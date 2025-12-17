-- Fix practice_results table schema
-- Add missing columns that are expected by the application

-- Add missing columns to practice_results table
ALTER TABLE practice_results 
ADD COLUMN IF NOT EXISTS answers JSONB,
ADD COLUMN IF NOT EXISTS capability_updates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vocabulary_updates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS milestone_progress JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_practice_results_answers ON practice_results USING GIN (answers);
CREATE INDEX IF NOT EXISTS idx_practice_results_capability_updates ON practice_results USING GIN (capability_updates);
CREATE INDEX IF NOT EXISTS idx_practice_results_vocabulary_updates ON practice_results USING GIN (vocabulary_updates);
CREATE INDEX IF NOT EXISTS idx_practice_results_milestone_progress ON practice_results USING GIN (milestone_progress);

-- Add index for practice results by user and completion date
CREATE INDEX IF NOT EXISTS idx_practice_results_user_completed ON practice_results(user_id, completed_at DESC);