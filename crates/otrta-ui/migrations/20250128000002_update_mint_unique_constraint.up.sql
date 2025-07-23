-- Drop the existing unique constraint on mint_url
ALTER TABLE mints DROP CONSTRAINT IF EXISTS mints_mint_url_key;

-- Add a new unique constraint on mint_url and organization_id (treating NULL as a specific value)
CREATE UNIQUE INDEX mints_url_org_unique ON mints (mint_url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)); 