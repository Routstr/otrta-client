use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Credit {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub token: String,
    pub amount: String,
    pub redeemed: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PaginationInfo {
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreditListResponse {
    pub data: Vec<Credit>,
    pub pagination: PaginationInfo,
}

pub async fn add_credit(pool: &PgPool, token: &str, amount: &str) -> Result<Uuid, sqlx::Error> {
    let rec = sqlx::query!(
        r#"
        INSERT INTO credits (id, created_at, token, amount, redeemed)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        "#,
        Uuid::new_v4(),
        Utc::now(),
        token,
        amount,
        false
    )
    .fetch_one(pool)
    .await?;

    Ok(rec.id)
}

pub async fn get_credits(
    pool: &PgPool,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<CreditListResponse, sqlx::Error> {
    // Default values if not provided
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(10);

    // Calculate offset
    let offset = (page - 1) * page_size;

    // Get total count
    let total = sqlx::query_scalar(r#"SELECT COUNT(*) FROM credits"#)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    // Calculate total pages
    let total_pages = (total + page_size - 1) / page_size;

    // Get paginated credits
    let credits = sqlx::query_as!(
        Credit,
        r#"
        SELECT 
            id,
            created_at,
            token,
            amount,
            redeemed
        FROM credits
        ORDER BY created_at
        LIMIT $1 OFFSET $2
        "#,
        page_size,
        offset
    )
    .fetch_all(pool)
    .await?;

    Ok(CreditListResponse {
        data: credits,
        pagination: PaginationInfo {
            total,
            page,
            page_size,
            total_pages,
        },
    })
}
