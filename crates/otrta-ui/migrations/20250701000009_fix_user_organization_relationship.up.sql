-- Add up migration script here

-- First, drop the foreign key constraint from organizations to users
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_owner_npub_fkey;

-- Remove the owner_npub column from organizations since organizations exist independently
ALTER TABLE organizations DROP COLUMN IF EXISTS owner_npub;

-- Add organization_id to users table (nullable initially for data migration)
ALTER TABLE users ADD COLUMN organization_id UUID;

-- Create a default organization for existing users
INSERT INTO organizations (id, name, created_at, updated_at, is_active)
VALUES (gen_random_uuid(), 'Default Organization', NOW(), NOW(), TRUE)
ON CONFLICT DO NOTHING;

-- Assign all existing users to the default organization
UPDATE users 
SET organization_id = (
    SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1
)
WHERE organization_id IS NULL;

-- Now make organization_id required
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint from users to organizations
ALTER TABLE users ADD CONSTRAINT users_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

-- Create indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
DROP INDEX IF EXISTS idx_organizations_owner_npub; 