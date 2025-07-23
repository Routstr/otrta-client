-- Revert user_id type back to UUID (this will only work if all user_id values are NULL or valid UUIDs)
ALTER TABLE transactions ALTER COLUMN user_id TYPE UUID USING user_id::UUID; 