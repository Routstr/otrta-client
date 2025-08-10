-- Change models unique constraint to be per provider
ALTER TABLE models DROP CONSTRAINT IF EXISTS models_name_key;
ALTER TABLE models ADD CONSTRAINT models_provider_id_name_unique UNIQUE (provider_id, name);
