use crate::models::{normalize_model_name, ModelRecord};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelPricingRecord {
    pub id: Uuid,
    pub normalized_model_name: String,
    pub provider_id: i32,
    pub provider_name: String,
    pub model_name: String,
    pub input_cost: i64,
    pub output_cost: i64,
    pub min_cash_per_request: i64,
    pub prompt_cost: Option<f64>,
    pub completion_cost: Option<f64>,
    pub request_cost: Option<f64>,
    pub image_cost: Option<f64>,
    pub web_search_cost: Option<f64>,
    pub internal_reasoning_cost: Option<f64>,
    pub max_cost: Option<f64>,
    pub is_free: bool,
    pub context_length: Option<i32>,
    pub description: Option<String>,
    pub model_type: Option<String>,
    pub modality: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelPricingProvider {
    pub provider_id: i32,
    pub provider_name: String,
    pub model_name: String,
    pub input_cost: i64,
    pub output_cost: i64,
    pub min_cash_per_request: i64,
    pub prompt_cost: Option<f64>,
    pub completion_cost: Option<f64>,
    pub request_cost: Option<f64>,
    pub image_cost: Option<f64>,
    pub web_search_cost: Option<f64>,
    pub internal_reasoning_cost: Option<f64>,
    pub max_cost: Option<f64>,
    pub is_free: bool,
    pub context_length: Option<i32>,
    pub description: Option<String>,
    pub model_type: Option<String>,
    pub modality: Option<String>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelPricingComparison {
    pub normalized_model_name: String,
    pub providers: Vec<ModelPricingProvider>,
}

pub async fn upsert_model_pricing(
    pool: &PgPool,
    model: &ModelRecord,
    provider_name: &str,
) -> Result<(), sqlx::Error> {
    let normalized_name = normalize_model_name(&model.name);

    sqlx::query!(
        r#"
        INSERT INTO model_pricing (
            normalized_model_name, provider_id, provider_name, model_name,
            input_cost, output_cost, min_cash_per_request,
            prompt_cost, completion_cost, request_cost, image_cost,
            web_search_cost, internal_reasoning_cost, max_cost,
            is_free, context_length, description, model_type, modality
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        ON CONFLICT (normalized_model_name, provider_id)
        DO UPDATE SET
            provider_name = EXCLUDED.provider_name,
            model_name = EXCLUDED.model_name,
            input_cost = EXCLUDED.input_cost,
            output_cost = EXCLUDED.output_cost,
            min_cash_per_request = EXCLUDED.min_cash_per_request,
            prompt_cost = EXCLUDED.prompt_cost,
            completion_cost = EXCLUDED.completion_cost,
            request_cost = EXCLUDED.request_cost,
            image_cost = EXCLUDED.image_cost,
            web_search_cost = EXCLUDED.web_search_cost,
            internal_reasoning_cost = EXCLUDED.internal_reasoning_cost,
            max_cost = EXCLUDED.max_cost,
            is_free = EXCLUDED.is_free,
            context_length = EXCLUDED.context_length,
            description = EXCLUDED.description,
            model_type = EXCLUDED.model_type,
            modality = EXCLUDED.modality,
            updated_at = NOW(),
            last_updated = NOW()
        "#,
        normalized_name,
        model.provider_id,
        provider_name,
        model.name,
        model.input_cost,
        model.output_cost,
        model.min_cash_per_request,
        model.prompt_cost,
        model.completion_cost,
        model.request_cost,
        model.image_cost,
        model.web_search_cost,
        model.internal_reasoning_cost,
        model.max_cost,
        model.is_free,
        model.context_length,
        model.description,
        model.model_type,
        model.modality
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_model_pricing_comparison(
    pool: &PgPool,
) -> Result<Vec<ModelPricingComparison>, sqlx::Error> {
    let records = sqlx::query!(
        r#"
        SELECT 
            mp.normalized_model_name,
            mp.provider_id,
            mp.provider_name,
            mp.model_name,
            mp.input_cost,
            mp.output_cost,
            mp.min_cash_per_request,
            mp.prompt_cost,
            mp.completion_cost,
            mp.request_cost,
            mp.image_cost,
            mp.web_search_cost,
            mp.internal_reasoning_cost,
            mp.max_cost,
            mp.is_free,
            mp.context_length,
            mp.description,
            mp.model_type,
            mp.modality,
            mp.last_updated,
            provider_counts.provider_count
        FROM model_pricing mp
        INNER JOIN (
            SELECT 
                normalized_model_name,
                COUNT(DISTINCT provider_id) as provider_count
            FROM model_pricing
            WHERE last_updated > NOW() - INTERVAL '1 day'
            GROUP BY normalized_model_name
        ) provider_counts ON mp.normalized_model_name = provider_counts.normalized_model_name
        WHERE mp.last_updated > NOW() - INTERVAL '1 day'
        ORDER BY provider_counts.provider_count DESC,
                 mp.normalized_model_name ASC,
                 CASE WHEN mp.is_free THEN 0 ELSE 1 END,
                 COALESCE(mp.input_cost + mp.output_cost, 0)
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut comparisons: std::collections::HashMap<String, Vec<ModelPricingProvider>> =
        std::collections::HashMap::new();
    let mut model_order: Vec<String> = Vec::new();
    let mut seen_models: std::collections::HashSet<String> = std::collections::HashSet::new();

    for record in records {
        // Track the order of models as they appear (already sorted by provider_count DESC)
        if !seen_models.contains(&record.normalized_model_name) {
            seen_models.insert(record.normalized_model_name.clone());
            model_order.push(record.normalized_model_name.clone());
        }

        let provider = ModelPricingProvider {
            provider_id: record.provider_id,
            provider_name: record.provider_name,
            model_name: record.model_name,
            input_cost: record.input_cost,
            output_cost: record.output_cost,
            min_cash_per_request: record.min_cash_per_request,
            prompt_cost: record.prompt_cost,
            completion_cost: record.completion_cost,
            request_cost: record.request_cost,
            image_cost: record.image_cost,
            web_search_cost: record.web_search_cost,
            internal_reasoning_cost: record.internal_reasoning_cost,
            max_cost: record.max_cost,
            is_free: record.is_free.unwrap_or(false),
            context_length: record.context_length,
            description: record.description,
            model_type: record.model_type,
            modality: record.modality,
            last_updated: record.last_updated.unwrap_or_else(|| chrono::Utc::now()),
        };

        comparisons
            .entry(record.normalized_model_name)
            .or_insert_with(Vec::new)
            .push(provider);
    }

    // Convert to result vector while preserving the database sort order
    let mut result: Vec<ModelPricingComparison> = Vec::new();

    // Process models in the order they appeared in the database query (sorted by provider_count DESC)
    for model_name in model_order {
        if let Some(providers) = comparisons.remove(&model_name) {
            result.push(ModelPricingComparison {
                normalized_model_name: model_name,
                providers,
            });
        }
    }

    Ok(result)
}
