-- Only run this rollback if the providers table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers') THEN
        -- Drop the composite unique constraint
        DROP INDEX IF EXISTS providers_url_org_unique;
        
        -- Recreate the original unique constraint on url only
        ALTER TABLE providers ADD CONSTRAINT providers_url_key UNIQUE (url);
    END IF;
END $$; 