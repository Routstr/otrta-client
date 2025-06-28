use crate::{
    db::{
        credit::{get_credits, CreditListResponse},
        models::{delete_all_models, get_all_models, models_to_proxy_models, upsert_model},
        provider::{
            create_custom_provider, delete_custom_provider, get_all_providers,
            get_default_provider, get_provider_by_id, refresh_providers_from_nostr,
            set_default_provider, CreateCustomProviderRequest, ProviderListResponse,
            RefreshProvidersResponse,
        },
        server_config::{create_config, get_default_config, update_config, ServerConfigRecord},
        transaction::{get_transactions, TransactionListResponse},
        Pool,
    },
    models::*,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Response,
    Json,
};

use serde::Deserialize;
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
    let server_config = if let Ok(Some(config)) = get_default_provider(&state.db).await {
        config
    } else {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Server configuration missing. Cannot fetch models without a configured endpoint.",
                    "type": "server_error",
                    "param": null,
                    "code": "server_config_missing"
                }
            })),
        ));
    };

    let client = reqwest::Client::new();
    let endpoint_url = format!("{}/proxy/models", &server_config.url);

    let proxy_models_response = match client
        .get(&endpoint_url)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to connect to proxy: {}", e),
                        "type": "connection_error"
                    }
                })),
            ));
        }
    };

    if !proxy_models_response.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": {
                    "message": format!("Proxy returned error: {}", proxy_models_response.status()),
                    "type": "proxy_error"
                }
            })),
        ));
    }

    let proxy_models: Vec<ProxyModelFromApi> = match proxy_models_response.json().await {
        Ok(models) => models,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to parse proxy response: {}", e),
                        "type": "parse_error"
                    }
                })),
            ));
        }
    };

    // Delete all existing models first
    let deleted_count = match delete_all_models(&state.db).await {
        Ok(count) => count,
        Err(e) => {
            eprintln!("Failed to delete existing models: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to delete existing models",
                        "type": "database_error"
                    }
                })),
            ));
        }
    };

    let mut models_added = 0;

    // Insert all new models
    for proxy_model in &proxy_models {
        match upsert_model(&state.db, proxy_model).await {
            Ok(_) => {
                models_added += 1;
            }
            Err(e) => {
                eprintln!("Failed to insert model {}: {}", proxy_model.name, e);
            }
        }
    }

    Ok(Json(RefreshModelsResponse {
        success: true,
        models_updated: 0,
        models_added,
        models_marked_removed: deleted_count as i32,
        message: Some(format!(
            "Successfully deleted {} existing models and added {} new models",
            deleted_count, models_added
        )),
    }))
}

pub async fn redeem_token(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Token>,
) -> Json<TokenRedeemResponse> {
    println!("toke: {}", payload.token);
    if let Ok(response) = state.wallet.receive(&payload.token).await {
        return Json(TokenRedeemResponse {
            amount: Some(response.to_string()),
            success: true,
            message: None,
        });
    }

    Json(TokenRedeemResponse {
        amount: None,
        success: false,
        message: Some("mal formed Token".to_string()),
    })
}

pub async fn get_balance(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    Json(json!({"balance": state.wallet.balance().await.unwrap()}))
}

pub async fn update_server_config(
    State(state): State<Arc<AppState>>,
    Json(config): Json<ServerConfig>,
) -> Result<Json<ServerConfig>, StatusCode> {
    let db_config = get_server_config(&state.db.clone()).await;
    if let Some(c) = db_config {
        update_config(&state.db.clone(), c.id, &config)
            .await
            .unwrap();
    } else {
        create_config(&state.db.clone(), &config).await.unwrap();
    }

    let config = get_server_config(&state.db.clone()).await.unwrap();
    Ok(Json(ServerConfig {
        endpoint: config.endpoint,
        api_key: config.api_key,
    }))
}

pub async fn get_current_server_config(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ServerConfig>, StatusCode> {
    let config = get_server_config(&state.db.clone()).await;
    if let Some(c) = config {
        return Ok(Json(ServerConfig {
            endpoint: c.endpoint,
            api_key: c.api_key,
        }));
    }

    return Ok(Json(ServerConfig {
        endpoint: "".to_string(),
        api_key: "".to_string(),
    }));
}

pub async fn get_server_config(db: &Pool) -> Option<ServerConfigRecord> {
    if let Ok(c) = get_default_config(db).await {
        return c;
    }

    None
}

#[derive(Deserialize)]
pub struct PaginationParams {
    page: Option<i64>,
    #[serde(rename = "pageSize")]
    page_size: Option<i64>,
}

pub async fn get_all_credits(
    State(state): State<Arc<AppState>>,
    params: Query<PaginationParams>,
) -> Result<Json<CreditListResponse>, StatusCode> {
    match get_credits(&state.db, params.page, params.page_size).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_all_transactions(
    State(state): State<Arc<AppState>>,
    params: Query<PaginationParams>,
) -> Result<Json<TransactionListResponse>, StatusCode> {
    match get_transactions(&state.db, params.page, params.page_size).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_pendings(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let proofs = state.wallet.pending().await.unwrap();
    Json(json!({"pending": proofs}))
}

pub async fn send_token(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SendTokenRequest>,
) -> Result<Json<SendTokenResponse>, (StatusCode, Json<serde_json::Value>)> {
    match state.wallet.send(payload.amount as u64).await {
        Ok(response) => Ok(Json(SendTokenResponse {
            token: response,
            success: true,
            message: None,
        })),
        Err(_e) => {
            let error_msg = format!("Failed to generate token");
            eprintln!("{}", error_msg);

            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": error_msg,
                        "type": "token_generation_error",
                    }
                })),
            ))
        }
    }
}

pub async fn redeem_pendings(State(state): State<Arc<AppState>>) -> StatusCode {
    if state.wallet.redeem_pendings().await.is_ok() {
        return StatusCode::BAD_REQUEST;
    }

    StatusCode::OK
}

// Provider handlers
pub async fn get_providers(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ProviderListResponse>, (StatusCode, Json<serde_json::Value>)> {
    match get_all_providers(&state.db).await {
        Ok(providers) => {
            let total = providers.len() as i32;
            Ok(Json(ProviderListResponse { providers, total }))
        }
        Err(e) => {
            eprintln!("Failed to get providers: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve providers",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_provider(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    match get_provider_by_id(&state.db, id).await {
        Ok(Some(provider)) => Ok(Json(provider)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Provider not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to get provider {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn set_provider_default(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    match set_default_provider(&state.db, id).await {
        Ok(_) => {
            // Return the updated provider
            match get_provider_by_id(&state.db, id).await {
                Ok(Some(provider)) => Ok(Json(provider)),
                Ok(None) => Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Provider not found",
                            "type": "not_found"
                        }
                    })),
                )),
                Err(e) => {
                    eprintln!("Failed to get updated provider {}: {}", id, e);
                    Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({
                            "error": {
                                "message": "Failed to retrieve updated provider",
                                "type": "database_error"
                            }
                        })),
                    ))
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to set default provider {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to set default provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn refresh_providers(
    State(state): State<Arc<AppState>>,
) -> Result<Json<RefreshProvidersResponse>, (StatusCode, Json<serde_json::Value>)> {
    match refresh_providers_from_nostr(&state.db).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            eprintln!("Failed to refresh providers: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to refresh providers from Nostr marketplace",
                        "type": "refresh_error"
                    }
                })),
            ))
        }
    }
}

pub async fn create_custom_provider_handler(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateCustomProviderRequest>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    // Validate the request
    if request.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Provider name cannot be empty",
                    "type": "validation_error"
                }
            })),
        ));
    }

    if request.url.trim().is_empty() || !request.url.starts_with("http") {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Provider URL must be a valid HTTP(S) URL",
                    "type": "validation_error"
                }
            })),
        ));
    }

    match create_custom_provider(&state.db, request).await {
        Ok(provider) => Ok(Json(provider)),
        Err(e) => {
            eprintln!("Failed to create custom provider: {}", e);
            // Check if it's a unique constraint violation
            if e.to_string()
                .contains("duplicate key value violates unique constraint")
            {
                Err((
                    StatusCode::CONFLICT,
                    Json(json!({
                        "error": {
                            "message": "A provider with this URL already exists",
                            "type": "duplicate_error"
                        }
                    })),
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to create custom provider",
                            "type": "database_error"
                        }
                    })),
                ))
            }
        }
    }
}

pub async fn delete_custom_provider_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match delete_custom_provider(&state.db, id).await {
        Ok(deleted) => {
            if deleted {
                Ok(Json(json!({
                    "success": true,
                    "message": "Custom provider deleted successfully"
                })))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Custom provider not found or cannot be deleted",
                            "type": "not_found"
                        }
                    })),
                ))
            }
        }
        Err(e) => {
            eprintln!("Failed to delete custom provider {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to delete custom provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_default_provider_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Option<crate::db::provider::Provider>>, (StatusCode, Json<serde_json::Value>)> {
    match get_default_provider(&state.db).await {
        Ok(provider) => Ok(Json(provider)),
        Err(e) => {
            eprintln!("Failed to get default provider: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to get default provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}
