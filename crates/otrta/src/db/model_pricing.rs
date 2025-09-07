use crate::models::{normalize_model_name, ModelRecord};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelPricingProvider {
    pub provider_id: i32,
    pub provider_name: String,
    pub model_name: String,
    pub input_cost: i64,
    pub output_cost: i64,
    pub min_cash_per_request: i64,
    pub is_free: bool,
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
            input_cost, output_cost, min_cash_per_request, is_free
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (normalized_model_name, provider_id)
        DO UPDATE SET
            provider_name = EXCLUDED.provider_name,
            model_name = EXCLUDED.model_name,
            input_cost = EXCLUDED.input_cost,
            output_cost = EXCLUDED.output_cost,
            min_cash_per_request = EXCLUDED.min_cash_per_request,
            is_free = EXCLUDED.is_free,
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
        model.is_free,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_model_pricing_comparison(
    pool: &PgPool,
    organization_id: &Uuid,
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
            COALESCE(mp.is_free, false) AS is_free,
            provider_counts.provider_count
        FROM model_pricing mp
        INNER JOIN providers p ON mp.provider_id = p.id
        INNER JOIN (
            SELECT 
                normalized_model_name,
                COUNT(DISTINCT provider_id) as provider_count
            FROM model_pricing mp2
            INNER JOIN providers p2 ON mp2.provider_id = p2.id
            WHERE mp2.last_updated > NOW() - INTERVAL '1 day'
              AND (p2.organization_id IS NULL OR p2.organization_id = $1)
            GROUP BY normalized_model_name
        ) provider_counts ON mp.normalized_model_name = provider_counts.normalized_model_name
        WHERE mp.last_updated > NOW() - INTERVAL '1 day'
          AND (p.organization_id IS NULL OR p.organization_id = $1)
        ORDER BY provider_counts.provider_count DESC,
                 mp.normalized_model_name ASC,
                 CASE WHEN COALESCE(mp.is_free, false) THEN 0 ELSE 1 END,
                 COALESCE(mp.input_cost + mp.output_cost, 0),
                 mp.min_cash_per_request
        "#,
        organization_id
    )
    .fetch_all(pool)
    .await?;

    let mut comparisons: std::collections::HashMap<String, Vec<ModelPricingProvider>> =
        std::collections::HashMap::new();
    let mut model_order: Vec<String> = Vec::new();
    let mut seen_models: std::collections::HashSet<String> = std::collections::HashSet::new();

    for record in records {
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
            is_free: record.is_free.unwrap_or(false),
        };

        comparisons
            .entry(record.normalized_model_name)
            .or_insert_with(Vec::new)
            .push(provider);
    }

    let mut result: Vec<ModelPricingComparison> = Vec::new();

    for model_name in model_order {
        if let Some(mut providers) = comparisons.remove(&model_name) {
            providers.sort_by(|a, b| {
                let a_key = (
                    if a.is_free { 0 } else { 1 },
                    a.input_cost.saturating_add(a.output_cost),
                    a.min_cash_per_request,
                );
                let b_key = (
                    if b.is_free { 0 } else { 1 },
                    b.input_cost.saturating_add(b.output_cost),
                    b.min_cash_per_request,
                );
                a_key.cmp(&b_key)
            });
            result.push(ModelPricingComparison {
                normalized_model_name: model_name,
                providers,
            });
        }
    }

    Ok(result)
}
