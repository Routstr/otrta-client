-- Drop the composite unique constraint
DROP INDEX IF EXISTS providers_url_org_unique;

-- Recreate the original unique constraint on url only
ALTER TABLE providers ADD CONSTRAINT providers_url_key UNIQUE (url); 