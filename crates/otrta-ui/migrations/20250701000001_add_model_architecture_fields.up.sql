-- Add architecture fields
ALTER TABLE models
    ADD COLUMN modality TEXT,
    ADD COLUMN input_modalities TEXT[],
    ADD COLUMN output_modalities TEXT[],
    ADD COLUMN tokenizer TEXT,
    ADD COLUMN instruct_type TEXT,
    ADD COLUMN created_timestamp BIGINT,
    -- Add pricing fields
    ADD COLUMN prompt_cost DOUBLE PRECISION,
    ADD COLUMN completion_cost DOUBLE PRECISION,
    ADD COLUMN request_cost DOUBLE PRECISION,
    ADD COLUMN image_cost DOUBLE PRECISION,
    ADD COLUMN web_search_cost DOUBLE PRECISION,
    ADD COLUMN internal_reasoning_cost DOUBLE PRECISION,
    ADD COLUMN max_cost DOUBLE PRECISION,
    -- Add top provider fields
    ADD COLUMN max_completion_tokens INTEGER,
    ADD COLUMN is_moderated BOOLEAN; 