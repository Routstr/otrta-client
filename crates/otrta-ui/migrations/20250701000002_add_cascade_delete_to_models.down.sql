-- Drop the CASCADE delete foreign key constraint
ALTER TABLE models DROP CONSTRAINT models_provider_id_fkey;

-- Add back the original foreign key constraint without CASCADE
ALTER TABLE models 
ADD CONSTRAINT models_provider_id_fkey 
FOREIGN KEY (provider_id) 
REFERENCES providers(id); 