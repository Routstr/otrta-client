use crate::{
    db::{
        api_keys::get_api_key_by_id,
        models::get_model,
        provider::get_default_provider,
        transaction::{add_transaction, TransactionDirection},
        Pool,
    },
    models::*,
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

async fn get_organization_wallet_from_api_key(
    state: &Arc<AppState>,
    api_key_id: &str,
) -> Result<Arc<crate::multimint::MultimintWalletWrapper>, Box<dyn std::error::Error + Send + Sync>>
{
    let api_key = get_api_key_by_id(&state.db, api_key_id)
        .await?
        .ok_or("API key not found")?;

    let org_id = Uuid::parse_str(&api_key.organization_id)?;
    let wallet = state
        .multimint_manager
        .get_or_create_multimint(&org_id)
        .await?;

    Ok(wallet)
}

pub async fn forward_any_request_get(
    Path(path): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Response<Body> {
    forward_request(&state.db, &path).await.into_response()
}

pub async fn forward_any_request(
    Path(path): Path<String>,
    State(state): State<Arc<AppState>>,
    request: Request,
) -> Response<Body> {
    let (parts, body) = request.into_parts();
    let api_key_id = parts.extensions.get::<String>().map(|s| s.as_str());
    let headers = parts.headers;

    let body_bytes = match axum::body::to_bytes(body, usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => return (StatusCode::BAD_REQUEST, "Failed to read request body").into_response(),
    };

    let body_data: serde_json::Value = match serde_json::from_slice(&body_bytes) {
        Ok(data) => data,
        Err(_) => serde_json::Value::Null,
    };

    forward_request_with_payment_with_body(
        headers,
        &state,
        &path,
        Some(body_data),
        false,
        api_key_id,
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
) -> Response<Body> {
    let server_config = if let Ok(Some(config)) = get_default_provider(&state.db).await {
        config
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Default provider missing. Cannot process request without a configured endpoint.",
                    "type": "server_error",
                    "param": null,
                    "code": "default_provider_missing"
                }
            })),
        ).into_response();
    };

    let mut client_builder = Client::builder();

    if is_streaming {
        use std::time::Duration;
        client_builder = client_builder
            .timeout(Duration::from_secs(300))
            .pool_idle_timeout(None)
            .pool_max_idle_per_host(0);
    }

    let client = client_builder.build().unwrap();
    let endpoint_url = format!("{}/{}", &server_config.url, path);

    let mut req_builder = if body.is_some() {
        client.post(endpoint_url)
    } else {
        client.get(endpoint_url)
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
        None
    };

    let is_free_model = match model.clone() {
        Some(model) => model.is_free,
        None => false,
    };

    if let Some(body_data) = body {
        req_builder = req_builder.json(&body_data);
    }

    let cost = match model {
        Some(model) => model
            .min_cost_per_request
            .unwrap_or_else(|| state.default_msats_per_request as i64),
        None => state.default_msats_per_request as i64,
    };

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
        let wallet = if let Some(api_key_id) = api_key_id {
            match get_organization_wallet_from_api_key(state, api_key_id).await {
                Ok(wallet) => wallet,
                Err(_) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({"error": "Failed to get organization wallet"})),
                    )
                        .into_response()
                }
            }
        } else {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "API key required"})),
            )
                .into_response();
        };

        let token_result = send_with_retry(
            &wallet,
            cost,
            server_config.mints.first().unwrap(),
            Some(3),
            &state.db,
            api_key_id,
        )
        .await;

        match token_result {
            Ok(token) => token,
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": format!("Failed to generate payment token: {:?}", e),
                            "type": "payment_error",
                        }
                    })),
                )
                    .into_response();
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

    let response = if let Ok(resp) = req_builder.send().await {
        let status = resp.status();
        let headers = resp.headers().clone();

        if status != StatusCode::OK {
            if let Some(change_sats) = headers.get("X-Cashu") {
                if let Ok(in_token) = change_sats.to_str() {
                    let wallet = if let Some(api_key_id) = api_key_id {
                        match get_organization_wallet_from_api_key(state, api_key_id).await {
                            Ok(wallet) => wallet,
                            Err(_) => {
                                return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get wallet")
                                    .into_response()
                            }
                        }
                    } else {
                        return (StatusCode::UNAUTHORIZED, "API key required").into_response();
                    };
                    let res = wallet.receive(in_token).await.unwrap();
                    add_transaction(
                        &state.db,
                        in_token,
                        &res.to_string(),
                        TransactionDirection::Incoming,
                        api_key_id,
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

        if let Some(change_sats) = headers.get("X-Cashu") {
            if let Ok(in_token) = change_sats.to_str() {
                let wallet = if let Some(api_key_id) = api_key_id {
                    match get_organization_wallet_from_api_key(state, api_key_id).await {
                        Ok(wallet) => wallet,
                        Err(_) => {
                            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get wallet")
                                .into_response()
                        }
                    }
                } else {
                    return (StatusCode::UNAUTHORIZED, "API key required").into_response();
                };
                let res = wallet.receive(in_token).await.unwrap();
                add_transaction(
                    &state.db,
                    in_token,
                    &res.to_string(),
                    TransactionDirection::Incoming,
                    api_key_id,
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
            let api_key_id_clone = api_key_id.map(|s| s.to_string());
            tokio::spawn(async move {
                if let Some(api_key_id) = api_key_id_clone {
                    if let Ok(wallet) =
                        get_organization_wallet_from_api_key(&state_clone, &api_key_id).await
                    {
                        if let Err(err) = wallet.redeem_pendings().await {
                            eprintln!("Error redeeming pendings: {:?}", err);
                        }
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
        let wallet = if let Some(api_key_id) = api_key_id {
            match get_organization_wallet_from_api_key(state, api_key_id).await {
                Ok(wallet) => wallet,
                Err(_) => {
                    return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get wallet")
                        .into_response()
                }
            }
        } else {
            return (StatusCode::UNAUTHORIZED, "API key required").into_response();
        };
        let res = wallet.receive(&token).await.unwrap();
        add_transaction(
            &state.db,
            &token,
            &res.to_string(),
            TransactionDirection::Incoming,
            api_key_id,
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

pub async fn forward_request(db: &Pool, path: &str) -> Response<Body> {
    let server_config = if let Ok(Some(config)) = get_default_provider(db).await {
        config
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Default provider missing. Cannot process request without a configured endpoint.",
                    "type": "server_error",
                    "param": null,
                    "code": "default_provider_missing"
                }
            })),
        ).into_response();
    };

    let client_builder = Client::builder();
    let client = client_builder.build().unwrap();

    let endpoint_url = format!("{}/{}", &server_config.url, path);

    let mut req_builder = client.get(endpoint_url);
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

            let error_json = Json(json!({
                "error": {
                    "message": format!("Error forwarding request: {}", error),
                    "type": "gateway_error"
                }
            }));

            (StatusCode::INTERNAL_SERVER_ERROR, error_json).into_response()
        }
    }
}
