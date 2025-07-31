-- Only run this migration if the mints table and organization_id column exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mints') AND
       EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mints' AND column_name = 'organization_id') THEN
        -- Drop the existing unique constraint on mint_url
        ALTER TABLE mints DROP CONSTRAINT IF EXISTS mints_mint_url_key;
        
        -- Add a new unique constraint on mint_url and organization_id (treating NULL as a specific value)
        CREATE UNIQUE INDEX IF NOT EXISTS mints_url_org_unique ON mints (mint_url, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
END $$; 