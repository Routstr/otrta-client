-- Add up migration script here

ALTER TABLE api_keys ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE api_keys ALTER COLUMN organization_id DROP NOT NULL;
