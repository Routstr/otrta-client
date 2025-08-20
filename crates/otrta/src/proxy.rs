use crate::{
    db::{
        api_keys::get_api_key_by_id,
        mint::{get_mint_by_url, get_mint_by_url_for_organization},
        models::get_model,
        provider::{get_default_provider, get_default_provider_for_organization_new},
        transaction::{add_transaction, TransactionDirection, TransactionType},
        Pool,
    },
    models::*,
    onion::{
        configure_client_with_tor_proxy, construct_url_with_protocol, get_onion_error_message,
        log_onion_timing, start_onion_timing,
    },
    wallet::send_with_retry,
};
use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::io;
use std::sync::Arc;
use uuid::Uuid;

#[derive(serde::Deserialize)]
struct OpenAIRequest {
    model: String,
    #[serde(flatten)]
    _other: serde_json::Value,
}

async fn redeem_token_on_error(
    state: &Arc<AppState>,
    org_id: &Uuid,
    token: &str,
    mint_url: &str,
    mint_currency_unit: &str,
    api_key_id: Option<&str>,
    user_id: Option<&str>,
    transaction_type: TransactionType,
    provider_url: &str,
    model_name: Option<&str>,
    status: StatusCode,
) {
    let wallet = match state
        .multimint_manager
        .get_or_create_multimint(org_id)
        .await
    {
        Ok(wallet) => wallet,
        Err(e) => {
            eprintln!(
                "Failed to get wallet for token redemption: mint={}, error={}",
                mint_url, e
            );
            return;
        }
    };

    let receive_result = wallet.receive(token).await.map_err(|e| e.to_string());

    match receive_result {
        Ok(res) => {
            eprintln!(
                "Redeemed original token after error response: mint={}, amount={}, status={}",
                mint_url, res, status
            );
            if let Err(e) = add_transaction(
                &state.db,
                token,
                &res,
                TransactionDirection::Incoming,
                api_key_id,
                user_id,
                transaction_type,
                Some(provider_url),
                Some(mint_currency_unit),
                model_name,
            )
            .await
            {
                eprintln!(
                    "Failed to record redemption transaction: mint={}, error={}",
                    mint_url, e
                );
            }
        }
        Err(e) => {
            eprintln!(
                "Failed to redeem original token after error response: mint={}, status={}, error={}",
                mint_url, status, e
            );
        }
    }
}

pub async fn forward_any_request_get(
    Path(path): Path<String>,
    State(state): State<Arc<AppState>>,
    request: Request,
) -> Response<Body> {
    let (parts, _) = request.into_parts();
    let api_key_id = parts.extensions.get::<String>().map(|s| s.as_str());
    forward_request(&state.db, &path, None, api_key_id)
        .await
        .into_response()
}

pub async fn forward_any_request(
    Path(path): Path<String>,
    State(state): State<Arc<AppState>>,
    request: Request,
) -> Response<Body> {
    let (parts, body) = request.into_parts();
    let api_key_id = parts.extensions.get::<String>().map(|s| s.as_str());
    let user_context = parts.extensions.get::<UserContext>();
    let headers = parts.headers;

    let body_bytes = match axum::body::to_bytes(body, usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => return (StatusCode::BAD_REQUEST, "Failed to read request body").into_response(),
    };

    let body_data: serde_json::Value = match serde_json::from_slice(&body_bytes) {
        Ok(data) => data,
        Err(_) => serde_json::Value::Null,
    };

    let (user_id, transaction_type) = if let Some(user_ctx) = user_context {
        (Some(user_ctx.npub.as_str()), TransactionType::Chat)
    } else {
        (None, TransactionType::Api)
    };

    forward_request_with_payment_with_body(
        headers,
        &state,
        &path,
        Some(body_data),
        false,
        api_key_id,
        None, // organization_id - will be derived from api_key_id
        user_id,
        transaction_type,
    )
    .await
}

pub async fn forward_request_with_payment_with_body<T: serde::Serialize>(
    original_headers: HeaderMap,
    state: &Arc<AppState>,
    path: &str,
    body: Option<T>,
    is_streaming: bool,
    api_key_id: Option<&str>,
    organization_id: Option<&Uuid>,
    user_id: Option<&str>,
    transaction_type: TransactionType,
) -> Response<Body> {
    let org_id = if let Some(org_id) = organization_id {
        *org_id
    } else if let Some(api_key_id) = api_key_id {
        match get_api_key_by_id(&state.db, api_key_id).await {
            Ok(Some(api_key)) => match Uuid::parse_str(&api_key.organization_id) {
                Ok(id) => id,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": {
                                "message": "Invalid organization ID in API key",
                                "type": "validation_error",
                                "code": "invalid_organization_id"
                            }
                        })),
                    )
                        .into_response();
                }
            },
            Ok(None) => {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "error": {
                            "message": "API key not found",
                            "type": "authentication_error",
                            "code": "api_key_not_found"
                        }
                    })),
                )
                    .into_response();
            }
            Err(_) => {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "error": {
                            "message": "Failed to retrieve API key",
                            "type": "authentication_error",
                            "code": "api_key_lookup_failed"
                        }
                    })),
                )
                    .into_response();
            }
        }
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Either API key or organization ID must be provided",
                    "type": "authentication_error",
                    "code": "missing_auth_info"
                }
            })),
        )
            .into_response();
    };

    // Get the default provider for the organization, with fallback to global default
    let server_config = match get_default_provider_for_organization_new(&state.db, &org_id).await {
        Ok(Some(config)) => config,
        Ok(None) => {
            // Fallback to global default provider if organization doesn't have one configured
            match get_default_provider(&state.db).await {
                Ok(Some(config)) => config,
                Ok(None) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": {
                                "message": "No default provider configured. Please configure a provider first.",
                                "type": "configuration_error",
                                "param": null,
                                "code": "default_provider_missing"
                            }
                        })),
                    ).into_response();
                }
                Err(e) => {
                    eprintln!("Failed to get global default provider: {}", e);
                    return (
                        StatusCode::SERVICE_UNAVAILABLE,
                        Json(json!({
                            "error": {
                                "message": "Provider service unavailable",
                                "type": "provider_error",
                                "code": "provider_lookup_failed"
                            }
                        })),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            eprintln!(
                "Failed to get default provider for organization {}: {}",
                org_id, e
            );
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": {
                        "message": "Provider service unavailable",
                        "type": "provider_error",
                        "code": "provider_lookup_failed"
                    }
                })),
            )
                .into_response();
        }
    };

    let endpoint_url = construct_url_with_protocol(&server_config.url, path);
    println!("Constructed proxy endpoint URL: {}", endpoint_url);

    let timeout_secs = if is_streaming { 300 } else { 60 }; // 5 min for streaming, 1 min for regular
    let mut client = match crate::onion::create_onion_client(
        &endpoint_url,
        server_config.use_onion,
        Some(timeout_secs),
    ) {
        Ok(client) => client,
        Err(e) => {
            eprintln!("Failed to create client with Tor proxy: {}", e);
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({
                    "error": {
                        "message": "Failed to configure client for .onion request",
                        "type": "proxy_error",
                        "code": "tor_proxy_configuration_failed"
                    }
                })),
            )
                .into_response();
        }
    };

    // For streaming requests with onion services, we need to handle connection pooling differently
    if is_streaming && server_config.use_onion && endpoint_url.contains(".onion") {
        // For onion streaming, create a fresh client without connection pooling
        let mut client_builder = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .pool_max_idle_per_host(1); // Allow minimal pooling for onion services

        // Configure Tor proxy for streaming onion requests
        client_builder = match configure_client_with_tor_proxy(
            client_builder,
            &endpoint_url,
            server_config.use_onion,
        ) {
            Ok(builder) => builder,
            Err(e) => {
                eprintln!("Failed to configure Tor proxy for streaming: {}", e);
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({
                        "error": {
                            "message": "Failed to configure Tor proxy for streaming .onion request",
                            "type": "proxy_error",
                            "code": "tor_streaming_configuration_failed"
                        }
                    })),
                )
                    .into_response();
            }
        };

        client = client_builder.build().unwrap();
    }

    let mut req_builder = if body.is_some() {
        client.post(&endpoint_url)
    } else {
        client.get(&endpoint_url)
    };

    let model_name = if let Some(body_data) = &body {
        if let Ok(openai_request) = serde_json::from_value::<OpenAIRequest>(
            serde_json::to_value(body_data).unwrap_or_default(),
        ) {
            Some(openai_request.model)
        } else {
            None
        }
    } else {
        None
    };

    let model = if let Some(ref model_name) = model_name {
        (get_model(&state.db, model_name).await).unwrap_or_default()
    } else {
        eprintln!("No model name provided in request");
        None
    };

    let is_free_model = match model.clone() {
        Some(model) => model.is_free,
        None => false,
    };

    eprintln!(
        "Processing request for model: {:?}, is_free: {}, cost_msats: {}",
        model_name,
        is_free_model,
        match model {
            Some(ref model) => model.min_cash_per_request,
            None => state.default_msats_per_request as i64,
        }
    );

    if let Some(body_data) = body {
        req_builder = req_builder.json(&body_data);
    }

    let cost_msats = match model {
        Some(model) => model
            .min_cost_per_request
            .unwrap_or_else(|| state.default_msats_per_request as i64),
        None => state.default_msats_per_request as i64,
    };

    if server_config.mints.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "No active mints configured for this provider",
                    "type": "configuration_error",
                    "code": "no_active_mints"
                }
            })),
        )
            .into_response();
    };

    // Helper function to get mint info and sort by priority (msat first)
    async fn get_sorted_mints_with_info(
        db: &crate::db::Pool,
        mint_urls: &[String],
        org_id: &uuid::Uuid,
    ) -> Vec<(String, String)> {
        let mut mints_with_units = Vec::new();

        for mint_url in mint_urls {
            let currency_unit = match get_mint_by_url_for_organization(db, mint_url, org_id).await {
                Ok(Some(mint)) => mint.currency_unit,
                Ok(None) => {
                    match get_mint_by_url(db, mint_url).await {
                        Ok(Some(mint)) => mint.currency_unit,
                        Ok(None) => {
                            eprintln!("Mint not found for URL: {} (neither organization-specific nor global)", mint_url);
                            "msat".to_string()
                        }
                        Err(e) => {
                            eprintln!(
                                "Error fetching global mint info for URL: {}: {}",
                                mint_url, e
                            );
                            "msat".to_string()
                        }
                    }
                }
                Err(e) => {
                    eprintln!(
                        "Error fetching mint info for URL: {} and organization: {}: {}",
                        mint_url, org_id, e
                    );
                    "msat".to_string()
                }
            };
            mints_with_units.push((mint_url.clone(), currency_unit));
        }

        // Sort mints: msat first, then sat
        mints_with_units.sort_by(|a, b| match (a.1.as_str(), b.1.as_str()) {
            ("msat", "sat") => std::cmp::Ordering::Less,
            ("sat", "msat") => std::cmp::Ordering::Greater,
            _ => std::cmp::Ordering::Equal,
        });

        mints_with_units
    }

    let sorted_mints = get_sorted_mints_with_info(&state.db, &server_config.mints, &org_id).await;
    if sorted_mints.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "No valid mints found for this provider",
                    "type": "configuration_error",
                    "code": "no_valid_mints"
                }
            })),
        )
            .into_response();
    }

    // Start with the first (highest priority) mint for initial cost calculation
    let (initial_mint_url, initial_mint_currency_unit) = sorted_mints.first().unwrap();
    let mut mint_url = initial_mint_url.clone();
    let mut mint_currency_unit = initial_mint_currency_unit.clone();

    let cost = if mint_currency_unit == "sat" {
        (cost_msats + 999) / 1000
    } else {
        cost_msats
    };

    eprintln!(
        "Cost calculation: model={:?}, cost_msats={}, mint_unit={}, final_cost={}, available_mints={}",
        model_name, cost_msats, mint_currency_unit, cost, sorted_mints.len()
    );

    let token = if is_free_model {
        eprintln!(
            "Recording free model transaction: model={:?}, provider={}, user={:?}",
            model_name, server_config.url, user_id
        );
        add_transaction(
            &state.db,
            "",
            "0",
            TransactionDirection::Outgoing,
            api_key_id,
            user_id,
            transaction_type.clone(),
            Some(&server_config.url),
            Some(&mint_currency_unit),
            model_name.as_deref(),
        )
        .await
        .unwrap_or_else(|e| {
            eprintln!("Failed to record free model transaction: {}", e);
            uuid::Uuid::new_v4()
        });
        String::new()
    } else {
        let wallet = match state
            .multimint_manager
            .get_or_create_multimint(&org_id)
            .await
        {
            Ok(wallet) => wallet,
            Err(e) => {
                eprintln!(
                    "Failed to get organization wallet for org {}: {}",
                    org_id, e
                );
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": {
                            "message": "No active mints configured",
                            "type": "wallet_error",
                            "code": "no_active_mints"
                        }
                    })),
                )
                    .into_response();
            }
        };

        // Try each mint in priority order until payment succeeds
        let mut successful_mint_url = None;
        let mut successful_currency_unit = None;
        let mut _final_cost = 0;
        let mut token = String::new();
        let mut _last_error = None;

        for (current_mint_url, current_currency_unit) in &sorted_mints {
            let current_cost = if current_currency_unit == "sat" {
                (cost_msats + 999) / 1000
            } else {
                cost_msats
            };

            eprintln!(
                "Attempting payment with mint: {}, unit: {}, cost: {}",
                current_mint_url, current_currency_unit, current_cost
            );

            let token_result = send_with_retry(
                &wallet,
                current_cost,
                current_mint_url,
                Some(3),
                &state.db,
                api_key_id,
                user_id,
                Some(&server_config.url),
                Some(current_currency_unit),
                model_name.as_deref(),
            )
            .await;

            match token_result {
                Ok(success_token) => {
                    eprintln!(
                        "Payment successful with mint: {}, unit: {}, cost: {}",
                        current_mint_url, current_currency_unit, current_cost
                    );
                    successful_mint_url = Some(current_mint_url.clone());
                    successful_currency_unit = Some(current_currency_unit.clone());
                    _final_cost = current_cost;
                    token = success_token;
                    break;
                }
                Err(e) => {
                    eprintln!(
                        "Payment failed with mint: {}, unit: {}, cost: {}, error: {:?}",
                        current_mint_url, current_currency_unit, current_cost, e
                    );
                    _last_error = Some(e);
                    continue;
                }
            }
        }

        // If no mint succeeded, handle the failure
        if successful_mint_url.is_none() {
            eprintln!(
                "All mints exhausted. Payment token generation failed for model: {:?}, tried {} mints",
                model_name, sorted_mints.len()
            );

            // If the model should be free or cost is 0, continue without payment
            if is_free_model || cost == 0 {
                eprintln!("Model is free or zero cost, proceeding without payment token");
                token = String::new();
            } else {
                return (
                    StatusCode::PAYMENT_REQUIRED,
                    Json(json!({
                        "error": {
                            "message": "Insufficient funds across all available mints",
                            "type": "payment_error",
                            "code": "insufficient_funds_all_mints",
                            "details": {
                                "model": model_name,
                                "cost_msats": cost_msats,
                                "mints_tried": sorted_mints.len(),
                                "mints": sorted_mints.iter().map(|(url, unit)| {
                                    json!({
                                        "url": url,
                                        "currency_unit": unit,
                                        "cost": if unit == "sat" { (cost_msats + 999) / 1000 } else { cost_msats }
                                    })
                                }).collect::<Vec<_>>()
                            }
                        }
                    })),
                )
                    .into_response();
            }
        } else {
            // Update the variables for successful payment
            mint_url = successful_mint_url.unwrap();
            mint_currency_unit = successful_currency_unit.unwrap();

            eprintln!(
                "Final payment successful: mint={}, unit={}, cost={}",
                mint_url, mint_currency_unit, _final_cost
            );
        }

        token
    };

    req_builder = req_builder.header(header::CONTENT_TYPE, "application/json");

    if !token.is_empty() {
        req_builder = req_builder.header("X-Cashu", &token);
    }

    if let Some(accept) = original_headers.get(header::ACCEPT) {
        req_builder = req_builder.header(header::ACCEPT, accept);
    }

    let start_time = start_onion_timing(&endpoint_url);

    let response = if let Ok(resp) = req_builder.send().await {
        log_onion_timing(start_time, &endpoint_url, "proxy");
        let status = resp.status();
        let headers = resp.headers().clone();

        if status != StatusCode::OK {
            if let Some(change_sats) = headers.get("X-Cashu") {
                if let Ok(in_token) = change_sats.to_str() {
                    let wallet = match state
                        .multimint_manager
                        .get_or_create_multimint(&org_id)
                        .await
                    {
                        Ok(wallet) => wallet,
                        Err(_) => {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(json!({
                                    "error": {
                                        "message": "No active mints configured",
                                        "type": "wallet_error",
                                        "code": "no_active_mints"
                                    }
                                })),
                            )
                                .into_response()
                        }
                    };

                    let receive_result = wallet.receive(in_token).await.map_err(|e| e.to_string());

                    match receive_result {
                        Ok(res) => {
                            eprintln!("Received change token: amount={}", res);
                            if let Err(e) = add_transaction(
                                &state.db,
                                in_token,
                                &res,
                                TransactionDirection::Incoming,
                                api_key_id,
                                user_id,
                                transaction_type.clone(),
                                Some(&server_config.url),
                                Some(&mint_currency_unit),
                                model_name.as_deref(),
                            )
                            .await
                            {
                                eprintln!("Failed to record change token transaction: {}", e);
                            }
                        }
                        Err(e) => {
                            eprintln!("Failed to receive change token: {}", e);
                        }
                    }
                }
            } else if !token.is_empty() && !is_free_model {
                redeem_token_on_error(
                    &state,
                    &org_id,
                    &token,
                    &mint_url,
                    &mint_currency_unit,
                    api_key_id,
                    user_id,
                    transaction_type.clone(),
                    &server_config.url,
                    model_name.as_deref(),
                    status,
                )
                .await;
            }
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "server error",
                        "type": "server_serror",
                        "code": "server_error"
                    }
                })),
            )
                .into_response();
        }

        let mut response = Response::builder().status(status);

        if is_streaming && !headers.contains_key(header::CONTENT_TYPE) {
            response = response.header(header::CONTENT_TYPE, "text/event-stream");
        }

        if let Some(change_sats) = headers.get("X-Cashu") {
            if let Ok(in_token) = change_sats.to_str() {
                let wallet = match state
                    .multimint_manager
                    .get_or_create_multimint(&org_id)
                    .await
                {
                    Ok(wallet) => wallet,
                    Err(_) => {
                        return (
                            StatusCode::BAD_REQUEST,
                            Json(json!({
                                "error": {
                                    "message": "No active mints configured",
                                    "type": "wallet_error",
                                    "code": "no_active_mints"
                                }
                            })),
                        )
                            .into_response()
                    }
                };

                let receive_result = wallet.receive(in_token).await.map_err(|e| e.to_string());

                match receive_result {
                    Ok(res) => {
                        eprintln!(
                            "Received change token on successful response: amount={}",
                            res
                        );
                        if let Err(e) = add_transaction(
                            &state.db,
                            in_token,
                            &res,
                            TransactionDirection::Incoming,
                            api_key_id,
                            user_id,
                            transaction_type.clone(),
                            Some(&server_config.url),
                            Some(&mint_currency_unit),
                            model_name.as_deref(),
                        )
                        .await
                        {
                            eprintln!(
                                "Failed to record successful change token transaction: {}",
                                e
                            );
                        }
                    }
                    Err(e) => {
                        eprintln!(
                            "Failed to receive change token on successful response: {}",
                            e
                        );
                    }
                }
            }
        }

        let response_headers = response.headers_mut().unwrap();
        for (name, value) in headers.iter() {
            if name != "connection" && name != "transfer-encoding" {
                response_headers.insert(name, value.clone());
            }
        }

        let stream = resp.bytes_stream().map(|result| {
            result.map_err(|e| io::Error::other(format!("Error reading from upstream: {}", e)))
        });

        let body = Body::from_stream(stream);

        return response.body(body).unwrap_or_else(|e| {
            let state_clone = state.clone();
            let org_id_clone = org_id;
            tokio::spawn(async move {
                if let Ok(wallet) = state_clone
                    .multimint_manager
                    .get_or_create_multimint(&org_id_clone)
                    .await
                {
                    if let Err(err) = wallet.redeem_pendings().await {
                        eprintln!("Error redeeming pendings: {:?}", err);
                    }
                }
            });

            eprintln!("Error creating streaming response: {}", e);
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from("{\"error\":{\"message\":\"Error creating streaming response\",\"type\":\"streaming_error\",\"code\":\"stream_creation_failed\"}}".to_string()))
                .unwrap()
        });
    } else {
        let wallet = match state
            .multimint_manager
            .get_or_create_multimint(&org_id)
            .await
        {
            Ok(wallet) => wallet,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": {
                            "message": "No active mints configured",
                            "type": "wallet_error",
                            "code": "no_active_mints"
                        }
                    })),
                )
                    .into_response()
            }
        };

        let receive_result = wallet.receive(&token).await.map_err(|e| e.to_string());

        match receive_result {
            Ok(res) => {
                eprintln!(
                    "Token redemption after failed request: mint={}, amount={}",
                    mint_url, res
                );
                if let Err(e) = add_transaction(
                    &state.db,
                    &token,
                    &res,
                    TransactionDirection::Incoming,
                    api_key_id,
                    user_id,
                    transaction_type,
                    Some(&server_config.url),
                    Some(&mint_currency_unit),
                    model_name.as_deref(),
                )
                .await
                {
                    eprintln!(
                        "Failed to record failed request redemption transaction: {}",
                        e
                    );
                }
            }
            Err(e) => {
                eprintln!(
                    "Failed to redeem token after failed request: mint={}, error={}",
                    mint_url, e
                );
            }
        }
        let error_json = Json(json!({
            "error": {
                "message": "Error forwarding request to provider",
                "type": "gateway_error",
                "code": "request_forwarding_failed"
            }
        }));
        (StatusCode::BAD_GATEWAY, error_json).into_response()
    };

    response
}

pub async fn forward_request(
    db: &Pool,
    path: &str,
    organization_id: Option<&Uuid>,
    api_key_id: Option<&str>,
) -> Response<Body> {
    let org_id = if let Some(org_id) = organization_id {
        *org_id
    } else if let Some(api_key_id) = api_key_id {
        match get_api_key_by_id(db, api_key_id).await {
            Ok(Some(api_key)) => match Uuid::parse_str(&api_key.organization_id) {
                Ok(id) => id,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": {
                                "message": "Invalid organization ID in API key",
                                "type": "validation_error",
                                "code": "invalid_organization_id"
                            }
                        })),
                    )
                        .into_response();
                }
            },
            Ok(None) => {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "error": {
                            "message": "API key not found",
                            "type": "authentication_error",
                            "code": "api_key_not_found"
                        }
                    })),
                )
                    .into_response();
            }
            Err(_) => {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "error": {
                            "message": "Failed to retrieve API key",
                            "type": "authentication_error",
                            "code": "api_key_lookup_failed"
                        }
                    })),
                )
                    .into_response();
            }
        }
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Either API key or organization ID must be provided",
                    "type": "authentication_error",
                    "code": "missing_auth_info"
                }
            })),
        )
            .into_response();
    };

    let server_config = match get_default_provider_for_organization_new(db, &org_id).await {
        Ok(Some(config)) => config,
        Ok(None) => {
            // Fallback to global default provider if organization doesn't have one configured
            match get_default_provider(db).await {
                Ok(Some(config)) => config,
                Ok(None) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": {
                                "message": "No default provider configured. Please configure a provider first.",
                                "type": "configuration_error",
                                "param": null,
                                "code": "default_provider_missing"
                            }
                        })),
                    ).into_response();
                }
                Err(e) => {
                    eprintln!("Failed to get global default provider: {}", e);
                    return (
                        StatusCode::SERVICE_UNAVAILABLE,
                        Json(json!({
                            "error": {
                                "message": "Provider service unavailable",
                                "type": "provider_error",
                                "code": "provider_lookup_failed"
                            }
                        })),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            eprintln!(
                "Failed to get default provider for organization {}: {}",
                org_id, e
            );
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": {
                        "message": "Provider service unavailable",
                        "type": "provider_error",
                        "code": "provider_lookup_failed"
                    }
                })),
            )
                .into_response();
        }
    };

    let endpoint_url = construct_url_with_protocol(&server_config.url, path);
    println!("Constructed forward_request endpoint URL: {}", endpoint_url);

    let timeout_secs = 60; // 1 min for regular requests
    let client = match crate::onion::create_onion_client(
        &endpoint_url,
        server_config.use_onion,
        Some(timeout_secs),
    ) {
        Ok(client) => client,
        Err(e) => {
            eprintln!("Failed to create client with Tor proxy: {}", e);
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({
                    "error": {
                        "message": "Failed to configure client for .onion request",
                        "type": "proxy_error",
                        "code": "tor_proxy_configuration_failed"
                    }
                })),
            )
                .into_response();
        }
    };

    let mut req_builder = client.get(&endpoint_url);
    req_builder = req_builder.header(header::CONTENT_TYPE, "application/json");

    let start_time = start_onion_timing(&endpoint_url);

    match req_builder.send().await {
        Ok(resp) => {
            log_onion_timing(start_time, &endpoint_url, "forward_request");
            let status = resp.status();
            let response = Response::builder().status(status);

            match resp.bytes().await {
                Ok(bytes) => response.body(Body::from(bytes)).unwrap_or_else(|e| {
                    eprintln!("Error creating response: {}", e);
                    Response::builder()
                        .status(StatusCode::BAD_GATEWAY)
                        .body(Body::from("{\"error\":{\"message\":\"Error processing provider response\",\"type\":\"gateway_error\",\"code\":\"response_processing_failed\"}}".to_string()))
                        .unwrap()
                }),
                Err(e) => {
                    eprintln!("Error reading response body: {}", e);
                    Response::builder()
                        .status(StatusCode::BAD_GATEWAY)
                        .body(Body::from("{\"error\":{\"message\":\"Error reading response from provider\",\"type\":\"gateway_error\",\"code\":\"response_read_failed\"}}".to_string()))
                        .unwrap()
                }
            }
        }
        Err(error) => {
            eprintln!("Error forwarding request: {}", error);

            let error_msg = get_onion_error_message(&error, &endpoint_url, "forward_request");

            let error_json = Json(json!({
                "error": {
                    "message": error_msg,
                    "type": "gateway_error"
                }
            }));

            (StatusCode::BAD_GATEWAY, error_json).into_response()
        }
    }
}
