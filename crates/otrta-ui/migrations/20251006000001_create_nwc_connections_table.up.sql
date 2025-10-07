-- Add up migration script here

CREATE TABLE nwc_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    connection_uri TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE mint_auto_refill_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mint_id INTEGER NOT NULL,
    organization_id UUID NOT NULL,
    nwc_connection_id UUID NOT NULL,
    min_balance_threshold_msat BIGINT NOT NULL DEFAULT 1000000,
    refill_amount_msat BIGINT NOT NULL DEFAULT 10000000,
    is_enabled BOOLEAN DEFAULT TRUE,
    last_refill_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (mint_id) REFERENCES mints(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (nwc_connection_id) REFERENCES nwc_connections(id) ON DELETE CASCADE,
    UNIQUE(mint_id, organization_id)
);

CREATE INDEX idx_nwc_connections_organization_id ON nwc_connections(organization_id);
CREATE INDEX idx_nwc_connections_is_active ON nwc_connections(is_active);
CREATE INDEX idx_mint_auto_refill_settings_organization_id ON mint_auto_refill_settings(organization_id);
CREATE INDEX idx_mint_auto_refill_settings_mint_id ON mint_auto_refill_settings(mint_id);
CREATE INDEX idx_mint_auto_refill_settings_is_enabled ON mint_auto_refill_settings(is_enabled);
CREATE INDEX idx_mint_auto_refill_settings_last_refill_at ON mint_auto_refill_settings(last_refill_at);