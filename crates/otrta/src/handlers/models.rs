use crate::{
    db::models::{
        delete_models_for_provider, get_models_for_organization, models_to_proxy_models,
        upsert_model,
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
use std::sync::Arc;

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

    // Use onion module to construct proper URL
    let endpoint_url = construct_url_with_protocol(&server_config.url, "v1/models");
    println!("Constructed endpoint URL: {}", endpoint_url);

    // Use onion module to create HTTP client with Tor proxy support
    let client = match create_onion_client(&endpoint_url, server_config.use_onion, Some(60)) {
        Ok(client) => client,
        Err(e) => return Err(e),
    };

    // Start timing for onion requests
    let start_time = start_onion_timing(&endpoint_url);
    println!("Making request to: {}", endpoint_url);

    let proxy_models_response = match client
        .get(&endpoint_url)
        .timeout(std::time::Duration::from_secs(120)) // Longer timeout for onion services
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
    State(_state): State<Arc<AppState>>,
) -> Result<Json<RefreshModelsResponse>, (StatusCode, Json<serde_json::Value>)> {
    // For now, background refresh is disabled since it needs organization context
    // This can be enhanced later to refresh for all organizations
    Err((
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "error": {
                "message": "Background model refresh is not implemented for organization-specific models",
                "type": "not_implemented"
            }
        })),
    ))
}
