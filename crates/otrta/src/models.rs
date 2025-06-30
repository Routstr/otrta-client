use chrono::{DateTime, Utc};
use otrta_wallet::wallet::CashuWalletClient;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Token {
    pub token: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Amount {
    pub amount: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TokenRedeemResponse {
    pub amount: Option<String>,
    pub success: bool,
    pub message: Option<String>,
}

pub struct AppState {
    pub db: sqlx::PgPool,
    pub default_msats_per_request: u32,
    pub wallet: CashuWalletClient,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    pub endpoint: String,
    pub api_key: String,
}

#[derive(Deserialize)]
pub struct SendTokenRequest {
    pub amount: i64,
}

#[derive(Serialize)]
pub struct SendTokenResponse {
    pub token: String,
    pub success: bool,
    pub message: Option<String>,
}

// Model structures for the proxy models endpoint
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProxyModel {
    pub name: String,
    pub input_cost: i64,                   // Cost per 1M tokens in msat
    pub output_cost: i64,                  // Cost per 1M tokens in msat
    pub min_cash_per_request: i64,         // Minimum charge per request in msat
    pub min_cost_per_request: Option<i64>, // Alternative minimum cost per request in msat
    pub provider: Option<String>,
    pub soft_deleted: Option<bool>,
    pub model_type: Option<String>,
    pub description: Option<String>,
    pub context_length: Option<i32>,
    pub is_free: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProxyModelFromApi {
    pub name: String,
    pub input_cost: Option<f64>, // Cost per 1M tokens in msat (as f64 from API)
    pub output_cost: Option<f64>, // Cost per 1M tokens in msat (as f64 from API)
    pub min_cash_per_request: Option<f64>, // Minimum charge per request in msat (as f64 from API)
    pub min_cost_per_request: Option<f64>, // Alternative minimum cost per request in msat (as f64 from API)
    pub provider: Option<String>,
    pub soft_deleted: Option<bool>,
    pub model_type: Option<String>,
    pub description: Option<String>,
    pub context_length: Option<i32>,
    pub is_free: Option<bool>,
}

#[derive(Clone, Debug)]
pub struct ModelRecord {
    pub id: uuid::Uuid,
    pub provider_id: i32,
    pub name: String,
    pub input_cost: i64,                   // Cost per 1M tokens in msat
    pub output_cost: i64,                  // Cost per 1M tokens in msat
    pub min_cash_per_request: i64,         // Minimum charge per request in msat
    pub min_cost_per_request: Option<i64>, // Alternative minimum cost per request in msat
    pub provider: Option<String>,
    pub soft_deleted: bool,
    pub model_type: Option<String>,
    pub description: Option<String>,
    pub context_length: Option<i32>,
    pub is_free: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
    pub last_seen_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct RefreshModelsResponse {
    pub success: bool,
    pub models_updated: i32,
    pub models_added: i32,
    pub models_marked_removed: i32,
    pub message: Option<String>,
}
