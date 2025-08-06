use crate::{
    models::{
        AppState, SendTokenRequest, SendTokenResponse, Token, TokenRedeemResponse, UserContext,
    },
    multimint::LocalMultimintSendOptions,
};
use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
};
use serde_json::{self, json};
use std::{str::FromStr, sync::Arc};

pub fn get_user_friendly_wallet_error_message(error: &str) -> String {
    match error {
        s if s.contains("BlindedMessageAlreadySigned") => {
            "This token has already been redeemed. Each ecash token can only be used once."
                .to_string()
        }
        s if s.contains("ProofAlreadySpent") => {
            "This token has already been spent. Each ecash token can only be used once.".to_string()
        }
        s if s.contains("ProofNotFound") => {
            "Invalid token: The proofs in this token were not found at the mint.".to_string()
        }
        s if s.contains("InsufficientFunds") => {
            "Insufficient funds: The token amount exceeds available balance.".to_string()
        }
        s if s.contains("InvalidToken") => {
            "Invalid token format or corrupted token data.".to_string()
        }
        s if s.contains("MintConnectionError") => {
            "Unable to connect to the mint. Please check your internet connection and try again."
                .to_string()
        }
        _ => format!("Wallet error: {}", error),
    }
}

pub async fn redeem_token(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<Token>,
) -> Json<TokenRedeemResponse> {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(&user_ctx.organization_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(_) => {
            return Json(TokenRedeemResponse {
                amount: None,
                success: false,
                message: Some("Failed to get organization wallet".to_string()),
            })
        }
    };

    let token = payload.token.trim();

    let parsed_token = match cdk::nuts::Token::from_str(token) {
        Ok(t) => t,
        Err(e) => {
            return Json(TokenRedeemResponse {
                amount: None,
                success: false,
                message: Some(format!("Invalid token format: {:?}", e)),
            });
        }
    };

    if let Ok(mint_url) = parsed_token.mint_url() {
        let configured_mints = wallet.list_mints().await;
        if !configured_mints.contains(&mint_url.to_string()) {
            return Json(TokenRedeemResponse {
                amount: None,
                success: false,
                message: Some(format!(
                    "Mint '{}' is not configured in this wallet. Please add the mint first.",
                    mint_url
                )),
            });
        }

        if let Some(mint_wallet) = wallet.get_wallet_for_mint(&mint_url.to_string()).await {
            match mint_wallet.receive(token).await {
                Ok(amount) => {
                    return Json(TokenRedeemResponse {
                        amount: Some(amount.to_string()),
                        success: true,
                        message: Some(format!(
                            "Successfully redeemed token from mint: {}",
                            mint_url
                        )),
                    });
                }
                Err(e) => {
                    let error_message = get_user_friendly_wallet_error_message(&e.to_string());
                    return Json(TokenRedeemResponse {
                        amount: None,
                        success: false,
                        message: Some(error_message),
                    });
                }
            }
        }
    }

    match wallet.receive(token).await {
        Ok(amount) => Json(TokenRedeemResponse {
            amount: Some(amount.to_string()),
            success: true,
            message: Some("Token redeemed successfully".to_string()),
        }),
        Err(e) => {
            let error_message = get_user_friendly_wallet_error_message(&e.to_string());
            Json(TokenRedeemResponse {
                amount: None,
                success: false,
                message: Some(error_message),
            })
        }
    }
}

pub async fn get_balance(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Json<serde_json::Value> {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(&user_ctx.organization_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(_) => return Json(json!({"error": "Failed to get organization wallet"})),
    };

    Json(json!({"balance": wallet.balance().await.unwrap()}))
}

pub async fn get_pendings(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Json<serde_json::Value> {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(&user_ctx.organization_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(_) => return Json(json!({"error": "Failed to get organization wallet"})),
    };

    let proofs = wallet.pending().await.unwrap();
    Json(json!({"pending": proofs}))
}

pub async fn send_token(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<SendTokenRequest>,
) -> Result<Json<SendTokenResponse>, (StatusCode, Json<serde_json::Value>)> {
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

    match wallet
        .send_simple(
            payload.amount as u64,
            LocalMultimintSendOptions {
                preferred_mint: Some(payload.mint_url),
                ..Default::default()
            },
        )
        .await
    {
        Ok(response) => {
            eprintln!("DEBUG: Successfully generated token");
            Ok(Json(SendTokenResponse {
                token: response,
                success: true,
                message: None,
            }))
        }
        Err(e) => {
            let error_msg = format!("Failed to generate token: {}", e);
            eprintln!("DEBUG: {}", error_msg);

            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": error_msg,
                        "type": "payment_error",
                    }
                })),
            ))
        }
    }
}

pub async fn redeem_pendings(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> StatusCode {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(&user_ctx.organization_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    if wallet.redeem_pendings().await.is_ok() {
        return StatusCode::OK;
    }

    StatusCode::BAD_REQUEST
}

pub async fn get_wallet_debug_info(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let org_wallet = match state
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

    use cdk::nuts::CurrencyUnit;

    let mut debug_info = serde_json::Map::new();

    let mints_list = org_wallet.list_mints().await;
    debug_info.insert("configured_mints".to_string(), json!(mints_list));

    for unit in [CurrencyUnit::Sat, CurrencyUnit::Msat] {
        match org_wallet.inner().cdk_wallet().get_balances(&unit).await {
            Ok(balances) => {
                let balances_map: std::collections::HashMap<String, u64> = balances
                    .into_iter()
                    .map(|(mint_url, amount)| (mint_url.to_string(), u64::from(amount)))
                    .collect();
                debug_info.insert(
                    format!("balances_{:?}", unit).to_lowercase(),
                    json!(balances_map),
                );
            }
            Err(e) => {
                debug_info.insert(
                    format!("balances_{:?}_error", unit).to_lowercase(),
                    json!(e.to_string()),
                );
            }
        }
    }

    match org_wallet.get_total_balance().await {
        Ok(total_balance) => {
            debug_info.insert("total_balance".to_string(), json!(total_balance));
        }
        Err(e) => {
            debug_info.insert("total_balance_error".to_string(), json!(e.to_string()));
        }
    }

    Ok(Json(json!(debug_info)))
}
