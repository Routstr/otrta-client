use crate::{
    db::{
        models::{delete_all_models, get_all_models, models_to_proxy_models, upsert_model},
        provider::get_default_provider,
    },
    models::{AppState, ModelListResponse, ProxyModel, RefreshModelsResponse},
};
use axum::{extract::State, http::StatusCode, response::Response, Json};
use serde_json::{self, json};
use std::sync::Arc;

pub async fn list_openai_models(State(state): State<Arc<AppState>>) -> Response {
    crate::proxy::forward_request(&state.db, "v1/models").await
}

pub async fn get_proxy_models(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ProxyModel>>, (StatusCode, Json<serde_json::Value>)> {
    let models = match get_all_models(&state.db).await {
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
) -> Result<Json<RefreshModelsResponse>, (StatusCode, Json<serde_json::Value>)> {
    match refresh_models_internal(&state.db).await {
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

pub async fn refresh_models_internal(db: &crate::db::Pool) -> Result<RefreshModelsResponse, String> {
    let server_config = if let Ok(Some(config)) = get_default_provider(db).await {
        config
    } else {
        return Err(
            "Server configuration missing. Cannot fetch models without a configured endpoint."
                .to_string(),
        );
    };

    let client = reqwest::Client::new();
    let endpoint_url = format!("{}/v1/models", &server_config.url);

    let proxy_models_response = match client
        .get(&endpoint_url)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            return Err(format!("Failed to connect to proxy: {}", e));
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

    let deleted_count = match delete_all_models(db).await {
        Ok(count) => count,
        Err(e) => {
            eprintln!("Failed to delete existing models: {}", e);
            return Err("Failed to delete existing models".to_string());
        }
    };

    let mut models_added = 0;

    for proxy_model in &proxy_models_data.data {
        match upsert_model(db, proxy_model).await {
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
            "Successfully deleted {} existing models and added {} new models",
            deleted_count, models_added
        )),
    })
} 