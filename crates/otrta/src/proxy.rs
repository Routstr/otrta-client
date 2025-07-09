use crate::{
    db::{models::get_model, provider::get_default_provider, Pool},
    models::*,
    wallet::{finalize_request, send_with_retry},
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

#[derive(serde::Deserialize)]
struct OpenAIRequest {
    model: String,
    #[serde(flatten)]
    _other: serde_json::Value,
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
    let headers = request.headers().clone();
    let body_bytes = match axum::body::to_bytes(request.into_body(), usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Failed to read request body",
                        "type": "request_error"
                    }
                })),
            ).into_response();
        }
    };
    
    let body_data: serde_json::Value = if body_bytes.is_empty() {
        serde_json::json!({})
    } else {
        match serde_json::from_slice(&body_bytes) {
            Ok(data) => data,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": {
                            "message": "Invalid JSON in request body",
                            "type": "parse_error"
                        }
                    })),
                ).into_response();
            }
        }
    };
    
    forward_request_with_payment_with_body(headers, &state, &path, Some(body_data), false)
        .await
        .into_response()
}

pub async fn forward_request_with_payment_with_body<T: serde::Serialize>(
    original_headers: HeaderMap,
    state: &Arc<AppState>,
    path: &str,
    body: Option<T>,
    is_streaming: bool,
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
        if let Ok(m) = get_model(&state.db, &model_name).await {
            m
        } else {
            None
        }
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

    let token = if is_free_model {
        String::new()
    } else {
        let token_result = send_with_retry(&state.wallet, cost, Some(3)).await;

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

    match req_builder.send().await {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();

            if status != StatusCode::OK {
                // Only handle payment headers for non-free models
                if !is_free_model && !token.is_empty() {
                    if let Some(change_sats) = headers.get("X-Cashu") {
                        if let Ok(in_token) = change_sats.to_str() {
                            state.wallet.receive(in_token).await.unwrap();
                        }
                    }
                }
                return Response::builder()
                    .status(StatusCode::BAD_REQUEST)
                    .body(Body::from("Server Error"))
                    .unwrap();
            }

            let mut response = Response::builder().status(status);

            if is_streaming && !headers.contains_key(header::CONTENT_TYPE) {
                response = response.header(header::CONTENT_TYPE, "text/event-stream");
            }

            // Only handle payment finalization for non-free models
            if !is_free_model && !token.is_empty() {
                if let Some(change_sats) = headers.get("X-Cashu") {
                    if let Ok(in_token) = change_sats.to_str() {
                        finalize_request(&state.db, &state.wallet, &token, cost, in_token).await;
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
                result.map_err(|e| {
                    io::Error::new(
                        io::ErrorKind::Other,
                        format!("Error reading from upstream: {}", e),
                    )
                })
            });

            let body = Body::from_stream(stream);

            return response.body(body).unwrap_or_else(|e| {
                let state_clone = state.clone();
                tokio::spawn(async move {
                    if let Err(err) = state_clone.wallet.redeem_pendings().await {
                        eprintln!("Error redeeming pendings: {:?}", err);
                    }
                });

                eprintln!("Error creating streaming response: {}", e);
                Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(Body::from("Error creating streaming response"))
                    .unwrap()
            });
        }
        Err(error) => {
            // Only redeem pendings for non-free models
            if !is_free_model && !token.is_empty() {
                let _ = state.wallet.redeem_pendings().await;
            }

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

pub async fn forward_request(db: &Pool, path: &str) -> Response<Body> {
    let server_config = if let Ok(Some(config)) = get_default_provider(&db).await {
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
