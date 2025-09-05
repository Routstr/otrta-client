-- Add up migration script here

ALTER TABLE providers
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual' NOT NULL;

UPDATE providers SET source = 'manual' WHERE source IS NULL;

CREATE INDEX IF NOT EXISTS idx_providers_source ON providers(source);
