-- Add user_id and type fields to transactions table
CREATE TYPE transaction_type AS ENUM ('chat', 'api');

ALTER TABLE transactions ADD COLUMN user_id UUID;
ALTER TABLE transactions ADD COLUMN type transaction_type NOT NULL DEFAULT 'api'; 