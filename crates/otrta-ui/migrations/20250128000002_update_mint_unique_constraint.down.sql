-- Drop the composite unique constraint
DROP INDEX IF EXISTS mints_url_org_unique;

-- Recreate the original unique constraint on mint_url only
ALTER TABLE mints ADD CONSTRAINT mints_mint_url_key UNIQUE (mint_url); 