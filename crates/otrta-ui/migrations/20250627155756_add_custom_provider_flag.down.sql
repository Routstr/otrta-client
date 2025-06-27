-- Add down migration script here

ALTER TABLE providers DROP COLUMN is_custom;
