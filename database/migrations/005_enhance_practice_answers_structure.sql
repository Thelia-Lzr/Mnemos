-- Enhance practice answers structure to better record user choices and wrong answers
-- Migration: 005_enhance_practice_answers_structure.sql

-- The answers JSONB field will now store detailed information about each question:
-- [
--   {
--     "questionId": "uuid",
--     "userAnswer": "A. Option text",
--     "userAnswerLetter": "A",
--     "correctAnswer": "B",
--     "correctAnswerText": "B. Correct option text",
--     "isCorrect": false,
--     "timeSpent": 30000,
--     "attempts": 1,
--     "questionContent": "What is the correct answer?",
--     "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
--     "explanation": "Explanation of the correct answer",
--     "vocabularyWords": ["word1", "word2"],
--     "grammarPoints": ["point1", "point2"]
--   }
-- ]

-- Add a new column to store wrong answers summary for quick access
ALTER TABLE practice_results 
ADD COLUMN IF NOT EXISTS wrong_answers_summary JSONB DEFAULT '[]'::jsonb;

-- Create index for wrong answers summary
CREATE INDEX IF NOT EXISTS idx_practice_results_wrong_answers ON practice_results USING GIN (wrong_answers_summary);

-- Add comments to document the enhanced structure
COMMENT ON COLUMN practice_results.answers IS 'Enhanced JSONB array storing detailed information about each question including user choices, correct answers, and question details';
COMMENT ON COLUMN practice_results.wrong_answers_summary IS 'JSONB array storing summary of wrong answers for quick access: [{"questionId": "uuid", "userChoice": "A", "correctChoice": "B", "questionContent": "..."}]';

-- Update existing records to have the new structure (this will be handled by the application)
-- The application will need to migrate existing data when it encounters old format answers