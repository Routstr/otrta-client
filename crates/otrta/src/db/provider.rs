use crate::db::Pool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Provider {
    pub id: i32,
    pub name: String,
    pub url: String,
    pub mints: Vec<String>,
    pub use_onion: bool,
    pub followers: i32,
    pub zaps: i32,
    pub is_default: bool,
    pub is_custom: bool,
    pub organization_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct OrganizationProvider {
    pub organization_id: Uuid,
    pub provider_id: i32,
    pub is_default: bool,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderWithStatus {
    #[serde(flatten)]
    pub provider: Provider,
    pub is_active_for_org: bool,
    pub is_default_for_org: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderListResponse {
    pub providers: Vec<Provider>,
    pub total: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshProvidersResponse {
    pub success: bool,
    pub providers_updated: i32,
    pub providers_added: i32,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomProviderRequest {
    pub name: String,
    pub url: String,
    pub mints: Vec<String>,
    pub use_onion: bool,
}

pub async fn get_all_providers(db: &Pool) -> Result<Vec<Provider>, sqlx::Error> {
    let providers = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at
         FROM providers
         ORDER BY is_default DESC, is_custom ASC, followers DESC, zaps DESC"
    )
    .fetch_all(db)
    .await?;

    Ok(providers)
}

pub async fn get_default_provider(db: &Pool) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at
         FROM providers
         WHERE is_default = TRUE"
    )
    .fetch_optional(db)
    .await?;

    Ok(provider)
}

pub async fn get_provider_by_id(db: &Pool, id: i32) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at
         FROM providers
         WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(db)
    .await?;

    Ok(provider)
}

pub async fn set_default_provider(db: &Pool, id: i32) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE providers SET is_default = FALSE")
        .execute(db)
        .await?;

    sqlx::query("UPDATE providers SET is_default = TRUE WHERE id = $1")
        .bind(id)
        .execute(db)
        .await?;

    Ok(())
}

pub async fn create_custom_provider(
    db: &Pool,
    request: CreateCustomProviderRequest,
) -> Result<Provider, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, updated_at)
         VALUES ($1, $2, $3, $4, 0, 0, TRUE, NOW())
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(&request.url)
    .bind(&request.mints)
    .bind(request.use_onion)
    .fetch_one(db)
    .await?;

    Ok(provider)
}

pub async fn delete_custom_provider(db: &Pool, id: i32) -> Result<bool, sqlx::Error> {
    // First check if the provider exists and get its details
    let provider_check = sqlx::query!(
        "SELECT id, name, is_custom, organization_id FROM providers WHERE id = $1",
        id
    )
    .fetch_optional(db)
    .await?;

    if let Some(provider) = provider_check {
        eprintln!(
            "Provider found: id={}, name={}, is_custom={:?}, organization_id={:?}",
            provider.id, provider.name, provider.is_custom, provider.organization_id
        );

        if !provider.is_custom.unwrap_or(false) {
            eprintln!("Provider {} is not marked as custom, cannot delete", id);
            return Ok(false);
        }
    } else {
        eprintln!("Provider {} not found", id);
        return Ok(false);
    }

    let result = sqlx::query("DELETE FROM providers WHERE id = $1 AND is_custom = TRUE")
        .bind(id)
        .execute(db)
        .await?;

    let deleted = result.rows_affected() > 0;
    eprintln!(
        "Delete result for provider {}: {} rows affected",
        id,
        result.rows_affected()
    );
    Ok(deleted)
}

pub async fn upsert_provider(
    db: &Pool,
    name: &str,
    url: &str,
    mints: Vec<String>,
    use_onion: bool,
    followers: i32,
    zaps: i32,
) -> Result<Provider, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
         ON CONFLICT (url)
         DO UPDATE SET
            name = EXCLUDED.name,
            mints = EXCLUDED.mints,
            use_onion = EXCLUDED.use_onion,
            followers = EXCLUDED.followers,
            zaps = EXCLUDED.zaps,
            updated_at = NOW()
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at"
    )
    .bind(name)
    .bind(url)
    .bind(&mints)
    .bind(use_onion)
    .bind(followers)
    .bind(zaps)
    .fetch_one(db)
    .await?;

    Ok(provider)
}

pub async fn refresh_providers_from_nostr(
    db: &Pool,
) -> Result<RefreshProvidersResponse, Box<dyn std::error::Error>> {
    // This is a placeholder for now - in a real implementation, you would:
    // 1. Connect to Nostr relays
    // 2. Query for provider announcements using specific event kinds
    // 3. Parse the provider data from the events
    // 4. Update the database with fresh data

    // For now, we'll simulate updating the existing providers with new follower/zap counts
    let mut providers_updated = 0;

    // Simulate fetching updated data from Nostr (only update non-custom providers)
    let mock_updates = vec![
        (1, 1300, 92000),  // Lightning Labs Provider
        (2, 920, 47500),   // Casa Node Provider
        (3, 2200, 160000), // Strike Provider
        (4, 720, 34800),   // Breez Provider
        (5, 1500, 82000),  // Alby Provider
    ];

    for (id, new_followers, new_zaps) in mock_updates {
        match sqlx::query(
            "UPDATE providers SET followers = $1, zaps = $2, updated_at = NOW() WHERE id = $3 AND is_custom = FALSE"
        )
        .bind(new_followers)
        .bind(new_zaps)
        .bind(id)
        .execute(db)
        .await
        {
            Ok(result) => {
                if result.rows_affected() > 0 {
                    providers_updated += 1;
                }
            }
            Err(e) => {
                eprintln!("Failed to update provider {}: {}", id, e);
            }
        }
    }

    Ok(RefreshProvidersResponse {
        success: true,
        providers_updated,
        providers_added: 0,
        message: Some(format!(
            "Updated {} providers from Nostr marketplace",
            providers_updated
        )),
    })
}

pub async fn get_providers_for_organization(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Vec<Provider>, sqlx::Error> {
    let providers = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at
         FROM providers
         WHERE organization_id IS NULL OR organization_id = $1
         ORDER BY is_default DESC, is_custom ASC, followers DESC, zaps DESC"
    )
    .bind(organization_id)
    .fetch_all(db)
    .await?;

    Ok(providers)
}

pub async fn get_default_provider_for_organization(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at
         FROM providers
         WHERE is_default = TRUE AND (organization_id IS NULL OR organization_id = $1)"
    )
    .bind(organization_id)
    .fetch_optional(db)
    .await?;

    Ok(provider)
}

pub async fn get_provider_by_id_for_organization(
    db: &Pool,
    id: i32,
    organization_id: &Uuid,
) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at
         FROM providers
         WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)"
    )
    .bind(id)
    .bind(organization_id)
    .fetch_optional(db)
    .await?;

    Ok(provider)
}

pub async fn create_custom_provider_for_organization(
    db: &Pool,
    request: CreateCustomProviderRequest,
    organization_id: &Uuid,
) -> Result<Provider, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, organization_id, updated_at)
         VALUES ($1, $2, $3, $4, 0, 0, TRUE, $5, NOW())
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, organization_id, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(&request.url)
    .bind(&request.mints)
    .bind(request.use_onion)
    .bind(organization_id)
    .fetch_one(db)
    .await?;

    Ok(provider)
}

pub async fn delete_custom_provider_for_organization(
    db: &Pool,
    id: i32,
    organization_id: &Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM providers WHERE id = $1 AND is_custom = TRUE AND organization_id = $2",
    )
    .bind(id)
    .bind(organization_id)
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn set_default_provider_for_organization(
    db: &Pool,
    id: i32,
    organization_id: &Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE providers SET is_default = FALSE WHERE organization_id = $1")
        .bind(organization_id)
        .execute(db)
        .await?;

    let result = sqlx::query("UPDATE providers SET is_default = TRUE WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)")
        .bind(id)
        .bind(organization_id)
        .execute(db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(())
}

pub async fn get_available_providers_for_organization(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Vec<ProviderWithStatus>, sqlx::Error> {
    let providers = sqlx::query!(
        r#"
        SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom, p.organization_id, p.created_at, p.updated_at,
            COALESCE(op.is_active, false) as is_active_for_org,
            COALESCE(op.is_default, false) as is_default_for_org
        FROM providers p
        LEFT JOIN organization_providers op
            ON p.id = op.provider_id AND op.organization_id = $1
        WHERE p.organization_id IS NULL OR p.organization_id = $1
        ORDER BY p.is_default DESC, p.is_custom ASC, p.followers DESC, p.zaps DESC
        "#,
        organization_id
    )
    .fetch_all(db)
    .await?;

    let result = providers
        .into_iter()
        .map(|row| ProviderWithStatus {
            provider: Provider {
                id: row.id,
                name: row.name,
                url: row.url,
                mints: row.mints.unwrap_or_default(),
                use_onion: row.use_onion.unwrap_or(false),
                followers: row.followers.unwrap_or(0),
                zaps: row.zaps.unwrap_or(0),
                is_default: row.is_default.unwrap_or(false),
                is_custom: row.is_custom.unwrap_or(false),
                organization_id: row.organization_id,
                created_at: row.created_at.unwrap_or_else(chrono::Utc::now),
                updated_at: row.updated_at.unwrap_or_else(chrono::Utc::now),
            },
            is_active_for_org: row.is_active_for_org.unwrap_or(false),
            is_default_for_org: row.is_default_for_org.unwrap_or(false),
        })
        .collect();

    Ok(result)
}

pub async fn get_active_providers_for_organization(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Vec<Provider>, sqlx::Error> {
    let providers = sqlx::query_as::<_, Provider>(
        r#"
        SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom, p.organization_id, p.created_at, p.updated_at
        FROM providers p
        INNER JOIN organization_providers op
            ON p.id = op.provider_id
        WHERE op.organization_id = $1 AND op.is_active = true
        ORDER BY op.is_default DESC, p.followers DESC, p.zaps DESC
        "#,
    )
    .bind(organization_id)
    .fetch_all(db)
    .await?;

    Ok(providers)
}

pub async fn get_default_provider_for_organization_new(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        r#"
        SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom, p.organization_id, p.created_at, p.updated_at
        FROM providers p
        INNER JOIN organization_providers op
            ON p.id = op.provider_id
        WHERE op.organization_id = $1 AND op.is_default = true AND op.is_active = true
        "#,
    )
    .bind(organization_id)
    .fetch_optional(db)
    .await?;

    Ok(provider)
}

pub async fn activate_provider_for_organization(
    db: &Pool,
    organization_id: &Uuid,
    provider_id: i32,
) -> Result<OrganizationProvider, sqlx::Error> {
    // First check if the provider is available to this organization
    let provider_exists = sqlx::query!(
        "SELECT id FROM providers WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)",
        provider_id,
        organization_id
    )
    .fetch_optional(db)
    .await?;

    if provider_exists.is_none() {
        return Err(sqlx::Error::RowNotFound);
    }

    // Insert or update the organization_provider relationship
    let org_provider = sqlx::query_as::<_, OrganizationProvider>(
        r#"
        INSERT INTO organization_providers (organization_id, provider_id, is_active, updated_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (organization_id, provider_id)
        DO UPDATE SET
            is_active = true,
            updated_at = NOW()
        RETURNING organization_id, provider_id, is_default, is_active, created_at, updated_at
        "#,
    )
    .bind(organization_id)
    .bind(provider_id)
    .fetch_one(db)
    .await?;

    Ok(org_provider)
}

pub async fn deactivate_provider_for_organization(
    db: &Pool,
    organization_id: &Uuid,
    provider_id: i32,
) -> Result<bool, sqlx::Error> {
    // Check if this is the default provider
    let is_default = sqlx::query!(
        "SELECT is_default FROM organization_providers WHERE organization_id = $1 AND provider_id = $2",
        organization_id,
        provider_id
    )
    .fetch_optional(db)
    .await?;

    if let Some(row) = is_default {
        if row.is_default.unwrap_or(false) {
            // Cannot deactivate the default provider
            return Err(sqlx::Error::RowNotFound); // We'll use this to indicate the constraint violation
        }
    }

    let result = sqlx::query!(
        "UPDATE organization_providers SET is_active = false, updated_at = NOW() WHERE organization_id = $1 AND provider_id = $2",
        organization_id,
        provider_id
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn set_default_provider_for_organization_new(
    db: &Pool,
    organization_id: &Uuid,
    provider_id: i32,
) -> Result<(), sqlx::Error> {
    // Start a transaction
    let mut tx = db.begin().await?;

    // Clear existing default
    sqlx::query!(
        "UPDATE organization_providers SET is_default = false WHERE organization_id = $1",
        organization_id
    )
    .execute(&mut *tx)
    .await?;

    // Set new default (and ensure it's active)
    let result = sqlx::query!(
        r#"
        INSERT INTO organization_providers (organization_id, provider_id, is_default, is_active, updated_at)
        VALUES ($1, $2, true, true, NOW())
        ON CONFLICT (organization_id, provider_id)
        DO UPDATE SET
            is_default = true,
            is_active = true,
            updated_at = NOW()
        "#,
        organization_id,
        provider_id
    )
    .execute(&mut *tx)
    .await?;

    if result.rows_affected() == 0 {
        tx.rollback().await?;
        return Err(sqlx::Error::RowNotFound);
    }

    tx.commit().await?;
    Ok(())
}
