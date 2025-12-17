"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanTestDatabase = exports.teardownTestEnvironment = exports.setupTestEnvironment = exports.testRedis = exports.testDb = void 0;
const pg_1 = require("pg");
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'ai_language_learning_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
    max: 5,
};
const testRedisConfig = {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
};
const setupTestEnvironment = async () => {
    try {
        exports.testDb = new pg_1.Pool(testDbConfig);
        await exports.testDb.connect();
        console.log('Test database connected');
        exports.testRedis = (0, redis_1.createClient)(testRedisConfig);
        await exports.testRedis.connect();
        console.log('Test Redis connected');
        await runTestMigrations();
    }
    catch (error) {
        console.error('Failed to setup test environment:', error);
        throw error;
    }
};
exports.setupTestEnvironment = setupTestEnvironment;
const teardownTestEnvironment = async () => {
    console.log('Starting test environment teardown...');
    const cleanupPromises = [];
    try {
        const { TaskResultManager } = await Promise.resolve().then(() => __importStar(require('../services/TaskResultManager')));
        const taskResultManager = TaskResultManager.getInstance();
        taskResultManager.stopCleanupTimer();
        console.log('TaskResultManager cleanup timer stopped');
    }
    catch (error) {
    }
    if (exports.testRedis) {
        cleanupPromises.push((async () => {
            try {
                if (exports.testRedis.isOpen) {
                    await exports.testRedis.quit();
                    console.log('Test Redis connection closed');
                }
            }
            catch (error) {
                console.warn('Error closing Redis:', error);
            }
        })());
    }
    if (exports.testDb) {
        cleanupPromises.push((async () => {
            try {
                if (!exports.testDb.ended) {
                    await exports.testDb.end();
                    console.log('Test database connection closed');
                }
            }
            catch (error) {
                console.warn('Error closing database:', error);
            }
        })());
    }
    try {
        await Promise.race([
            Promise.all(cleanupPromises),
            new Promise((resolve) => {
                setTimeout(() => {
                    console.log('Teardown timeout reached, forcing exit');
                    resolve();
                }, 2000);
            })
        ]);
    }
    catch (error) {
        console.error('Error during teardown:', error);
    }
    console.log('Test environment teardown completed');
};
exports.teardownTestEnvironment = teardownTestEnvironment;
const runTestMigrations = async () => {
    const createTablesQuery = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
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
    CREATE TABLE IF NOT EXISTS user_preferences (
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
    CREATE TABLE IF NOT EXISTS user_capabilities (
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
    CREATE TABLE IF NOT EXISTS learning_progress (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
      total_study_time INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      last_study_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, language)
    );

    -- User credits table
    CREATE TABLE IF NOT EXISTS user_credits (
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

    -- Practice groups table (minimal for tests)
    CREATE TABLE IF NOT EXISTS practice_groups (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
      difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
      type VARCHAR(50) NOT NULL,
      estimated_duration INTEGER,
      focus_areas TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Questions table
    CREATE TABLE IF NOT EXISTS questions (
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

    -- Practice results table (minimal for tests)
    CREATE TABLE IF NOT EXISTS practice_results (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      practice_group_id UUID REFERENCES practice_groups(id) ON DELETE CASCADE,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      accuracy DECIMAL(5,2) NOT NULL,
      total_time INTEGER NOT NULL,
      average_time_per_question DECIMAL(8,2),
      weak_areas TEXT[],
      improved_areas TEXT[],
      recommended_focus TEXT[],
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Vocabulary words table (minimal for tests)
    CREATE TABLE IF NOT EXISTS vocabulary_words (
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

    -- User MMR table (minimal for tests)
    CREATE TABLE IF NOT EXISTS user_mmr (
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
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, language)
    );

    -- Match requests table for PK matching system
    CREATE TABLE IF NOT EXISTS match_requests (
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
    CREATE TABLE IF NOT EXISTS mmr_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
      mmr INTEGER NOT NULL,
      change_amount INTEGER NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- PK battles table
    CREATE TABLE IF NOT EXISTS pk_battles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
      player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
      practice_group_id UUID REFERENCES practice_groups(id) ON DELETE CASCADE,
      start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP WITH TIME ZONE,
      player1_score INTEGER DEFAULT 0,
      player2_score INTEGER DEFAULT 0,
      player1_time INTEGER DEFAULT 0,
      player2_time INTEGER DEFAULT 0,
      winner_id UUID REFERENCES users(id),
      player1_mmr_change INTEGER DEFAULT 0,
      player2_mmr_change INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'generating_practice', 'in_progress', 'completed', 'cancelled', 'timeout')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Battle answers table for tracking individual answers in PK battles
    CREATE TABLE IF NOT EXISTS battle_answers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      battle_id UUID REFERENCES pk_battles(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
      answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      time_spent INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Credit transactions table (minimal for tests)
    CREATE TABLE IF NOT EXISTS credit_transactions (
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
    CREATE TABLE IF NOT EXISTS recharge_packages (
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
    CREATE TABLE IF NOT EXISTS payment_orders (
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

    -- Chat messages table
    CREATE TABLE IF NOT EXISTS chat_messages (
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

    -- Async tasks table
    CREATE TABLE IF NOT EXISTS async_tasks (
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
      execution_time INTEGER,
      cached BOOLEAN DEFAULT false,
      cache_key VARCHAR(255),
      webhook_url VARCHAR(500),
      notify_user BOOLEAN DEFAULT false,
      dependencies UUID[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Capability assessments table
    CREATE TABLE IF NOT EXISTS capability_assessments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
      assessment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      assessment_type VARCHAR(30) NOT NULL CHECK (assessment_type IN ('initial', 'periodic', 'user_requested', 'performance_triggered')),
      overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
      skill_scores JSONB NOT NULL,
      data_source VARCHAR(30) NOT NULL CHECK (data_source IN ('chat_analysis', 'practice_performance', 'vocabulary_tracking', 'user_self_report', 'comprehensive_test')),
      confidence_level INTEGER NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
      improvement_areas JSONB,
      regression_areas JSONB,
      recommendations JSONB,
      next_steps JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Reassessment cases table
    CREATE TABLE IF NOT EXISTS reassessment_cases (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
      original_assessment_id UUID REFERENCES capability_assessments(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      focus_areas JSONB,
      user_objections JSONB,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      targeted_questions JSONB,
      user_responses JSONB,
      new_assessment_id UUID REFERENCES capability_assessments(id),
      resolution_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Knowledge points table
    CREATE TABLE IF NOT EXISTS knowledge_points (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ja', 'fr')),
      skill_area VARCHAR(20) NOT NULL,
      mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
      last_assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, language, skill_area)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_user_capabilities_user_language ON user_capabilities(user_id, language);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_words_user_language ON vocabulary_words(user_id, language);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_capability_assessments_user_language ON capability_assessments(user_id, language);
    CREATE INDEX IF NOT EXISTS idx_reassessment_cases_user_language ON reassessment_cases(user_id, language);

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Apply updated_at triggers to relevant tables
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
    CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_user_capabilities_updated_at ON user_capabilities;
    CREATE TRIGGER update_user_capabilities_updated_at BEFORE UPDATE ON user_capabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_learning_progress_updated_at ON learning_progress;
    CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON learning_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_vocabulary_words_updated_at ON vocabulary_words;
    CREATE TRIGGER update_vocabulary_words_updated_at BEFORE UPDATE ON vocabulary_words FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
    CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_recharge_packages_updated_at ON recharge_packages;
    CREATE TRIGGER update_recharge_packages_updated_at BEFORE UPDATE ON recharge_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_payment_orders_updated_at ON payment_orders;
    CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON payment_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
    try {
        await exports.testDb.query(createTablesQuery);
        console.log('Test database schema created');
    }
    catch (error) {
        console.error('Error creating test schema:', error);
        throw error;
    }
};
const cleanTestDatabase = async () => {
    try {
        if (!exports.testDb || !exports.testDb.query) {
            console.warn('Test database not available for cleanup');
            return;
        }
        await exports.testDb.query(`
      TRUNCATE TABLE 
        async_tasks,
        chat_messages,
        payment_orders,
        recharge_packages,
        credit_transactions,
        user_credits,
        vocabulary_words,
        practice_results,
        questions,
        practice_groups,
        battle_answers,
        mmr_history,
        match_requests,
        user_mmr,
        learning_progress,
        user_capabilities,
        user_preferences,
        users 
      CASCADE
    `);
        if (exports.testRedis && exports.testRedis.isOpen) {
            await exports.testRedis.flushDb();
        }
    }
    catch (error) {
        console.error('Error cleaning test database:', error);
    }
};
exports.cleanTestDatabase = cleanTestDatabase;
if (typeof beforeEach !== 'undefined') {
    beforeEach(async () => {
        if (process.env.NODE_ENV === 'test') {
            await (0, exports.cleanTestDatabase)();
        }
    });
}
//# sourceMappingURL=setup.js.map