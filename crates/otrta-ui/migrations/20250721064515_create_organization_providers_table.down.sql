-- Remove organization_providers table and related indexes
DROP INDEX IF EXISTS idx_organization_providers_active;
DROP INDEX IF EXISTS idx_organization_providers_default;
DROP TABLE organization_providers;
