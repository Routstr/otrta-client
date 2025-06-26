use crate::{
    db::{models::get_model, Pool},
    handlers::get_server_config,
    models::*,
    wallet::{finalize_request, send_with_retry},
};
use axum::{
    body::Body,
    extract::{Path, State},
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
    other: serde_json::Value,
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
    headers: HeaderMap,
    Json(body_data): Json<serde_json::Value>,
) -> Response<Body> {
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
    let server_config = if let Some(config) = get_server_config(&state.db).await {
        config
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Server configuration missing. Cannot process request without a configured endpoint.",
                    "type": "server_error",
                    "param": null,
                    "code": "server_config_missing"
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
    let endpoint_url = format!("{}/{}", &server_config.endpoint, path);

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

    let is_free_model = if let Some(ref model_name) = model_name {
        match get_model(&state.db, model_name).await {
            Ok(Some(model)) => model.is_free,
            Ok(None) => false, // Model not found, assume not free for safety
            Err(_) => false,   // Database error, assume not free for safety
        }
    } else {
        false
    };

    if let Some(body_data) = body {
        req_builder = req_builder.json(&body_data);
    }

    // Generate payment token only if model is not free
    let token = if is_free_model {
        String::new() // Empty string for free models
    } else {
        let token_result = send_with_retry(
            &state.wallet,
            state.default_msats_per_request as i64,
            Some(3),
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

    // Only add X-Cashu header if we have a token (non-free model)
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
                        finalize_request(
                            &state.db,
                            &state.wallet,
                            &token,
                            state.default_msats_per_request as i64,
                            in_token,
                        )
                        .await;
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
    let server_config = if let Some(config) = get_server_config(&db).await {
        config
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Server configuration missing. Cannot process request without a configured endpoint.",
                    "type": "server_error",
                    "param": null,
                    "code": "server_config_missing"
                }
            })),
        ).into_response();
    };

    let client_builder = Client::builder();
    let client = client_builder.build().unwrap();

    let endpoint_url = format!("{}/{}", &server_config.endpoint, path);

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
