-- Add missing columns to user_capabilities table for enhanced assessment features

-- Add enhanced capability detail columns
ALTER TABLE user_capabilities 
ADD COLUMN IF NOT EXISTS vocabulary_capability JSONB,
ADD COLUMN IF NOT EXISTS grammar_capability JSONB,
ADD COLUMN IF NOT EXISTS comprehension_capability JSONB,
ADD COLUMN IF NOT EXISTS learning_style VARCHAR(20) DEFAULT 'mixed' CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
ADD COLUMN IF NOT EXISTS strengths TEXT[],
ADD COLUMN IF NOT EXISTS weaknesses TEXT[];

-- Create capability_assessments table if it doesn't exist
CREATE TABLE IF NOT EXISTS capability_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    assessment_type VARCHAR(50) NOT NULL,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    skill_scores JSONB NOT NULL,
    data_source VARCHAR(50) NOT NULL,
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
    improvement_areas JSONB,
    regression_areas JSONB,
    recommendations JSONB,
    next_steps JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for capability assessments
CREATE INDEX IF NOT EXISTS idx_capability_assessments_user_language ON capability_assessments(user_id, language);
CREATE INDEX IF NOT EXISTS idx_capability_assessments_date ON capability_assessments(assessment_date);

-- Add missing language column to practice_results if it doesn't exist
ALTER TABLE practice_results 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) CHECK (language IN ('en', 'ja', 'fr'));

-- Add missing practice_history column to users if it doesn't exist (this might be a misunderstanding in the error logs)
-- The practice history should be tracked through practice_results table, not as a column

-- Update existing records with default values for new columns
UPDATE user_capabilities 
SET 
    vocabulary_capability = COALESCE(vocabulary_capability, '{}'),
    grammar_capability = COALESCE(grammar_capability, '{}'),
    comprehension_capability = COALESCE(comprehension_capability, '{}'),
    learning_style = COALESCE(learning_style, 'mixed'),
    strengths = COALESCE(strengths, '{}'),
    weaknesses = COALESCE(weaknesses, '{}')
WHERE 
    vocabulary_capability IS NULL 
    OR grammar_capability IS NULL 
    OR comprehension_capability IS NULL 
    OR learning_style IS NULL 
    OR strengths IS NULL 
    OR weaknesses IS NULL;