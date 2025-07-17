use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "transaction_direction")]
pub enum TransactionDirection {
    Incoming,
    Outgoing,
}

impl From<String> for TransactionDirection {
    fn from(s: String) -> Self {
        match s.as_str() {
            "Incoming" => TransactionDirection::Incoming,
            "Outgoing" => TransactionDirection::Outgoing,
            _ => TransactionDirection::Outgoing,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub token: String,
    pub amount: String,
    pub direction: TransactionDirection,
    pub api_key_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PaginationInfo {
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionListResponse {
    pub data: Vec<Transaction>,
    pub pagination: PaginationInfo,
}

pub async fn add_transaction(
    pool: &PgPool,
    token: &str,
    amount: &str,
    direction: TransactionDirection,
    api_key_id: Option<&str>,
) -> Result<Uuid, sqlx::Error> {
    let rec = sqlx::query!(
        r#"
        INSERT INTO transactions (id, created_at, token, amount, direction, api_key_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
        Uuid::new_v4(),
        Utc::now(),
        token,
        amount,
        direction as TransactionDirection,
        api_key_id.map(|id| Uuid::parse_str(id).ok()).flatten()
    )
    .fetch_one(pool)
    .await?;

    Ok(rec.id)
}

pub async fn get_transactions(
    pool: &PgPool,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<TransactionListResponse, sqlx::Error> {
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(10);

    let offset = (page - 1) * page_size;

    let total = sqlx::query_scalar(r#"SELECT COUNT(*) FROM transactions"#)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    let total_pages = (total + page_size - 1) / page_size;

    let credits = sqlx::query_as!(
        Transaction,
        r#"
        SELECT 
            id,
            created_at,
            token,
            amount,
            direction as "direction: TransactionDirection",
            api_key_id::text
        FROM transactions
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        page_size,
        offset
    )
    .fetch_all(pool)
    .await?;

    Ok(TransactionListResponse {
        data: credits,
        pagination: PaginationInfo {
            total,
            page,
            page_size,
            total_pages,
        },
    })
}
