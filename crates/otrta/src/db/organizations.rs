use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{Organization, CreateOrganizationRequest};

pub async fn create_organization(
    pool: &PgPool,
    request: &CreateOrganizationRequest,
) -> Result<Organization, AppError> {
    let now = chrono::Utc::now();
    let id = Uuid::new_v4();
    
    let organization = sqlx::query!(
        r#"
        INSERT INTO organizations (id, name, owner_npub, created_at, updated_at, is_active)
        VALUES ($1, $2, $3, $4, $4, true)
        RETURNING id, name, owner_npub, created_at, updated_at, is_active
        "#,
        id,
        request.name,
        request.owner_npub,
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
        owner_npub: organization.owner_npub,
        created_at: organization.created_at.unwrap_or_else(chrono::Utc::now),
        updated_at: organization.updated_at.unwrap_or_else(chrono::Utc::now),
        is_active: organization.is_active.unwrap_or(true),
    };

    Ok(organization)
}

pub async fn get_organization_by_id(pool: &PgPool, id: &Uuid) -> Result<Option<Organization>, AppError> {
    let row = sqlx::query!(
        r#"
        SELECT id, name, owner_npub, created_at, updated_at, is_active
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
        owner_npub: r.owner_npub,
        created_at: r.created_at.unwrap_or_else(Utc::now),
        updated_at: r.updated_at.unwrap_or_else(Utc::now),
        is_active: r.is_active.unwrap_or(true),
    });

    Ok(organization)
}

pub async fn get_organizations_by_owner(pool: &PgPool, owner_npub: &str) -> Result<Vec<Organization>, AppError> {
    let rows = sqlx::query!(
        r#"
        SELECT id, name, owner_npub, created_at, updated_at, is_active
        FROM organizations
        WHERE owner_npub = $1 AND is_active = true
        ORDER BY created_at DESC
        "#,
        owner_npub
    )
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get organizations by owner: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    let organizations = rows.into_iter().map(|r| Organization {
        id: r.id,
        name: r.name,
        owner_npub: r.owner_npub,
        created_at: r.created_at.unwrap_or_else(Utc::now),
        updated_at: r.updated_at.unwrap_or_else(Utc::now),
        is_active: r.is_active.unwrap_or(true),
    }).collect();

    Ok(organizations)
}

pub async fn get_default_organization_for_user(pool: &PgPool, user_npub: &str) -> Result<Option<Organization>, AppError> {
    let row = sqlx::query!(
        r#"
        SELECT id, name, owner_npub, created_at, updated_at, is_active
        FROM organizations
        WHERE owner_npub = $1 AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1
        "#,
        user_npub
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get default organization for user: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    let organization = row.map(|r| Organization {
        id: r.id,
        name: r.name,
        owner_npub: r.owner_npub,
        created_at: r.created_at.unwrap_or_else(Utc::now),
        updated_at: r.updated_at.unwrap_or_else(Utc::now),
        is_active: r.is_active.unwrap_or(true),
    });

    Ok(organization)
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

pub async fn user_owns_organization(pool: &PgPool, user_npub: &str, org_id: &Uuid) -> Result<bool, AppError> {
    let count = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) as count
        FROM organizations
        WHERE id = $1 AND owner_npub = $2 AND is_active = true
        "#,
        org_id,
        user_npub
    )
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check if user owns organization: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;

    Ok(count.unwrap_or(0) > 0)
} 