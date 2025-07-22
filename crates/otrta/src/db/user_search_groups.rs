use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSearchGroup {
    pub id: Uuid,
    pub user_id: String,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub async fn create_conversation(pool: &PgPool, user_id: String) -> UserSearchGroup {
    let group = sqlx::query_as!(
        UserSearchGroup,
        r#"
        INSERT INTO user_search_groups (user_id, name)
        VALUES ($1, 'new Conversation')
        RETURNING id, user_id, name, created_at, updated_at
        "#,
        user_id
    )
    .fetch_one(pool)
    .await
    .unwrap();

    group
}

pub async fn get_search_groups(pool: &PgPool, user_id: String) -> Vec<UserSearchGroup> {
    sqlx::query_as!(
        UserSearchGroup,
        r#"
        SELECT id, user_id, name, created_at, updated_at
        FROM user_search_groups
        WHERE user_id = $1
        ORDER BY created_at DESC
        "#,
        user_id
    )
    .fetch_all(pool)
    .await
    .unwrap()
}

pub async fn get_search_group(
    pool: &PgPool,
    user_id: String,
    group_id: Uuid,
) -> Result<UserSearchGroup, sqlx::Error> {
    sqlx::query_as!(
        UserSearchGroup,
        r#"
        SELECT id, user_id, name, created_at, updated_at
        FROM user_search_groups
        WHERE user_id = $1 AND id = $2
        "#,
        user_id,
        group_id
    )
    .fetch_one(pool)
    .await
}

pub async fn get_search_group_latest(pool: &PgPool, user_id: String) -> Option<UserSearchGroup> {
    sqlx::query_as!(
        UserSearchGroup,
        r#"
        SELECT id, user_id, name, created_at, updated_at
        FROM user_search_groups
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        "#,
        user_id
    )
    .fetch_optional(pool)
    .await
    .unwrap()
}

pub async fn update_search_group_name(pool: &PgPool, user_id: String, group_id: Uuid, name: &str) {
    sqlx::query!(
        r#"
        UPDATE user_search_groups
        SET name = $3, updated_at = NOW()
        WHERE user_id = $1 AND id = $2
        "#,
        user_id,
        group_id,
        name
    )
    .execute(pool)
    .await
    .unwrap();
}

pub async fn delete_search_group(pool: &PgPool, user_id: String, group_id: Uuid) {
    sqlx::query!(
        r#"
        DELETE FROM user_search_groups
        WHERE user_id = $1 AND id = $2
        "#,
        user_id,
        group_id
    )
    .execute(pool)
    .await
    .unwrap();
}
