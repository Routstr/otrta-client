use std::sync::Arc;

use crate::db::mint::CurrencyUnit;
use crate::multimint::MultimintWalletWrapper;
use chrono::{DateTime, Utc};
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
    pub wallet: Arc<MultimintWalletWrapper>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    pub endpoint: String,
    pub api_key: String,
}

#[derive(Deserialize)]
pub struct SendTokenRequest {
    pub amount: i64,
    pub mint_url: String,
    pub unit: Option<String>,
}

#[derive(Serialize)]
pub struct SendTokenResponse {
    pub token: String,
    pub success: bool,
    pub message: Option<String>,
}

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
    pub modality: Option<String>,
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

    pub modality: Option<String>,
    pub input_modalities: Option<Vec<String>>,
    pub output_modalities: Option<Vec<String>>,
    pub tokenizer: Option<String>,
    pub instruct_type: Option<String>,
    pub created_timestamp: Option<i64>,

    pub prompt_cost: Option<f64>,
    pub completion_cost: Option<f64>,
    pub request_cost: Option<f64>,
    pub image_cost: Option<f64>,
    pub web_search_cost: Option<f64>,
    pub internal_reasoning_cost: Option<f64>,
    pub max_cost: Option<f64>,

    pub max_completion_tokens: Option<i32>,
    pub is_moderated: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct RefreshModelsResponse {
    pub success: bool,
    pub models_updated: i32,
    pub models_added: i32,
    pub models_marked_removed: i32,
    pub message: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Architecture {
    pub modality: Option<String>,
    pub input_modalities: Option<Vec<String>>,
    pub output_modalities: Option<Vec<String>>,
    pub tokenizer: Option<String>,
    pub instruct_type: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Pricing {
    pub prompt: f64,
    pub completion: f64,
    pub request: f64,
    pub image: f64,
    pub web_search: f64,
    pub internal_reasoning: f64,
    #[serde(default)]
    pub max_cost: f64, // in sats not msats
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TopProvider {
    pub context_length: Option<i32>,
    pub max_completion_tokens: Option<i32>,
    pub is_moderated: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelListResponse {
    pub data: Vec<ProxyModelFromApi>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProxyModelFromApi {
    pub id: String,
    pub created: i64,

    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub input_cost: Option<f64>,
    #[serde(default)]
    pub output_cost: Option<f64>,
    #[serde(default)]
    pub min_cash_per_request: Option<f64>,
    #[serde(default)]
    pub min_cost_per_request: Option<f64>,
    #[serde(default)]
    pub provider: Option<String>,
    #[serde(default)]
    pub soft_deleted: Option<bool>,
    #[serde(default)]
    pub model_type: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub context_length: Option<i32>,
    #[serde(default)]
    pub is_free: Option<bool>,

    #[serde(default)]
    pub architecture: Option<Architecture>,

    #[serde(default)]
    pub pricing: Option<Pricing>,
    #[serde(default)]
    pub sats_pricing: Option<Pricing>,
    #[serde(default)]
    pub per_request_limits: Option<serde_json::Value>,
    #[serde(default)]
    pub top_provider: Option<TopProvider>,
}

impl ProxyModelFromApi {
    pub fn to_model_record(&self, provider_id: i32) -> ModelRecord {
        // println!("{:?}", self);
        ModelRecord {
            id: uuid::Uuid::new_v4(),
            provider_id,
            name: if self.id.is_empty() {
                self.name.clone()
            } else {
                self.id.clone()
            },
            input_cost: (self.sats_pricing.as_ref().map(|p| p.prompt).unwrap_or(0.0)
                * 1000_000.0
                * 1000.0) as i64, // Convert to msats
            output_cost: (self
                .sats_pricing
                .as_ref()
                .map(|p| p.completion)
                .unwrap_or(0.0)
                * 1000_000.0
                * 1000.0) as i64,
            min_cash_per_request: (self
                .sats_pricing
                .as_ref()
                .map(|p| p.max_cost)
                .unwrap_or(0.0)
                * 1000.0) as i64,
            min_cost_per_request: self.min_cost_per_request.map(|c| c as i64),
            provider: self.provider.clone(),
            soft_deleted: self.soft_deleted.unwrap_or(false),
            model_type: self.model_type.clone(), // self.architecture.as_ref().and_then(|a| a.).clone(),
            description: self.description.clone(),
            context_length: self.top_provider.as_ref().and_then(|tp| tp.context_length),
            is_free: self.is_free.unwrap_or(false),
            created_at: chrono::Utc::now(),
            updated_at: Some(chrono::Utc::now()),
            last_seen_at: Some(chrono::Utc::now()),

            modality: self.architecture.as_ref().and_then(|a| a.modality.clone()),
            input_modalities: self
                .architecture
                .as_ref()
                .and_then(|a| a.input_modalities.clone()),
            output_modalities: self
                .architecture
                .as_ref()
                .and_then(|a| a.output_modalities.clone()),
            tokenizer: self.architecture.as_ref().and_then(|a| a.tokenizer.clone()),
            instruct_type: self
                .architecture
                .as_ref()
                .and_then(|a| a.instruct_type.clone()),
            created_timestamp: Some(self.created),

            prompt_cost: self.pricing.as_ref().map(|p| p.prompt),
            completion_cost: self.pricing.as_ref().map(|p| p.completion),
            request_cost: self.pricing.as_ref().map(|p| p.request),
            image_cost: self.pricing.as_ref().map(|p| p.image),
            web_search_cost: self.pricing.as_ref().map(|p| p.web_search),
            internal_reasoning_cost: self.pricing.as_ref().map(|p| p.internal_reasoning),
            max_cost: self.pricing.as_ref().map(|p| p.max_cost),

            // Top provider fields
            max_completion_tokens: self
                .top_provider
                .as_ref()
                .and_then(|tp| tp.max_completion_tokens),
            is_moderated: self.top_provider.as_ref().and_then(|tp| tp.is_moderated),
        }
    }
}

// Multimint-related types and requests

#[derive(Deserialize)]
pub struct MultimintSendTokenRequest {
    pub amount: u64,
    pub preferred_mint: Option<String>,
    pub unit: Option<String>,
    pub split_across_mints: Option<bool>,
}

#[derive(Serialize)]
pub struct MultimintSendTokenResponse {
    pub tokens: String, // May contain multiple tokens separated by newlines
    pub success: bool,
    pub message: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct MintBalance {
    pub mint_url: String,
    pub balance: u64,
    pub unit: CurrencyUnit,
    pub proof_count: usize,
}

#[derive(Serialize, Deserialize)]
pub struct MultimintBalanceResponse {
    pub total_balance: u64,
    pub balances_by_mint: Vec<MintBalance>,
}

#[derive(Deserialize)]
pub struct TransferBetweenMintsRequest {
    pub from_mint: String,
    pub to_mint: String,
    pub amount: u64,
}

#[derive(Serialize)]
pub struct TransferBetweenMintsResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Deserialize)]
pub struct TopupMintRequest {
    pub mint_url: String,
    pub method: String,        // "lightning" or "ecash"
    pub amount: Option<u64>,   // For lightning
    pub token: Option<String>, // For ecash
}

#[derive(Serialize)]
pub struct TopupMintResponse {
    pub success: bool,
    pub message: String,
    pub invoice: Option<String>, // For lightning topup
}

#[derive(Serialize)]
pub struct PendingProofsResponse {
    pub pending_proofs: std::collections::HashMap<String, Vec<PendingProof>>,
}

#[derive(Serialize, Deserialize)]
pub struct PendingProof {
    pub token: String,
    pub amount: String,
    pub key: String,
    pub key_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct User {
    pub npub: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Organization {
    pub id: uuid::Uuid,
    pub name: String,
    pub owner_npub: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub npub: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateOrganizationRequest {
    pub name: String,
    pub owner_npub: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SignupRequest {
    pub npub: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub organization_name: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SignupResponse {
    pub success: bool,
    pub user: User,
    pub organization: Organization,
    pub message: Option<String>,
}
