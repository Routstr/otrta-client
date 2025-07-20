use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{CreateOrganizationRequest, Organization};

pub async fn create_organization(
    pool: &PgPool,
    request: &CreateOrganizationRequest,
) -> Result<Organization, AppError> {
    let now = chrono::Utc::now();
    let id = Uuid::new_v4();

    let organization = sqlx::query!(
        r#"
        INSERT INTO organizations (id, name, created_at, updated_at, is_active)
        VALUES ($1, $2, $3, $3, true)
        RETURNING id, name, created_at, updated_at, is_active
        "#,
        id,
        request.name,
        now
    )
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create organization: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    let organization = Organization {
        id: organization.id,
        name: organization.name,
        created_at: organization.created_at.unwrap_or_else(chrono::Utc::now),
        updated_at: organization.updated_at.unwrap_or_else(chrono::Utc::now),
        is_active: organization.is_active.unwrap_or(true),
    };

    Ok(organization)
}

pub async fn get_organization_by_id(
    pool: &PgPool,
    id: &Uuid,
) -> Result<Option<Organization>, AppError> {
    let row = sqlx::query!(
        r#"
        SELECT id, name, created_at, updated_at, is_active
        FROM organizations
        WHERE id = $1 AND is_active = true
        "#,
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get organization by id: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    let organization = row.map(|r| Organization {
        id: r.id,
        name: r.name,
        created_at: r.created_at.unwrap_or_else(Utc::now),
        updated_at: r.updated_at.unwrap_or_else(Utc::now),
        is_active: r.is_active.unwrap_or(true),
    });

    Ok(organization)
}

pub async fn get_organization_for_user(
    pool: &PgPool,
    user_npub: &str,
) -> Result<Option<Organization>, AppError> {
    let row = sqlx::query!(
        r#"
        SELECT o.id, o.name, o.created_at, o.updated_at, o.is_active
        FROM organizations o
        INNER JOIN users u ON u.organization_id = o.id
        WHERE u.npub = $1 AND o.is_active = true AND u.is_active = true
        "#,
        user_npub
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get organization for user: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    let organization = row.map(|r| Organization {
        id: r.id,
        name: r.name,
        created_at: r.created_at.unwrap_or_else(Utc::now),
        updated_at: r.updated_at.unwrap_or_else(Utc::now),
        is_active: r.is_active.unwrap_or(true),
    });

    Ok(organization)
}

pub async fn get_default_organization_for_user(
    pool: &PgPool,
    user_npub: &str,
) -> Result<Option<Organization>, AppError> {
    // Since users now belong to one organization, this is the same as get_organization_for_user
    get_organization_for_user(pool, user_npub).await
}

pub async fn organization_exists(pool: &PgPool, id: &Uuid) -> Result<bool, AppError> {
    let count = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) as count
        FROM organizations
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check if organization exists: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    Ok(count.unwrap_or(0) > 0)
}

pub async fn user_belongs_to_organization(
    pool: &PgPool,
    user_npub: &str,
    org_id: &Uuid,
) -> Result<bool, AppError> {
    let count = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) as count
        FROM users
        WHERE npub = $1 AND organization_id = $2 AND is_active = true
        "#,
        user_npub,
        org_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check if user belongs to organization: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    Ok(count.unwrap_or(0) > 0)
}
