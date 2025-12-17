-- Add language column to chat_messages table for better language-specific analysis

-- Add language column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) CHECK (language IN ('en', 'ja', 'fr'));

-- Create index for better performance on language-based queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_language ON chat_messages(user_id, language);

-- Update existing records to set a default language (optional, can be left NULL)
-- UPDATE chat_messages SET language = 'en' WHERE language IS NULL;