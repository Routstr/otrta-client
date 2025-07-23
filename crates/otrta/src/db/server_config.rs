use chrono::{DateTime, Utc};
use sqlx::PgPool;

use crate::models::ServerConfig;

#[derive(Debug)]
pub struct ServerConfigRecord {
    pub id: String,
    pub endpoint: String,
    pub api_key: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
    pub seed: Option<String>,
    pub organization_id: uuid::Uuid,
}

pub async fn get_all_configs(pool: &PgPool) -> Result<Vec<ServerConfigRecord>, sqlx::Error> {
    let configs = sqlx::query!(
        r#"
        SELECT id, endpoint, api_key, created_at, updated_at, seed, organization_id
        FROM server_config
        "#
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|record| ServerConfigRecord {
        id: record.id,
        endpoint: record.endpoint,
        api_key: record.api_key,
        created_at: record.created_at,
        updated_at: record.updated_at,
        seed: record.seed,
        organization_id: record.organization_id,
    })
    .collect();

    Ok(configs)
}

pub async fn get_default_config(pool: &PgPool) -> Result<Option<ServerConfigRecord>, sqlx::Error> {
    let record = sqlx::query!(
        r#"
        SELECT id, endpoint, api_key, created_at, updated_at, seed, organization_id
        FROM server_config
        ORDER BY created_at DESC
        LIMIT 1
        "#
    )
    .fetch_optional(pool)
    .await?;

    match record {
        Some(r) => Ok(Some(ServerConfigRecord {
            id: r.id,
            endpoint: r.endpoint,
            api_key: r.api_key,
            created_at: r.created_at,
            updated_at: r.updated_at,
            seed: r.seed,
            organization_id: r.organization_id,
        })),
        None => Ok(None),
    }
}

pub async fn get_config_by_organization(
    pool: &PgPool,
    organization_id: &uuid::Uuid,
) -> Result<Option<ServerConfigRecord>, sqlx::Error> {
    let record = sqlx::query!(
        r#"
        SELECT id, endpoint, api_key, created_at, updated_at, seed, organization_id
        FROM server_config
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        "#,
        organization_id
    )
    .fetch_optional(pool)
    .await?;

    match record {
        Some(r) => Ok(Some(ServerConfigRecord {
            id: r.id,
            endpoint: r.endpoint,
            api_key: r.api_key,
            created_at: r.created_at,
            updated_at: r.updated_at,
            seed: r.seed,
            organization_id: r.organization_id,
        })),
        None => Ok(None),
    }
}

pub async fn create_config(
    pool: &PgPool,
    config: &ServerConfig,
    organization_id: &uuid::Uuid,
) -> Result<ServerConfigRecord, sqlx::Error> {
    let id = format!(
        "config_{}",
        uuid::Uuid::new_v4().to_string().replace("-", "")
    );

    let record = sqlx::query!(
        r#"
        INSERT INTO server_config (id, endpoint, api_key, created_at, organization_id)
        VALUES ($1, $2, $3, NOW(), $4)
        RETURNING id, endpoint, api_key, created_at, updated_at, seed, organization_id
        "#,
        id,
        config.endpoint,
        config.api_key,
        organization_id
    )
    .fetch_one(pool)
    .await?;

    Ok(ServerConfigRecord {
        id: record.id,
        endpoint: record.endpoint,
        api_key: record.api_key,
        created_at: record.created_at,
        updated_at: record.updated_at,
        seed: record.seed,
        organization_id: record.organization_id,
    })
}

pub async fn create_config_for_organization(
    pool: &PgPool,
    config: &ServerConfig,
    organization_id: &uuid::Uuid,
) -> Result<ServerConfigRecord, sqlx::Error> {
    let id = format!(
        "config_{}",
        uuid::Uuid::new_v4().to_string().replace("-", "")
    );

    let record = sqlx::query!(
        r#"
        INSERT INTO server_config (id, endpoint, api_key, created_at, organization_id)
        VALUES ($1, $2, $3, NOW(), $4)
        RETURNING id, endpoint, api_key, created_at, updated_at, seed, organization_id
        "#,
        id,
        config.endpoint,
        config.api_key,
        organization_id
    )
    .fetch_one(pool)
    .await?;

    Ok(ServerConfigRecord {
        id: record.id,
        endpoint: record.endpoint,
        api_key: record.api_key,
        created_at: record.created_at,
        updated_at: record.updated_at,
        seed: record.seed,
        organization_id: record.organization_id,
    })
}

pub async fn update_config(
    pool: &PgPool,
    id: String,
    config: &ServerConfig,
) -> Result<ServerConfigRecord, sqlx::Error> {
    let record = sqlx::query!(
        r#"
        UPDATE server_config
        SET endpoint = $1, api_key = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, endpoint, api_key, created_at, updated_at, seed, organization_id
        "#,
        config.endpoint,
        config.api_key,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(ServerConfigRecord {
        id: record.id,
        endpoint: record.endpoint,
        api_key: record.api_key,
        created_at: record.created_at,
        updated_at: record.updated_at,
        seed: record.seed,
        organization_id: record.organization_id,
    })
}

pub async fn delete_config(pool: &PgPool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        DELETE FROM server_config
        WHERE id = $1
        "#,
        id
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn config_exists(pool: &PgPool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        SELECT EXISTS(SELECT 1 FROM server_config WHERE id = $1) as exists
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(result.exists.unwrap_or(false))
}

impl ServerConfigRecord {
    pub fn to_api_config(&self) -> ServerConfig {
        ServerConfig {
            endpoint: self.endpoint.clone(),
            api_key: self.api_key.clone(),
        }
    }
}

pub async fn update_seed(
    pool: &PgPool,
    seed: &str,
    organization_id: &uuid::Uuid,
) -> Result<ServerConfigRecord, sqlx::Error> {
    let record = sqlx::query!(
        r#"
        UPDATE server_config
        SET seed = $1, updated_at = NOW()
        WHERE organization_id = $2
        RETURNING id, endpoint, api_key, created_at, updated_at, seed, organization_id
        "#,
        seed,
        organization_id
    )
    .fetch_one(pool)
    .await?;

    Ok(ServerConfigRecord {
        id: record.id,
        endpoint: record.endpoint,
        api_key: record.api_key,
        created_at: record.created_at,
        updated_at: record.updated_at,
        seed: record.seed,
        organization_id: record.organization_id,
    })
}

pub async fn create_with_seed(
    pool: &PgPool,
    seed: &str,
    organization_id: &uuid::Uuid,
) -> Result<ServerConfigRecord, sqlx::Error> {
    let id = format!(
        "config_{}",
        uuid::Uuid::new_v4().to_string().replace("-", "")
    );

    let record = sqlx::query!(
        r#"
        INSERT INTO server_config (id, endpoint, api_key, created_at, seed, organization_id)
        VALUES ($1, $2, $3, NOW(), $4, $5)
        RETURNING id, endpoint, api_key, created_at, updated_at, seed, organization_id
        "#,
        id,
        String::from(""),
        String::from(""),
        seed,
        organization_id
    )
    .fetch_one(pool)
    .await?;

    Ok(ServerConfigRecord {
        id: record.id,
        endpoint: record.endpoint,
        api_key: record.api_key,
        created_at: record.created_at,
        updated_at: record.updated_at,
        seed: record.seed,
        organization_id: record.organization_id,
    })
}

pub async fn create_with_seed_for_organization(
    pool: &PgPool,
    seed: &str,
    organization_id: &uuid::Uuid,
) -> Result<ServerConfigRecord, sqlx::Error> {
    let id = format!(
        "config_{}",
        uuid::Uuid::new_v4().to_string().replace("-", "")
    );

    let record = sqlx::query!(
        r#"
        INSERT INTO server_config (id, endpoint, api_key, created_at, seed, organization_id)
        VALUES ($1, $2, $3, NOW(), $4, $5)
        RETURNING id, endpoint, api_key, created_at, updated_at, seed, organization_id
        "#,
        id,
        String::from(""),
        String::from(""),
        seed,
        organization_id
    )
    .fetch_one(pool)
    .await?;

    Ok(ServerConfigRecord {
        id: record.id,
        endpoint: record.endpoint,
        api_key: record.api_key,
        created_at: record.created_at,
        updated_at: record.updated_at,
        seed: record.seed,
        organization_id: record.organization_id,
    })
}
