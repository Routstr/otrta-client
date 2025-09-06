-- Revert provider URL constraint back to simple URL uniqueness
-- This removes the source-aware constraint and restores the original behavior

DO $$ 
BEGIN
    -- Drop the composite unique constraint if it exists
    IF EXISTS (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'providers' 
        AND constraint_name = 'providers_url_source_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE providers DROP CONSTRAINT providers_url_source_key;
    END IF;
    
    -- Add back the simple unique constraint on url
    -- Note: This may fail if there are duplicate URLs with different sources
    ALTER TABLE providers ADD CONSTRAINT providers_url_key UNIQUE (url);
    
END $$;
