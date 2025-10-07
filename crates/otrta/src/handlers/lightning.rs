use crate::models::{AppState, TopupMintResponse, UserContext};
use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{self, json};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateLightningPaymentRequest {
    pub invoice: String,          // The BOLT11 invoice to pay
    pub amount: Option<u64>,      // Optional amount for amountless invoices
    pub mint_url: Option<String>, // Optional specific mint to use
}

#[derive(Deserialize)]
pub struct LightningPaymentStatus {
    pub quote_id: String,
    pub mint_url: String,
}

#[derive(Serialize)]
pub struct CreateLightningPaymentResponse {
    pub success: bool,
    pub quote_id: String,
    pub invoice_to_pay: String, // The original invoice we're paying
    pub amount: u64,
    pub fee_reserve: u64,
    pub expiry: u64,
    pub message: String,
    pub mint_url: String,
}

#[derive(Serialize)]
pub struct PaymentStatusResponse {
    pub quote_id: String,
    pub state: String,
    pub amount: u64,
}

#[derive(Serialize)]
pub struct PendingInvoicesResponse {
    pub invoices: Vec<PendingInvoiceInfo>,
}

#[derive(Serialize)]
pub struct PendingInvoiceInfo {
    pub quote_id: String,
    pub payment_request: String,
    pub amount: u64,
    pub mint_url: String,
    pub state: String,
    pub expiry: u64,
}

#[derive(Deserialize)]
pub struct CreateLightningInvoiceRequest {
    pub amount: u64,
    pub unit: Option<String>,
    pub mint_url: Option<String>,
    pub description: Option<String>,
}

#[derive(Serialize)]
pub struct CreateLightningInvoiceResponse {
    pub success: bool,
    pub quote_id: String,
    pub payment_request: String, // The BOLT11 invoice for others to pay
    pub amount: u64,
    pub expiry: u64,
    pub message: String,
    pub mint_url: String, // Include mint_url for enhanced payment status checking
}

pub async fn create_lightning_payment_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<CreateLightningPaymentRequest>,
) -> Result<Json<CreateLightningPaymentResponse>, (StatusCode, Json<serde_json::Value>)> {
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
    use cdk::Bolt11Invoice;
    use std::str::FromStr;

    eprintln!(
        "DEBUG: Received lightning payment request: invoice={}, amount={:?}, mint_url={:?}",
        payload.invoice.chars().take(20).collect::<String>(),
        payload.amount,
        payload.mint_url
    );

    // Parse the BOLT11 invoice that the user wants to pay
    let bolt11 = match Bolt11Invoice::from_str(&payload.invoice) {
        Ok(invoice) => invoice,
        Err(e) => {
            eprintln!("DEBUG: Failed to parse BOLT11 invoice: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": format!("Invalid BOLT11 invoice: {}", e),
                        "type": "validation_error"
                    }
                })),
            ));
        }
    };

    eprintln!(
        "DEBUG: Parsed BOLT11 invoice - amount: {:?}",
        bolt11.amount_milli_satoshis()
    );

    let wallet = if let Some(mint_url) = &payload.mint_url {
        match org_wallet.get_wallet_for_mint(mint_url).await {
            Some(wallet) => {
                eprintln!("DEBUG: Found wallet for specified mint");
                wallet
            }
            None => {
                eprintln!("DEBUG: No wallet found for specified mint: {}", mint_url);
                return Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": format!("No wallet found for mint: {}. Make sure this mint is added to your wallet.", mint_url),
                            "type": "wallet_not_found"
                        }
                    })),
                ));
            }
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": format!("No wallet found for mint: {:?}. Make sure this mint is added to your wallet.", payload.mint_url),
                    "type": "wallet_not_found"
                }
            })),
        ));
    };
    eprintln!("DEBUG: Creating melt quote for invoice");

    let melt_options = if bolt11.amount_milli_satoshis().is_none() {
        let amount = payload.amount.ok_or_else(|| {
            eprintln!("DEBUG: Amount required for amountless invoice but not provided");
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Amount required for amountless invoice",
                        "type": "validation_error"
                    }
                })),
            )
        })?;
        eprintln!("DEBUG: Using amountless options with {} sats", amount);
        Some(cdk::nuts::MeltOptions::new_mpp(amount))
    } else {
        eprintln!("DEBUG: Using default melt options (invoice has amount)");
        None
    };

    match wallet
        .melt_quote(payload.invoice.clone(), melt_options)
        .await
    {
        Ok(quote) => {
            eprintln!(
                "DEBUG: Successfully created melt quote: {} for {} sats",
                quote.id,
                u64::from(quote.amount)
            );

            Ok(Json(CreateLightningPaymentResponse {
                success: true,
                quote_id: quote.id,
                invoice_to_pay: payload.invoice,
                amount: quote.amount.into(),
                fee_reserve: quote.fee_reserve.into(),
                expiry: quote.expiry,
                message: format!(
                    "Payment quote created for {} sats (fee: {} sats)",
                    u64::from(quote.amount),
                    u64::from(quote.fee_reserve)
                ),
                mint_url: payload.mint_url.unwrap(),
            }))
        }
        Err(e) => {
            eprintln!("DEBUG: Failed to create melt quote: {:?}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to create lightning payment quote: {}", e),
                        "type": "lightning_error"
                    }
                })),
            ))
        }
    }
}

pub async fn check_lightning_payment_status_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(payload): Path<LightningPaymentStatus>,
) -> Result<Json<PaymentStatusResponse>, (StatusCode, Json<serde_json::Value>)> {
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

    let wallet = match org_wallet.get_wallet_for_mint(&payload.mint_url).await {
        Some(wallet) => {
            eprintln!("DEBUG: Found wallet for specified mint");
            wallet
        }
        None => {
            eprintln!(
                "DEBUG: No wallet found for specified mint: {}",
                payload.mint_url
            );
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": {
                        "message": format!("No wallet found for mint: {}. Make sure this mint is added to your wallet.", payload.mint_url),
                        "type": "wallet_not_found"
                    }
                })),
            ));
        }
    };

    wallet.check_mint_quote(&payload.quote_id).await.unwrap();

    Ok(Json(PaymentStatusResponse {
        quote_id: payload.quote_id.clone(),
        state: "pending".to_string(),
        amount: 0,
    }))
}

pub async fn check_lightning_payment_status_with_mint_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<LightningPaymentStatus>,
) -> Result<Json<PaymentStatusResponse>, (StatusCode, Json<serde_json::Value>)> {
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

    let wallet = match org_wallet.get_wallet_for_mint(&payload.mint_url).await {
        Some(wallet) => {
            eprintln!("DEBUG: Found wallet for specified mint");
            wallet
        }
        None => {
            eprintln!(
                "DEBUG: No wallet found for specified mint: {}",
                payload.mint_url
            );
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": {
                        "message": format!("No wallet found for mint: {}. Make sure this mint is added to your wallet.", payload.mint_url),
                        "type": "wallet_not_found"
                    }
                })),
            ));
        }
    };

    let status = wallet.check_mint_quote(&payload.quote_id).await.unwrap();

    Ok(Json(PaymentStatusResponse {
        quote_id: payload.quote_id.clone(),
        state: status.to_string(),
        amount: 0,
    }))
}

pub async fn complete_lightning_topup_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(quote_id): Path<String>,
) -> Result<Json<TopupMintResponse>, (StatusCode, Json<serde_json::Value>)> {
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
    use cdk::wallet::types::WalletKey;

    let unit = CurrencyUnit::Msat;

    // Try to execute the melt across all wallets
    let balances = match org_wallet.inner().cdk_wallet().get_balances(&unit).await {
        Ok(balances) => balances,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to get balances: {}", e),
                        "type": "wallet_error"
                    }
                })),
            ));
        }
    };

    for (mint_url, _) in balances {
        let wallet_key = WalletKey::new(mint_url, unit.clone());
        if let Some(wallet) = org_wallet
            .inner()
            .cdk_wallet()
            .get_wallet(&wallet_key)
            .await
        {
            // Try to execute the melt directly
            match wallet.melt(&quote_id).await {
                Ok(melt_result) => {
                    return Ok(Json(TopupMintResponse {
                        success: true,
                        message: format!(
                            "Lightning payment completed. Amount: {} sats, Fee: {} sats",
                            u64::from(melt_result.amount),
                            u64::from(melt_result.fee_paid)
                        ),
                        invoice: melt_result.preimage,
                    }));
                }
                Err(_) => {
                    // Continue to next wallet if this one doesn't have the quote
                    continue;
                }
            }
        }
    }

    Err((
        StatusCode::NOT_FOUND,
        Json(json!({
            "error": {
                "message": "Quote not found or payment failed",
                "type": "payment_error"
            }
        })),
    ))
}

pub async fn create_lightning_invoice_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(payload): Json<CreateLightningInvoiceRequest>,
) -> Result<Json<CreateLightningInvoiceResponse>, (StatusCode, Json<serde_json::Value>)> {
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
    eprintln!(
        "DEBUG: Create lightning invoice request - amount: {}, unit: {:?}, mint_url: {:?}, description: {:?}",
        payload.amount, payload.unit, payload.mint_url, payload.description
    );

    let wallet = if let Some(mint_url) = &payload.mint_url {
        match org_wallet.get_wallet_for_mint(mint_url).await {
            Some(wallet) => {
                eprintln!("DEBUG: Found wallet for specified mint");
                wallet
            }
            None => {
                eprintln!("DEBUG: No wallet found for specified mint: {}", mint_url);
                return Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": format!("No wallet found for mint: {}. Make sure this mint is added to your wallet.", mint_url),
                            "type": "wallet_not_found"
                        }
                    })),
                ));
            }
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": format!("No wallet found for mint: {:?}. Make sure this mint is added to your wallet.", payload.mint_url),
                    "type": "wallet_not_found"
                }
            })),
        ));
    };

    let mint_result = wallet
        .mint_quote(payload.amount, payload.description.clone())
        .await;

    let quote = match mint_result {
        Ok(quote) => {
            eprintln!("DEBUG: Successfully created mint quote with description");
            quote
        }
        Err(e) if e.to_string().contains("InvoiceDescriptionUnsupported") => {
            eprintln!("DEBUG: Description not supported, trying without description");
            match wallet.mint_quote(payload.amount, None).await {
                Ok(quote) => {
                    eprintln!("DEBUG: Successfully created mint quote without description");
                    quote
                }
                Err(e) => {
                    eprintln!(
                        "DEBUG: Failed to create mint quote even without description: {:?}",
                        e
                    );
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({
                            "error": {
                                "message": format!("Failed to create lightning invoice: {}", e),
                                "type": "lightning_error"
                            }
                        })),
                    ));
                }
            }
        }
        Err(e) => {
            eprintln!("DEBUG: Failed to create mint quote: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": format!("Failed to create lightning invoice: {}", e),
                        "type": "lightning_error"
                    }
                })),
            ));
        }
    };

    Ok(Json(CreateLightningInvoiceResponse {
        success: true,
        quote_id: quote.id,
        payment_request: quote.request,
        amount: payload.amount,
        expiry: quote.expiry,
        message: format!(
            "Lightning invoice created for {} {}",
            payload.amount,
            if let Some(desc) = &payload.unit {
                desc.to_string()
            } else {
                String::new()
            }
        ),
        mint_url: payload.mint_url.clone().unwrap_or_default(), // Include the mint_url used for the invoice
    }))
}

pub async fn check_lightning_payment_nwc(
    state: &Arc<AppState>,
    organization_id: &Uuid,
    quote_id: &str,
    mint_url: &str,
) -> Result<Json<PaymentStatusResponse>, (StatusCode, Json<serde_json::Value>)> {
    let org_wallet = match state
        .multimint_manager
        .get_or_create_multimint(organization_id)
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

    let wallet = match org_wallet.get_wallet_for_mint(mint_url).await {
        Some(wallet) => {
            eprintln!("DEBUG: Found wallet for specified mint");
            wallet
        }
        None => {
            eprintln!("DEBUG: No wallet found for specified mint: {}", mint_url);
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": {
                        "message": format!("No wallet found for mint: {}. Make sure this mint is added to your wallet.", mint_url),
                        "type": "wallet_not_found"
                    }
                })),
            ));
        }
    };

    let status = wallet.check_mint_quote(&quote_id).await.unwrap();

    Ok(Json(PaymentStatusResponse {
        quote_id: quote_id.to_string(),
        state: status.to_string(),
        amount: 0,
    }))
}
