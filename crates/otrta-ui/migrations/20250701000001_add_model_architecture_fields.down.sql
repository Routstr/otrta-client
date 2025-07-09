-- Remove all new columns
ALTER TABLE models
    DROP COLUMN modality,
    DROP COLUMN input_modalities,
    DROP COLUMN output_modalities,
    DROP COLUMN tokenizer,
    DROP COLUMN instruct_type,
    DROP COLUMN created_timestamp,
    DROP COLUMN prompt_cost,
    DROP COLUMN completion_cost,
    DROP COLUMN request_cost,
    DROP COLUMN image_cost,
    DROP COLUMN web_search_cost,
    DROP COLUMN internal_reasoning_cost,
    DROP COLUMN max_cost,
    DROP COLUMN max_completion_tokens,
    DROP COLUMN is_moderated; 