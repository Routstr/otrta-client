-- Add down migration script here
ALTER TABLE transactions DROP COLUMN IF EXISTS api_key_id;
