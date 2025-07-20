-- Add organization field to server_config table (NOT NULL)
-- First, delete any existing server_config records since they would not have an organization_id
DELETE FROM server_config;

-- Add the NOT NULL organization_id column
ALTER TABLE server_config ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for better performance on organization lookups
CREATE INDEX idx_server_config_organization_id ON server_config(organization_id); 