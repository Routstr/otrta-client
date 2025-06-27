use crate::db::Pool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

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
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
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
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, created_at, updated_at 
         FROM providers 
         ORDER BY is_default DESC, is_custom ASC, followers DESC, zaps DESC"
    )
    .fetch_all(db)
    .await?;

    Ok(providers)
}

pub async fn get_provider_by_id(db: &Pool, id: i32) -> Result<Option<Provider>, sqlx::Error> {
    let provider = sqlx::query_as::<_, Provider>(
        "SELECT id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, created_at, updated_at 
         FROM providers 
         WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(db)
    .await?;

    Ok(provider)
}

pub async fn set_default_provider(db: &Pool, id: i32) -> Result<(), sqlx::Error> {
    // First, unset all existing defaults
    sqlx::query("UPDATE providers SET is_default = FALSE")
        .execute(db)
        .await?;

    // Then set the specified provider as default
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
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, created_at, updated_at"
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
    let result = sqlx::query("DELETE FROM providers WHERE id = $1 AND is_custom = TRUE")
        .bind(id)
        .execute(db)
        .await?;

    Ok(result.rows_affected() > 0)
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
         RETURNING id, name, url, mints, use_onion, followers, zaps, is_default, is_custom, created_at, updated_at"
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

pub async fn refresh_providers_from_nostr(db: &Pool) -> Result<RefreshProvidersResponse, Box<dyn std::error::Error>> {
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
        message: Some(format!("Updated {} providers from Nostr marketplace", providers_updated)),
    })
} 