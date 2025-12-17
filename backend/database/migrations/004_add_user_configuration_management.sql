-- Add enhanced user configuration management tables
-- This migration extends the existing user_learning_languages table and adds new configuration tracking

-- First, add new columns to existing user_learning_languages table
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS learning_intensity VARCHAR(20) DEFAULT 'regular' CHECK (learning_intensity IN ('casual', 'regular', 'intensive', 'immersive'));
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS preferred_practice_types TEXT[] DEFAULT ARRAY['mixed'];
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER DEFAULT 15 CHECK (daily_goal_minutes >= 5 AND daily_goal_minutes <= 180);
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS weekly_goal_sessions INTEGER DEFAULT 5 CHECK (weekly_goal_sessions >= 1 AND weekly_goal_sessions <= 21);
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS difficulty_preference VARCHAR(20) DEFAULT 'adaptive' CHECK (difficulty_preference IN ('adaptive', 'challenging', 'comfortable', 'easy'));

-- Learning style preferences
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS visual_learning_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS auditory_learning_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS kinesthetic_learning_enabled BOOLEAN DEFAULT false;

-- Notification preferences for each language
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS practice_reminders BOOLEAN DEFAULT true;
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS milestone_notifications BOOLEAN DEFAULT true;
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS weekly_progress_reports BOOLEAN DEFAULT true;

-- Metadata
ALTER TABLE user_learning_languages ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(50) DEFAULT 'user';

-- User language configuration history table
CREATE TABLE user_language_configuration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
        'level_update', 'target_change', 'primary_switch', 'activation_toggle', 
        'preference_update', 'goal_adjustment', 'notification_change', 'learning_style_update'
    )),
    
    -- Change details
    field_changed VARCHAR(100) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    
    -- Change metadata
    changed_by VARCHAR(50) NOT NULL, -- user ID or 'system'
    change_source VARCHAR(50) NOT NULL CHECK (change_source IN (
        'user_profile', 'onboarding', 'assessment_result', 'admin_action', 'system_migration'
    )),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Global learning preferences table
CREATE TABLE global_learning_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- General learning preferences
    preferred_study_time VARCHAR(20) DEFAULT 'flexible' CHECK (preferred_study_time IN ('morning', 'afternoon', 'evening', 'night', 'flexible')),
    session_duration_preference INTEGER DEFAULT 20 CHECK (session_duration_preference >= 5 AND session_duration_preference <= 120),
    break_interval_preference INTEGER DEFAULT 5 CHECK (break_interval_preference >= 1 AND break_interval_preference <= 30),
    
    -- Gamification preferences
    competitive_mode BOOLEAN DEFAULT false,
    achievement_notifications BOOLEAN DEFAULT true,
    leaderboard_participation BOOLEAN DEFAULT false,
    streak_tracking BOOLEAN DEFAULT true,
    
    -- AI interaction preferences
    ai_personality VARCHAR(20) DEFAULT 'encouraging' CHECK (ai_personality IN ('encouraging', 'neutral', 'challenging', 'friendly', 'professional')),
    explanation_detail VARCHAR(20) DEFAULT 'standard' CHECK (explanation_detail IN ('minimal', 'standard', 'detailed', 'comprehensive')),
    feedback_frequency VARCHAR(20) DEFAULT 'after_session' CHECK (feedback_frequency IN ('immediate', 'after_session', 'daily', 'weekly')),
    
    -- Privacy and data preferences
    data_analytics_opt_in BOOLEAN DEFAULT true,
    performance_tracking_opt_in BOOLEAN DEFAULT true,
    personalized_recommendations BOOLEAN DEFAULT true,
    
    -- Accessibility preferences
    font_size VARCHAR(20) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'extra_large')),
    color_scheme VARCHAR(20) DEFAULT 'auto' CHECK (color_scheme IN ('light', 'dark', 'auto', 'high_contrast')),
    reduced_motion BOOLEAN DEFAULT false,
    screen_reader_optimized BOOLEAN DEFAULT false,
    
    -- Backup and sync preferences
    cloud_sync_enabled BOOLEAN DEFAULT true,
    offline_mode_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Configuration validation constraints table
CREATE TABLE user_configuration_constraints (
    id INTEGER PRIMARY KEY DEFAULT 1,
    max_active_languages INTEGER DEFAULT 3,
    min_daily_goal_minutes INTEGER DEFAULT 5,
    max_daily_goal_minutes INTEGER DEFAULT 180,
    min_weekly_goal_sessions INTEGER DEFAULT 1,
    max_weekly_goal_sessions INTEGER DEFAULT 21,
    allowed_level_progression JSONB DEFAULT '{
        "A1": ["A1", "A2"],
        "A2": ["A1", "A2", "B1"],
        "B1": ["A2", "B1", "B2"],
        "B2": ["B1", "B2", "C1"],
        "C1": ["B2", "C1", "C2"],
        "C2": ["C1", "C2"]
    }'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_constraint_config CHECK (id = 1)
);

-- Insert default constraint configuration
INSERT INTO user_configuration_constraints (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_user_language_config_history_user ON user_language_configuration_history(user_id);
CREATE INDEX idx_user_language_config_history_user_language ON user_language_configuration_history(user_id, language);
CREATE INDEX idx_user_language_config_history_change_type ON user_language_configuration_history(change_type);
CREATE INDEX idx_user_language_config_history_created_at ON user_language_configuration_history(created_at);
CREATE INDEX idx_global_learning_preferences_user ON global_learning_preferences(user_id);

-- Enhanced indexes for user_learning_languages
CREATE INDEX idx_user_learning_languages_primary ON user_learning_languages(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_user_learning_languages_intensity ON user_learning_languages(learning_intensity);
CREATE INDEX idx_user_learning_languages_goals ON user_learning_languages(daily_goal_minutes, weekly_goal_sessions);

-- Create triggers for updated_at columns
CREATE TRIGGER update_global_learning_preferences_updated_at 
    BEFORE UPDATE ON global_learning_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_configuration_constraints_updated_at 
    BEFORE UPDATE ON user_configuration_constraints 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create global preferences for new users
CREATE OR REPLACE FUNCTION create_default_global_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO global_learning_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default global preferences when a user is created
CREATE TRIGGER create_user_global_preferences
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_global_preferences();

-- Function to log configuration changes
CREATE OR REPLACE FUNCTION log_language_configuration_change()
RETURNS TRIGGER AS $$
DECLARE
    change_type_val VARCHAR(50);
    field_name VARCHAR(100);
    old_val JSONB;
    new_val JSONB;
BEGIN
    -- Determine change type and field based on what changed
    IF OLD.current_level != NEW.current_level THEN
        change_type_val := 'level_update';
        field_name := 'current_level';
        old_val := to_jsonb(OLD.current_level);
        new_val := to_jsonb(NEW.current_level);
    ELSIF OLD.target_level != NEW.target_level OR (OLD.target_level IS NULL) != (NEW.target_level IS NULL) THEN
        change_type_val := 'target_change';
        field_name := 'target_level';
        old_val := to_jsonb(OLD.target_level);
        new_val := to_jsonb(NEW.target_level);
    ELSIF OLD.is_primary != NEW.is_primary THEN
        change_type_val := 'primary_switch';
        field_name := 'is_primary';
        old_val := to_jsonb(OLD.is_primary);
        new_val := to_jsonb(NEW.is_primary);
    ELSIF OLD.is_active != NEW.is_active THEN
        change_type_val := 'activation_toggle';
        field_name := 'is_active';
        old_val := to_jsonb(OLD.is_active);
        new_val := to_jsonb(NEW.is_active);
    ELSIF OLD.daily_goal_minutes != NEW.daily_goal_minutes OR OLD.weekly_goal_sessions != NEW.weekly_goal_sessions THEN
        change_type_val := 'goal_adjustment';
        field_name := 'goals';
        old_val := jsonb_build_object('daily_goal_minutes', OLD.daily_goal_minutes, 'weekly_goal_sessions', OLD.weekly_goal_sessions);
        new_val := jsonb_build_object('daily_goal_minutes', NEW.daily_goal_minutes, 'weekly_goal_sessions', NEW.weekly_goal_sessions);
    ELSIF OLD.practice_reminders != NEW.practice_reminders OR OLD.milestone_notifications != NEW.milestone_notifications OR OLD.weekly_progress_reports != NEW.weekly_progress_reports THEN
        change_type_val := 'notification_change';
        field_name := 'notifications';
        old_val := jsonb_build_object('practice_reminders', OLD.practice_reminders, 'milestone_notifications', OLD.milestone_notifications, 'weekly_progress_reports', OLD.weekly_progress_reports);
        new_val := jsonb_build_object('practice_reminders', NEW.practice_reminders, 'milestone_notifications', NEW.milestone_notifications, 'weekly_progress_reports', NEW.weekly_progress_reports);
    ELSIF OLD.visual_learning_enabled != NEW.visual_learning_enabled OR OLD.auditory_learning_enabled != NEW.auditory_learning_enabled OR OLD.kinesthetic_learning_enabled != NEW.kinesthetic_learning_enabled THEN
        change_type_val := 'learning_style_update';
        field_name := 'learning_styles';
        old_val := jsonb_build_object('visual', OLD.visual_learning_enabled, 'auditory', OLD.auditory_learning_enabled, 'kinesthetic', OLD.kinesthetic_learning_enabled);
        new_val := jsonb_build_object('visual', NEW.visual_learning_enabled, 'auditory', NEW.auditory_learning_enabled, 'kinesthetic', NEW.kinesthetic_learning_enabled);
    ELSE
        change_type_val := 'preference_update';
        field_name := 'general_preferences';
        old_val := jsonb_build_object('learning_intensity', OLD.learning_intensity, 'difficulty_preference', OLD.difficulty_preference);
        new_val := jsonb_build_object('learning_intensity', NEW.learning_intensity, 'difficulty_preference', NEW.difficulty_preference);
    END IF;

    -- Insert the change log
    INSERT INTO user_language_configuration_history (
        user_id, language, change_type, field_changed, 
        previous_value, new_value, changed_by, change_source
    ) VALUES (
        NEW.user_id, NEW.language, change_type_val, field_name,
        old_val, new_val, NEW.last_modified_by, 'user_profile'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log configuration changes
CREATE TRIGGER log_user_language_configuration_changes
    AFTER UPDATE ON user_learning_languages
    FOR EACH ROW EXECUTE FUNCTION log_language_configuration_change();

-- View for easy access to complete user configuration
CREATE VIEW user_configuration_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    COUNT(ull.id) FILTER (WHERE ull.is_active = true) as active_languages_count,
    (SELECT ull2.language FROM user_learning_languages ull2 WHERE ull2.user_id = u.id AND ull2.is_primary = true AND ull2.is_active = true LIMIT 1) as primary_language,
    glp.preferred_study_time,
    glp.session_duration_preference,
    glp.competitive_mode,
    glp.ai_personality,
    glp.explanation_detail,
    u.created_at as user_created_at,
    glp.updated_at as preferences_updated_at
FROM users u
LEFT JOIN user_learning_languages ull ON u.id = ull.user_id
LEFT JOIN global_learning_preferences glp ON u.id = glp.user_id
GROUP BY u.id, u.username, u.email, glp.preferred_study_time, glp.session_duration_preference, 
         glp.competitive_mode, glp.ai_personality, glp.explanation_detail, 
         u.created_at, glp.updated_at;

-- View for configuration health monitoring
CREATE VIEW user_configuration_health AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(ull.id) FILTER (WHERE ull.is_active = true) as active_languages,
    COUNT(ull.id) FILTER (WHERE ull.is_primary = true) as primary_languages,
    CASE 
        WHEN COUNT(ull.id) FILTER (WHERE ull.is_primary = true) = 0 THEN 'no_primary_language'
        WHEN COUNT(ull.id) FILTER (WHERE ull.is_primary = true) > 1 THEN 'multiple_primary_languages'
        WHEN COUNT(ull.id) FILTER (WHERE ull.is_active = true) = 0 THEN 'no_active_languages'
        WHEN COUNT(ull.id) FILTER (WHERE ull.is_active = true) > 3 THEN 'too_many_active_languages'
        ELSE 'healthy'
    END as health_status,
    glp.id IS NOT NULL as has_global_preferences,
    MAX(ull.updated_at) as last_config_update
FROM users u
LEFT JOIN user_learning_languages ull ON u.id = ull.user_id
LEFT JOIN global_learning_preferences glp ON u.id = glp.user_id
GROUP BY u.id, u.username, glp.id;