-- Add AI analysis results table for practice results
-- This stores AI-generated learning advice and analysis

-- Practice AI analysis table
CREATE TABLE practice_ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_result_id UUID REFERENCES practice_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis_content TEXT NOT NULL,
    learning_advice TEXT NOT NULL,
    strengths_identified TEXT[],
    weaknesses_identified TEXT[],
    improvement_suggestions TEXT[],
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    ai_model VARCHAR(100),
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User learning languages and levels table
CREATE TABLE user_learning_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    current_level VARCHAR(10) NOT NULL CHECK (current_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    target_level VARCHAR(10) CHECK (target_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language)
);

-- Practice history view for easy access to completion records
CREATE VIEW practice_history_view AS
SELECT 
    pg.id as practice_group_id,
    pg.user_id,
    pg.title,
    pg.description,
    pg.language,
    pg.difficulty,
    pg.type,
    pg.created_at as practice_created_at,
    pr.id as result_id,
    pr.accuracy,
    pr.total_time,
    pr.completed_at,
    pai.analysis_content,
    pai.learning_advice,
    pai.created_at as analysis_created_at
FROM practice_groups pg
LEFT JOIN practice_results pr ON pg.id = pr.practice_group_id
LEFT JOIN practice_ai_analysis pai ON pr.id = pai.practice_result_id
ORDER BY pg.created_at DESC;

-- Indexes for better performance
CREATE INDEX idx_practice_ai_analysis_practice_result ON practice_ai_analysis(practice_result_id);
CREATE INDEX idx_practice_ai_analysis_user ON practice_ai_analysis(user_id);
CREATE INDEX idx_user_learning_languages_user ON user_learning_languages(user_id);
CREATE INDEX idx_user_learning_languages_active ON user_learning_languages(user_id, is_active) WHERE is_active = true;

-- Trigger to update updated_at column
CREATE TRIGGER update_user_learning_languages_updated_at 
    BEFORE UPDATE ON user_learning_languages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();