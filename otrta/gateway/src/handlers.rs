use crate::{
    db::{
        Pool,
        credit::{CreditListResponse, get_credits},
        server_config::{ServerConfigRecord, get_default_config},
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
use cdk::wallet::{ReceiveOptions, SendOptions};
use serde::{Deserialize, Serialize};
use serde_json::{self, json};
use std::sync::Arc;

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
    if let Ok(response) = state
        .wallet
        .receive(&payload.token, ReceiveOptions::default())
        .await
    {
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
    Json(json!({"balance": state.wallet.total_balance().await.unwrap().to_string() }))
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
    Json(json!({"pending": state.wallet.total_pending_balance().await.unwrap()}))
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
    let prepared_send = state
        .wallet
        .prepare_send((payload.amount as u64).into(), SendOptions::default())
        .await
        .unwrap();

    match state.wallet.send(prepared_send, None).await {
        Ok(response) => Ok(Json(SendTokenResponse {
            token: response.to_string(),
            success: true,
            message: None,
        })),
        Err(e) => {
            let error_msg = format!("Failed to generate token: {}", e);
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
