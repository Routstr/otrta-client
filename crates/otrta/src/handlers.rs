use crate::{
    db::{
        credit::{get_credits, CreditListResponse},
        mint::{
            create_mint, delete_mint, get_active_mints, get_all_mints, get_mint_by_id,
            set_mint_active_status, update_mint, CreateMintRequest, Mint, MintListResponse,
            UpdateMintRequest,
        },
        models::{delete_all_models, get_all_models, models_to_proxy_models, upsert_model},
        provider::{
            create_custom_provider, delete_custom_provider, get_all_providers,
            get_default_provider, get_provider_by_id, refresh_providers_from_nostr,
            set_default_provider, CreateCustomProviderRequest, ProviderListResponse,
            RefreshProvidersResponse,
        },
        server_config::{create_config, get_default_config, update_config, ServerConfigRecord},
        transaction::{
            get_api_key_statistics, get_transactions, ApiKeyStatistics, TransactionListResponse,
        },
        Pool,
    },
    models::*,
    multimint::LocalMultimintSendOptions,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Response,
    Json,
};

use serde::Deserialize;
use serde_json::{self, json};
use std::{str::FromStr, sync::Arc};

fn get_user_friendly_wallet_error_message(error: &str) -> String {
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

pub async fn redeem_token(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Token>,
) -> Json<TokenRedeemResponse> {
    let token = payload.token.trim();
    println!("Attempting to redeem token: {}", token);

    let parsed_token = match cdk::nuts::Token::from_str(&token) {
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
        let configured_mints = state.wallet.list_mints().await;
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

        if let Some(wallet) = state
            .wallet
            .get_wallet_for_mint(&mint_url.to_string())
            .await
        {
            match wallet.receive(token).await {
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

    match state.wallet.receive(token).await {
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

#[derive(Deserialize)]
pub struct StatisticsParams {
    start_date: Option<String>,
    end_date: Option<String>,
}

pub async fn get_api_key_statistics_handler(
    State(state): State<Arc<AppState>>,
    Path(api_key_id): Path<String>,
    params: Query<StatisticsParams>,
) -> Result<Json<ApiKeyStatistics>, (StatusCode, Json<serde_json::Value>)> {
    let start_date = params.start_date.as_ref().and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|dt| dt.with_timezone(&chrono::Utc))
    });

    let end_date = params.end_date.as_ref().and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|dt| dt.with_timezone(&chrono::Utc))
    });

    match get_api_key_statistics(&state.db, &api_key_id, start_date, end_date).await {
        Ok(statistics) => Ok(Json(statistics)),
        Err(sqlx::Error::RowNotFound) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found or no statistics available",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to get API key statistics: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve statistics",
                        "type": "database_error"
                    }
                })),
            ))
        }
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
    println!("{:?}", payload.mint_url);

    // Parse the unit from the request, default to msat if not provided
    let unit = payload
        .unit
        .and_then(|u| u.parse::<crate::db::mint::CurrencyUnit>().ok())
        .unwrap_or(crate::db::mint::CurrencyUnit::Msat);

    // Convert amount to msat if needed (multimint wallet expects msat internally)
    let amount_in_msat = match unit {
        crate::db::mint::CurrencyUnit::Sat => payload.amount * 1000,
        crate::db::mint::CurrencyUnit::Msat => payload.amount,
    };

    match state
        .wallet
        .send(
            amount_in_msat as u64,
            LocalMultimintSendOptions {
                preferred_mint: Some(payload.mint_url),
                unit: Some(unit),
                ..Default::default()
            },
            &state.db,
            None,
        )
        .await
    {
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

async fn refresh_models_internal(db: &crate::db::Pool) -> Result<RefreshModelsResponse, String> {
    let server_config = if let Ok(Some(config)) = get_default_provider(&db).await {
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

    let deleted_count = match delete_all_models(&db).await {
        Ok(count) => count,
        Err(e) => {
            eprintln!("Failed to delete existing models: {}", e);
            return Err("Failed to delete existing models".to_string());
        }
    };

    let mut models_added = 0;

    for proxy_model in &proxy_models_data.data {
        match upsert_model(&db, &proxy_model).await {
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

pub async fn set_provider_default(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    match set_default_provider(&state.db, id).await {
        Ok(_) => {
            if let Err(e) = refresh_models_internal(&state.db).await {
                eprintln!(
                    "Warning: Failed to refresh models after setting default provider: {}",
                    e
                );
            }

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

// Mint management handlers

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
    Json(request): Json<CreateMintRequest>,
) -> Result<Json<Mint>, (StatusCode, Json<serde_json::Value>)> {
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
                .parse::<crate::db::mint::CurrencyUnit>()
                .unwrap_or(crate::db::mint::CurrencyUnit::Sat);
            if let Err(e) = state.wallet.add_mint(&mint.mint_url, currency_unit).await {
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

// TODO: Multimint wallet handlers will be added in the next step
// These will require integrating with the MultimintWallet from the MULTIMINT_USAGE.md

pub async fn get_multimint_balance_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<MultimintBalanceResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Get complete multimint balance information
    let multimint_balance = match state.wallet.get_total_balance().await {
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
    Json(payload): Json<MultimintSendTokenRequest>,
) -> Result<Json<MultimintSendTokenResponse>, (StatusCode, Json<serde_json::Value>)> {
    let unit = payload
        .unit
        .and_then(|u| u.parse::<crate::db::mint::CurrencyUnit>().ok());
    let send_options = crate::multimint::LocalMultimintSendOptions {
        preferred_mint: payload.preferred_mint,
        unit,
        split_across_mints: payload.split_across_mints.unwrap_or(false),
    };

    match state
        .wallet
        .send(payload.amount, send_options, &state.db, None)
        .await
    {
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
    Json(payload): Json<TransferBetweenMintsRequest>,
) -> Result<Json<TransferBetweenMintsResponse>, (StatusCode, Json<serde_json::Value>)> {
    let configured_mints = state.wallet.list_mints().await;

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

    match state
        .wallet
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

pub async fn topup_mint_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TopupMintRequest>,
) -> Result<Json<TopupMintResponse>, (StatusCode, Json<serde_json::Value>)> {
    match payload.method.as_str() {
        "ecash" => {
            if let Some(token) = payload.token {
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
                        currency_unit: Some(crate::db::mint::CurrencyUnit::Sat.to_string()),
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
                    let mints = state.wallet.list_mints().await;
                    mints.contains(&payload.mint_url)
                };

                if !mint_exists_in_wallet {
                    if let Err(e) = state
                        .wallet
                        .add_mint(&payload.mint_url, crate::db::mint::CurrencyUnit::Sat)
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

                if let Some(wallet) = state.wallet.get_wallet_for_mint(&payload.mint_url).await {
                    match wallet.receive(&token).await {
                        Ok(amount) => Ok(Json(TopupMintResponse {
                            success: true,
                            message: format!(
                                "Successfully topped up mint {} with {} msats from ecash token",
                                payload.mint_url, amount
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
                    match state.wallet.receive(&token).await {
                        Ok(amount) => Ok(Json(TopupMintResponse {
                            success: true,
                            message: format!(
                                "Successfully topped up with {} msats from ecash token",
                                amount
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

pub async fn get_all_api_keys_handler(
    State(state): State<Arc<AppState>>,
    params: Query<PaginationParams>,
) -> Result<Json<crate::db::api_keys::ApiKeyListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    match crate::db::api_keys::get_all_api_keys(&state.db, None, page, page_size).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            eprintln!("Error getting API keys: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to get API keys",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_api_key_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<crate::db::api_keys::ApiKey>, (StatusCode, Json<serde_json::Value>)> {
    match crate::db::api_keys::get_api_key_by_id(&state.db, &id).await {
        Ok(Some(api_key)) => Ok(Json(api_key)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Error getting API key: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to get API key",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}

pub async fn create_api_key_handler(
    State(state): State<Arc<AppState>>,
    Json(request): Json<crate::db::api_keys::CreateApiKeyRequest>,
) -> Result<Json<crate::db::api_keys::ApiKey>, (StatusCode, Json<serde_json::Value>)> {
    if request.name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "API key name is required",
                    "type": "validation_error"
                }
            })),
        ));
    }

    if request.user_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "User ID is required",
                    "type": "validation_error"
                }
            })),
        ));
    }

    if request.organization_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Organization ID is required",
                    "type": "validation_error"
                }
            })),
        ));
    }

    match crate::db::api_keys::create_api_key(&state.db, request).await {
        Ok(api_key) => Ok(Json(api_key)),
        Err(e) => {
            eprintln!("Error creating API key: {}", e);
            if e.to_string().contains("unique constraint") {
                Err((
                    StatusCode::CONFLICT,
                    Json(json!({
                        "error": {
                            "message": "API key already exists",
                            "type": "conflict"
                        }
                    })),
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to create API key",
                            "type": "internal_server_error"
                        }
                    })),
                ))
            }
        }
    }
}

pub async fn update_api_key_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(request): Json<crate::db::api_keys::UpdateApiKeyRequest>,
) -> Result<Json<crate::db::api_keys::ApiKey>, (StatusCode, Json<serde_json::Value>)> {
    match crate::db::api_keys::update_api_key(&state.db, &id, request).await {
        Ok(Some(api_key)) => Ok(Json(api_key)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Error updating API key: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to update API key",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}

pub async fn delete_api_key_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match crate::db::api_keys::delete_api_key(&state.db, &id).await {
        Ok(true) => Ok(Json(json!({
            "message": "API key deleted successfully"
        }))),
        Ok(false) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Error deleting API key: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to delete API key",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}

pub async fn signup_handler(
    State(app_state): State<Arc<AppState>>,
    Json(request): Json<SignupRequest>,
) -> Result<Json<SignupResponse>, (StatusCode, Json<serde_json::Value>)> {
    use crate::db::{users, organizations};

    if let Err(validation_error) = users::validate_npub(&request.npub) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "validation_error",
                "message": validation_error.to_string(),
                "type": "validation_error"
            })),
        ));
    }

    if users::user_exists(&app_state.db, &request.npub).await.unwrap_or(false) {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({
                "error": "user_already_exists",
                "message": "User with this npub already exists",
                "type": "conflict"
            })),
        ));
    }

    let create_user_request = crate::models::CreateUserRequest {
        npub: request.npub.clone(),
        display_name: request.display_name.clone(),
        email: request.email.clone(),
    };

    let user = match users::create_user(&app_state.db, &create_user_request).await {
        Ok(user) => user,
        Err(e) => {
            tracing::error!("Failed to create user: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "user_creation_failed",
                    "message": "Failed to create user",
                    "type": "internal_server_error"
                })),
            ));
        }
    };

    let org_name = request.organization_name.unwrap_or_else(|| {
        format!("{}'s Organization", request.display_name.as_deref().unwrap_or("User"))
    });

    let create_org_request = crate::models::CreateOrganizationRequest {
        name: org_name,
        owner_npub: request.npub.clone(),
    };

    let organization = match organizations::create_organization(&app_state.db, &create_org_request).await {
        Ok(org) => org,
        Err(e) => {
            tracing::error!("Failed to create organization: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "organization_creation_failed", 
                    "message": "Failed to create organization",
                    "type": "internal_server_error"
                })),
            ));
        }
    };

    Ok(Json(SignupResponse {
        success: true,
        user,
        organization,
        message: Some("User and organization created successfully".to_string()),
    }))
}

pub async fn get_user_profile_handler(
    State(app_state): State<Arc<AppState>>,
    Path(npub): Path<String>,
) -> Result<Json<User>, (StatusCode, Json<serde_json::Value>)> {
    use crate::db::users;

    let user = match users::get_user_by_npub(&app_state.db, &npub).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": "user_not_found",
                    "message": "User not found",
                    "type": "not_found"
                })),
            ));
        }
        Err(e) => {
            tracing::error!("Failed to get user: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "get_user_failed",
                    "message": "Failed to get user",
                    "type": "internal_server_error"
                })),
            ));
        }
    };

    Ok(Json(user))
}

pub async fn get_user_organizations_handler(
    State(app_state): State<Arc<AppState>>,
    Path(npub): Path<String>,
) -> Result<Json<Vec<Organization>>, (StatusCode, Json<serde_json::Value>)> {
    use crate::db::organizations;

    let organizations = match organizations::get_organizations_by_owner(&app_state.db, &npub).await {
        Ok(orgs) => orgs,
        Err(e) => {
            tracing::error!("Failed to get user organizations: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "get_organizations_failed",
                    "message": "Failed to get user organizations",
                    "type": "internal_server_error"
                })),
            ));
        }
    };

    Ok(Json(organizations))
}
