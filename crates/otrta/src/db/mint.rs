use crate::db::Pool;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CurrencyUnit {
    Sat,
    Msat,
}

impl std::fmt::Display for CurrencyUnit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CurrencyUnit::Sat => write!(f, "sat"),
            CurrencyUnit::Msat => write!(f, "msat"),
        }
    }
}

impl FromStr for CurrencyUnit {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "sat" => Ok(CurrencyUnit::Sat),
            "msat" => Ok(CurrencyUnit::Msat),
            _ => Err(format!("Invalid currency unit: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Mint {
    pub id: i32,
    pub mint_url: String,
    pub currency_unit: String,
    pub is_active: bool,
    pub name: Option<String>,
    pub organization_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MintListResponse {
    pub mints: Vec<Mint>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMintRequest {
    pub mint_url: String,
    pub currency_unit: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMintRequest {
    pub is_active: Option<bool>,
    pub name: Option<String>,
    pub currency_unit: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MintBalance {
    pub mint_url: String,
    pub balance: u64,
    pub unit: String,
    pub proof_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintUnitBalance {
    pub mint_id: i32,
    pub mint_url: String,
    pub mint_name: Option<String>,
    pub unit: String,
    pub balance: u64,
    pub proof_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintWithBalances {
    pub mint_id: i32,
    pub mint_url: String,
    pub mint_name: Option<String>,
    pub unit_balances: Vec<MintUnitBalance>,
    pub total_balance: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MultimintBalance {
    pub total_balance: u64,
    pub balances_by_mint: Vec<MintBalance>,
    pub balances_by_unit: std::collections::HashMap<String, u64>,
    pub mints_with_balances: Vec<MintWithBalances>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MintUnit {
    pub id: i32,
    pub mint_id: i32,
    pub unit: String,
    pub keyset_id: String,
    pub active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MintWithUnits {
    #[serde(flatten)]
    pub mint: Mint,
    pub supported_units: Vec<MintUnit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeysetInfo {
    pub id: String,
    pub unit: String,
    pub active: bool,
}

pub async fn get_all_mints(db: &Pool) -> Result<Vec<Mint>, sqlx::Error> {
    let mints = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         ORDER BY created_at ASC",
    )
    .fetch_all(db)
    .await?;

    Ok(mints)
}

pub async fn get_active_mints(db: &Pool) -> Result<Vec<Mint>, sqlx::Error> {
    let mints = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         WHERE is_active = TRUE
         ORDER BY created_at ASC",
    )
    .fetch_all(db)
    .await?;

    Ok(mints)
}

pub async fn get_mint_by_id(db: &Pool, id: i32) -> Result<Option<Mint>, sqlx::Error> {
    let mint = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(db)
    .await?;

    Ok(mint)
}

pub async fn get_mint_by_url(db: &Pool, mint_url: &str) -> Result<Option<Mint>, sqlx::Error> {
    let mint = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         WHERE mint_url = $1 AND organization_id IS NULL",
    )
    .bind(mint_url)
    .fetch_optional(db)
    .await?;

    Ok(mint)
}

pub async fn get_mint_by_url_for_organization(
    db: &Pool,
    mint_url: &str,
    organization_id: &Uuid,
) -> Result<Option<Mint>, sqlx::Error> {
    let mint = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         WHERE mint_url = $1 AND organization_id = $2",
    )
    .bind(mint_url)
    .bind(organization_id)
    .fetch_optional(db)
    .await?;

    Ok(mint)
}

pub async fn create_mint(db: &Pool, request: CreateMintRequest) -> Result<Mint, sqlx::Error> {
    let currency_unit = request.currency_unit.unwrap_or_else(|| "msat".to_string());

    let mint = sqlx::query_as::<_, Mint>(
        "INSERT INTO mints (mint_url, currency_unit, is_active, name, organization_id, updated_at)
         VALUES ($1, $2, TRUE, $3, NULL, NOW())
         RETURNING id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at",
    )
    .bind(&request.mint_url)
    .bind(&currency_unit)
    .bind(&request.name)
    .fetch_one(db)
    .await?;

    Ok(mint)
}

pub async fn update_mint(
    db: &Pool,
    id: i32,
    request: UpdateMintRequest,
) -> Result<Option<Mint>, sqlx::Error> {
    // First check if the mint exists
    let existing_mint = get_mint_by_id(db, id).await?;
    if existing_mint.is_none() {
        return Ok(None);
    }

    let mint = sqlx::query_as::<_, Mint>(
        "UPDATE mints 
         SET is_active = COALESCE($1, is_active),
             name = COALESCE($2, name),
             currency_unit = COALESCE($3, currency_unit),
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at",
    )
    .bind(request.is_active)
    .bind(request.name)
    .bind(request.currency_unit)
    .bind(id)
    .fetch_one(db)
    .await?;

    Ok(Some(mint))
}

pub async fn delete_mint(db: &Pool, id: i32) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM mints WHERE id = $1")
        .bind(id)
        .execute(db)
        .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn set_mint_active_status(
    db: &Pool,
    id: i32,
    is_active: bool,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("UPDATE mints SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(db)
        .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn get_mints_for_organization(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Vec<Mint>, sqlx::Error> {
    let mints = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         WHERE organization_id IS NULL OR organization_id = $1
         ORDER BY created_at ASC",
    )
    .bind(organization_id)
    .fetch_all(db)
    .await?;

    Ok(mints)
}

pub async fn get_active_mints_for_organization(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Vec<Mint>, sqlx::Error> {
    let mints = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         WHERE is_active = TRUE AND (organization_id IS NULL OR organization_id = $1)
         ORDER BY created_at ASC",
    )
    .bind(organization_id)
    .fetch_all(db)
    .await?;

    Ok(mints)
}

pub async fn get_mint_by_id_for_organization(
    db: &Pool,
    id: i32,
    organization_id: &Uuid,
) -> Result<Option<Mint>, sqlx::Error> {
    let mint = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at 
         FROM mints 
         WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)",
    )
    .bind(id)
    .bind(organization_id)
    .fetch_optional(db)
    .await?;

    Ok(mint)
}

pub async fn create_mint_for_organization(
    db: &Pool,
    request: CreateMintRequest,
    organization_id: &Uuid,
) -> Result<Mint, sqlx::Error> {
    let currency_unit = request.currency_unit.unwrap_or_else(|| "msat".to_string());

    let mint = sqlx::query_as::<_, Mint>(
        "INSERT INTO mints (mint_url, currency_unit, is_active, name, organization_id, updated_at)
         VALUES ($1, $2, TRUE, $3, $4, NOW())
         RETURNING id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at",
    )
    .bind(&request.mint_url)
    .bind(&currency_unit)
    .bind(&request.name)
    .bind(organization_id)
    .fetch_one(db)
    .await?;

    Ok(mint)
}

pub async fn update_mint_for_organization(
    db: &Pool,
    id: i32,
    organization_id: &Uuid,
    request: UpdateMintRequest,
) -> Result<Option<Mint>, sqlx::Error> {
    let mint = sqlx::query_as::<_, Mint>(
        "UPDATE mints 
         SET is_active = COALESCE($3, is_active),
             name = COALESCE($4, name),
             currency_unit = COALESCE($5, currency_unit),
             updated_at = NOW()
         WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)
         RETURNING id, mint_url, currency_unit, is_active, name, organization_id, created_at, updated_at",
    )
    .bind(id)
    .bind(organization_id)
    .bind(request.is_active)
    .bind(request.name)
    .bind(request.currency_unit)
    .fetch_optional(db)
    .await?;

    Ok(mint)
}

pub async fn delete_mint_for_organization(
    db: &Pool,
    id: i32,
    organization_id: &Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM mints WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)",
    )
    .bind(id)
    .bind(organization_id)
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn set_mint_active_status_for_organization(
    db: &Pool,
    id: i32,
    organization_id: &Uuid,
    is_active: bool,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        "UPDATE mints SET is_active = $3, updated_at = NOW() 
         WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)",
    )
    .bind(id)
    .bind(organization_id)
    .bind(is_active)
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn discover_mint_keysets(
    mint_url: &str,
) -> Result<Vec<KeysetInfo>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let keys_url = format!("{}/v1/keys", mint_url.trim_end_matches('/'));

    let response = client
        .get(&keys_url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to fetch keysets from {}: {}",
            keys_url,
            response.status()
        )
        .into());
    }

    let keys_data: serde_json::Value = response.json().await?;
    let mut keysets = Vec::new();

    if let Some(keysets_obj) = keys_data.get("keysets") {
        if let Some(keysets_array) = keysets_obj.as_array() {
            for keyset in keysets_array {
                if let (Some(id), Some(unit)) = (keyset.get("id"), keyset.get("unit")) {
                    if let (Some(id_str), Some(unit_str)) = (id.as_str(), unit.as_str()) {
                        keysets.push(KeysetInfo {
                            id: id_str.to_string(),
                            unit: unit_str.to_string(),
                            active: keyset
                                .get("active")
                                .and_then(|a| a.as_bool())
                                .unwrap_or(true),
                        });
                    }
                }
            }
        }
    }

    if keysets.is_empty() {
        keysets.push(KeysetInfo {
            id: "default".to_string(),
            unit: "msat".to_string(),
            active: true,
        });
    }

    Ok(keysets)
}

pub async fn create_mint_units(
    db: &Pool,
    mint_id: i32,
    keysets: &[KeysetInfo],
) -> Result<Vec<MintUnit>, sqlx::Error> {
    let mut units = Vec::new();

    for keyset in keysets {
        let unit = sqlx::query_as::<_, MintUnit>(
            "INSERT INTO mint_units (mint_id, unit, keyset_id, active, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (mint_id, unit) DO UPDATE SET
                keyset_id = EXCLUDED.keyset_id,
                active = EXCLUDED.active,
                updated_at = NOW()
             RETURNING id, mint_id, unit, keyset_id, active, created_at, updated_at",
        )
        .bind(mint_id)
        .bind(&keyset.unit)
        .bind(&keyset.id)
        .bind(keyset.active)
        .fetch_one(db)
        .await?;

        units.push(unit);
    }

    Ok(units)
}

pub async fn get_mint_units(db: &Pool, mint_id: i32) -> Result<Vec<MintUnit>, sqlx::Error> {
    let units = sqlx::query_as::<_, MintUnit>(
        "SELECT id, mint_id, unit, keyset_id, active, created_at, updated_at
         FROM mint_units
         WHERE mint_id = $1 AND active = TRUE
         ORDER BY unit",
    )
    .bind(mint_id)
    .fetch_all(db)
    .await?;

    Ok(units)
}

pub async fn get_mint_with_units(
    db: &Pool,
    mint_id: i32,
) -> Result<Option<MintWithUnits>, sqlx::Error> {
    let mint = get_mint_by_id(db, mint_id).await?;

    match mint {
        Some(mint) => {
            let units = get_mint_units(db, mint_id).await?;
            Ok(Some(MintWithUnits {
                mint,
                supported_units: units,
            }))
        }
        None => Ok(None),
    }
}

pub async fn get_active_mints_with_units(db: &Pool) -> Result<Vec<MintWithUnits>, sqlx::Error> {
    let mints = get_active_mints(db).await?;
    let mut mints_with_units = Vec::new();

    for mint in mints {
        let units = get_mint_units(db, mint.id).await?;
        mints_with_units.push(MintWithUnits {
            mint,
            supported_units: units,
        });
    }

    Ok(mints_with_units)
}

pub async fn get_active_mints_with_units_for_organization(
    db: &Pool,
    organization_id: &uuid::Uuid,
) -> Result<Vec<MintWithUnits>, sqlx::Error> {
    let mints = get_active_mints_for_organization(db, organization_id).await?;
    let mut mints_with_units = Vec::new();

    for mint in mints {
        let units = get_mint_units(db, mint.id).await?;
        mints_with_units.push(MintWithUnits {
            mint,
            supported_units: units,
        });
    }

    Ok(mints_with_units)
}
