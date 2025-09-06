-- Update provider URL constraint to allow same URL for different sources
-- This enables having the same URL for both 'nostr' and 'manual' providers

DO $$ 
BEGIN
    -- Drop the existing unique constraint on url if it exists
    IF EXISTS (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'providers' 
        AND constraint_name = 'providers_url_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE providers DROP CONSTRAINT providers_url_key;
    END IF;
    
    -- Drop any existing composite index
    DROP INDEX IF EXISTS providers_url_org_unique;
    
    -- Add new unique constraint on url + source combination
    -- This allows same URL for different sources (nostr vs manual)
    ALTER TABLE providers ADD CONSTRAINT providers_url_source_key UNIQUE (url, source);
    
END $$;
