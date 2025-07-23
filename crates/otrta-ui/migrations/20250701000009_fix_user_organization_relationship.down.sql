-- Add down migration script here

-- Drop the indexes
DROP INDEX IF EXISTS idx_users_organization_id;

-- Drop the foreign key constraint from users to organizations
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;

-- Add owner_npub column back to organizations
ALTER TABLE organizations ADD COLUMN owner_npub VARCHAR(63);

-- Populate owner_npub with the first user from each organization (for rollback purposes)
UPDATE organizations 
SET owner_npub = (
    SELECT npub FROM users 
    WHERE users.organization_id = organizations.id 
    LIMIT 1
);

-- Make owner_npub required (if there are organizations without users, this will fail - which is expected)
ALTER TABLE organizations ALTER COLUMN owner_npub SET NOT NULL;

-- Add back the foreign key constraint from organizations to users
ALTER TABLE organizations ADD CONSTRAINT organizations_owner_npub_fkey 
    FOREIGN KEY (owner_npub) REFERENCES users(npub) ON DELETE CASCADE;

-- Remove organization_id from users
ALTER TABLE users DROP COLUMN organization_id;

-- Recreate the original index
CREATE INDEX idx_organizations_owner_npub ON organizations(owner_npub); 