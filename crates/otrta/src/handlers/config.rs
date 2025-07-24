use crate::{
    db::{
        server_config::{get_default_config, update_config, ServerConfigRecord},
        Pool,
    },
    models::{AppState, ServerConfig},
};
use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;
use std::sync::Arc;

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
        // Note: This call would need an organization_id parameter
        // create_config(&state.db.clone(), &config, &organization_id).await.unwrap();
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

    Ok(Json(ServerConfig {
        endpoint: "".to_string(),
        api_key: "".to_string(),
    }))
}

pub async fn get_server_config(db: &Pool) -> Option<ServerConfigRecord> {
    if let Ok(c) = get_default_config(db).await {
        return c;
    }

    None
}

pub async fn tor_health_check() -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let tor_available = validate_tor_availability().await;
    
    Ok(Json(json!({
        "tor_proxy_available": tor_available,
        "proxy_url": std::env::var("TOR_SOCKS_PROXY").unwrap_or_else(|_| "socks5://127.0.0.1:9050".to_string())
    })))
}

async fn validate_tor_availability() -> bool {
    let tor_proxy_url = std::env::var("TOR_SOCKS_PROXY")
        .unwrap_or_else(|_| "socks5://127.0.0.1:9050".to_string());
    
    match reqwest::Client::builder()
        .proxy(reqwest::Proxy::all(&tor_proxy_url).unwrap())
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(_) => true,
        Err(_) => false
    }
}
