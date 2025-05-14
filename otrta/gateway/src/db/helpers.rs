use async_trait::async_trait;
use sqlx::{Pool, Postgres};
use std::fmt;
use uuid::Uuid;

#[async_trait]
pub trait DbCrud<T, C, U> {
    async fn get_by_id(pool: &Pool<Postgres>, id: &str) -> Result<Option<T>, sqlx::Error>;
    async fn list_all(pool: &Pool<Postgres>) -> Result<Vec<T>, sqlx::Error>;
    async fn create(pool: &Pool<Postgres>, data: &C) -> Result<T, sqlx::Error>;
    async fn update(pool: &Pool<Postgres>, id: &str, data: &U) -> Result<T, sqlx::Error>;
    async fn delete(pool: &Pool<Postgres>, id: &str) -> Result<bool, sqlx::Error>;
}

#[derive(Debug)]
pub enum DbError {
    Sqlx(sqlx::Error),
    NotFound(String),
    Validation(String),
    Other(String),
}

impl fmt::Display for DbError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DbError::Sqlx(e) => write!(f, "Database error: {}", e),
            DbError::NotFound(e) => write!(f, "Entity not found: {}", e),
            DbError::Validation(e) => write!(f, "Validation error: {}", e),
            DbError::Other(e) => write!(f, "Other error: {}", e),
        }
    }
}

impl From<sqlx::Error> for DbError {
    fn from(err: sqlx::Error) -> Self {
        DbError::Sqlx(err)
    }
}

impl std::error::Error for DbError {}

pub type DbResult<T> = Result<T, DbError>;

pub fn generate_id(prefix: &str) -> String {
    format!("{}_{}", prefix, Uuid::new_v4().to_string().replace("-", ""))
}

pub async fn entity_exists(pool: &Pool<Postgres>, table: &str, id: &str) -> Result<bool, DbError> {
    let query = format!(
        "SELECT EXISTS(SELECT 1 FROM {} WHERE id = $1) as exists",
        table
    );

    let result = sqlx::query_scalar::<_, bool>(&query)
        .bind(id)
        .fetch_one(pool)
        .await?;

    Ok(result)
}

pub async fn entity_exists_by_field(
    pool: &Pool<Postgres>,
    table: &str,
    field: &str,
    value: &str,
) -> Result<bool, DbError> {
    let query = format!(
        "SELECT EXISTS(SELECT 1 FROM {} WHERE {} = $1) as exists",
        table, field
    );

    let result = sqlx::query_scalar::<_, bool>(&query)
        .bind(value)
        .fetch_one(pool)
        .await?;

    Ok(result)
}
