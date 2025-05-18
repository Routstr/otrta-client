use ecash_402_wallet::wallet::CashuWalletClient;
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
    pub default_sats_per_request: u32,
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
