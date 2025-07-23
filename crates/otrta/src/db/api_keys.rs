use crate::models::UserContext;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// Database row struct that matches the exact column types
#[derive(sqlx::FromRow)]
struct ApiKeyRow {
    pub id: Uuid,
    pub name: String,
    pub key: String,
    pub user_id: Option<String>,
    pub organization_id: Option<String>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl From<ApiKeyRow> for ApiKey {
    fn from(row: ApiKeyRow) -> Self {
        ApiKey {
            id: row.id.to_string(),
            name: row.name,
            key: row.key,
            user_id: row.user_id.unwrap_or_default(),
            organization_id: row.organization_id.unwrap_or_default(),
            last_used_at: row.last_used_at.map(|dt| dt.to_rfc3339()),
            expires_at: row.expires_at.map(|dt| dt.to_rfc3339()),
            is_active: row.is_active.unwrap_or(true),
            created_at: row.created_at.unwrap_or_else(chrono::Utc::now).to_rfc3339(),
            updated_at: row.updated_at.unwrap_or_else(chrono::Utc::now).to_rfc3339(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub key: String,
    pub user_id: String,
    pub organization_id: String,
    pub last_used_at: Option<String>,
    pub expires_at: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub expires_at: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    pub is_active: Option<bool>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ApiKeyListResponse {
    pub api_keys: Vec<ApiKey>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

pub async fn get_all_api_keys(
    pool: &PgPool,
    organization_id: Option<&str>,
    page: i64,
    page_size: i64,
) -> Result<ApiKeyListResponse, sqlx::Error> {
    let offset = (page - 1) * page_size;

    let (api_keys, total) = if let Some(org_id) = organization_id {
        let rows = sqlx::query_as!(
            ApiKeyRow,
            r#"
            SELECT id, name, key, user_id, organization_id, last_used_at, expires_at, 
                   is_active, created_at, updated_at
            FROM api_keys
            WHERE organization_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            org_id,
            page_size,
            offset
        )
        .fetch_all(pool)
        .await?;

        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM api_keys WHERE organization_id = $1",
            org_id
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        let api_keys = rows.into_iter().map(ApiKey::from).collect();

        (api_keys, total)
    } else {
        let rows = sqlx::query_as!(
            ApiKeyRow,
            r#"
            SELECT id, name, key, user_id, organization_id, last_used_at, expires_at, 
                   is_active, created_at, updated_at
            FROM api_keys
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            page_size,
            offset
        )
        .fetch_all(pool)
        .await?;

        let total = sqlx::query_scalar!("SELECT COUNT(*) FROM api_keys")
            .fetch_one(pool)
            .await?
            .unwrap_or(0);

        let api_keys = rows.into_iter().map(ApiKey::from).collect();

        (api_keys, total)
    };

    let total_pages = (total + page_size - 1) / page_size;

    Ok(ApiKeyListResponse {
        api_keys,
        total,
        page,
        page_size,
        total_pages,
    })
}

pub async fn get_api_key_by_id(pool: &PgPool, id: &str) -> Result<Option<ApiKey>, sqlx::Error> {
    let id_uuid = Uuid::parse_str(id).map_err(|_| sqlx::Error::RowNotFound)?;

    let row = sqlx::query_as!(
        ApiKeyRow,
        r#"
        SELECT id, name, key, user_id, organization_id, last_used_at, expires_at, 
               is_active, created_at, updated_at
        FROM api_keys
        WHERE id = $1
        "#,
        id_uuid
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(ApiKey::from))
}

pub async fn get_api_key_by_key(pool: &PgPool, key: &str) -> Result<Option<ApiKey>, sqlx::Error> {
    let row = sqlx::query_as!(
        ApiKeyRow,
        r#"
        SELECT id, name, key, user_id, organization_id, last_used_at, expires_at, 
               is_active, created_at, updated_at
        FROM api_keys
        WHERE key = $1 AND is_active = true
        "#,
        key
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(ApiKey::from))
}

pub async fn create_api_key(
    pool: &PgPool,
    request: CreateApiKeyRequest,
    user_context: &UserContext,
) -> Result<ApiKey, sqlx::Error> {
    let api_key = generate_api_key();
    let is_active = request.is_active.unwrap_or(true);

    let expires_at = if let Some(expires_str) = &request.expires_at {
        Some(
            DateTime::parse_from_rfc3339(expires_str)
                .map_err(|_| sqlx::Error::RowNotFound)?
                .with_timezone(&Utc),
        )
    } else {
        None
    };

    let row = sqlx::query_as!(
        ApiKeyRow,
        r#"
        INSERT INTO api_keys (name, key, user_id, organization_id, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, key, user_id, organization_id, last_used_at, expires_at, 
                  is_active, created_at, updated_at
        "#,
        request.name,
        api_key,
        user_context.npub,
        user_context.organization_id.to_string(),
        expires_at,
        is_active
    )
    .fetch_one(pool)
    .await?;

    Ok(ApiKey::from(row))
}

pub async fn update_api_key(
    pool: &PgPool,
    id: &str,
    request: UpdateApiKeyRequest,
) -> Result<Option<ApiKey>, sqlx::Error> {
    let id_uuid = Uuid::parse_str(id).map_err(|_| sqlx::Error::RowNotFound)?;

    let expires_at = if let Some(expires_str) = &request.expires_at {
        Some(
            DateTime::parse_from_rfc3339(expires_str)
                .map_err(|_| sqlx::Error::RowNotFound)?
                .with_timezone(&Utc),
        )
    } else {
        None
    };

    let row = sqlx::query_as!(
        ApiKeyRow,
        r#"
        UPDATE api_keys
        SET name = COALESCE($2, name),
            is_active = COALESCE($3, is_active),
            expires_at = COALESCE($4, expires_at),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, key, user_id, organization_id, last_used_at, expires_at, 
                  is_active, created_at, updated_at
        "#,
        id_uuid,
        request.name,
        request.is_active,
        expires_at
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(ApiKey::from))
}

pub async fn delete_api_key(pool: &PgPool, id: &str) -> Result<bool, sqlx::Error> {
    let id_uuid = Uuid::parse_str(id).map_err(|_| sqlx::Error::RowNotFound)?;

    let result = sqlx::query!("DELETE FROM api_keys WHERE id = $1", id_uuid)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn update_last_used_at(pool: &PgPool, id: &str) -> Result<(), sqlx::Error> {
    let id_uuid = Uuid::parse_str(id).map_err(|_| sqlx::Error::RowNotFound)?;

    sqlx::query!(
        "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",
        id_uuid
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_api_key_by_id_for_user(
    pool: &PgPool,
    id: &str,
    organization_id: &str,
) -> Result<Option<ApiKey>, sqlx::Error> {
    let id_uuid = Uuid::parse_str(id).map_err(|_| sqlx::Error::RowNotFound)?;
    let org_uuid = Uuid::parse_str(organization_id).map_err(|_| sqlx::Error::RowNotFound)?;

    let row = sqlx::query_as!(
        ApiKeyRow,
        r#"
        SELECT id, name, key, user_id, organization_id, last_used_at, expires_at, 
               is_active, created_at, updated_at
        FROM api_keys
        WHERE id = $1 AND organization_id = $2
        "#,
        id_uuid,
        org_uuid.to_string()
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(ApiKey::from))
}

pub async fn update_api_key_for_user(
    pool: &PgPool,
    id: &str,
    organization_id: &str,
    request: UpdateApiKeyRequest,
) -> Result<Option<ApiKey>, sqlx::Error> {
    let id_uuid = Uuid::parse_str(id).map_err(|_| sqlx::Error::RowNotFound)?;
    let org_uuid = Uuid::parse_str(organization_id).map_err(|_| sqlx::Error::RowNotFound)?;

    let expires_at = if let Some(expires_str) = &request.expires_at {
        Some(
            DateTime::parse_from_rfc3339(expires_str)
                .map_err(|_| sqlx::Error::RowNotFound)?
                .with_timezone(&Utc),
        )
    } else {
        None
    };

    let row = sqlx::query_as!(
        ApiKeyRow,
        r#"
        UPDATE api_keys
        SET name = COALESCE($3, name),
            is_active = COALESCE($4, is_active),
            expires_at = COALESCE($5, expires_at),
            updated_at = NOW()
        WHERE id = $1 AND organization_id = $2
        RETURNING id, name, key, user_id, organization_id, last_used_at, expires_at, 
                  is_active, created_at, updated_at
        "#,
        id_uuid,
        org_uuid.to_string(),
        request.name,
        request.is_active,
        expires_at
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(ApiKey::from))
}

pub async fn delete_api_key_for_user(
    pool: &PgPool,
    id: &str,
    organization_id: &str,
) -> Result<bool, sqlx::Error> {
    let id_uuid = Uuid::parse_str(id).map_err(|_| sqlx::Error::RowNotFound)?;
    let org_uuid = Uuid::parse_str(organization_id).map_err(|_| sqlx::Error::RowNotFound)?;

    let result = sqlx::query!(
        "DELETE FROM api_keys WHERE id = $1 AND organization_id = $2",
        id_uuid,
        org_uuid.to_string()
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

fn generate_api_key() -> String {
    use rand::distributions::Alphanumeric;
    use rand::prelude::*;

    let mut rng = thread_rng();
    let key: String = (0..32).map(|_| rng.sample(Alphanumeric) as char).collect();

    format!("otrta_{}", key)
}
