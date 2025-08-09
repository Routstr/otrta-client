-- Restore the provider URL constraint
-- First add back the basic unique constraint on URL
ALTER TABLE providers ADD CONSTRAINT providers_url_key UNIQUE (url);

-- Then add the organization-aware unique index (this will replace the basic constraint if needed)
CREATE UNIQUE INDEX IF NOT EXISTS providers_url_org_unique ON providers (url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));
