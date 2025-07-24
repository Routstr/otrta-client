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
    pub status: Option<String>,
    pub started_at: Option<chrono::NaiveDateTime>,
    pub completed_at: Option<chrono::NaiveDateTime>,
    pub error_message: Option<String>,
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

pub async fn create_pending_search(
    db_pool: &PgPool,
    query: &String,
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
    let empty_search = Search {
        message: String::new(),
        sources: None,
    };

    sqlx::query!(
        r#"
        INSERT INTO user_searches (id, user_id, user_search_group_id, created_at, name, search, status, started_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        search_id,
        user_id,
        group.id,
        chrono::Utc::now(),
        query,
        sqlx::types::Json(empty_search) as sqlx::types::Json<Search>,
        "pending",
        Option::<chrono::NaiveDateTime>::None,
    )
    .execute(db_pool)
    .await
    .expect("Failed to insert pending search");

    search_id
}

pub async fn update_search_status(
    db_pool: &PgPool,
    search_id: Uuid,
    status: &str,
    started_at: Option<chrono::NaiveDateTime>,
    completed_at: Option<chrono::NaiveDateTime>,
    error_message: Option<&str>,
) {
    sqlx::query!(
        r#"
        UPDATE user_searches 
        SET status = $1, started_at = $2, completed_at = $3, error_message = $4
        WHERE id = $5
        "#,
        status,
        started_at,
        completed_at,
        error_message,
        search_id,
    )
    .execute(db_pool)
    .await
    .expect("Failed to update search status");
}

pub async fn complete_search(db_pool: &PgPool, search_id: Uuid, search_response: SearchResponse) {
    let search_data: Search = search_response.into();

    sqlx::query!(
        r#"
        UPDATE user_searches 
        SET search = $1, status = $2, completed_at = $3
        WHERE id = $4
        "#,
        sqlx::types::Json(search_data) as sqlx::types::Json<Search>,
        "completed",
        chrono::Utc::now().naive_utc(),
        search_id,
    )
    .execute(db_pool)
    .await
    .expect("Failed to complete search");
}

pub async fn get_search_by_id(
    db_pool: &PgPool,
    search_id: Uuid,
    user_id: &str,
) -> Option<UserSearch> {
    sqlx::query_as!(
        UserSearch,
        r#"
        SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>",
               status, started_at, completed_at, error_message 
               
        FROM user_searches 
        WHERE id = $1 AND user_id = $2
        "#,
        search_id,
        user_id,
    )
    .fetch_optional(db_pool)
    .await
    .expect("Failed to fetch search by id")
}

pub async fn get_pending_searches(db_pool: &PgPool, user_id: &str) -> Vec<UserSearch> {
    sqlx::query_as!(
        UserSearch,
        r#"
        SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>",
               status, started_at, completed_at, error_message
               
        FROM user_searches 
        WHERE user_id = $1 AND status IN ('pending', 'processing')
        ORDER BY created_at DESC
        "#,
        user_id,
    )
    .fetch_all(db_pool)
    .await
    .expect("Failed to fetch pending searches")
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
        INSERT INTO user_searches (id, user_id, user_search_group_id, created_at, name, search, status, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        search_id,
        user_id,
        group.id,
        chrono::Utc::now(),
        query,
        sqlx::types::Json(search_data) as sqlx::types::Json<Search>,
        "completed",
        Some(chrono::Utc::now().naive_utc()),
    )
    .execute(db_pool)
    .await
    .expect("Failed to insert search");

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
                    SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>",
                           status, started_at, completed_at, error_message
                           
                    FROM user_searches
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
                     SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>",
                            status, started_at, completed_at, error_message
                            
                     FROM user_searches
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
                    SELECT id, user_id, user_search_group_id, created_at, name, search as "search: Json<Search>",
                           status, started_at, completed_at, error_message
                           
                    FROM user_searches
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
