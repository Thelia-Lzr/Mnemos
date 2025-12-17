-- Add language column to chat_messages table

DO $$ 
BEGIN
    -- Add language column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chat_messages' AND column_name = 'language') THEN
        ALTER TABLE chat_messages ADD COLUMN language VARCHAR(10);
        
        -- Add comment to explain the column
        COMMENT ON COLUMN chat_messages.language IS 'Language code for the chat message (e.g., fr, en, es)';
        
        -- Update existing records to have a default language (optional)
        -- You can uncomment the next line if you want to set a default language for existing records
        -- UPDATE chat_messages SET language = 'fr' WHERE language IS NULL;
    END IF;
END $$;