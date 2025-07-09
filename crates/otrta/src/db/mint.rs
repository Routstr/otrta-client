use crate::db::Pool;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Mint {
    pub id: i32,
    pub mint_url: String,
    pub currency_unit: String,
    pub is_active: bool,
    pub name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MintListResponse {
    pub mints: Vec<Mint>,
    pub total: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMintRequest {
    pub mint_url: String,
    pub currency_unit: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMintRequest {
    pub is_active: Option<bool>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MintBalance {
    pub mint_url: String,
    pub balance: u64,
    pub unit: String,
    pub proof_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MultimintBalance {
    pub total_balance: u64,
    pub balances_by_mint: Vec<MintBalance>,
}

pub async fn get_all_mints(db: &Pool) -> Result<Vec<Mint>, sqlx::Error> {
    let mints = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, created_at, updated_at 
         FROM mints 
         ORDER BY created_at ASC"
    )
    .fetch_all(db)
    .await?;

    Ok(mints)
}

pub async fn get_active_mints(db: &Pool) -> Result<Vec<Mint>, sqlx::Error> {
    let mints = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, created_at, updated_at 
         FROM mints 
         WHERE is_active = TRUE
         ORDER BY created_at ASC"
    )
    .fetch_all(db)
    .await?;

    Ok(mints)
}

pub async fn get_mint_by_id(db: &Pool, id: i32) -> Result<Option<Mint>, sqlx::Error> {
    let mint = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, created_at, updated_at 
         FROM mints 
         WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(db)
    .await?;

    Ok(mint)
}

pub async fn get_mint_by_url(db: &Pool, mint_url: &str) -> Result<Option<Mint>, sqlx::Error> {
    let mint = sqlx::query_as::<_, Mint>(
        "SELECT id, mint_url, currency_unit, is_active, name, created_at, updated_at 
         FROM mints 
         WHERE mint_url = $1"
    )
    .bind(mint_url)
    .fetch_optional(db)
    .await?;

    Ok(mint)
}

pub async fn create_mint(
    db: &Pool,
    request: CreateMintRequest,
) -> Result<Mint, sqlx::Error> {
    let currency_unit = request.currency_unit.unwrap_or_else(|| "Msat".to_string());
    
    let mint = sqlx::query_as::<_, Mint>(
        "INSERT INTO mints (mint_url, currency_unit, is_active, name, updated_at)
         VALUES ($1, $2, TRUE, $3, NOW())
         RETURNING id, mint_url, currency_unit, is_active, name, created_at, updated_at"
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
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, mint_url, currency_unit, is_active, name, created_at, updated_at"
    )
    .bind(request.is_active)
    .bind(request.name)
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