use crate::{
    db::{
        api_keys::get_api_key_by_id,
        models::get_model,
        provider::{get_default_provider, get_default_provider_for_organization_new},
        transaction::{add_transaction, TransactionDirection, TransactionType},
        Pool,
    },
    models::*,
    onion::{
        configure_client_with_tor_proxy, construct_url_with_protocol, get_onion_error_message,
        is_onion_url, log_onion_timing, needs_tor_proxy, start_onion_timing,
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
                                "type": "server_error",
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
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to retrieve API key",
                            "type": "server_error",
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
                                "type": "server_error",
                                "param": null,
                                "code": "default_provider_missing"
                            }
                        })),
                    ).into_response();
                }
                Err(e) => {
                    eprintln!("Failed to get global default provider: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({
                            "error": {
                                "message": "Failed to retrieve provider configuration",
                                "type": "server_error",
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
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve provider configuration",
                        "type": "server_error",
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
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to configure client for .onion request",
                        "type": "proxy_error"
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
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to configure Tor proxy for streaming .onion request",
                            "type": "proxy_error"
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
        "Processing request for model: {:?}, is_free: {}, cost: {}",
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

    let cost = match model {
        Some(model) => model
            .min_cost_per_request
            .unwrap_or_else(|| state.default_msats_per_request as i64),
        None => state.default_msats_per_request as i64,
    };

    println!("{:?}", server_config);
    if server_config.mints.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": {
                    "message": format!("no mint found for provider"),
                    "type": "payment_error",
                }
            })),
        )
            .into_response();
    };

    let token = if is_free_model {
        String::new()
    } else {
        // Get wallet from organization ID directly since we already have it
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
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to get organization wallet",
                            "type": "wallet_error",
                            "code": "wallet_access_failed"
                        }
                    })),
                )
                    .into_response();
            }
        };

        let token_result = send_with_retry(
            &wallet,
            cost,
            server_config.mints.first().unwrap(),
            Some(3),
            &state.db,
            api_key_id,
            user_id,
        )
        .await;

        match token_result {
            Ok(token) => token,
            Err(e) => {
                eprintln!(
                    "Payment token generation failed for model: {:?}, cost: {} msats, error: {:?}",
                    model_name, cost, e
                );

                // If the model should be free or cost is 0, continue without payment
                if is_free_model || cost == 0 {
                    eprintln!("Model is free or zero cost, proceeding without payment token");
                    String::new()
                } else {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({
                            "error": {
                                "message": format!("Failed to generate payment token: {:?}. This usually means insufficient wallet balance or mint connectivity issues.", e),
                                "type": "payment_error",
                                "details": {
                                    "model": model_name,
                                    "cost_msats": cost,
                                    "is_free_model": is_free_model
                                }
                            }
                        })),
                    )
                        .into_response();
                }
            }
        }
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
                            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get wallet")
                                .into_response()
                        }
                    };
                    let res = wallet.receive(in_token).await.unwrap();
                    add_transaction(
                        &state.db,
                        in_token,
                        &res.to_string(),
                        TransactionDirection::Incoming,
                        api_key_id,
                        user_id,
                        transaction_type.clone(),
                    )
                    .await
                    .unwrap();
                }
            }
        }

        let mut response = Response::builder().status(status);

        if is_streaming && !headers.contains_key(header::CONTENT_TYPE) {
            response = response.header(header::CONTENT_TYPE, "text/event-stream");
        }

        println!("{:?}", headers);
        if let Some(change_sats) = headers.get("X-Cashu") {
            println!("{:?}", change_sats);
            if let Ok(in_token) = change_sats.to_str() {
                let wallet = match state
                    .multimint_manager
                    .get_or_create_multimint(&org_id)
                    .await
                {
                    Ok(wallet) => wallet,
                    Err(_) => {
                        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get wallet")
                            .into_response()
                    }
                };
                let res = wallet.receive(in_token).await.unwrap();
                add_transaction(
                    &state.db,
                    in_token,
                    &res.to_string(),
                    TransactionDirection::Incoming,
                    api_key_id,
                    user_id,
                    transaction_type.clone(),
                )
                .await
                .unwrap();
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
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from("Error creating streaming response"))
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
                return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get wallet").into_response()
            }
        };
        let res = wallet.receive(&token).await.unwrap();
        add_transaction(
            &state.db,
            &token,
            &res.to_string(),
            TransactionDirection::Incoming,
            api_key_id,
            user_id,
            transaction_type,
        )
        .await
        .unwrap();
        let error_json = Json(json!({
            "error": {
            "message": format!("Error forwarding request"),
            "type": "gateway_error"
        }}));
        (StatusCode::INTERNAL_SERVER_ERROR, error_json).into_response()
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
        match get_api_key_by_id(&db, api_key_id).await {
            Ok(Some(api_key)) => match Uuid::parse_str(&api_key.organization_id) {
                Ok(id) => id,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": {
                                "message": "Invalid organization ID in API key",
                                "type": "server_error",
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
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to retrieve API key",
                            "type": "server_error",
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

    let server_config = match get_default_provider_for_organization_new(&db, &org_id).await {
        Ok(Some(config)) => config,
        Ok(None) => {
            // Fallback to global default provider if organization doesn't have one configured
            match get_default_provider(&db).await {
                Ok(Some(config)) => config,
                Ok(None) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": {
                                "message": "No default provider configured. Please configure a provider first.",
                                "type": "server_error",
                                "param": null,
                                "code": "default_provider_missing"
                            }
                        })),
                    ).into_response();
                }
                Err(e) => {
                    eprintln!("Failed to get global default provider: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({
                            "error": {
                                "message": "Failed to retrieve provider configuration",
                                "type": "server_error",
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
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve provider configuration",
                        "type": "server_error",
                        "code": "provider_lookup_failed"
                    }
                })),
            )
                .into_response();
        }
    };

    let client_builder = Client::builder();
    let client = client_builder.build().unwrap();

    // Construct proper URL with protocol prefix (same logic as models.rs)
    let base_url =
        if server_config.url.starts_with("http://") || server_config.url.starts_with("https://") {
            server_config.url.clone()
        } else if server_config.url.contains(".onion") {
            // For onion addresses, use http:// prefix by default
            format!("http://{}", server_config.url)
        } else {
            // For regular URLs, use https:// prefix by default
            format!("https://{}", server_config.url)
        };

    let endpoint_url = format!("{}/{}", base_url, path);
    println!("Constructed forward_request endpoint URL: {}", endpoint_url);

    let mut req_builder = client.get(&endpoint_url);
    req_builder = req_builder.header(header::CONTENT_TYPE, "application/json");

    match req_builder.send().await {
        Ok(resp) => {
            let status = resp.status();
            let response = Response::builder().status(status);

            match resp.bytes().await {
                Ok(bytes) => response.body(Body::from(bytes)).unwrap_or_else(|e| {
                    eprintln!("Error creating response: {}", e);
                    Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(Body::from("Error creating response"))
                        .unwrap()
                }),
                Err(e) => {
                    eprintln!("Error reading response body: {}", e);
                    Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(Body::from(format!("Error reading response body: {}", e)))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_onion_url_detection() {
        assert!(is_onion_url("http://example.onion"));
        assert!(is_onion_url("https://3g2upl4pq6kufc4m.onion"));
        assert!(is_onion_url(
            "http://facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd.onion"
        ));
        assert!(!is_onion_url("https://example.com"));
        assert!(!is_onion_url("http://google.com"));
    }

    #[test]
    fn test_tor_proxy_requirement() {
        assert!(needs_tor_proxy("http://example.onion", true));
        assert!(!needs_tor_proxy("http://example.onion", false));
        assert!(!needs_tor_proxy("http://example.com", true));
        assert!(!needs_tor_proxy("http://example.com", false));
    }
}
