-- Drop the existing unique constraint on url
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_url_key;

-- Add a new unique constraint on url and organization_id (treating NULL as a specific value)
CREATE UNIQUE INDEX providers_url_org_unique ON providers (url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)); 