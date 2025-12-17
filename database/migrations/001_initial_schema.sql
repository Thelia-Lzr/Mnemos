-- AI Language Learning Database Schema
-- Initial migration script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    notifications_email BOOLEAN DEFAULT true,
    notifications_push BOOLEAN DEFAULT true,
    practice_reminders BOOLEAN DEFAULT true,
    daily_quote_enabled BOOLEAN DEFAULT true,
    review_reminders BOOLEAN DEFAULT true,
    milestone_updates BOOLEAN DEFAULT true,
    pk_invitations BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User capabilities table
CREATE TABLE user_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    current_level VARCHAR(10) NOT NULL CHECK (current_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    learning_goal VARCHAR(10) NOT NULL CHECK (learning_goal IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    is_active_learning BOOLEAN DEFAULT true,
    overall_level VARCHAR(10) NOT NULL CHECK (overall_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    listening_level INTEGER DEFAULT 50 CHECK (listening_level >= 0 AND listening_level <= 100),
    speaking_level INTEGER DEFAULT 50 CHECK (speaking_level >= 0 AND speaking_level <= 100),
    reading_level INTEGER DEFAULT 50 CHECK (reading_level >= 0 AND reading_level <= 100),
    writing_level INTEGER DEFAULT 50 CHECK (writing_level >= 0 AND writing_level <= 100),
    estimated_vocabulary_size INTEGER DEFAULT 0,
    mastered_words_count INTEGER DEFAULT 0,
    learning_words_count INTEGER DEFAULT 0,
    last_assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_assessment_due TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language)
);

-- Learning progress table
CREATE TABLE learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    total_study_time INTEGER DEFAULT 0, -- in minutes
    streak_days INTEGER DEFAULT 0,
    last_study_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language)
);

-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_level INTEGER NOT NULL,
    estimated_duration INTEGER, -- in days
    priority INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Practice groups table
CREATE TABLE practice_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    type VARCHAR(50) NOT NULL,
    estimated_duration INTEGER, -- in minutes
    focus_areas TEXT[], -- array of focus areas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_group_id UUID REFERENCES practice_groups(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    vocabulary_words TEXT[],
    grammar_points TEXT[],
    difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Practice results table
CREATE TABLE practice_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    practice_group_id UUID REFERENCES practice_groups(id) ON DELETE CASCADE,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    accuracy DECIMAL(5,2) NOT NULL,
    total_time INTEGER NOT NULL, -- in seconds
    average_time_per_question DECIMAL(8,2),
    weak_areas TEXT[],
    improved_areas TEXT[],
    recommended_focus TEXT[],
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question answers table
CREATE TABLE question_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_result_id UUID REFERENCES practice_results(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent INTEGER NOT NULL, -- in seconds
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vocabulary words table
CREATE TABLE vocabulary_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    definition TEXT,
    pronunciation VARCHAR(255),
    part_of_speech VARCHAR(50),
    difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
    frequency INTEGER DEFAULT 1,
    mastery_level VARCHAR(20) DEFAULT 'new' CHECK (mastery_level IN ('new', 'learning', 'short_term', 'long_term', 'mastered')),
    mastery_score INTEGER DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    first_encountered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    initial_strength DECIMAL(5,2) DEFAULT 1.0,
    decay_rate DECIMAL(5,2) DEFAULT 0.1,
    review_count INTEGER DEFAULT 0,
    last_review_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, word, language)
);

-- User MMR table
CREATE TABLE user_mmr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    current_mmr INTEGER DEFAULT 1000,
    peak_mmr INTEGER DEFAULT 1000,
    total_battles INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.0,
    vocabulary_rating INTEGER DEFAULT 1000,
    grammar_rating INTEGER DEFAULT 1000,
    speed_rating INTEGER DEFAULT 1000,
    accuracy_rating INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language)
);

-- PK battles table
CREATE TABLE pk_battles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    practice_group_id UUID REFERENCES practice_groups(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    player1_time INTEGER DEFAULT 0, -- in seconds
    player2_time INTEGER DEFAULT 0, -- in seconds
    winner_id UUID REFERENCES users(id),
    player1_mmr_change INTEGER DEFAULT 0,
    player2_mmr_change INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'generating_practice', 'in_progress', 'completed', 'cancelled', 'timeout')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Battle answers table for tracking individual answers in PK battles
CREATE TABLE battle_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battle_id UUID REFERENCES pk_battles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent INTEGER NOT NULL, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User credits table
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    last_purchase_at TIMESTAMP WITH TIME ZONE,
    average_monthly_spending DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Credit transactions table
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'chat', 'practice', 'pk_entry', 'pk_reward', 'refund', 'admin_adjust')),
    amount INTEGER NOT NULL,
    description TEXT,
    related_service VARCHAR(100),
    related_id UUID,
    token_usage INTEGER,
    ai_model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recharge packages table
CREATE TABLE recharge_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_in_cents INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    credit_amount INTEGER NOT NULL,
    bonus_credits INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    original_price INTEGER,
    discount_percentage INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Payment orders table
CREATE TABLE payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES recharge_packages(id),
    amount INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    credit_amount INTEGER NOT NULL,
    payment_method VARCHAR(50),
    payment_gateway VARCHAR(100),
    gateway_order_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
    paid_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily learning recommendations table
CREATE TABLE daily_learning_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    date DATE NOT NULL,
    recommendations JSONB NOT NULL,
    quick_practice_options JSONB,
    based_on_capability JSONB,
    based_on_milestones JSONB,
    based_on_vocabulary JSONB,
    user_feedback JSONB,
    is_viewed BOOLEAN DEFAULT false,
    viewed_at TIMESTAMP WITH TIME ZONE,
    ai_model VARCHAR(100),
    generation_time INTEGER, -- in milliseconds
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language, date)
);

-- Async tasks table
CREATE TABLE async_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 4),
    model VARCHAR(100),
    prompt TEXT,
    context JSONB,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled', 'timeout')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    result JSONB,
    error_code VARCHAR(100),
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 300,
    tokens_used INTEGER,
    execution_time INTEGER, -- in milliseconds
    cached BOOLEAN DEFAULT false,
    cache_key VARCHAR(255),
    webhook_url VARCHAR(500),
    notify_user BOOLEAN DEFAULT false,
    dependencies UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'user_text' CHECK (type IN ('user_text', 'user_file', 'ai_response', 'system')),
    ai_response JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    detected_intent VARCHAR(100),
    function_calls JSONB,
    function_results JSONB,
    attachments JSONB,
    extracted_vocabulary TEXT[],
    identified_grammar TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Match requests table for PK matching system
CREATE TABLE match_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    mmr INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MMR history table for tracking MMR changes
CREATE TABLE mmr_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
    mmr INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_capabilities_user_language ON user_capabilities(user_id, language);
CREATE INDEX idx_practice_groups_user_id ON practice_groups(user_id);
CREATE INDEX idx_questions_practice_group_id ON questions(practice_group_id);
CREATE INDEX idx_vocabulary_words_user_language ON vocabulary_words(user_id, language);
CREATE INDEX idx_vocabulary_words_next_review ON vocabulary_words(next_review_at) WHERE next_review_at IS NOT NULL;
CREATE INDEX idx_pk_battles_players ON pk_battles(player1_id, player2_id);
CREATE INDEX idx_battle_answers_battle_user ON battle_answers(battle_id, user_id);
CREATE INDEX idx_match_requests_user_language ON match_requests(user_id, language);
CREATE INDEX idx_match_requests_status_mmr ON match_requests(status, mmr) WHERE status = 'waiting';
CREATE INDEX idx_mmr_history_user_language ON mmr_history(user_id, language);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX idx_daily_recommendations_user_date ON daily_learning_recommendations(user_id, date);
CREATE INDEX idx_async_tasks_user_status ON async_tasks(user_id, status);
CREATE INDEX idx_async_tasks_status_priority ON async_tasks(status, priority);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- OpenRouter configuration table
CREATE TABLE openrouter_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    api_key VARCHAR(255) NOT NULL,
    base_url VARCHAR(255) DEFAULT 'https://openrouter.ai/api/v1',
    timeout INTEGER DEFAULT 30000,
    max_retries INTEGER DEFAULT 3,
    retry_delay INTEGER DEFAULT 1000,
    daily_token_limit INTEGER,
    monthly_token_limit INTEGER,
    cost_threshold DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20) DEFAULT 'untested' CHECK (test_status IN ('untested', 'testing', 'success', 'failed', 'expired')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    CONSTRAINT single_config CHECK (id = 1)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_capabilities_updated_at BEFORE UPDATE ON user_capabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON learning_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vocabulary_words_updated_at BEFORE UPDATE ON vocabulary_words FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recharge_packages_updated_at BEFORE UPDATE ON recharge_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_match_requests_updated_at BEFORE UPDATE ON match_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_mmr_updated_at BEFORE UPDATE ON user_mmr FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pk_battles_updated_at BEFORE UPDATE ON pk_battles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON payment_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_async_tasks_updated_at BEFORE UPDATE ON async_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_openrouter_config_updated_at BEFORE UPDATE ON openrouter_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();