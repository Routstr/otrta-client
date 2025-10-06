use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NwcConnection {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub connection_uri: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MintAutoRefillSettings {
    pub id: Uuid,
    pub mint_id: i32,
    pub organization_id: Uuid,
    pub nwc_connection_id: Uuid,
    pub min_balance_threshold_msat: i64,
    pub refill_amount_msat: i64,
    pub is_enabled: bool,
    pub last_refill_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNwcConnectionRequest {
    pub name: String,
    pub connection_uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNwcConnectionRequest {
    pub name: Option<String>,
    pub connection_uri: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMintAutoRefillRequest {
    pub mint_id: i32,
    pub nwc_connection_id: Uuid,
    pub min_balance_threshold_msat: i64,
    pub refill_amount_msat: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMintAutoRefillRequest {
    pub nwc_connection_id: Option<Uuid>,
    pub min_balance_threshold_msat: Option<i64>,
    pub refill_amount_msat: Option<i64>,
    pub is_enabled: Option<bool>,
}

pub async fn create_nwc_connection(
    pool: &PgPool,
    organization_id: &Uuid,
    request: CreateNwcConnectionRequest,
) -> Result<NwcConnection, AppError> {
    let connection = sqlx::query_as::<_, NwcConnection>(
        "INSERT INTO nwc_connections (organization_id, name, connection_uri, updated_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, organization_id, name, connection_uri, is_active, created_at, updated_at",
    )
    .bind(organization_id)
    .bind(&request.name)
    .bind(&request.connection_uri)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create NWC connection: {}", e);
        AppError::InternalServerError
    })?;

    Ok(connection)
}

pub async fn get_nwc_connections_for_organization(
    pool: &PgPool,
    organization_id: &Uuid,
) -> Result<Vec<NwcConnection>, AppError> {
    let connections = sqlx::query_as::<_, NwcConnection>(
        "SELECT id, organization_id, name, connection_uri, is_active, created_at, updated_at
         FROM nwc_connections
         WHERE organization_id = $1
         ORDER BY created_at DESC",
    )
    .bind(organization_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get NWC connections: {}", e);
        AppError::InternalServerError
    })?;

    Ok(connections)
}

pub async fn get_active_nwc_connections_for_organization(
    pool: &PgPool,
    organization_id: &Uuid,
) -> Result<Vec<NwcConnection>, AppError> {
    let connections = sqlx::query_as::<_, NwcConnection>(
        "SELECT id, organization_id, name, connection_uri, is_active, created_at, updated_at
         FROM nwc_connections
         WHERE organization_id = $1 AND is_active = TRUE
         ORDER BY created_at DESC",
    )
    .bind(organization_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get active NWC connections: {}", e);
        AppError::InternalServerError
    })?;

    Ok(connections)
}

pub async fn get_nwc_connection_by_id(
    pool: &PgPool,
    id: &Uuid,
    organization_id: &Uuid,
) -> Result<Option<NwcConnection>, AppError> {
    let connection = sqlx::query_as::<_, NwcConnection>(
        "SELECT id, organization_id, name, connection_uri, is_active, created_at, updated_at
         FROM nwc_connections
         WHERE id = $1 AND organization_id = $2",
    )
    .bind(id)
    .bind(organization_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get NWC connection by ID: {}", e);
        AppError::InternalServerError
    })?;

    Ok(connection)
}

pub async fn update_nwc_connection(
    pool: &PgPool,
    id: &Uuid,
    organization_id: &Uuid,
    request: UpdateNwcConnectionRequest,
) -> Result<Option<NwcConnection>, AppError> {
    let connection = sqlx::query_as::<_, NwcConnection>(
        "UPDATE nwc_connections
         SET name = COALESCE($3, name),
             connection_uri = COALESCE($4, connection_uri),
             is_active = COALESCE($5, is_active),
             updated_at = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING id, organization_id, name, connection_uri, is_active, created_at, updated_at",
    )
    .bind(id)
    .bind(organization_id)
    .bind(request.name)
    .bind(request.connection_uri)
    .bind(request.is_active)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update NWC connection: {}", e);
        AppError::InternalServerError
    })?;

    Ok(connection)
}

pub async fn delete_nwc_connection(
    pool: &PgPool,
    id: &Uuid,
    organization_id: &Uuid,
) -> Result<bool, AppError> {
    let result = sqlx::query("DELETE FROM nwc_connections WHERE id = $1 AND organization_id = $2")
        .bind(id)
        .bind(organization_id)
        .execute(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete NWC connection: {}", e);
            AppError::InternalServerError
        })?;

    Ok(result.rows_affected() > 0)
}

pub async fn create_mint_auto_refill_settings(
    pool: &PgPool,
    organization_id: &Uuid,
    request: CreateMintAutoRefillRequest,
) -> Result<MintAutoRefillSettings, AppError> {
    let settings = sqlx::query_as::<_, MintAutoRefillSettings>(
        "INSERT INTO mint_auto_refill_settings (mint_id, organization_id, nwc_connection_id, min_balance_threshold_msat, refill_amount_msat, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, mint_id, organization_id, nwc_connection_id, min_balance_threshold_msat, refill_amount_msat, is_enabled, last_refill_at, created_at, updated_at",
    )
    .bind(request.mint_id)
    .bind(organization_id)
    .bind(request.nwc_connection_id)
    .bind(request.min_balance_threshold_msat)
    .bind(request.refill_amount_msat)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create mint auto-refill settings: {}", e);
        AppError::InternalServerError
    })?;

    Ok(settings)
}

pub async fn get_mint_auto_refill_settings_for_organization(
    pool: &PgPool,
    organization_id: &Uuid,
) -> Result<Vec<MintAutoRefillSettings>, AppError> {
    let settings = sqlx::query_as::<_, MintAutoRefillSettings>(
        "SELECT id, mint_id, organization_id, nwc_connection_id, min_balance_threshold_msat, refill_amount_msat, is_enabled, last_refill_at, created_at, updated_at
         FROM mint_auto_refill_settings
         WHERE organization_id = $1
         ORDER BY created_at DESC",
    )
    .bind(organization_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get mint auto-refill settings: {}", e);
        AppError::InternalServerError
    })?;

    Ok(settings)
}

pub async fn get_enabled_mint_auto_refill_settings(
    pool: &PgPool,
) -> Result<Vec<MintAutoRefillSettings>, AppError> {
    let settings = sqlx::query_as::<_, MintAutoRefillSettings>(
        "SELECT mars.id, mars.mint_id, mars.organization_id, mars.nwc_connection_id,
                mars.min_balance_threshold_msat, mars.refill_amount_msat, mars.is_enabled,
                mars.last_refill_at, mars.created_at, mars.updated_at
         FROM mint_auto_refill_settings mars
         JOIN nwc_connections nwc ON mars.nwc_connection_id = nwc.id
         JOIN mints m ON mars.mint_id = m.id
         WHERE mars.is_enabled = TRUE AND nwc.is_active = TRUE AND m.is_active = TRUE
         ORDER BY mars.last_refill_at ASC NULLS FIRST",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get enabled mint auto-refill settings: {}", e);
        AppError::InternalServerError
    })?;

    Ok(settings)
}

pub async fn get_mint_auto_refill_settings_by_mint(
    pool: &PgPool,
    mint_id: i32,
    organization_id: &Uuid,
) -> Result<Option<MintAutoRefillSettings>, AppError> {
    let settings = sqlx::query_as::<_, MintAutoRefillSettings>(
        "SELECT id, mint_id, organization_id, nwc_connection_id, min_balance_threshold_msat, refill_amount_msat, is_enabled, last_refill_at, created_at, updated_at
         FROM mint_auto_refill_settings
         WHERE mint_id = $1 AND organization_id = $2",
    )
    .bind(mint_id)
    .bind(organization_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get mint auto-refill settings by mint: {}", e);
        AppError::InternalServerError
    })?;

    Ok(settings)
}

pub async fn update_mint_auto_refill_settings(
    pool: &PgPool,
    id: &Uuid,
    organization_id: &Uuid,
    request: UpdateMintAutoRefillRequest,
) -> Result<Option<MintAutoRefillSettings>, AppError> {
    let settings = sqlx::query_as::<_, MintAutoRefillSettings>(
        "UPDATE mint_auto_refill_settings
         SET nwc_connection_id = COALESCE($3, nwc_connection_id),
             min_balance_threshold_msat = COALESCE($4, min_balance_threshold_msat),
             refill_amount_msat = COALESCE($5, refill_amount_msat),
             is_enabled = COALESCE($6, is_enabled),
             updated_at = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING id, mint_id, organization_id, nwc_connection_id, min_balance_threshold_msat, refill_amount_msat, is_enabled, last_refill_at, created_at, updated_at",
    )
    .bind(id)
    .bind(organization_id)
    .bind(request.nwc_connection_id)
    .bind(request.min_balance_threshold_msat)
    .bind(request.refill_amount_msat)
    .bind(request.is_enabled)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update mint auto-refill settings: {}", e);
        AppError::InternalServerError
    })?;

    Ok(settings)
}

pub async fn update_last_refill_time(pool: &PgPool, id: &Uuid) -> Result<bool, AppError> {
    let result = sqlx::query(
        "UPDATE mint_auto_refill_settings
         SET last_refill_at = NOW(), updated_at = NOW()
         WHERE id = $1",
    )
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update last refill time: {}", e);
        AppError::InternalServerError
    })?;

    Ok(result.rows_affected() > 0)
}

pub async fn delete_mint_auto_refill_settings(
    pool: &PgPool,
    id: &Uuid,
    organization_id: &Uuid,
) -> Result<bool, AppError> {
    let result =
        sqlx::query("DELETE FROM mint_auto_refill_settings WHERE id = $1 AND organization_id = $2")
            .bind(id)
            .bind(organization_id)
            .execute(pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to delete mint auto-refill settings: {}", e);
                AppError::InternalServerError
            })?;

    Ok(result.rows_affected() > 0)
}
