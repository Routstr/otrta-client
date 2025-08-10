use chrono::{DateTime, Utc};
use sqlx::PgPool;

use crate::models::{ModelRecord, ProxyModel, ProxyModelFromApi};

use super::provider::get_default_provider_for_organization_new;

pub async fn get_all_models(pool: &PgPool) -> Result<Vec<ModelRecord>, sqlx::Error> {
    let models = sqlx::query!(
        r#"
        SELECT id, provider_id, name, input_cost, output_cost, min_cash_per_request, 
               min_cost_per_request, provider, soft_deleted, model_type, 
               description, context_length, is_free, created_at, updated_at, last_seen_at,
               modality, input_modalities, output_modalities, tokenizer, instruct_type,
               created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
               web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
               is_moderated
        FROM models
        WHERE soft_deleted = false OR soft_deleted IS NULL
        ORDER BY name ASC
        "#
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|record| ModelRecord {
        id: record.id,
        provider_id: record.provider_id,
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
        modality: record.modality,
        input_modalities: record.input_modalities,
        output_modalities: record.output_modalities,
        tokenizer: record.tokenizer,
        instruct_type: record.instruct_type,
        created_timestamp: record.created_timestamp,
        prompt_cost: record.prompt_cost,
        completion_cost: record.completion_cost,
        request_cost: record.request_cost,
        image_cost: record.image_cost,
        web_search_cost: record.web_search_cost,
        internal_reasoning_cost: record.internal_reasoning_cost,
        max_cost: record.max_cost,
        max_completion_tokens: record.max_completion_tokens,
        is_moderated: record.is_moderated,
    })
    .collect();

    Ok(models)
}

pub async fn get_models_for_organization(
    pool: &PgPool,
    organization_id: &uuid::Uuid,
) -> Result<Vec<ModelRecord>, sqlx::Error> {
    // Get the default provider for this organization
    let default_provider = get_default_provider_for_organization_new(pool, organization_id).await?;

    let provider_id = match default_provider {
        Some(provider) => provider.id,
        None => {
            // If no default provider for organization, return empty list
            return Ok(vec![]);
        }
    };

    let models = sqlx::query!(
        r#"
        SELECT id, provider_id, name, input_cost, output_cost, min_cash_per_request, 
               min_cost_per_request, provider, soft_deleted, model_type, 
               description, context_length, is_free, created_at, updated_at, last_seen_at,
               modality, input_modalities, output_modalities, tokenizer, instruct_type,
               created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
               web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
               is_moderated
        FROM models
        WHERE provider_id = $1 AND (soft_deleted = false OR soft_deleted IS NULL)
        ORDER BY name ASC
        "#,
        provider_id
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|record| ModelRecord {
        id: record.id,
        provider_id: record.provider_id,
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
        modality: record.modality,
        input_modalities: record.input_modalities,
        output_modalities: record.output_modalities,
        tokenizer: record.tokenizer,
        instruct_type: record.instruct_type,
        created_timestamp: record.created_timestamp,
        prompt_cost: record.prompt_cost,
        completion_cost: record.completion_cost,
        request_cost: record.request_cost,
        image_cost: record.image_cost,
        web_search_cost: record.web_search_cost,
        internal_reasoning_cost: record.internal_reasoning_cost,
        max_cost: record.max_cost,
        max_completion_tokens: record.max_completion_tokens,
        is_moderated: record.is_moderated,
    })
    .collect();

    Ok(models)
}

pub async fn get_all_models_including_deleted(
    pool: &PgPool,
) -> Result<Vec<ModelRecord>, sqlx::Error> {
    let models = sqlx::query!(
        r#"
        SELECT id, provider_id, name, input_cost, output_cost, min_cash_per_request, 
               min_cost_per_request, provider, soft_deleted, model_type, 
               description, context_length, is_free, created_at, updated_at, last_seen_at,
               modality, input_modalities, output_modalities, tokenizer, instruct_type,
               created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
               web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
               is_moderated
        FROM models
        ORDER BY name ASC
        "#
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|record| ModelRecord {
        id: record.id,
        provider_id: record.provider_id,
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
        modality: record.modality,
        input_modalities: record.input_modalities,
        output_modalities: record.output_modalities,
        tokenizer: record.tokenizer,
        instruct_type: record.instruct_type,
        created_timestamp: record.created_timestamp,
        prompt_cost: record.prompt_cost,
        completion_cost: record.completion_cost,
        request_cost: record.request_cost,
        image_cost: record.image_cost,
        web_search_cost: record.web_search_cost,
        internal_reasoning_cost: record.internal_reasoning_cost,
        max_cost: record.max_cost,
        max_completion_tokens: record.max_completion_tokens,
        is_moderated: record.is_moderated,
    })
    .collect();

    Ok(models)
}

pub async fn get_model(
    pool: &PgPool,
    model_name: &str,
) -> Result<Option<ModelRecord>, sqlx::Error> {
    let record = sqlx::query!(
        r#"
        SELECT id, provider_id, name, input_cost, output_cost, min_cash_per_request, 
               min_cost_per_request, provider, soft_deleted, model_type, 
               description, context_length, is_free, created_at, updated_at, last_seen_at,
               modality, input_modalities, output_modalities, tokenizer, instruct_type,
               created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
               web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
               is_moderated
        FROM models
        WHERE name = $1
        "#,
        model_name
    )
    .fetch_optional(pool)
    .await?;

    Ok(record.map(|r| ModelRecord {
        id: r.id,
        provider_id: r.provider_id,
        name: r.name,
        input_cost: r.input_cost,
        output_cost: r.output_cost,
        min_cash_per_request: r.min_cash_per_request,
        min_cost_per_request: r.min_cost_per_request,
        provider: r.provider,
        soft_deleted: r.soft_deleted.unwrap_or(false),
        model_type: r.model_type,
        description: r.description,
        context_length: r.context_length,
        is_free: r.is_free.unwrap_or(false),
        created_at: r.created_at,
        updated_at: r.updated_at,
        last_seen_at: r.last_seen_at,
        modality: r.modality,
        input_modalities: r.input_modalities,
        output_modalities: r.output_modalities,
        tokenizer: r.tokenizer,
        instruct_type: r.instruct_type,
        created_timestamp: r.created_timestamp,
        prompt_cost: r.prompt_cost,
        completion_cost: r.completion_cost,
        request_cost: r.request_cost,
        image_cost: r.image_cost,
        web_search_cost: r.web_search_cost,
        internal_reasoning_cost: r.internal_reasoning_cost,
        max_cost: r.max_cost,
        max_completion_tokens: r.max_completion_tokens,
        is_moderated: r.is_moderated,
    }))
}

pub async fn delete_all_models(pool: &PgPool) -> Result<i64, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        DELETE FROM models
        "#
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected() as i64)
}

pub async fn delete_models_for_provider(
    pool: &PgPool,
    provider_id: i32,
) -> Result<i64, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        DELETE FROM models
        WHERE provider_id = $1
        "#,
        provider_id
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected() as i64)
}

pub async fn upsert_model(
    pool: &PgPool,
    model: &ProxyModelFromApi,
    provider_id: i32,
) -> Result<ModelRecord, sqlx::Error> {
    let model_record = model.to_model_record(provider_id);

    let record = sqlx::query!(
        r#"
        INSERT INTO models (
            name, provider_id, input_cost, output_cost, min_cash_per_request, 
            min_cost_per_request, provider, soft_deleted, model_type, 
            description, context_length, is_free, created_at, updated_at, last_seen_at,
            modality, input_modalities, output_modalities, tokenizer, instruct_type,
            created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
            web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
            is_moderated
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW(),
            $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        )
        ON CONFLICT (name, provider_id) DO UPDATE SET
            provider_id = EXCLUDED.provider_id,
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
            last_seen_at = NOW(),
            modality = EXCLUDED.modality,
            input_modalities = EXCLUDED.input_modalities,
            output_modalities = EXCLUDED.output_modalities,
            tokenizer = EXCLUDED.tokenizer,
            instruct_type = EXCLUDED.instruct_type,
            created_timestamp = EXCLUDED.created_timestamp,
            prompt_cost = EXCLUDED.prompt_cost,
            completion_cost = EXCLUDED.completion_cost,
            request_cost = EXCLUDED.request_cost,
            image_cost = EXCLUDED.image_cost,
            web_search_cost = EXCLUDED.web_search_cost,
            internal_reasoning_cost = EXCLUDED.internal_reasoning_cost,
            max_cost = EXCLUDED.max_cost,
            max_completion_tokens = EXCLUDED.max_completion_tokens,
            is_moderated = EXCLUDED.is_moderated
        RETURNING id, provider_id, name, input_cost, output_cost, min_cash_per_request, 
                  min_cost_per_request, provider, soft_deleted, model_type, 
                  description, context_length, is_free, created_at, updated_at, last_seen_at,
                  modality, input_modalities, output_modalities, tokenizer, instruct_type,
                  created_timestamp, prompt_cost, completion_cost, request_cost, image_cost,
                  web_search_cost, internal_reasoning_cost, max_cost, max_completion_tokens,
                  is_moderated
        "#,
        model_record.name,
        model_record.provider_id,
        model_record.input_cost,
        model_record.output_cost,
        model_record.min_cash_per_request,
        model_record.min_cash_per_request,
        model_record.provider,
        model_record.soft_deleted,
        model_record.model_type,
        model_record.description,
        model_record.context_length,
        model_record.is_free,
        model_record.modality,
        model_record.input_modalities.as_deref(),
        model_record.output_modalities.as_deref(),
        model_record.tokenizer,
        model_record.instruct_type,
        model_record.created_timestamp,
        model_record.prompt_cost,
        model_record.completion_cost,
        model_record.request_cost,
        model_record.image_cost,
        model_record.web_search_cost,
        model_record.internal_reasoning_cost,
        model_record.max_cost,
        model_record.max_completion_tokens,
        model_record.is_moderated,
    )
    .fetch_one(pool)
    .await?;

    Ok(ModelRecord {
        id: record.id,
        provider_id: record.provider_id,
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
        modality: record.modality,
        input_modalities: record.input_modalities,
        output_modalities: record.output_modalities,
        tokenizer: record.tokenizer,
        instruct_type: record.instruct_type,
        created_timestamp: record.created_timestamp,
        prompt_cost: record.prompt_cost,
        completion_cost: record.completion_cost,
        request_cost: record.request_cost,
        image_cost: record.image_cost,
        web_search_cost: record.web_search_cost,
        internal_reasoning_cost: record.internal_reasoning_cost,
        max_cost: record.max_cost,
        max_completion_tokens: record.max_completion_tokens,
        is_moderated: record.is_moderated,
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

    Ok(60000.0)
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
            modality: model.modality,
            description: model.description,
            context_length: model.context_length,
            is_free: Some(model.is_free),
        })
        .collect()
}
