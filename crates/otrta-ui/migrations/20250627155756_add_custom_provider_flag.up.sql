-- Add up migration script here

ALTER TABLE providers ADD COLUMN is_custom BOOLEAN DEFAULT FALSE;
