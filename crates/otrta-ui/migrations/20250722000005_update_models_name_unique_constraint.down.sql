-- Revert to unique name
ALTER TABLE models DROP CONSTRAINT IF EXISTS models_provider_id_name_unique;
-- Add back unique on name (Postgres auto-generates name models_name_key)
ALTER TABLE models ADD CONSTRAINT models_name_key UNIQUE (name);
