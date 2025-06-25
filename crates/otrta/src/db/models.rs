use chrono::{DateTime, Utc};
use sqlx::PgPool;

use crate::models::{ModelRecord, ProxyModel, ProxyModelFromApi};

pub async fn get_all_models(pool: &PgPool) -> Result<Vec<ModelRecord>, sqlx::Error> {
    let models = sqlx::query!(
        r#"
        SELECT id, name, input_cost, output_cost, min_cash_per_request, 
               min_cost_per_request, provider, soft_deleted, model_type, 
               description, context_length, is_free, created_at, updated_at, last_seen_at
        FROM models
        ORDER BY name ASC
        "#
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|record| ModelRecord {
        id: record.id,
        name: record.name,
        input_cost: record.input_cost,
        output_cost: record.output_cost,
        min_cash_per_request: record.min_cash_per_request,
        min_cost_per_request: record.min_cost_per_request,
        provider: record.provider,
        soft_deleted: record.soft_deleted.unwrap_or(false),
        model_type: record.model_type,
        description: record.description,
        context_length: record.context_length,
        is_free: record.is_free.unwrap_or(false),
        created_at: record.created_at,
        updated_at: record.updated_at,
        last_seen_at: record.last_seen_at,
    })
    .collect();

    Ok(models)
}

pub async fn upsert_model(
    pool: &PgPool,
    model: &ProxyModelFromApi,
) -> Result<ModelRecord, sqlx::Error> {
    // Store the model data directly as received from API (already in sats)
    let input_cost = model.input_cost.unwrap_or(0.0) as i64;
    let output_cost = model.output_cost.unwrap_or(0.0) as i64;
    let min_cash_per_request = model.min_cash_per_request.unwrap_or(0.0) as i64;
    let min_cost_per_request = model.min_cost_per_request.map(|cost| cost as i64);

    let record = sqlx::query!(
        r#"
        INSERT INTO models (name, input_cost, output_cost, min_cash_per_request, 
                           min_cost_per_request, provider, soft_deleted, model_type, 
                           description, context_length, is_free, created_at, updated_at, last_seen_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
            input_cost = EXCLUDED.input_cost,
            output_cost = EXCLUDED.output_cost,
            min_cash_per_request = EXCLUDED.min_cash_per_request,
            min_cost_per_request = EXCLUDED.min_cost_per_request,
            provider = EXCLUDED.provider,
            soft_deleted = EXCLUDED.soft_deleted,
            model_type = EXCLUDED.model_type,
            description = EXCLUDED.description,
            context_length = EXCLUDED.context_length,
            is_free = EXCLUDED.is_free,
            updated_at = NOW(),
            last_seen_at = NOW()
        RETURNING id, name, input_cost, output_cost, min_cash_per_request, 
                  min_cost_per_request, provider, soft_deleted, model_type, 
                  description, context_length, is_free, created_at, updated_at, last_seen_at
        "#,
        model.name,
        input_cost,
        output_cost,
        min_cash_per_request,
        min_cost_per_request,
        model.provider,
        model.soft_deleted.unwrap_or(false),
        model.model_type,
        model.description,
        model.context_length,
        model.is_free.unwrap_or(false),
    )
    .fetch_one(pool)
    .await?;

    Ok(ModelRecord {
        id: record.id,
        name: record.name,
        input_cost: record.input_cost,
        output_cost: record.output_cost,
        min_cash_per_request: record.min_cash_per_request,
        min_cost_per_request: record.min_cost_per_request,
        provider: record.provider,
        soft_deleted: record.soft_deleted.unwrap_or(false),
        model_type: record.model_type,
        description: record.description,
        context_length: record.context_length,
        is_free: record.is_free.unwrap_or(false),
        created_at: record.created_at,
        updated_at: record.updated_at,
        last_seen_at: record.last_seen_at,
    })
}

pub async fn mark_models_as_removed(
    pool: &PgPool,
    model_names: &[String],
    cutoff_time: DateTime<Utc>,
) -> Result<i64, sqlx::Error> {
    if model_names.is_empty() {
        return Ok(0);
    }

    let result = sqlx::query!(
        r#"
        UPDATE models 
        SET soft_deleted = true, updated_at = NOW()
        WHERE name = ANY($1) AND (last_seen_at IS NULL OR last_seen_at < $2)
        "#,
        model_names,
        cutoff_time
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected() as i64)
}

// Bitcoin price fetching with fallback
pub async fn get_bitcoin_price_in_usd() -> Result<f64, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    // Try CoinGecko first
    if let Ok(response) = client
        .get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        if let Ok(json) = response.json::<serde_json::Value>().await {
            if let Some(price) = json
                .get("bitcoin")
                .and_then(|btc| btc.get("usd"))
                .and_then(|usd| usd.as_f64())
            {
                return Ok(price);
            }
        }
    }

    // Try Coinbase as fallback
    if let Ok(response) = client
        .get("https://api.coinbase.com/v2/exchange-rates?currency=BTC")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        if let Ok(json) = response.json::<serde_json::Value>().await {
            if let Some(price_str) = json
                .get("data")
                .and_then(|data| data.get("rates"))
                .and_then(|rates| rates.get("USD"))
                .and_then(|usd| usd.as_str())
            {
                if let Ok(price) = price_str.parse::<f64>() {
                    return Ok(price);
                }
            }
        }
    }

    // Try Binance as another fallback
    if let Ok(response) = client
        .get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        if let Ok(json) = response.json::<serde_json::Value>().await {
            if let Some(price_str) = json.get("price").and_then(|p| p.as_str()) {
                if let Ok(price) = price_str.parse::<f64>() {
                    return Ok(price);
                }
            }
        }
    }

    // Default fallback price if all APIs fail
    Ok(60000.0)
}

fn convert_usd_to_sats(usd_amount: f64, btc_price_usd: f64) -> i64 {
    if btc_price_usd <= 0.0 {
        return 0;
    }

    let sats_per_usd = 100_000_000.0 / btc_price_usd; // 100M sats per BTC
    let sats = usd_amount * sats_per_usd;

    sats.round() as i64
}

pub fn models_to_proxy_models(models: Vec<ModelRecord>) -> Vec<ProxyModel> {
    models
        .into_iter()
        .map(|model| ProxyModel {
            name: model.name,
            input_cost: model.input_cost,
            output_cost: model.output_cost,
            min_cash_per_request: model.min_cash_per_request,
            min_cost_per_request: model.min_cost_per_request,
            provider: model.provider,
            soft_deleted: Some(model.soft_deleted),
            model_type: model.model_type,
            description: model.description,
            context_length: model.context_length,
            is_free: Some(model.is_free),
        })
        .collect()
}
