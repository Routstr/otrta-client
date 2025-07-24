ALTER TABLE user_searches ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
ALTER TABLE user_searches ADD COLUMN started_at TIMESTAMP;
ALTER TABLE user_searches ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE user_searches ADD COLUMN error_message TEXT;
ALTER TABLE user_searches ADD COLUMN search_metadata JSONB;

CREATE INDEX idx_user_searches_status ON user_searches(user_id, status);
CREATE INDEX idx_user_searches_group_status ON user_searches(user_search_group_id, status);

UPDATE user_searches SET status = 'completed', completed_at = created_at WHERE status IS NULL; 