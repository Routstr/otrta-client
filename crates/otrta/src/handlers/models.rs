use crate::{
    db::models::{
        delete_models_for_provider, get_models_for_organization, models_to_proxy_models,
        upsert_model,
    },
    db::{
        model_pricing::ModelPricingComparison, organizations::get_all_organizations,
        provider::get_active_providers_for_organization,
    },
    models::{AppState, ModelListResponse, ProxyModel, RefreshModelsResponse, UserContext},
    onion::{
        construct_url_with_protocol, create_onion_client, get_onion_error_message,
        log_onion_timing, start_onion_timing,
    },
};
use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::Response,
    Json,
};
use serde_json::{self, json};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::time::{sleep, Duration};

pub async fn list_openai_models(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Response {
    crate::proxy::forward_request(
        &state.db,
        "v1/models",
        Some(&user_ctx.organization_id),
        None,
    )
    .await
}

pub async fn get_proxy_models(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Result<Json<Vec<ProxyModel>>, (StatusCode, Json<serde_json::Value>)> {
    let models = match get_models_for_organization(&state.db, &user_ctx.organization_id).await {
        Ok(models) => models,
        Err(_) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve models",
                        "type": "database_error"
                    }
                })),
            ));
        }
    };

    let proxy_models = models_to_proxy_models(models);

    Ok(Json(proxy_models))
}

pub async fn get_model_pricing_comparison(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ModelPricingComparison>>, (StatusCode, Json<serde_json::Value>)> {
    match crate::db::model_pricing::get_model_pricing_comparison(&state.db).await {
        Ok(comparisons) => Ok(Json(comparisons)),
        Err(e) => {
            eprintln!("Failed to get model pricing comparison: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve model pricing comparison",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn refresh_models_from_proxy(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Result<Json<RefreshModelsResponse>, (StatusCode, Json<serde_json::Value>)> {
    match refresh_models_internal(&state.db, &user_ctx.organization_id).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            eprintln!("Failed to refresh models: {}", e);

            let (status, error_type) = if e.contains("Server configuration missing") {
                (StatusCode::BAD_REQUEST, "server_config_missing")
            } else if e.contains("Failed to connect") {
                (StatusCode::INTERNAL_SERVER_ERROR, "connection_error")
            } else if e.contains("Proxy returned error") {
                (StatusCode::INTERNAL_SERVER_ERROR, "proxy_error")
            } else if e.contains("Failed to parse") {
                (StatusCode::INTERNAL_SERVER_ERROR, "parse_error")
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, "database_error")
            };

            Err((
                status,
                Json(json!({
                    "error": {
                        "message": e,
                        "type": error_type
                    }
                })),
            ))
        }
    }
}

pub async fn refresh_models_internal(
    db: &crate::db::Pool,
    organization_id: &uuid::Uuid,
) -> Result<RefreshModelsResponse, String> {
    let server_config = if let Ok(Some(config)) =
        crate::db::provider::get_default_provider_for_organization_new(db, organization_id).await
    {
        config
    } else {
        return Err(
            "No default provider configured for organization. Cannot fetch models without a configured provider."
                .to_string(),
        );
    };

    let endpoint_url = construct_url_with_protocol(&server_config.url, "v1/models");
    println!("Constructed endpoint URL: {}", endpoint_url);

    let client = match create_onion_client(&endpoint_url, server_config.use_onion, Some(60)) {
        Ok(client) => client,
        Err(e) => return Err(e),
    };

    let start_time = start_onion_timing(&endpoint_url);
    println!("Making request to: {}", endpoint_url);

    let proxy_models_response = match client
        .get(&endpoint_url)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
    {
        Ok(response) => {
            log_onion_timing(start_time, &endpoint_url, "models");
            println!("Response status: {}", response.status());
            response
        }
        Err(e) => {
            let error_msg = get_onion_error_message(&e, &endpoint_url, "models");
            eprintln!("Request error details: {:?}", e);
            return Err(format!("{}: {}", error_msg, e));
        }
    };

    if !proxy_models_response.status().is_success() {
        return Err(format!(
            "Proxy returned error: {}",
            proxy_models_response.status()
        ));
    }

    let proxy_models_data: ModelListResponse = match proxy_models_response.json().await {
        Ok(models) => models,
        Err(e) => {
            return Err(format!("Failed to parse proxy response: {}", e));
        }
    };

    let deleted_count = match delete_models_for_provider(db, server_config.id).await {
        Ok(count) => count,
        Err(e) => {
            eprintln!("Failed to delete existing models for provider: {}", e);
            return Err("Failed to delete existing models for provider".to_string());
        }
    };

    let mut models_added = 0;

    for proxy_model in &proxy_models_data.data {
        match upsert_model(db, proxy_model, server_config.id).await {
            Ok(_) => {
                models_added += 1;
            }
            Err(e) => {
                eprintln!("Failed to insert model {}: {}", proxy_model.name, e);
            }
        }
    }

    Ok(RefreshModelsResponse {
        success: true,
        models_updated: 0,
        models_added,
        models_marked_removed: deleted_count as i32,
        message: Some(format!(
            "Successfully deleted {} existing models and added {} new models for provider {}",
            deleted_count, models_added, server_config.id
        )),
    })
}

pub async fn refresh_models_background(
    State(state): State<Arc<AppState>>,
) -> Result<Json<RefreshModelsResponse>, (StatusCode, Json<serde_json::Value>)> {
    let mut total_models_added = 0;
    let mut total_models_removed = 0;
    let mut total_providers_processed = 0;
    let mut errors = Vec::new();

    let organizations = match get_all_organizations(&state.db).await {
        Ok(orgs) => orgs,
        Err(e) => {
            eprintln!("Failed to get organizations: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to get organizations: {}", e),
                        "type": "database_error"
                    }
                })),
            ));
        }
    };

    let mut unique_providers: HashMap<String, (i32, uuid::Uuid)> = HashMap::new();

    for org in organizations.iter() {
        eprintln!(
            "Collecting providers from organization: {} ({})",
            org.name, org.id
        );

        let providers = match get_active_providers_for_organization(&state.db, &org.id).await {
            Ok(providers) => providers,
            Err(e) => {
                let error_msg =
                    format!("Failed to get providers for organization {}: {}", org.id, e);
                eprintln!("{}", error_msg);
                errors.push(error_msg);
                continue;
            }
        };

        for provider in providers.iter() {
            if !unique_providers.contains_key(&provider.url) {
                unique_providers.insert(provider.url.clone(), (provider.id, org.id));
                eprintln!(
                    "Added unique provider: {} (ID: {}) from org: {}",
                    provider.url, provider.id, org.id
                );
            } else {
                eprintln!(
                    "Skipping duplicate provider URL: {} (ID: {}) from org: {}",
                    provider.url, provider.id, org.id
                );
            }
        }
    }

    eprintln!(
        "Found {} unique providers to process",
        unique_providers.len()
    );

    for (provider_index, (provider_url, (provider_id, organization_id))) in
        unique_providers.iter().enumerate()
    {
        eprintln!(
            "Processing provider {}/{}: {} (ID: {})",
            provider_index + 1,
            unique_providers.len(),
            provider_url,
            provider_id
        );

        match refresh_models_for_provider(&state.db, organization_id, *provider_id).await {
            Ok(response) => {
                total_models_added += response.models_added;
                total_models_removed += response.models_marked_removed;
                total_providers_processed += 1;
                eprintln!(
                    "Successfully processed provider {}: added {}, removed {}",
                    provider_url, response.models_added, response.models_marked_removed
                );
            }
            Err(e) => {
                let error_msg = format!(
                    "Failed to refresh models for provider {} (ID: {}): {}",
                    provider_url, provider_id, e
                );
                eprintln!("{}", error_msg);
                errors.push(error_msg);
            }
        }

        if provider_index < unique_providers.len() - 1 {
            sleep(Duration::from_millis(500)).await;
        }
    }

    // After processing all providers, update the comprehensive pricing table
    eprintln!("Updating model pricing comparison table for all providers...");
    let mut pricing_errors = 0;

    for org in organizations.iter() {
        let providers = match get_active_providers_for_organization(&state.db, &org.id).await {
            Ok(providers) => providers,
            Err(e) => {
                eprintln!(
                    "Failed to get providers for pricing update (org {}): {}",
                    org.id, e
                );
                continue;
            }
        };

        for provider in providers.iter() {
            // Get all models for this provider
            let models = match sqlx::query!(
                r#"
                SELECT id, provider_id, name, input_cost, output_cost, min_cash_per_request, 
                       min_cost_per_request, provider, soft_deleted, model_type, 
                       description, context_length, is_free, created_at, updated_at, last_seen_at,
                       modality, input_modalities, output_modalities, tokenizer, instruct_type,
                       created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
                       web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
                       is_moderated
                FROM models
                WHERE provider_id = $1 AND (soft_deleted = false OR soft_deleted IS NULL)
                "#,
                provider.id
            )
            .fetch_all(&state.db)
            .await
            {
                Ok(records) => records,
                Err(e) => {
                    eprintln!(
                        "Failed to fetch models for provider {} ({}): {}",
                        provider.name, provider.id, e
                    );
                    pricing_errors += 1;
                    continue;
                }
            };

            // Update pricing for each model
            for model_record in models {
                let model = crate::models::ModelRecord {
                    id: model_record.id,
                    provider_id: model_record.provider_id,
                    name: model_record.name,
                    input_cost: model_record.input_cost,
                    output_cost: model_record.output_cost,
                    min_cash_per_request: model_record.min_cash_per_request,
                    min_cost_per_request: model_record.min_cost_per_request,
                    provider: model_record.provider,
                    soft_deleted: model_record.soft_deleted.unwrap_or(false),
                    model_type: model_record.model_type,
                    description: model_record.description,
                    context_length: model_record.context_length,
                    is_free: model_record.is_free.unwrap_or(false),
                    created_at: model_record.created_at,
                    updated_at: model_record.updated_at,
                    last_seen_at: model_record.last_seen_at,
                    modality: model_record.modality,
                    input_modalities: model_record.input_modalities,
                    output_modalities: model_record.output_modalities,
                    tokenizer: model_record.tokenizer,
                    instruct_type: model_record.instruct_type,
                    created_timestamp: model_record.created_timestamp,
                    prompt_cost: model_record.prompt_cost,
                    completion_cost: model_record.completion_cost,
                    request_cost: model_record.request_cost,
                    image_cost: model_record.image_cost,
                    web_search_cost: model_record.web_search_cost,
                    internal_reasoning_cost: model_record.internal_reasoning_cost,
                    max_cost: model_record.max_cost,
                    max_completion_tokens: model_record.max_completion_tokens,
                    is_moderated: model_record.is_moderated,
                };

                if let Err(e) = crate::db::model_pricing::upsert_model_pricing(
                    &state.db,
                    &model,
                    &provider.name,
                )
                .await
                {
                    eprintln!(
                        "Failed to update pricing for model {} from provider {}: {}",
                        model.name, provider.name, e
                    );
                    pricing_errors += 1;
                }
            }
        }
    }

    let success = errors.is_empty();
    let pricing_note = if pricing_errors > 0 {
        format!(" ({} pricing update errors)", pricing_errors)
    } else {
        " (pricing comparison updated)".to_string()
    };

    let message = if success {
        format!(
            "Successfully processed {} unique providers across {} organizations. Added {} models, removed {} models.{}",
            total_providers_processed, organizations.len(), total_models_added, total_models_removed, pricing_note
        )
    } else {
        format!(
            "Processed {} unique providers with {} errors. Added {} models, removed {} models. Errors: {}{}",
            total_providers_processed,
            errors.len(),
            total_models_added,
            total_models_removed,
            errors.join("; "),
            pricing_note
        )
    };

    eprintln!(
        "Model pricing comparison table update completed with {} errors",
        pricing_errors
    );

    Ok(Json(RefreshModelsResponse {
        success,
        models_updated: 0,
        models_added: total_models_added,
        models_marked_removed: total_models_removed,
        message: Some(message),
    }))
}

async fn refresh_models_for_provider(
    db: &crate::db::Pool,
    organization_id: &uuid::Uuid,
    provider_id: i32,
) -> Result<RefreshModelsResponse, String> {
    let provider = match crate::db::provider::get_provider_by_id_for_organization(
        db,
        provider_id,
        organization_id,
    )
    .await
    {
        Ok(Some(provider)) => provider,
        Ok(None) => {
            return Err(format!(
                "Provider {} not found for organization {}",
                provider_id, organization_id
            ));
        }
        Err(e) => {
            return Err(format!(
                "Database error getting provider {}: {}",
                provider_id, e
            ));
        }
    };

    let endpoint_url = construct_url_with_protocol(&provider.url, "v1/models");

    let client = match create_onion_client(&endpoint_url, provider.use_onion, Some(60)) {
        Ok(client) => client,
        Err(e) => return Err(e),
    };

    let start_time = start_onion_timing(&endpoint_url);

    let proxy_models_response = match client
        .get(&endpoint_url)
        .timeout(Duration::from_secs(120))
        .send()
        .await
    {
        Ok(response) => {
            log_onion_timing(start_time, &endpoint_url, "models");
            response
        }
        Err(e) => {
            let error_msg = get_onion_error_message(&e, &endpoint_url, "models");
            return Err(format!("{}: {}", error_msg, e));
        }
    };

    if !proxy_models_response.status().is_success() {
        return Err(format!(
            "Proxy returned error: {}",
            proxy_models_response.status()
        ));
    }

    let proxy_models_data: ModelListResponse = match proxy_models_response.json().await {
        Ok(models) => models,
        Err(e) => {
            return Err(format!("Failed to parse proxy response: {}", e));
        }
    };

    // Atomic model replacement: delete old and insert new models in a single transaction
    // to ensure models are always available in the database
    let mut transaction = match db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            return Err(format!("Failed to begin transaction: {}", e));
        }
    };

    // Delete existing models for this provider within the transaction
    let deleted_count = match sqlx::query!("DELETE FROM models WHERE provider_id = $1", provider.id)
        .execute(&mut *transaction)
        .await
    {
        Ok(result) => result.rows_affected(),
        Err(e) => {
            let _ = transaction.rollback().await;
            return Err(format!(
                "Failed to delete existing models for provider: {}",
                e
            ));
        }
    };

    let mut models_added = 0;

    // Insert all new models within the same transaction
    for proxy_model in &proxy_models_data.data {
        let model_record = proxy_model.to_model_record(provider.id);

        let result = sqlx::query!(
            r#"
            INSERT INTO models (
                name, provider_id, input_cost, output_cost, min_cash_per_request, 
                min_cost_per_request, provider, soft_deleted, model_type, 
                description, context_length, is_free, created_at, updated_at, last_seen_at,
                modality, input_modalities, output_modalities, tokenizer, instruct_type,
                created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
                web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
                is_moderated
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW(),
                $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
            )
            "#,
            model_record.name,
            model_record.provider_id,
            model_record.input_cost,
            model_record.output_cost,
            model_record.min_cash_per_request,
            model_record.min_cash_per_request,
            model_record.provider,
            model_record.soft_deleted,
            model_record.model_type,
            model_record.description,
            model_record.context_length,
            model_record.is_free,
            model_record.modality,
            model_record.input_modalities.as_deref(),
            model_record.output_modalities.as_deref(),
            model_record.tokenizer,
            model_record.instruct_type,
            model_record.created_timestamp,
            model_record.prompt_cost,
            model_record.completion_cost,
            model_record.request_cost,
            model_record.image_cost,
            model_record.web_search_cost,
            model_record.internal_reasoning_cost,
            model_record.max_cost,
            model_record.max_completion_tokens,
            model_record.is_moderated,
        )
        .execute(&mut *transaction)
        .await;

        match result {
            Ok(_) => {
                models_added += 1;
            }
            Err(e) => {
                let _ = transaction.rollback().await;
                return Err(format!(
                    "Failed to insert model {}: {}",
                    proxy_model.name, e
                ));
            }
        }
    }

    // All inserts succeeded, commit the transaction

    // Commit the transaction
    match transaction.commit().await {
        Ok(_) => {
            eprintln!(
                "Successfully deleted {} existing models and added {} new models for provider {}",
                deleted_count, models_added, provider.id
            );
        }
        Err(e) => {
            return Err(format!("Failed to commit transaction: {}", e));
        }
    }

    // Update model pricing for this provider so pricing stays up to date even without the background job
    let provider = match crate::db::provider::get_provider_by_id_for_organization(
        db,
        provider_id,
        organization_id,
    )
    .await
    {
        Ok(Some(p)) => p,
        _ => {
            return Err("Failed to load provider after model refresh".to_string());
        }
    };

    let models = match sqlx::query!(
        r#"
        SELECT id, provider_id, name, input_cost, output_cost, min_cash_per_request, 
               min_cost_per_request, provider, soft_deleted, model_type, 
               description, context_length, is_free, created_at, updated_at, last_seen_at,
               modality, input_modalities, output_modalities, tokenizer, instruct_type,
               created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
               web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
               is_moderated
        FROM models
        WHERE provider_id = $1 AND (soft_deleted = false OR soft_deleted IS NULL)
        "#,
        provider.id
    )
    .fetch_all(db)
    .await
    {
        Ok(records) => records,
        Err(e) => {
            return Err(format!(
                "Failed to fetch models for pricing update (provider {}): {}",
                provider.id, e
            ));
        }
    };

    for model_record in models {
        let model = crate::models::ModelRecord {
            id: model_record.id,
            provider_id: model_record.provider_id,
            name: model_record.name,
            input_cost: model_record.input_cost,
            output_cost: model_record.output_cost,
            min_cash_per_request: model_record.min_cash_per_request,
            min_cost_per_request: model_record.min_cost_per_request,
            provider: model_record.provider,
            soft_deleted: model_record.soft_deleted.unwrap_or(false),
            model_type: model_record.model_type,
            description: model_record.description,
            context_length: model_record.context_length,
            is_free: model_record.is_free.unwrap_or(false),
            created_at: model_record.created_at,
            updated_at: model_record.updated_at,
            last_seen_at: model_record.last_seen_at,
            modality: model_record.modality,
            input_modalities: model_record.input_modalities,
            output_modalities: model_record.output_modalities,
            tokenizer: model_record.tokenizer,
            instruct_type: model_record.instruct_type,
            created_timestamp: model_record.created_timestamp,
            prompt_cost: model_record.prompt_cost,
            completion_cost: model_record.completion_cost,
            request_cost: model_record.request_cost,
            image_cost: model_record.image_cost,
            web_search_cost: model_record.web_search_cost,
            internal_reasoning_cost: model_record.internal_reasoning_cost,
            max_cost: model_record.max_cost,
            max_completion_tokens: model_record.max_completion_tokens,
            is_moderated: model_record.is_moderated,
        };

        if let Err(e) =
            crate::db::model_pricing::upsert_model_pricing(db, &model, &provider.name).await
        {
            eprintln!(
                "Failed to update pricing for model {} from provider {}: {}",
                model.name, provider.name, e
            );
        }
    }

    Ok(RefreshModelsResponse {
        success: true,
        models_updated: 0,
        models_added,
        models_marked_removed: deleted_count as i32,
        message: Some(format!(
            "Successfully deleted {} existing models and added {} new models for provider {}",
            deleted_count, models_added, provider.id
        )),
    })
}
