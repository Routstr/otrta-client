-- Add up migration script here

CREATE TABLE mints (
    id SERIAL PRIMARY KEY,
    mint_url VARCHAR(500) NOT NULL UNIQUE,
    currency_unit VARCHAR(50) DEFAULT 'Msat',
    is_active BOOLEAN DEFAULT TRUE,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);