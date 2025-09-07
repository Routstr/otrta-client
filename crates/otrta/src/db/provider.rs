use crate::db::Pool;
use otrta_nostr::discover_providers;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug)]
pub enum ProviderError {
    Database(sqlx::Error),
    DuplicateUrl(String),
}

impl From<sqlx::Error> for ProviderError {
    fn from(error: sqlx::Error) -> Self {
        ProviderError::Database(error)
    }
}

impl std::fmt::Display for ProviderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderError::Database(e) => write!(f, "Database error: {}", e),
            ProviderError::DuplicateUrl(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for ProviderError {}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum ProviderSource {
    Manual,
    Nostr,
}

impl std::fmt::Display for ProviderSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderSource::Manual => write!(f, "manual"),
            ProviderSource::Nostr => write!(f, "nostr"),
        }
    }
}

impl From<String> for ProviderSource {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "nostr" => ProviderSource::Nostr,
            _ => ProviderSource::Manual,
        }
    }
}

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
    pub source: String,
    pub organization_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub has_msat_support: bool,
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
    pub is_editable: bool,
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

impl Provider {
    pub fn get_source(&self) -> ProviderSource {
        ProviderSource::from(self.source.clone())
    }

    pub fn is_from_nostr(&self) -> bool {
        self.get_source() == ProviderSource::Nostr
    }

    pub fn is_manual(&self) -> bool {
        self.get_source() == ProviderSource::Manual
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomProviderRequest {
    pub name: String,
    pub url: String,
    pub mints: Vec<String>,
    pub use_onion: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNostrProviderRequest {
    pub name: String,
    pub about: String,
    pub url: String,
    pub mints: Vec<String>,
    pub use_onion: bool,
    pub followers: i32,
    pub zaps: i32,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCustomProviderRequest {
    pub name: String,
    pub url: String,
    pub mints: Vec<String>,
    pub use_onion: bool,
}

pub async fn get_all_providers(db: &Pool) -> Result<Vec<Provider>, sqlx::Error> {
    let providers = sqlx::query_as::<_, Provider>(
        "SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom,
            COALESCE(p.source, 'manual') as source,
            p.organization_id, p.created_at, p.updated_at,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(p.mints)
                AND m.currency_unit = 'msat'
            ) as has_msat_support
         FROM providers p
         ORDER BY p.is_default DESC, COALESCE(p.source, 'manual') DESC, p.is_custom ASC, p.followers DESC, p.zaps DESC",
    )
    .fetch_all(db)
    .await?;

    Ok(providers)
}

pub async fn get_default_provider(db: &Pool) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom, COALESCE(p.source, 'manual') as source,
            p.organization_id, p.created_at, p.updated_at,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(p.mints)
                AND m.currency_unit = 'msat'
            ) as has_msat_support
         FROM providers p
         WHERE p.is_default = TRUE",
    )
    .fetch_optional(db)
    .await?;

    Ok(provider)
}

pub async fn get_provider_by_id(db: &Pool, id: i32) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom, COALESCE(p.source, 'manual') as source,
            p.organization_id, p.created_at, p.updated_at,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(p.mints)
                AND m.currency_unit = 'msat'
            ) as has_msat_support
         FROM providers p
         WHERE p.id = $1",
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
) -> Result<Provider, ProviderError> {
    // Check if a provider with this URL already exists for the global scope (organization_id = NULL)
    let existing_provider = sqlx::query!(
        "SELECT id FROM providers WHERE url = $1 AND organization_id IS NULL",
        request.url
    )
    .fetch_optional(db)
    .await?;

    if existing_provider.is_some() {
        return Err(ProviderError::DuplicateUrl(
            "A global provider with this URL already exists".to_string(),
        ));
    }

    let provider = sqlx::query_as::<_, Provider>(
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, source, organization_id, updated_at)
         VALUES ($1, $2, $3, $4, 0, 0, TRUE, 'manual', NULL, NOW())
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, COALESCE(source, 'manual') as source, organization_id, created_at, updated_at, false as has_msat_support"
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
    } else {
        eprintln!("Provider {} not found", id);
        return Ok(false);
    }

    let result = sqlx::query("DELETE FROM providers WHERE id = $1")
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
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, source, organization_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, 'manual', NULL, NOW())
         ON CONFLICT (url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
         DO UPDATE SET
            name = EXCLUDED.name,
            mints = EXCLUDED.mints,
            use_onion = EXCLUDED.use_onion,
            followers = EXCLUDED.followers,
            zaps = EXCLUDED.zaps,
            updated_at = NOW()
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, COALESCE(source, 'manual') as source, organization_id, created_at, updated_at, false as has_msat_support"
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

pub async fn refresh_providers_from_nostr_global(
    db: &Pool,
) -> Result<RefreshProvidersResponse, Box<dyn std::error::Error>> {
    let mut providers_updated = 0;
    let mut providers_added = 0;

    let nostr_providers = match discover_providers().await {
        Ok(providers) => providers,
        Err(e) => {
            eprintln!("Failed to discover providers from Nostr: {}", e);
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to discover providers: {}", e),
            )));
        }
    };

    for nostr_provider in nostr_providers {
        for url in &nostr_provider.urls {
            if url.is_empty() || url.contains("XXX") {
                continue;
            }

            let is_onion_url = url.contains(".onion");

            let existing_provider = sqlx::query_as::<_, Provider>(
                "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom,
                    COALESCE(source, 'manual') as source, organization_id, created_at, updated_at,
                    EXISTS(
                        SELECT 1 FROM mints m
                        WHERE m.mint_url = ANY(mints)
                        AND m.currency_unit = 'msat'
                    ) as has_msat_support
                 FROM providers WHERE url = $1 AND source = 'nostr'",
            )
            .bind(url)
            .fetch_optional(db)
            .await?;

            if let Some(provider) = existing_provider {
                let provider_name = if nostr_provider.urls.len() > 1 {
                    let url_suffix = if is_onion_url { " (Tor)" } else { "" };
                    format!("{}{}", nostr_provider.name, url_suffix)
                } else {
                    nostr_provider.name.clone()
                };

                let result = sqlx::query(
                    "UPDATE providers SET 
                        name = $1, 
                        mints = $2, 
                        use_onion = $3, 
                        followers = $4, 
                        zaps = $5, 
                        updated_at = NOW() 
                     WHERE id = $6",
                )
                .bind(&provider_name)
                .bind(&nostr_provider.mints)
                .bind(is_onion_url)
                .bind(nostr_provider.followers)
                .bind(nostr_provider.zaps)
                .bind(provider.id)
                .execute(db)
                .await?;

                if result.rows_affected() > 0 {
                    providers_updated += 1;
                }
            } else {
                let provider_name = if nostr_provider.urls.len() > 1 {
                    let url_suffix = if is_onion_url { " (Tor)" } else { "" };
                    format!("{}{}", nostr_provider.name, url_suffix)
                } else {
                    nostr_provider.name.clone()
                };

                let _created_provider = sqlx::query!(
                    "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_default, is_custom, source, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, 'nostr', NOW(), NOW())
                     RETURNING id",
                    &provider_name,
                    url,
                    &nostr_provider.mints,
                    is_onion_url,
                    nostr_provider.followers,
                    nostr_provider.zaps
                )
                .fetch_one(db)
                .await?;

                providers_added += 1;
            }
        }
    }

    Ok(RefreshProvidersResponse {
        success: true,
        providers_updated,
        providers_added,
        message: Some(format!(
            "Updated {} providers and added {} new providers from Nostr marketplace",
            providers_updated, providers_added
        )),
    })
}

pub async fn refresh_providers_from_nostr(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<RefreshProvidersResponse, Box<dyn std::error::Error>> {
    let mut providers_updated = 0;
    let mut providers_added = 0;
    let mut newly_created_provider_ids: Vec<i32> = Vec::new();

    let nostr_providers = match discover_providers().await {
        Ok(providers) => providers,
        Err(e) => {
            eprintln!("Failed to discover providers from Nostr: {}", e);
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to discover providers: {}", e),
            )));
        }
    };

    for nostr_provider in nostr_providers {
        for url in &nostr_provider.urls {
            if url.is_empty() || url.contains("XXX") {
                continue;
            }

            let is_onion_url = url.contains(".onion");

            let existing_provider = sqlx::query_as::<_, Provider>(
                "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom,
                    COALESCE(source, 'manual') as source, organization_id, created_at, updated_at,
                    EXISTS(
                        SELECT 1 FROM mints m
                        WHERE m.mint_url = ANY(mints)
                        AND m.currency_unit = 'msat'
                    ) as has_msat_support
                 FROM providers WHERE url = $1 AND source = 'nostr'",
            )
            .bind(url)
            .fetch_optional(db)
            .await?;

            if let Some(provider) = existing_provider {
                let provider_name = if nostr_provider.urls.len() > 1 {
                    let url_suffix = if is_onion_url { " (Tor)" } else { "" };
                    format!("{}{}", nostr_provider.name, url_suffix)
                } else {
                    nostr_provider.name.clone()
                };

                let result = sqlx::query(
                    "UPDATE providers SET 
                        name = $1, 
                        mints = $2, 
                        use_onion = $3, 
                        followers = $4, 
                        zaps = $5, 
                        updated_at = NOW() 
                     WHERE id = $6",
                )
                .bind(&provider_name)
                .bind(&nostr_provider.mints)
                .bind(is_onion_url)
                .bind(nostr_provider.followers)
                .bind(nostr_provider.zaps)
                .bind(provider.id)
                .execute(db)
                .await?;

                if result.rows_affected() > 0 {
                    providers_updated += 1;
                }
            } else {
                let provider_name = if nostr_provider.urls.len() > 1 {
                    let url_suffix = if is_onion_url { " (Tor)" } else { "" };
                    format!("{}{}", nostr_provider.name, url_suffix)
                } else {
                    nostr_provider.name.clone()
                };

                let created_provider = sqlx::query!(
                    "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_default, is_custom, source, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, 'nostr', NOW(), NOW())
                     RETURNING id",
                    &provider_name,
                    url,
                    &nostr_provider.mints,
                    is_onion_url,
                    nostr_provider.followers,
                    nostr_provider.zaps
                )
                .fetch_one(db)
                .await?;

                providers_added += 1;
                newly_created_provider_ids.push(created_provider.id);
            }
        }
    }

    // Auto-activate newly created providers for the organization
    for provider_id in newly_created_provider_ids {
        if let Err(e) = activate_provider_for_organization(db, organization_id, provider_id).await {
            eprintln!("Failed to auto-activate provider {}: {}", provider_id, e);
            // Continue with other providers even if one fails
        }
    }

    Ok(RefreshProvidersResponse {
        success: true,
        providers_updated,
        providers_added,
        message: Some(format!(
            "Updated {} providers and added {} new providers from Nostr marketplace",
            providers_updated, providers_added
        )),
    })
}

pub async fn get_providers_for_organization(
    db: &Pool,
    organization_id: &Uuid,
) -> Result<Vec<Provider>, sqlx::Error> {
    let providers = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom,
            COALESCE(source, 'manual') as source, organization_id, created_at, updated_at,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(mints)
                AND m.currency_unit = 'msat'
            ) as has_msat_support
         FROM providers
         WHERE organization_id IS NULL OR organization_id = $1
         ORDER BY is_default DESC, is_custom ASC, followers DESC, zaps DESC",
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
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom,
            COALESCE(source, 'manual') as source, organization_id, created_at, updated_at,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(mints)
                AND m.currency_unit = 'msat'
            ) as has_msat_support
         FROM providers
         WHERE is_default = TRUE AND (organization_id IS NULL OR organization_id = $1)",
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
        "SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom, p.organization_id, p.created_at, p.updated_at, p.source,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(p.mints)
                AND m.organization_id = $2
                AND m.currency_unit = 'msat'
            ) as has_msat_support
         FROM providers p
         WHERE p.id = $1 AND (p.organization_id IS NULL OR p.organization_id = $2)",
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
) -> Result<Provider, ProviderError> {
    // Check if a provider with this URL already exists for this organization
    let existing_provider = sqlx::query!(
        "SELECT id FROM providers WHERE url = $1 AND organization_id = $2",
        request.url,
        organization_id
    )
    .fetch_optional(db)
    .await?;

    if existing_provider.is_some() {
        return Err(ProviderError::DuplicateUrl(
            "A provider with this URL already exists for your organization".to_string(),
        ));
    }

    let provider = sqlx::query_as::<_, Provider>(
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, source, organization_id, updated_at)
         VALUES ($1, $2, $3, $4, 0, 0, TRUE, 'manual', $5, NOW())
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, COALESCE(source, 'manual') as source, organization_id, created_at, updated_at, false as has_msat_support"
    )
    .bind(&request.name)
    .bind(&request.url)
    .bind(&request.mints)
    .bind(request.use_onion)
    .bind(organization_id)
    .fetch_one(db)
    .await?;

    // Automatically activate the newly created provider for this organization
    let _ = activate_provider_for_organization(db, organization_id, provider.id).await?;

    Ok(provider)
}

pub async fn update_custom_provider(
    db: &Pool,
    id: i32,
    request: UpdateCustomProviderRequest,
) -> Result<Provider, ProviderError> {
    // Check if another global provider with this URL already exists (excluding the current one)
    let existing_provider = sqlx::query!(
        "SELECT id FROM providers WHERE url = $1 AND organization_id IS NULL AND id != $2",
        request.url,
        id
    )
    .fetch_optional(db)
    .await?;

    if existing_provider.is_some() {
        return Err(ProviderError::DuplicateUrl(
            "A global provider with this URL already exists".to_string(),
        ));
    }

    let provider = sqlx::query_as::<_, Provider>(
        "UPDATE providers
         SET name = $1, url = $2, mints = $3, use_onion = $4, updated_at = NOW()
         WHERE id = $5 AND is_custom = TRUE
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, COALESCE(source, 'manual') as source, organization_id, created_at, updated_at, false as has_msat_support"
    )
    .bind(&request.name)
    .bind(&request.url)
    .bind(&request.mints)
    .bind(request.use_onion)
    .bind(id)
    .fetch_one(db)
    .await?;

    Ok(provider)
}

pub async fn update_custom_provider_for_organization(
    db: &Pool,
    id: i32,
    request: UpdateCustomProviderRequest,
    organization_id: &Uuid,
) -> Result<Provider, ProviderError> {
    // Check if another provider with this URL already exists for this organization (excluding the current one)
    let existing_provider = sqlx::query!(
        "SELECT id FROM providers WHERE url = $1 AND organization_id = $2 AND id != $3",
        request.url,
        organization_id,
        id
    )
    .fetch_optional(db)
    .await?;

    if existing_provider.is_some() {
        return Err(ProviderError::DuplicateUrl(
            "A provider with this URL already exists for your organization".to_string(),
        ));
    }

    let provider = sqlx::query_as::<_, Provider>(
        "UPDATE providers
         SET name = $1, url = $2, mints = $3, use_onion = $4, updated_at = NOW()
         WHERE id = $5 AND is_custom = TRUE AND organization_id = $6
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, COALESCE(source, 'manual') as source, organization_id, created_at, updated_at, false as has_msat_support"
    )
    .bind(&request.name)
    .bind(&request.url)
    .bind(&request.mints)
    .bind(request.use_onion)
    .bind(id)
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
    is_admin: bool,
) -> Result<Vec<ProviderWithStatus>, sqlx::Error> {
    let providers = sqlx::query!(
        r#"
        SELECT
            p.id, p.name, p.url, p.mints, p.use_onion, p.followers, p.zaps,
            p.is_default, p.is_custom, p.organization_id, p.created_at, p.updated_at, p.source,
            COALESCE(op.is_active, false) as is_active_for_org,
            COALESCE(op.is_default, false) as is_default_for_org,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(p.mints)
                AND m.organization_id = $1
                AND m.currency_unit = 'msat'
            ) as has_msat_support
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
        .map(|row| {
            let is_custom = row.is_custom.unwrap_or(false);
            let provider_org_id = row.organization_id;

            // Provider is editable if it's custom and either:
            // 1. User is admin (can edit any custom provider), or
            // 2. Provider belongs to the same organization
            let is_editable = is_admin || (is_custom && provider_org_id == Some(*organization_id));

            ProviderWithStatus {
                provider: Provider {
                    id: row.id,
                    name: row.name,
                    url: row.url,
                    mints: row.mints.unwrap_or_default(),
                    use_onion: row.use_onion.unwrap_or(false),
                    followers: row.followers.unwrap_or(0),
                    zaps: row.zaps.unwrap_or(0),
                    is_default: row.is_default.unwrap_or(false),
                    is_custom,
                    source: row.source,
                    organization_id: provider_org_id,
                    created_at: row.created_at.unwrap_or_else(chrono::Utc::now),
                    updated_at: row.updated_at.unwrap_or_else(chrono::Utc::now),
                    has_msat_support: row.has_msat_support.unwrap_or(false),
                },
                is_active_for_org: row.is_active_for_org.unwrap_or(false),
                is_default_for_org: row.is_default_for_org.unwrap_or(false),
                is_editable,
            }
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
            p.is_default, p.is_custom, p.organization_id, p.created_at, p.updated_at, p.source,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(p.mints)
                AND m.organization_id = $1
                AND m.currency_unit = 'msat'
            ) as has_msat_support
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
            p.is_default, p.is_custom, p.organization_id, p.created_at, p.updated_at, p.source,
            EXISTS(
                SELECT 1 FROM mints m
                WHERE m.mint_url = ANY(p.mints)
                AND m.organization_id = $1
                AND m.currency_unit = 'msat'
            ) as has_msat_support
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

pub async fn upsert_provider_for_organization(
    db: &Pool,
    name: &str,
    url: &str,
    mints: Vec<String>,
    use_onion: bool,
    followers: i32,
    zaps: i32,
    organization_id: Option<&Uuid>,
) -> Result<Provider, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, source, organization_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, 'manual', $7, NOW())
         ON CONFLICT (url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
         DO UPDATE SET
            name = EXCLUDED.name,
            mints = EXCLUDED.mints,
            use_onion = EXCLUDED.use_onion,
            followers = EXCLUDED.followers,
            zaps = EXCLUDED.zaps,
            updated_at = NOW()
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, 'manual' as source, organization_id, created_at, updated_at, false as has_msat_support"
    )
    .bind(name)
    .bind(url)
    .bind(&mints)
    .bind(use_onion)
    .bind(followers)
    .bind(zaps)
    .bind(organization_id)
    .fetch_one(db)
    .await?;

    Ok(provider)
}

pub async fn upsert_nostr_provider(
    db: &Pool,
    request: CreateNostrProviderRequest,
) -> Result<Provider, sqlx::Error> {
    let provider_name = if request.url.contains(".onion") {
        format!("{} (Tor)", request.name)
    } else {
        request.name
    };

    let provider = sqlx::query_as::<_, Provider>(
        "INSERT INTO providers (name, url, mints, use_onion, followers, zaps, is_custom, source, organization_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, 'nostr', NULL, NOW())
         ON CONFLICT (url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
         DO UPDATE SET
            name = EXCLUDED.name,
            mints = EXCLUDED.mints,
            use_onion = EXCLUDED.use_onion,
            followers = EXCLUDED.followers,
            zaps = EXCLUDED.zaps,
            updated_at = NOW()
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, COALESCE(source, 'nostr') as source, organization_id, created_at, updated_at, false as has_msat_support"
    )
    .bind(&provider_name)
    .bind(&request.url)
    .bind(&request.mints)
    .bind(request.use_onion)
    .bind(request.followers)
    .bind(request.zaps)
    .fetch_one(db)
    .await?;

    Ok(provider)
}
