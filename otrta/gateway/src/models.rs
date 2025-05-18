use cdk::wallet::Wallet;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum UserRole {
    #[serde(rename = "superuser")]
    Superuser,
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "manager")]
    Manager,
    #[serde(rename = "group_leader")]
    GroupLeader,
    #[serde(rename = "developer")]
    Developer,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub organization_id: String,
    pub role: UserRole,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateUser {
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub organization_id: String,
    pub role: UserRole,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub organization_id: Option<String>,
    pub role: Option<UserRole>,
    pub is_active: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub slug: Option<String>,
    pub logo_url: Option<String>,
    pub domain: Option<String>,
    pub plan: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateOrganization {
    pub name: String,
    pub description: Option<String>,
    pub slug: Option<String>,
    pub logo_url: Option<String>,
    pub domain: Option<String>,
    pub plan: Option<String>,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateOrganization {
    pub name: Option<String>,
    pub description: Option<String>,
    pub slug: Option<String>,
    pub logo_url: Option<String>,
    pub domain: Option<String>,
    pub plan: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub key: String,
    pub organization_id: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateApiKey {
    pub name: String,
    pub organization_id: String,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateApiKey {
    pub name: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub model_type: String,
    pub is_active: bool,
    pub config: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateModel {
    pub name: String,
    pub provider_id: String,
    pub model_type: String,
    pub is_active: bool,
    pub config: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateModel {
    pub name: Option<String>,
    pub provider_id: Option<String>,
    pub model_type: Option<String>,
    pub is_active: Option<bool>,
    pub config: Option<serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub api_type: String,
    pub is_active: bool,
    pub config: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateProvider {
    pub name: String,
    pub api_type: String,
    pub is_active: bool,
    pub config: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateProvider {
    pub name: Option<String>,
    pub api_type: Option<String>,
    pub is_active: Option<bool>,
    pub config: Option<serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Credit {
    pub id: String,
    pub organization_id: String,
    pub amount: f64,
    pub transaction_type: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateCredit {
    pub organization_id: String,
    pub amount: f64,
    pub transaction_type: String,
    pub description: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateCredit {
    pub amount: Option<f64>,
    pub transaction_type: Option<String>,
    pub description: Option<String>,
}

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

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub npub: String,
    pub name: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub user_id: String,
    pub theme: String,
}

pub struct AppState {
    pub db: sqlx::PgPool,
    pub default_sats_per_request: u32,
    pub wallet: Wallet,
}
