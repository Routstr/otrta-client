-- Add up migration script here
CREATE TABLE credits (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL,
    amount TEXT NOT NULL,
    redeemed BOOLEAN NOT NULL
);
