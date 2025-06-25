use crate::{
    db::{
        credit::{get_credits, CreditListResponse},
        models::{
            get_all_models, get_bitcoin_price_in_usd, mark_models_as_removed,
            models_to_proxy_models, upsert_model,
        },
        server_config::{create_config, get_default_config, update_config, ServerConfigRecord},
        transaction::{get_transactions, TransactionListResponse},
        Pool,
    },
    models::*,
};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Response,
    Json,
};
use chrono::Utc;
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
    let server_config = if let Some(config) = get_server_config(&state.db).await {
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
    let endpoint_url = format!("{}/proxy/models", &server_config.endpoint);

    let proxy_models_response = match client
        .get(&endpoint_url)
        .header("Authorization", format!("Bearer {}", server_config.api_key))
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

    // Track refresh time for marking removed models
    let refresh_time = Utc::now();
    let models_added = 0;
    let mut models_updated = 0;

    // Upsert each model (store directly as received from API)
    for proxy_model in &proxy_models {
        match upsert_model(&state.db, proxy_model).await {
            Ok(_) => {
                models_updated += 1;
            }
            Err(e) => {
                eprintln!("Failed to upsert model {}: {}", proxy_model.name, e);
            }
        }
    }

    // Mark models not in the response as removed
    let current_model_names: Vec<String> = proxy_models.iter().map(|m| m.name.clone()).collect();

    let models_marked_removed =
        match mark_models_as_removed(&state.db, &current_model_names, refresh_time).await {
            Ok(count) => count as i32,
            Err(e) => {
                eprintln!("Failed to mark removed models: {}", e);
                0
            }
        };

    Ok(Json(RefreshModelsResponse {
        success: true,
        models_updated,
        models_added,
        models_marked_removed,
        message: Some(format!(
            "Successfully refreshed {} models, marked {} as removed",
            models_updated, models_marked_removed
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
