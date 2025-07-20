-- Remove organization field from server_config table
DROP INDEX IF EXISTS idx_server_config_organization_id;
ALTER TABLE server_config DROP COLUMN IF EXISTS organization_id; 