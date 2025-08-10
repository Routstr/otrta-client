CREATE TABLE IF NOT EXISTS model_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_model_name VARCHAR NOT NULL,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    provider_name VARCHAR NOT NULL,
    model_name VARCHAR NOT NULL,
    input_cost BIGINT NOT NULL DEFAULT 0,
    output_cost BIGINT NOT NULL DEFAULT 0,
    min_cash_per_request BIGINT NOT NULL DEFAULT 0,
    is_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(normalized_model_name, provider_id)
);

CREATE INDEX idx_model_pricing_normalized_name ON model_pricing(normalized_model_name);
CREATE INDEX idx_model_pricing_provider_id ON model_pricing(provider_id);
CREATE INDEX idx_model_pricing_is_free ON model_pricing(is_free);
CREATE INDEX idx_model_pricing_updated ON model_pricing(last_updated);
