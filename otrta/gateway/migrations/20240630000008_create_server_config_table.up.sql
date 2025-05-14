-- Create server configuration table
CREATE TABLE server_config (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    api_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ
);