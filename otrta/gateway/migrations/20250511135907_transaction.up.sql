-- Add up migration script here
CREATE TYPE transaction_direction AS ENUM ('Incoming', 'Outgoing');

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL,
    amount TEXT NOT NULL,
    direction transaction_direction NOT NULL
);
