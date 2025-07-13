use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::{IntoResponse, Response},
};
use base64::Engine;
use nostr::{Event, Kind, ToBech32};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::warn;

use crate::error::AppError;

#[derive(Clone)]
pub struct AuthConfig {
    pub enabled: bool,
    pub max_age_seconds: u64,
    pub whitelisted_npubs: Vec<String>,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            max_age_seconds: 300,
            whitelisted_npubs: vec![],
        }
    }
}

pub async fn auth_middleware(
    State(config): State<AuthConfig>,
    request: Request,
    next: Next,
) -> Response {
    if !config.enabled {
        return next.run(request).await;
    }

    let auth_header = match request.headers().get(AUTHORIZATION) {
        Some(header) => header,
        None => return AppError::Unauthorized.into_response(),
    };

    let auth_str = match auth_header.to_str() {
        Ok(str) => str,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    if !auth_str.starts_with("Nostr ") {
        return AppError::Unauthorized.into_response();
    }

    let encoded_event = &auth_str[6..];
    let decoded_bytes = match base64::engine::general_purpose::STANDARD.decode(encoded_event) {
        Ok(bytes) => bytes,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    let event_json = match std::str::from_utf8(&decoded_bytes) {
        Ok(json) => json,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    let event: Event = match serde_json::from_str(event_json) {
        Ok(event) => event,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    if let Err(err) = validate_auth_event(&event, &request, &config) {
        return err.into_response();
    }

    next.run(request).await
}

fn validate_auth_event(
    event: &Event,
    request: &Request,
    config: &AuthConfig,
) -> Result<(), AppError> {
    if event.kind != Kind::Custom(27235) {
        warn!("Invalid event kind: expected 27235, got {}", event.kind);
        return Err(AppError::Unauthorized);
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let event_age = now.saturating_sub(event.created_at.as_u64());
    if event_age > config.max_age_seconds {
        warn!("Event too old: {} seconds", event_age);
        return Err(AppError::Unauthorized);
    }

    if !event.verify().is_ok() {
        warn!("Invalid event signature");
        return Err(AppError::Unauthorized);
    }

    if !config.whitelisted_npubs.is_empty() {
        let user_npub = event.pubkey.to_bech32().unwrap_or_default();
        if !config.whitelisted_npubs.contains(&user_npub) {
            warn!("User {} not in whitelist", user_npub);
            return Err(AppError::Unauthorized);
        }
    }

    let mut url_found = false;
    let mut method_found = false;

    for tag in &event.tags {
        let values = tag.as_vec();
        if values.len() >= 2 {
            match values[0].as_str() {
                "u" => {
                    // TODO: FIX ME
                    let expected_url = format!(
                        "{}://{}{}",
                        request
                            .uri()
                            .scheme()
                            .map(|s| s.as_str())
                            .unwrap_or("https"),
                        request
                            .uri()
                            .authority()
                            .map(|a| a.as_str())
                            .unwrap_or("localhost"),
                        request.uri().path()
                    );

                    // if values[1] != expected_url {
                    //     warn!("URL mismatch: expected {}, got {}", expected_url, values[1]);
                    //     return Err(AppError::Unauthorized);
                    // }
                    url_found = true;
                }
                "method" => {
                    let expected_method = request.method().as_str();
                    if values[1] != expected_method {
                        warn!(
                            "Method mismatch: expected {}, got {}",
                            expected_method, values[1]
                        );
                        return Err(AppError::Unauthorized);
                    }
                    method_found = true;
                }
                _ => {}
            }
        }
    }

    if !url_found || !method_found {
        warn!("Missing required tags (u or method)");
        return Err(AppError::Unauthorized);
    }

    Ok(())
}
