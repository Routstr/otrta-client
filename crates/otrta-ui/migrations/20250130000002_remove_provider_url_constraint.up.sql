-- Remove the global provider URL constraint
-- This allows different organizations to have providers with the same URL
-- The uniqueness will be enforced in application code per organization

DO $$ 
BEGIN
    -- Drop the composite unique index if it exists
    DROP INDEX IF EXISTS providers_url_org_unique;
    
    -- Drop the unique constraint on url if it exists 
    IF EXISTS (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'providers' 
        AND constraint_name = 'providers_url_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE providers DROP CONSTRAINT providers_url_key;
    END IF;
END $$;
