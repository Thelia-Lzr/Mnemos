-- Add capability changes fields to practice_ai_analysis table

DO $$ 
BEGIN
    -- Add capability_changes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'practice_ai_analysis' AND column_name = 'capability_changes') THEN
        ALTER TABLE practice_ai_analysis ADD COLUMN capability_changes JSONB;
        COMMENT ON COLUMN practice_ai_analysis.capability_changes IS 'AI assessed capability changes in different skill areas';
    END IF;

    -- Add overall_progress_direction column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'practice_ai_analysis' AND column_name = 'overall_progress_direction') THEN
        ALTER TABLE practice_ai_analysis ADD COLUMN overall_progress_direction VARCHAR(20);
        COMMENT ON COLUMN practice_ai_analysis.overall_progress_direction IS 'Overall progress direction: improved, maintained, or declined';
    END IF;

    -- Add progress_message column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'practice_ai_analysis' AND column_name = 'progress_message') THEN
        ALTER TABLE practice_ai_analysis ADD COLUMN progress_message TEXT;
        COMMENT ON COLUMN practice_ai_analysis.progress_message IS 'Progress message to show to user for motivation';
    END IF;
END $$;