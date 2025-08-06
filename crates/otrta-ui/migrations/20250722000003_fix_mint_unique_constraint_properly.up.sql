-- Fix mint unique constraint to be per organization
-- This migration properly fixes the constraint after organization_id column was added

-- Drop the old unique constraint if it still exists
ALTER TABLE mints DROP CONSTRAINT IF EXISTS mints_mint_url_key;

-- Drop the old unique index if it exists  
DROP INDEX IF EXISTS mints_url_org_unique;

-- Add proper unique constraint on mint_url and organization_id combination
-- This allows the same mint_url to be used by different organizations
ALTER TABLE mints ADD CONSTRAINT mints_mint_url_organization_id_unique 
UNIQUE (mint_url, organization_id);