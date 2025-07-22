use serde::{Deserialize, Serialize};
use sqlx::{types::Json, PgPool};
use uuid::Uuid;

use crate::db::user_search_groups::{
    create_conversation, get_search_group, get_search_group_latest, update_search_group_name,
};

#[derive(Debug, Deserialize, Serialize)]
pub struct UserSearchWithGroupId {
    pub group_id: Uuid,
    pub user_search: Vec<UserSearch>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SearchResponse {
    pub message: String,
    pub sources: Option<Vec<SearchSource>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SearchSource {
    pub metadata: SearchSourceMetadata,
    pub content: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SearchSourceMetadata {
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSearch {
    pub id: Uuid,
    pub user_id: String,
    pub user_search_group_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub name: String,
    pub search: Json<Search>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Search {
    pub message: String,
    pub sources: Option<Vec<SearchSource>>,
}

impl From<SearchResponse> for Search {
    fn from(response: SearchResponse) -> Self {
        Search {
            message: response.message,
            sources: response.sources,
        }
    }
}

pub async fn insert_search(
    db_pool: &PgPool,
    query: &String,
    search_response: SearchResponse,
    user_id: String,
    group_id: Uuid,
) -> Uuid {
    let group = match get_search_group(db_pool, user_id.clone(), group_id).await {
        Ok(group) => group,
        Err(_) => create_conversation(db_pool, user_id.clone()).await,
    };
    if group.name == "new Conversation" {
        update_search_group_name(db_pool, user_id.clone(), group.id, query).await;
    }

    let search_id = Uuid::new_v4();
    let search_data: Search = search_response.into();

    sqlx::query!(
        r#"
        INSERT INTO user_searches (id, user_id, user_search_group_id, created_at, name, search)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        search_id,
        user_id,
        group.id,
        chrono::offset::Utc::now(),
        query,
        sqlx::types::Json(search_data) as Json<Search>
    )
    .execute(db_pool)
    .await
    .unwrap();

    search_id
}

pub async fn get_searches(
    db_pool: &PgPool,
    group_id: Option<Uuid>,
    user_id: String,
) -> UserSearchWithGroupId {
    match group_id {
        Some(id) => {
            let search = sqlx::query_as!(
                UserSearch,
                r#"
                    SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>" FROM user_searches
                    WHERE user_search_group_id = $1 AND user_id = $2
                    ORDER BY created_at DESC
                "#,
                id,
                user_id
            )
                .fetch_all(db_pool)
                .await
                .unwrap();
            UserSearchWithGroupId {
                group_id: id,
                user_search: search,
            }
        }
        None => {
            let group = get_search_group_latest(db_pool, user_id.clone()).await;
            let group = match group {
                Some(group) => group,
                None => create_conversation(db_pool, user_id.clone()).await,
            };

            let search = sqlx::query_as!(
                UserSearch,
                r#"
                     SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>" FROM user_searches
                     WHERE user_search_group_id = $1 AND user_id = $2
                     ORDER BY created_at DESC
                 "#,
                 group.id,
                 user_id
            )
                .fetch_all(db_pool)
                .await
                .unwrap();

            UserSearchWithGroupId {
                group_id: group.id,
                user_search: search,
            }
        }
    }
}

pub async fn delete_search(db_pool: &PgPool, user_id: String, group_id: Uuid, id: Uuid) {
    sqlx::query!(
        r#"
        DELETE FROM user_searches
        WHERE id = $1 AND user_search_group_id = $2 AND user_id = $3
        "#,
        id,
        group_id,
        user_id,
    )
    .execute(db_pool)
    .await
    .unwrap();
}

pub async fn get_search(db_pool: &PgPool, group_id: Uuid, id: Uuid, user_id: String) -> UserSearch {
    sqlx::query_as!(
                UserSearch,
                r#"
                    SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>" FROM user_searches
                    WHERE user_search_group_id = $1 AND id = $2 AND user_id = $3
                    ORDER BY created_at DESC
                "#,
                group_id,
                id,
                user_id
            )
                .fetch_one(db_pool)
                .await
                .unwrap()
}

pub async fn retry_search(
    db_pool: &PgPool,
    search_response: SearchResponse,
    id: Uuid,
    user_id: String,
    group_id: Uuid,
) -> UserSearch {
    sqlx::query!(
        r#"
                    UPDATE user_searches
                    SET search = $4
                    WHERE user_search_group_id = $1 AND id = $2 AND user_id = $3
                "#,
        group_id,
        id,
        user_id,
        sqlx::types::Json(search_response.into()) as Json<Search>
    )
    .execute(db_pool)
    .await
    .unwrap();

    get_search(db_pool, group_id, id, user_id).await
}
