-- Add down migration script here

-- Remove provider_id field from models table
DROP INDEX IF EXISTS idx_models_provider_id;
ALTER TABLE models DROP COLUMN IF EXISTS provider_id;
