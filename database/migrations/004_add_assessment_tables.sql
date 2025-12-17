-- Migration: Add Assessment and Reassessment Tables
-- Version: 004
-- Description: Create tables for capability assessments and reassessment functionality

-- Capability Assessments Table
CREATE TABLE IF NOT EXISTS capability_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('initial', 'periodic', 'user_requested', 'performance_triggered')),
    
    -- Assessment results
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    skill_scores JSONB NOT NULL DEFAULT '{}',
    
    -- Assessment basis
    data_source VARCHAR(50) NOT NULL CHECK (data_source IN ('chat_analysis', 'practice_performance', 'vocabulary_tracking', 'user_self_report', 'comprehensive_test')),
    confidence_level INTEGER NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
    
    -- Change analysis
    improvement_areas TEXT[] DEFAULT '{}',
    regression_areas TEXT[] DEFAULT '{}',
    
    -- Recommendations
    recommendations TEXT[] DEFAULT '{}',
    next_steps TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT unique_user_language_assessment UNIQUE (user_id, language, assessment_date)
);

-- Reassessment Cases Table
CREATE TABLE IF NOT EXISTS reassessment_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    original_assessment_id UUID NOT NULL REFERENCES capability_assessments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    focus_areas TEXT[] DEFAULT '{}',
    user_objections TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    targeted_questions JSONB DEFAULT '[]',
    user_responses JSONB DEFAULT '[]',
    new_assessment_id UUID REFERENCES capability_assessments(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Knowledge Points Table (for detailed skill tracking)
CREATE TABLE IF NOT EXISTS knowledge_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    skill_area VARCHAR(50) NOT NULL,
    mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
    last_assessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    CONSTRAINT unique_user_language_skill UNIQUE (user_id, language, skill_area)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_capability_assessments_user_language ON capability_assessments(user_id, language);
CREATE INDEX IF NOT EXISTS idx_capability_assessments_date ON capability_assessments(assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_capability_assessments_type ON capability_assessments(assessment_type);

CREATE INDEX IF NOT EXISTS idx_reassessment_cases_user_language ON reassessment_cases(user_id, language);
CREATE INDEX IF NOT EXISTS idx_reassessment_cases_status ON reassessment_cases(status);
CREATE INDEX IF NOT EXISTS idx_reassessment_cases_created ON reassessment_cases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_points_user_language ON knowledge_points(user_id, language);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_skill ON knowledge_points(skill_area);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_mastery ON knowledge_points(mastery_level DESC);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reassessment_cases_updated_at 
    BEFORE UPDATE ON reassessment_cases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_points_updated_at 
    BEFORE UPDATE ON knowledge_points 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample knowledge points for common skill areas
INSERT INTO knowledge_points (user_id, language, skill_area, mastery_level) 
SELECT 
    u.id,
    'en' as language,
    skill_area,
    FLOOR(RANDOM() * 100) as mastery_level
FROM users u
CROSS JOIN (
    VALUES 
    ('vocabulary'),
    ('grammar'),
    ('listening'),
    ('speaking'),
    ('reading'),
    ('writing'),
    ('pronunciation'),
    ('fluency')
) AS kp(skill_area)
WHERE u.role = 'user'
ON CONFLICT (user_id, language, skill_area) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE capability_assessments IS 'Stores comprehensive language capability assessments for users';
COMMENT ON TABLE reassessment_cases IS 'Tracks user requests for reassessment and their resolution';
COMMENT ON TABLE knowledge_points IS 'Detailed tracking of specific knowledge points and mastery levels';

COMMENT ON COLUMN capability_assessments.skill_scores IS 'JSON object containing scores for each skill area (vocabulary, grammar, listening, speaking, reading, writing, etc.)';
COMMENT ON COLUMN capability_assessments.data_source IS 'Source of data used for assessment (chat analysis, practice performance, etc.)';
COMMENT ON COLUMN reassessment_cases.targeted_questions IS 'JSON array of specific questions generated for reassessment';
COMMENT ON COLUMN reassessment_cases.user_responses IS 'JSON array of user responses to reassessment questions with AI evaluations';

COMMENT ON COLUMN knowledge_points.skill_area IS 'Skill area being tracked (vocabulary, grammar, listening, speaking, reading, writing, pronunciation, fluency)';
COMMENT ON COLUMN knowledge_points.mastery_level IS 'Mastery level from 0-100 for this skill area';