-- Fix user_id type to match users.npub (VARCHAR instead of UUID)
ALTER TABLE transactions ALTER COLUMN user_id TYPE VARCHAR(63); 