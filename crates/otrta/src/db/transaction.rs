use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use bigdecimal::{BigDecimal, ToPrimitive};

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

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ApiKeyStatistics {
    pub api_key_id: String,
    pub total_incoming: i64,
    pub total_outgoing: i64,
    pub total_cost: i64,
    pub daily_stats: Vec<DailyStats>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DailyStats {
    pub date: String,
    pub incoming: i64,
    pub outgoing: i64,
    pub cost: i64,
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

pub async fn get_api_key_statistics(
    pool: &PgPool,
    api_key_id: &str,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
) -> Result<ApiKeyStatistics, sqlx::Error> {
    let start_date = start_date.unwrap_or_else(|| {
        Utc::now() - chrono::Duration::days(30)
    });
    let end_date = end_date.unwrap_or_else(|| Utc::now());
    
    let api_key_uuid = Uuid::parse_str(api_key_id).map_err(|_| {
        sqlx::Error::RowNotFound
    })?;

    let summary = sqlx::query!(
        r#"
        SELECT 
            COALESCE(SUM(CASE WHEN direction = 'Incoming' THEN amount::bigint ELSE 0 END), 0) as total_incoming,
            COALESCE(SUM(CASE WHEN direction = 'Outgoing' THEN amount::bigint ELSE 0 END), 0) as total_outgoing
        FROM transactions 
        WHERE api_key_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
        "#,
        api_key_uuid,
        start_date,
        end_date
    )
    .fetch_one(pool)
    .await?;

    let daily_stats = sqlx::query!(
        r#"
        SELECT 
            DATE(created_at) as date,
            COALESCE(SUM(CASE WHEN direction = 'Incoming' THEN amount::bigint ELSE 0 END), 0) as incoming,
            COALESCE(SUM(CASE WHEN direction = 'Outgoing' THEN amount::bigint ELSE 0 END), 0) as outgoing
        FROM transactions 
        WHERE api_key_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
        GROUP BY DATE(created_at)
        ORDER BY date
        "#,
        api_key_uuid,
        start_date,
        end_date
    )
    .fetch_all(pool)
    .await?;

    let daily_stats: Vec<DailyStats> = daily_stats
        .into_iter()
        .map(|row| {
            let incoming = row.incoming
                .unwrap_or(BigDecimal::from(0))
                .to_i64()
                .unwrap_or(0);
            let outgoing = row.outgoing
                .unwrap_or(BigDecimal::from(0))
                .to_i64()
                .unwrap_or(0);
            DailyStats {
                date: row.date.unwrap().format("%Y-%m-%d").to_string(),
                incoming,
                outgoing,
                cost: outgoing - incoming,
            }
        })
        .collect();

    let total_incoming = summary.total_incoming
        .unwrap_or(BigDecimal::from(0))
        .to_i64()
        .unwrap_or(0);
    let total_outgoing = summary.total_outgoing
        .unwrap_or(BigDecimal::from(0))
        .to_i64()
        .unwrap_or(0);

    Ok(ApiKeyStatistics {
        api_key_id: api_key_id.to_string(),
        total_incoming,
        total_outgoing,
        total_cost: total_outgoing - total_incoming,
        daily_stats,
    })
}
