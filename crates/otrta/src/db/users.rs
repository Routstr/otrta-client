use chrono::Utc;
use sqlx::PgPool;

use crate::error::AppError;
use crate::models::{CreateUserRequest, User};

pub async fn create_user(pool: &PgPool, request: &CreateUserRequest) -> Result<User, AppError> {
    let now = chrono::Utc::now();

    let row = sqlx::query!(
        r#"
        INSERT INTO users (npub, display_name, email, organization_id, created_at, updated_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $5, true)
        RETURNING npub, display_name, email, organization_id, created_at, updated_at, last_login_at, is_active
        "#,
        request.npub,
        request.display_name,
        request.email,
        request.organization_id,
        now
    )
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create user: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    let user = User {
        npub: row.npub,
        display_name: row.display_name,
        email: row.email,
        organization_id: row.organization_id,
        created_at: row.created_at.unwrap_or_else(Utc::now),
        updated_at: row.updated_at.unwrap_or_else(Utc::now),
        last_login_at: row.last_login_at,
        is_active: row.is_active.unwrap_or(true),
    };

    Ok(user)
}

pub async fn get_user_by_npub(pool: &PgPool, npub: &str) -> Result<Option<User>, AppError> {
    let row = sqlx::query!(
        r#"
        SELECT npub, display_name, email, organization_id, created_at, updated_at, last_login_at, is_active
        FROM users
        WHERE npub = $1 AND is_active = true
        "#,
        npub
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get user by npub: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    let user = row.map(|r| User {
        npub: r.npub,
        display_name: r.display_name,
        email: r.email,
        organization_id: r.organization_id,
        created_at: r.created_at.unwrap_or_else(Utc::now),
        updated_at: r.updated_at.unwrap_or_else(Utc::now),
        last_login_at: r.last_login_at,
        is_active: r.is_active.unwrap_or(true),
    });

    Ok(user)
}

pub async fn update_last_login(pool: &PgPool, npub: &str) -> Result<(), AppError> {
    let now = chrono::Utc::now();

    sqlx::query!(
        r#"
        UPDATE users 
        SET last_login_at = $1, updated_at = $1
        WHERE npub = $2
        "#,
        now,
        npub
    )
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update last login: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    Ok(())
}

pub async fn user_exists(pool: &PgPool, npub: &str) -> Result<bool, AppError> {
    let count = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) as count
        FROM users
        WHERE npub = $1
        "#,
        npub
    )
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check if user exists: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    Ok(count.unwrap_or(0) > 0)
}

pub fn validate_npub(npub: &str) -> Result<(), AppError> {
    if !npub.starts_with("npub1") {
        return Err(AppError::ValidationError(
            "Invalid npub format: must start with 'npub1'".to_string(),
        ));
    }

    if npub.len() != 63 {
        return Err(AppError::ValidationError(
            "Invalid npub format: must be 63 characters long".to_string(),
        ));
    }

    Ok(())
}
