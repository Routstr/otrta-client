use crate::{
    db::models::{
        delete_models_for_provider, get_models_for_organization, models_to_proxy_models,
        upsert_model,
    },
    db::{organizations::get_all_organizations, provider::get_active_providers_for_organization},
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

    for (org_index, org) in organizations.iter().enumerate() {
        eprintln!("Processing organization: {} ({})", org.name, org.id);

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

        eprintln!(
            "Found {} active providers for organization {}",
            providers.len(),
            org.name
        );

        for (provider_index, provider) in providers.iter().enumerate() {
            eprintln!(
                "Refreshing models for provider: {} ({})",
                provider.name, provider.id
            );

            match refresh_models_for_provider(&state.db, &org.id, provider.id).await {
                Ok(response) => {
                    total_models_added += response.models_added;
                    total_models_removed += response.models_marked_removed;
                    total_providers_processed += 1;
                    eprintln!(
                        "Successfully refreshed models for provider {} in organization {}: {} added, {} removed",
                        provider.name, org.name, response.models_added, response.models_marked_removed
                    );
                }
                Err(e) => {
                    let error_msg = format!(
                        "Failed to refresh models for provider {} in organization {}: {}",
                        provider.name, org.name, e
                    );
                    eprintln!("{}", error_msg);
                    errors.push(error_msg);
                }
            }

            if provider_index < providers.len() - 1 {
                sleep(Duration::from_millis(500)).await;
            }
        }

        if org_index < organizations.len() - 1 {
            sleep(Duration::from_secs(1)).await;
        }
    }

    let success = errors.is_empty();
    let message = if success {
        format!(
            "Successfully processed {} providers across {} organizations. Added {} models, removed {} models.",
            total_providers_processed, organizations.len(), total_models_added, total_models_removed
        )
    } else {
        format!(
            "Processed {} providers with {} errors. Added {} models, removed {} models. Errors: {}",
            total_providers_processed,
            errors.len(),
            total_models_added,
            total_models_removed,
            errors.join("; ")
        )
    };

    eprintln!("Background refresh completed: {}", message);

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

    // FIXME: better model update
    // let deleted_count = match delete_models_for_provider(db, provider.id).await {
    //     Ok(count) => count,
    //     Err(e) => {
    //         eprintln!("Failed to delete existing models for provider: {}", e);
    //         return Err("Failed to delete existing models for provider".to_string());
    //     }
    // };

    let mut models_added = 0;

    for proxy_model in &proxy_models_data.data {
        match upsert_model(db, proxy_model, provider.id).await {
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
        models_marked_removed: 0 as i32,
        message: Some(format!(
            "Successfully deleted {} existing models and added {} new models for provider {}",
            0, models_added, provider.id
        )),
    })
}
