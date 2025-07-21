-- Add organization_id column to providers table
ALTER TABLE providers ADD COLUMN organization_id UUID;
