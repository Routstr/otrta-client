-- Add up migration script here

-- Add provider_id field to models table (initially nullable)
ALTER TABLE models 
ADD COLUMN provider_id INTEGER REFERENCES providers(id);

-- Set provider_id to the default provider for existing models
UPDATE models 
SET provider_id = (SELECT id FROM providers WHERE is_default = TRUE LIMIT 1)
WHERE provider_id IS NULL;

-- Make provider_id NOT NULL after setting values
ALTER TABLE models 
ALTER COLUMN provider_id SET NOT NULL;

-- Create index for efficient lookups
CREATE INDEX idx_models_provider_id ON models(provider_id);
