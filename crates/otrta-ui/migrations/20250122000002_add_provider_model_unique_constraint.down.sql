-- Remove unique constraint for provider_id and name
DROP INDEX IF EXISTS idx_models_provider_name_unique; 