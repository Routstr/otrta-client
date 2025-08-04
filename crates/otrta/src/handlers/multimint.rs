use crate::{
    models::{
        AppState, MintBalance, MultimintBalanceResponse, MultimintSendTokenRequest,
        MultimintSendTokenResponse, TransferBetweenMintsRequest, TransferBetweenMintsResponse,
        UserContext,
    },
    multimint::LocalMultimintSendOptions,
};
use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
};
use serde_json::{self, json};
use std::sync::Arc;

pub async fn get_multimint_balance_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Result<Json<MultimintBalanceResponse>, (StatusCode, Json<serde_json::Value>)> {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(&user_ctx.organization_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(_) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(
                    json!({"error": {"message": "Failed to get organization wallet", "type": "wallet_error"}}),
                ),
            ))
        }
    };

    // Get complete multimint balance information
    let multimint_balance = match wallet.get_total_balance().await {
        Ok(balance) => balance,
        Err(e) => {
            eprintln!("Failed to get multimint balance: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to get multimint balance",
                        "type": "wallet_error"
                    }
                })),
            ));
        }
    };

    // Convert from multimint::MintBalance to models::MintBalance
    let balances_by_mint = multimint_balance
        .balances_by_mint
        .into_iter()
        .map(|mb| MintBalance {
            mint_url: mb.mint_url,
            balance: mb.balance,
            unit: mb.unit,
            proof_count: mb.proof_count,
        })
        .collect();

    let response = MultimintBalanceResponse {
        total_balance: multimint_balance.total_balance,
        balances_by_mint,
    };

    Ok(Json(response))
}

pub async fn send_multimint_token_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<MultimintSendTokenRequest>,
) -> Result<Json<MultimintSendTokenResponse>, (StatusCode, Json<serde_json::Value>)> {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(&user_ctx.organization_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(_) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(
                    json!({"error": {"message": "Failed to get organization wallet", "type": "wallet_error"}}),
                ),
            ))
        }
    };

    let send_options = LocalMultimintSendOptions {
        preferred_mint: payload.preferred_mint,
        split_across_mints: payload.split_across_mints.unwrap_or(false),
        ..Default::default()
    };

    match wallet.send_simple(payload.amount, send_options).await {
        Ok(token) => Ok(Json(MultimintSendTokenResponse {
            tokens: token,
            success: true,
            message: Some("Token generated successfully".to_string()),
        })),
        Err(e) => {
            eprintln!("Failed to send multimint token: {:?}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to send token: {}", e),
                        "type": "wallet_error"
                    }
                })),
            ))
        }
    }
}

pub async fn transfer_between_mints_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<TransferBetweenMintsRequest>,
) -> Result<Json<TransferBetweenMintsResponse>, (StatusCode, Json<serde_json::Value>)> {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(&user_ctx.organization_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(_) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(
                    json!({"error": {"message": "Failed to get organization wallet", "type": "wallet_error"}}),
                ),
            ))
        }
    };

    let configured_mints = wallet.list_mints().await;

    if !configured_mints.contains(&payload.from_mint) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": format!("Source mint '{}' is not configured", payload.from_mint),
                    "type": "mint_not_configured"
                }
            })),
        ));
    }

    if !configured_mints.contains(&payload.to_mint) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": format!("Destination mint '{}' is not configured", payload.to_mint),
                    "type": "mint_not_configured"
                }
            })),
        ));
    }

    match wallet
        .transfer_between_mints(&payload.from_mint, &payload.to_mint, payload.amount)
        .await
    {
        Ok(_) => Ok(Json(TransferBetweenMintsResponse {
            success: true,
            message: format!(
                "Successfully transferred {} msats from {} to {}",
                payload.amount, payload.from_mint, payload.to_mint
            ),
        })),
        Err(e) => {
            eprintln!("Failed to transfer between mints: {:?}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to transfer between mints: {}", e),
                        "type": "transfer_error"
                    }
                })),
            ))
        }
    }
}
