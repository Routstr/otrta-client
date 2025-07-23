-- Remove user_id and type fields from transactions table
ALTER TABLE transactions DROP COLUMN user_id;
ALTER TABLE transactions DROP COLUMN type;

DROP TYPE transaction_type; 