-- Create organization_providers relationship table
CREATE TABLE organization_providers (
    organization_id UUID NOT NULL,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (organization_id, provider_id)
);

-- Ensure only one default provider per organization
CREATE UNIQUE INDEX idx_organization_providers_default 
ON organization_providers (organization_id) 
WHERE is_default = TRUE;

-- Index for faster queries
CREATE INDEX idx_organization_providers_active 
ON organization_providers (organization_id, is_active);

-- Add some default active providers for existing organizations if any
-- This will be handled by the application logic instead
