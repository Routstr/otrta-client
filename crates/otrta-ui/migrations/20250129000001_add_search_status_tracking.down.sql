DROP INDEX IF EXISTS idx_user_searches_group_status;
DROP INDEX IF EXISTS idx_user_searches_status;

ALTER TABLE user_searches DROP COLUMN IF EXISTS search_metadata;
ALTER TABLE user_searches DROP COLUMN IF EXISTS error_message;
ALTER TABLE user_searches DROP COLUMN IF EXISTS completed_at;
ALTER TABLE user_searches DROP COLUMN IF EXISTS started_at;
ALTER TABLE user_searches DROP COLUMN IF EXISTS status; 