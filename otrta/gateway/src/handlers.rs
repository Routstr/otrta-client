use crate::{
    db::{
        Pool,
        credit::{CreditListResponse, get_credits},
        server_config::{ServerConfigRecord, create_config, get_default_config, update_config},
        transaction::{TransactionListResponse, get_transactions},
    },
    models::*,
};
use axum::{
    Json,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde::{Deserialize, Serialize};
use serde_json::{self, json};
use std::sync::Arc;
use wallet::models::ServerConfig;

pub async fn list_openai_models(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    crate::proxy::forward_request(headers, &state.db, "/v1/models").await
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

pub async fn get_pendings(State(_state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    Json(json!({"pending": "test"}))
}

#[derive(Deserialize)]
pub struct SendTokenRequest {
    amount: i64,
}

#[derive(Serialize)]
pub struct SendTokenResponse {
    token: String,
    success: bool,
    message: Option<String>,
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
