-- Create models table
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    input_cost BIGINT NOT NULL DEFAULT 0, -- Cost per 1M tokens in sats
    output_cost BIGINT NOT NULL DEFAULT 0, -- Cost per 1M tokens in sats
    min_cash_per_request BIGINT NOT NULL DEFAULT 0, -- Minimum charge per request in sats
    min_cost_per_request BIGINT, -- Alternative minimum cost per request in sats
    provider TEXT,
    soft_deleted BOOLEAN DEFAULT false,
    model_type TEXT,
    description TEXT,
    context_length INTEGER,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW() -- Track when model was last seen in proxy response
);

-- Create index for efficient lookups
CREATE INDEX idx_models_name ON models(name);
CREATE INDEX idx_models_soft_deleted ON models(soft_deleted);
CREATE INDEX idx_models_last_seen_at ON models(last_seen_at); 