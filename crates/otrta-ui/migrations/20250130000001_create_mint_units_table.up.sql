-- Create mint_units table to support multiple units per mint
CREATE TABLE mint_units (
    id SERIAL PRIMARY KEY,
    mint_id INTEGER NOT NULL REFERENCES mints(id) ON DELETE CASCADE,
    unit VARCHAR(50) NOT NULL,
    keyset_id VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mint_id, unit)
);

-- Create index for faster queries
CREATE INDEX idx_mint_units_mint_id ON mint_units(mint_id);
CREATE INDEX idx_mint_units_active ON mint_units(active);

-- Migrate existing mints to use the new structure
INSERT INTO mint_units (mint_id, unit, keyset_id, active)
SELECT id, currency_unit, 'default', is_active
FROM mints
WHERE currency_unit IS NOT NULL;