-- Add down migration script here
ALTER TABLE api_keys ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN organization_id SET NOT NULL;
