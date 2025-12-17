-- Sample data for development and testing
-- This file contains initial data for the AI Language Learning application

-- Insert sample recharge packages
INSERT INTO recharge_packages (name, description, price_in_cents, credit_amount, bonus_credits, is_active, is_popular, display_order) VALUES
('Starter Pack', 'Perfect for beginners', 999, 100, 10, true, false, 1),
('Popular Pack', 'Most popular choice', 1999, 250, 50, true, true, 2),
('Pro Pack', 'For serious learners', 4999, 700, 200, true, false, 3),
('Ultimate Pack', 'Maximum value', 9999, 1500, 500, true, false, 4);

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', '$2a$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'admin');

-- Insert sample regular user (password: user123)
INSERT INTO users (username, email, password_hash, role) VALUES
('testuser', 'user@example.com', '$2a$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'user');

-- Get user IDs for further inserts
DO $$
DECLARE
    admin_id UUID;
    user_id UUID;
BEGIN
    SELECT id INTO admin_id FROM users WHERE username = 'admin';
    SELECT id INTO user_id FROM users WHERE username = 'testuser';
    
    -- Insert user preferences for test user
    INSERT INTO user_preferences (user_id) VALUES (user_id);
    
    -- Insert user capabilities for test user (English learning)
    INSERT INTO user_capabilities (
        user_id, language, current_level, learning_goal, overall_level,
        confidence_score, listening_level, speaking_level, reading_level, writing_level
    ) VALUES (
        user_id, 'en', 'A2', 'B2', 'A2',
        65, 60, 55, 70, 50
    );
    
    -- Insert learning progress for test user
    INSERT INTO learning_progress (user_id, language, total_study_time, streak_days, last_study_date) VALUES
    (user_id, 'en', 120, 5, CURRENT_DATE);
    
    -- Insert user credits for test user
    INSERT INTO user_credits (user_id, current_balance, total_earned) VALUES
    (user_id, 50, 50);
    
    -- Insert user MMR for test user
    INSERT INTO user_mmr (user_id, language) VALUES
    (user_id, 'en');
    
    -- Insert sample vocabulary words for test user
    INSERT INTO vocabulary_words (user_id, word, language, definition, mastery_level, mastery_score) VALUES
    (user_id, 'hello', 'en', 'A greeting', 'mastered', 95),
    (user_id, 'world', 'en', 'The earth and all its inhabitants', 'long_term', 80),
    (user_id, 'learning', 'en', 'The process of acquiring knowledge', 'short_term', 60),
    (user_id, 'language', 'en', 'A system of communication', 'learning', 40),
    (user_id, 'artificial', 'en', 'Made by humans rather than natural', 'new', 20);
    
    -- Insert sample milestone for test user
    INSERT INTO milestones (user_id, language, title, description, target_level, priority) VALUES
    (user_id, 'en', 'Master Basic Vocabulary', 'Learn 500 most common English words', 2, 1),
    (user_id, 'en', 'Improve Grammar', 'Master present and past tenses', 3, 2);
    
END $$;