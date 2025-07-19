-- Add up migration script here
ALTER TABLE transactions ADD COLUMN api_key_id UUID;
