-- Drop the existing foreign key constraint
ALTER TABLE models DROP CONSTRAINT models_provider_id_fkey;

-- Add the new foreign key constraint with CASCADE delete
ALTER TABLE models 
ADD CONSTRAINT models_provider_id_fkey 
FOREIGN KEY (provider_id) 
REFERENCES providers(id) 
ON DELETE CASCADE; 