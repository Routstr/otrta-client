-- Drop the index first
DROP INDEX IF EXISTS idx_models_provider_id;

-- Drop the provider_id column
ALTER TABLE models DROP COLUMN provider_id;
