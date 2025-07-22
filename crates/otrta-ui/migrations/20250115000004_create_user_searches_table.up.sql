CREATE TABLE user_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_search_group_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    search JSONB NOT NULL,
    FOREIGN KEY (user_search_group_id) REFERENCES user_search_groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_searches_user_id ON user_searches(user_id);
CREATE INDEX idx_user_searches_group_id ON user_searches(user_search_group_id);
CREATE INDEX idx_user_searches_created_at ON user_searches(created_at); 