-- Add unique constraint to prevent duplicate models for the same provider
-- First remove any existing duplicates by keeping only the most recently updated one

WITH ranked_models AS (
    SELECT 
        id,
        provider_id,
        name,
        ROW_NUMBER() OVER (
            PARTITION BY provider_id, name 
            ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
        ) as rn
    FROM models
)
DELETE FROM models 
WHERE id IN (
    SELECT id 
    FROM ranked_models 
    WHERE rn > 1
);

-- Create unique constraint to ensure one model per provider per name
CREATE UNIQUE INDEX idx_models_provider_name_unique 
ON models (provider_id, name); 