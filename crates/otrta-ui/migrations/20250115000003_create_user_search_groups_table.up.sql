CREATE TABLE user_search_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_search_groups_user_id ON user_search_groups(user_id);
CREATE INDEX idx_user_search_groups_created_at ON user_search_groups(created_at); 