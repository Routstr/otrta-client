-- Only run this migration if the providers table and organization_id column exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers') AND
       EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'organization_id') THEN
        -- Drop the existing unique constraint on url
        ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_url_key;
        
        -- Add a new unique constraint on url and organization_id (treating NULL as a specific value)
        CREATE UNIQUE INDEX IF NOT EXISTS providers_url_org_unique ON providers (url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
END $$; 