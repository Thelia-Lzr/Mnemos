-- Add missing wrong_answers_summary column to practice_results table
-- This column stores a summary of wrong answers for analysis and display

ALTER TABLE practice_results 
ADD COLUMN IF NOT EXISTS wrong_answers_summary JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance on wrong_answers_summary column
CREATE INDEX IF NOT EXISTS idx_practice_results_wrong_answers ON practice_results USING GIN (wrong_answers_summary);

-- Add comment to document the column
COMMENT ON COLUMN practice_results.wrong_answers_summary IS 'Summary of wrong answers with question details and explanations';
