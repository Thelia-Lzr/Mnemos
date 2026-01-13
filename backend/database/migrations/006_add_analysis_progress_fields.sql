-- Add missing progress tracking fields to practice_ai_analysis table
-- These fields store capability changes and overall progress direction

ALTER TABLE practice_ai_analysis 
ADD COLUMN IF NOT EXISTS capability_changes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS overall_progress_direction VARCHAR(20) DEFAULT 'maintained' CHECK (overall_progress_direction IN ('improved', 'maintained', 'declined')),
ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- Create index for better performance on capability_changes column
CREATE INDEX IF NOT EXISTS idx_practice_ai_analysis_capability_changes ON practice_ai_analysis USING GIN (capability_changes);

-- Add comments to document the columns
COMMENT ON COLUMN practice_ai_analysis.capability_changes IS 'JSON object tracking changes in reading, writing, listening, speaking, grammar, and vocabulary capabilities';
COMMENT ON COLUMN practice_ai_analysis.overall_progress_direction IS 'Overall learning progress direction: improved, maintained, or declined';
COMMENT ON COLUMN practice_ai_analysis.progress_message IS 'Personalized progress message for the user';
