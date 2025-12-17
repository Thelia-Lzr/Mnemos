-- Ensure all capability columns exist in user_capabilities table

-- Check and add missing columns one by one to avoid conflicts
DO $$ 
BEGIN
    -- Add vocabulary_capability column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_capabilities' AND column_name = 'vocabulary_capability') THEN
        ALTER TABLE user_capabilities ADD COLUMN vocabulary_capability JSONB;
    END IF;

    -- Add grammar_capability column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_capabilities' AND column_name = 'grammar_capability') THEN
        ALTER TABLE user_capabilities ADD COLUMN grammar_capability JSONB;
    END IF;

    -- Add comprehension_capability column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_capabilities' AND column_name = 'comprehension_capability') THEN
        ALTER TABLE user_capabilities ADD COLUMN comprehension_capability JSONB;
    END IF;

    -- Add learning_style column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_capabilities' AND column_name = 'learning_style') THEN
        ALTER TABLE user_capabilities ADD COLUMN learning_style VARCHAR(20) DEFAULT 'mixed' 
        CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed'));
    END IF;

    -- Add strengths column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_capabilities' AND column_name = 'strengths') THEN
        ALTER TABLE user_capabilities ADD COLUMN strengths TEXT[];
    END IF;

    -- Add weaknesses column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_capabilities' AND column_name = 'weaknesses') THEN
        ALTER TABLE user_capabilities ADD COLUMN weaknesses TEXT[];
    END IF;
END $$;