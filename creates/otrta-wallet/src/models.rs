use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    pub endpoint: String,
    pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SendTokenPendingResponse {
    pub token: String,
    pub amount: String,
    pub key: String,
    pub key_id: String,
}
