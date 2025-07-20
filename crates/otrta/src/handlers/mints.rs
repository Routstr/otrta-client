use crate::{
    db::mint::{
        create_mint, delete_mint, get_active_mints, get_all_mints, get_mint_by_id,
        set_mint_active_status, update_mint, CreateMintRequest, Mint, MintListResponse,
        UpdateMintRequest,
    },
    handlers::wallet::get_user_friendly_wallet_error_message,
    models::{AppState, TopupMintRequest, TopupMintResponse, UserContext},
};
use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde_json::{self, json};
use std::{str::FromStr, sync::Arc};

pub async fn get_all_mints_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<MintListResponse>, (StatusCode, Json<serde_json::Value>)> {
    match get_all_mints(&state.db).await {
        Ok(mints) => {
            let total = mints.len() as i32;
            Ok(Json(MintListResponse { mints, total }))
        }
        Err(e) => {
            eprintln!("Failed to get mints: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve mints",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_active_mints_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<MintListResponse>, (StatusCode, Json<serde_json::Value>)> {
    match get_active_mints(&state.db).await {
        Ok(mints) => {
            let total = mints.len() as i32;
            Ok(Json(MintListResponse { mints, total }))
        }
        Err(e) => {
            eprintln!("Failed to get active mints: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve active mints",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_mint_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<Mint>, (StatusCode, Json<serde_json::Value>)> {
    match get_mint_by_id(&state.db, id).await {
        Ok(Some(mint)) => Ok(Json(mint)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Mint not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to get mint {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve mint",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn create_mint_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(request): Json<CreateMintRequest>,
) -> Result<Json<Mint>, (StatusCode, Json<serde_json::Value>)> {
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

    // Validate the request
    if request.mint_url.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Mint URL cannot be empty",
                    "type": "validation_error"
                }
            })),
        ));
    }

    if !request.mint_url.starts_with("http") {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Mint URL must be a valid HTTP(S) URL",
                    "type": "validation_error"
                }
            })),
        ));
    }

    match create_mint(&state.db, request.clone()).await {
        Ok(mint) => {
            let currency_unit = mint
                .currency_unit
                .parse::<cdk::nuts::CurrencyUnit>()
                .unwrap_or(cdk::nuts::CurrencyUnit::Sat);
            if let Err(e) = wallet.add_mint(&mint.mint_url, currency_unit).await {
                eprintln!("Failed to add mint to wallet {}: {:?}", mint.mint_url, e);
            }
            Ok(Json(mint))
        }
        Err(e) => {
            eprintln!("Failed to create mint: {}", e);
            if e.to_string()
                .contains("duplicate key value violates unique constraint")
            {
                Err((
                    StatusCode::CONFLICT,
                    Json(json!({
                        "error": {
                            "message": "A mint with this URL already exists",
                            "type": "duplicate_error"
                        }
                    })),
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to create mint",
                            "type": "database_error"
                        }
                    })),
                ))
            }
        }
    }
}

pub async fn update_mint_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
    Json(request): Json<UpdateMintRequest>,
) -> Result<Json<Mint>, (StatusCode, Json<serde_json::Value>)> {
    match update_mint(&state.db, id, request).await {
        Ok(Some(mint)) => Ok(Json(mint)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Mint not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to update mint {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to update mint",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn delete_mint_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match delete_mint(&state.db, id).await {
        Ok(deleted) => {
            if deleted {
                Ok(Json(json!({
                    "success": true,
                    "message": "Mint deleted successfully"
                })))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Mint not found",
                            "type": "not_found"
                        }
                    })),
                ))
            }
        }
        Err(e) => {
            eprintln!("Failed to delete mint {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to delete mint",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn set_mint_active_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
    Json(request): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let is_active = request
        .get("is_active")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    match set_mint_active_status(&state.db, id, is_active).await {
        Ok(updated) => {
            if updated {
                Ok(Json(json!({
                    "success": true,
                    "message": format!("Mint {} successfully", if is_active { "activated" } else { "deactivated" })
                })))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Mint not found",
                            "type": "not_found"
                        }
                    })),
                ))
            }
        }
        Err(e) => {
            eprintln!("Failed to update mint active status {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to update mint status",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn topup_mint_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<TopupMintRequest>,
) -> Result<Json<TopupMintResponse>, (StatusCode, Json<serde_json::Value>)> {
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
    match payload.method.as_str() {
        "ecash" => {
            if let Some(token) = payload.token {
                let token_data = cdk::nuts::Token::from_str(&token).unwrap();
                let mint_exists_in_db =
                    match crate::db::mint::get_mint_by_url(&state.db, &payload.mint_url).await {
                        Ok(mint_option) => mint_option.is_some(),
                        Err(e) => {
                            eprintln!("Failed to check if mint exists in database: {:?}", e);
                            false
                        }
                    };

                if !mint_exists_in_db {
                    let create_request = crate::db::mint::CreateMintRequest {
                        mint_url: payload.mint_url.clone(),
                        currency_unit: Some(token_data.unit().unwrap().to_string()),
                        name: None,
                    };

                    if let Err(e) = crate::db::mint::create_mint(&state.db, create_request).await {
                        if !e
                            .to_string()
                            .contains("duplicate key value violates unique constraint")
                        {
                            eprintln!(
                                "Failed to save mint to database {}: {:?}",
                                payload.mint_url, e
                            );
                        }
                    }
                }

                let mint_exists_in_wallet = {
                    let mints = wallet.list_mints().await;
                    mints.contains(&payload.mint_url)
                };

                if !mint_exists_in_wallet {
                    if let Err(e) = wallet
                        .add_mint(
                            &payload.mint_url,
                            token_data.unit().unwrap_or(cdk::nuts::CurrencyUnit::Sat),
                        )
                        .await
                    {
                        eprintln!("Failed to add mint to wallet {}: {:?}", payload.mint_url, e);
                        return Err((
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(json!({
                                "error": {
                                    "message": format!("Failed to add mint to wallet {}: {}", payload.mint_url, e),
                                    "type": "mint_add_error"
                                }
                            })),
                        ));
                    }
                }

                if let Some(mint_wallet) = wallet.get_wallet_for_mint(&payload.mint_url).await {
                    match mint_wallet.receive(&token).await {
                        Ok(amount) => Ok(Json(TopupMintResponse {
                            success: true,
                            message: format!(
                                "Successfully topped up mint {} with {} {} from ecash token",
                                payload.mint_url,
                                amount,
                                token_data.unit().unwrap().to_string(),
                            ),
                            invoice: None,
                        })),
                        Err(e) => {
                            eprintln!("Failed to redeem ecash token with specific mint: {:?}", e);
                            let error_message =
                                get_user_friendly_wallet_error_message(&e.to_string());
                            Err((
                                StatusCode::BAD_REQUEST,
                                Json(json!({
                                    "error": {
                                        "message": error_message,
                                        "type": "redeem_error"
                                    }
                                })),
                            ))
                        }
                    }
                } else {
                    match wallet.receive(&token).await {
                        Ok(amount) => Ok(Json(TopupMintResponse {
                            success: true,
                            message: format!(
                                "Successfully topped up with {} {} from ecash token",
                                amount,
                                token_data.unit().unwrap().to_string(),
                            ),
                            invoice: None,
                        })),
                        Err(e) => {
                            eprintln!("Failed to redeem ecash token: {:?}", e);
                            let error_message =
                                get_user_friendly_wallet_error_message(&e.to_string());
                            Err((
                                StatusCode::BAD_REQUEST,
                                Json(json!({
                                    "error": {
                                        "message": format!("{}. Please ensure the token is from the correct mint ({})", error_message, payload.mint_url),
                                        "type": "redeem_error"
                                    }
                                })),
                            ))
                        }
                    }
                }
            } else {
                Err((
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": {
                            "message": "Token is required for ecash topup",
                            "type": "validation_error"
                        }
                    })),
                ))
            }
        }
        "lightning" => {
            // TODO: Implement lightning invoice generation
            Err((
                StatusCode::NOT_IMPLEMENTED,
                Json(json!({
                    "error": {
                        "message": "Lightning topup not yet implemented",
                        "type": "not_implemented"
                    }
                })),
            ))
        }
        _ => Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Invalid topup method. Use 'ecash' or 'lightning'",
                    "type": "validation_error"
                }
            })),
        )),
    }
}
