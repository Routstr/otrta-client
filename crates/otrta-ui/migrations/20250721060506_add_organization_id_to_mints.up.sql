-- Add organization_id column to mints table
ALTER TABLE mints ADD COLUMN organization_id UUID;
