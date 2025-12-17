-- Add language column to practice_results table

DO $$ 
BEGIN
    -- Add language column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'practice_results' AND column_name = 'language') THEN
        ALTER TABLE practice_results ADD COLUMN language VARCHAR(10);
        
        -- Add comment to explain the column
        COMMENT ON COLUMN practice_results.language IS 'Language code for the practice session (e.g., fr, en, es)';
        
        -- Update existing records to have a default language based on user's primary language
        -- This is a best-effort approach for existing data
        UPDATE practice_results 
        SET language = (
            SELECT uc.language 
            FROM user_capabilities uc 
            WHERE uc.user_id = practice_results.user_id 
            LIMIT 1
        )
        WHERE language IS NULL;
        
        -- If still null, set to 'fr' as default
        UPDATE practice_results SET language = 'fr' WHERE language IS NULL;
    END IF;
END $$;