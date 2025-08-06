-- Rollback fix for mint unique constraint

-- Drop the composite unique constraint
ALTER TABLE mints DROP CONSTRAINT IF EXISTS mints_mint_url_organization_id_unique;

-- Recreate the original unique constraint on mint_url only
-- WARNING: This may fail if there are duplicate mint_urls for different organizations
ALTER TABLE mints ADD CONSTRAINT mints_mint_url_key UNIQUE (mint_url);