"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserConfigurationService = void 0;
const uuid_1 = require("uuid");
const UserLanguageConfiguration_1 = require("../models/UserLanguageConfiguration");
class UserConfigurationService {
    constructor(db) {
        this.db = db;
    }
    async getUserLanguageConfigurations(userId, activeOnly = false) {
        try {
            const query = `
        SELECT * FROM user_learning_languages 
        WHERE user_id = $1 ${activeOnly ? 'AND is_active = true' : ''}
        ORDER BY is_primary DESC, created_at ASC
      `;
            const result = await this.db.query(query, [userId]);
            return result.rows.map(row => this.mapRowToLanguageConfiguration(row));
        }
        catch (error) {
            console.error('Error getting user language configurations:', error);
            throw new Error('Failed to retrieve language configurations');
        }
    }
    async getUserLanguageConfiguration(userId, language) {
        try {
            const result = await this.db.query('SELECT * FROM user_learning_languages WHERE user_id = $1 AND language = $2', [userId, language]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToLanguageConfiguration(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting user language configuration:', error);
            return null;
        }
    }
    async createLanguageConfiguration(userId, request, changedBy = 'user', changeSource = 'user_profile') {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const validation = await this.validateLanguageConfiguration(userId, request);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }
            const existingResult = await client.query('SELECT id FROM user_learning_languages WHERE user_id = $1 AND language = $2', [userId, request.language]);
            if (existingResult.rows.length > 0) {
                throw new Error('Language configuration already exists for this user');
            }
            if (request.isPrimary) {
                await client.query('UPDATE user_learning_languages SET is_primary = false, last_modified_by = $2 WHERE user_id = $1', [userId, changedBy]);
            }
            const primaryCheck = await client.query('SELECT COUNT(*) as count FROM user_learning_languages WHERE user_id = $1 AND is_primary = true', [userId]);
            const shouldBePrimary = request.isPrimary || parseInt(primaryCheck.rows[0].count) === 0;
            const config = { ...UserLanguageConfiguration_1.DEFAULT_LANGUAGE_CONFIGURATION, ...request };
            const id = (0, uuid_1.v4)();
            const insertQuery = `
        INSERT INTO user_learning_languages (
          id, user_id, language, current_level, target_level, is_primary, is_active,
          learning_intensity, preferred_practice_types, daily_goal_minutes, weekly_goal_sessions,
          difficulty_preference, visual_learning_enabled, auditory_learning_enabled,
          kinesthetic_learning_enabled, practice_reminders, milestone_notifications,
          weekly_progress_reports, last_modified_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
            const result = await client.query(insertQuery, [
                id, userId, request.language, request.currentLevel, request.targetLevel,
                shouldBePrimary, config.learningIntensity, config.preferredPracticeTypes,
                config.dailyGoalMinutes, config.weeklyGoalSessions, config.difficultyPreference,
                config.visualLearningEnabled, config.auditoryLearningEnabled,
                config.kinestheticLearningEnabled, config.practiceReminders,
                config.milestoneNotifications, config.weeklyProgressReports, changedBy
            ]);
            await this.ensureUserCapabilityExists(client, userId, request.language, request.currentLevel, request.targetLevel);
            await this.ensureLearningProgressExists(client, userId, request.language);
            await client.query('COMMIT');
            return this.mapRowToLanguageConfiguration(result.rows[0]);
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating language configuration:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async updateLanguageConfiguration(userId, language, updates, changedBy = 'user', changeSource = 'user_profile', ipAddress, userAgent) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const currentResult = await client.query('SELECT * FROM user_learning_languages WHERE user_id = $1 AND language = $2', [userId, language]);
            if (currentResult.rows.length === 0) {
                throw new Error('Language configuration not found');
            }
            const currentConfig = this.mapRowToLanguageConfiguration(currentResult.rows[0]);
            const validation = await this.validateLanguageConfigurationUpdate(userId, language, updates);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }
            if (updates.isPrimary) {
                await client.query('UPDATE user_learning_languages SET is_primary = false, last_modified_by = $2 WHERE user_id = $1 AND language != $3', [userId, changedBy, language]);
            }
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined && key !== 'changeReason') {
                    const dbKey = this.camelToSnakeCase(key);
                    updateFields.push(`${dbKey} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });
            if (updateFields.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            updateFields.push(`last_modified_by = $${paramIndex}`, `updated_at = CURRENT_TIMESTAMP`);
            values.push(changedBy);
            paramIndex++;
            values.push(userId, language);
            const updateQuery = `
        UPDATE user_learning_languages 
        SET ${updateFields.join(', ')} 
        WHERE user_id = $${paramIndex} AND language = $${paramIndex + 1}
      `;
            const updateResult = await client.query(updateQuery, values);
            if (updates.currentLevel) {
                await client.query('UPDATE user_capabilities SET current_level = $1, overall_level = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND language = $3', [updates.currentLevel, userId, language]);
            }
            if (updates.targetLevel) {
                await client.query('UPDATE user_capabilities SET learning_goal = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND language = $3', [updates.targetLevel, userId, language]);
            }
            await client.query('COMMIT');
            return (updateResult.rowCount ?? 0) > 0;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating language configuration:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async removeLanguageConfiguration(userId, language, changedBy = 'user') {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const languageResult = await client.query('SELECT is_primary FROM user_learning_languages WHERE user_id = $1 AND language = $2', [userId, language]);
            if (languageResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            const wasPrimary = languageResult.rows[0].is_primary;
            await client.query(`
        INSERT INTO user_language_configuration_history (
          user_id, language, change_type, field_changed, previous_value, new_value,
          changed_by, change_source
        ) VALUES ($1, $2, 'activation_toggle', 'removed', 'true'::jsonb, 'false'::jsonb, $3, 'user_profile')
      `, [userId, language, changedBy]);
            await client.query('DELETE FROM user_learning_languages WHERE user_id = $1 AND language = $2', [userId, language]);
            if (wasPrimary) {
                await client.query(`UPDATE user_learning_languages 
           SET is_primary = true, last_modified_by = $2
           WHERE user_id = $1 AND is_active = true 
           ORDER BY created_at ASC 
           LIMIT 1`, [userId, changedBy]);
            }
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error removing language configuration:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getGlobalPreferences(userId) {
        try {
            const result = await this.db.query('SELECT * FROM global_learning_preferences WHERE user_id = $1', [userId]);
            if (result.rows.length === 0) {
                return await this.createDefaultGlobalPreferences(userId);
            }
            return this.mapRowToGlobalPreferences(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting global preferences:', error);
            return null;
        }
    }
    async updateGlobalPreferences(userId, updates) {
        try {
            await this.ensureGlobalPreferencesExist(userId);
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined) {
                    const dbKey = this.camelToSnakeCase(key);
                    updateFields.push(`${dbKey} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });
            if (updateFields.length === 0) {
                return false;
            }
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(userId);
            const updateQuery = `
        UPDATE global_learning_preferences 
        SET ${updateFields.join(', ')} 
        WHERE user_id = $${paramIndex}
      `;
            const result = await this.db.query(updateQuery, values);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error updating global preferences:', error);
            throw error;
        }
    }
    async getConfigurationHistory(userId, language, limit = 50) {
        try {
            const query = `
        SELECT * FROM user_language_configuration_history 
        WHERE user_id = $1 ${language ? 'AND language = $2' : ''}
        ORDER BY created_at DESC 
        LIMIT $${language ? 3 : 2}
      `;
            const params = language ? [userId, language, limit] : [userId, limit];
            const result = await this.db.query(query, params);
            return result.rows.map(row => this.mapRowToConfigurationHistory(row));
        }
        catch (error) {
            console.error('Error getting configuration history:', error);
            return [];
        }
    }
    async getUserConfigurationSummary(userId) {
        try {
            const [languageConfigs, globalPrefs, recentChanges, healthStatus] = await Promise.all([
                this.getUserLanguageConfigurations(userId),
                this.getGlobalPreferences(userId),
                this.getConfigurationHistory(userId, undefined, 10),
                this.getConfigurationHealthStatus(userId)
            ]);
            const activeLanguages = languageConfigs.filter(config => config.isActive);
            const primaryLanguage = languageConfigs.find(config => config.isPrimary)?.language;
            if (!primaryLanguage) {
                return null;
            }
            return {
                userId,
                totalActiveLanguages: activeLanguages.length,
                primaryLanguage,
                languageConfigurations: languageConfigs,
                globalPreferences: globalPrefs,
                recentChanges,
                configurationHealth: healthStatus
            };
        }
        catch (error) {
            console.error('Error getting user configuration summary:', error);
            return null;
        }
    }
    async getConfigurationHealthStatus(userId) {
        try {
            const result = await this.db.query('SELECT * FROM user_configuration_health WHERE user_id = $1', [userId]);
            if (result.rows.length === 0) {
                return {
                    score: 0,
                    issues: [{ severity: 'high', category: 'consistency', description: 'No configuration found', suggestedAction: 'Set up language preferences' }],
                    recommendations: ['Complete your language configuration setup']
                };
            }
            const healthData = result.rows[0];
            const issues = [];
            let score = 100;
            if (healthData.health_status !== 'healthy') {
                switch (healthData.health_status) {
                    case 'no_primary_language':
                        issues.push({
                            severity: 'high',
                            category: 'consistency',
                            description: 'No primary language set',
                            suggestedAction: 'Set one of your languages as primary'
                        });
                        score -= 30;
                        break;
                    case 'multiple_primary_languages':
                        issues.push({
                            severity: 'high',
                            category: 'consistency',
                            description: 'Multiple primary languages detected',
                            suggestedAction: 'Set only one language as primary'
                        });
                        score -= 25;
                        break;
                    case 'no_active_languages':
                        issues.push({
                            severity: 'high',
                            category: 'goals',
                            description: 'No active languages configured',
                            suggestedAction: 'Add and activate at least one language'
                        });
                        score -= 40;
                        break;
                    case 'too_many_active_languages':
                        issues.push({
                            severity: 'medium',
                            category: 'performance',
                            description: 'Too many active languages may reduce focus',
                            suggestedAction: 'Consider deactivating some languages to focus on fewer'
                        });
                        score -= 15;
                        break;
                }
            }
            if (!healthData.has_global_preferences) {
                issues.push({
                    severity: 'medium',
                    category: 'preferences',
                    description: 'Global learning preferences not configured',
                    suggestedAction: 'Set up your global learning preferences'
                });
                score -= 20;
            }
            const recommendations = [];
            if (score < 80) {
                recommendations.push('Review and fix configuration issues for better learning experience');
            }
            if (healthData.active_languages === 0) {
                recommendations.push('Add at least one language to start learning');
            }
            if (healthData.active_languages > 3) {
                recommendations.push('Consider focusing on fewer languages for better progress');
            }
            return {
                score: Math.max(0, score),
                issues,
                recommendations
            };
        }
        catch (error) {
            console.error('Error getting configuration health status:', error);
            return {
                score: 0,
                issues: [{ severity: 'high', category: 'consistency', description: 'Error checking configuration health', suggestedAction: 'Contact support' }],
                recommendations: ['Contact support to resolve configuration issues']
            };
        }
    }
    async validateLanguageConfiguration(userId, config) {
        const errors = [];
        const warnings = [];
        try {
            const constraints = await this.getConfigurationConstraints();
            const activeLanguagesCount = await this.db.query('SELECT COUNT(*) as count FROM user_learning_languages WHERE user_id = $1 AND is_active = true', [userId]);
            if (parseInt(activeLanguagesCount.rows[0].count) >= constraints.maxActiveLanguages) {
                errors.push({
                    field: 'language',
                    code: 'MAX_ACTIVE_LANGUAGES_EXCEEDED',
                    message: `Maximum of ${constraints.maxActiveLanguages} active languages allowed`,
                    currentValue: parseInt(activeLanguagesCount.rows[0].count),
                    allowedValues: [`<= ${constraints.maxActiveLanguages}`]
                });
            }
            if (config.dailyGoalMinutes !== undefined) {
                if (config.dailyGoalMinutes < constraints.minDailyGoalMinutes || config.dailyGoalMinutes > constraints.maxDailyGoalMinutes) {
                    errors.push({
                        field: 'dailyGoalMinutes',
                        code: 'INVALID_DAILY_GOAL',
                        message: `Daily goal must be between ${constraints.minDailyGoalMinutes} and ${constraints.maxDailyGoalMinutes} minutes`,
                        currentValue: config.dailyGoalMinutes,
                        allowedValues: [`${constraints.minDailyGoalMinutes}-${constraints.maxDailyGoalMinutes}`]
                    });
                }
            }
            if (config.weeklyGoalSessions !== undefined) {
                if (config.weeklyGoalSessions < constraints.minWeeklyGoalSessions || config.weeklyGoalSessions > constraints.maxWeeklyGoalSessions) {
                    errors.push({
                        field: 'weeklyGoalSessions',
                        code: 'INVALID_WEEKLY_GOAL',
                        message: `Weekly goal must be between ${constraints.minWeeklyGoalSessions} and ${constraints.maxWeeklyGoalSessions} sessions`,
                        currentValue: config.weeklyGoalSessions,
                        allowedValues: [`${constraints.minWeeklyGoalSessions}-${constraints.maxWeeklyGoalSessions}`]
                    });
                }
            }
            if (config.targetLevel && config.currentLevel) {
                const allowedTargets = constraints.allowedLevelProgression[config.currentLevel];
                if (!allowedTargets.includes(config.targetLevel)) {
                    errors.push({
                        field: 'targetLevel',
                        code: 'INVALID_LEVEL_PROGRESSION',
                        message: `Target level ${config.targetLevel} is not allowed from current level ${config.currentLevel}`,
                        currentValue: config.targetLevel,
                        allowedValues: allowedTargets
                    });
                }
            }
            if (config.dailyGoalMinutes && config.dailyGoalMinutes > 60) {
                warnings.push({
                    field: 'dailyGoalMinutes',
                    code: 'HIGH_DAILY_GOAL',
                    message: 'Daily goal over 60 minutes may be difficult to maintain consistently',
                    suggestion: 'Consider starting with a lower goal and increasing gradually'
                });
            }
        }
        catch (error) {
            console.error('Error validating language configuration:', error);
            errors.push({
                field: 'general',
                code: 'VALIDATION_ERROR',
                message: 'Error occurred during validation'
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    async validateLanguageConfigurationUpdate(userId, language, updates) {
        const errors = [];
        const warnings = [];
        try {
            const constraints = await this.getConfigurationConstraints();
            if (updates.dailyGoalMinutes !== undefined) {
                if (updates.dailyGoalMinutes < constraints.minDailyGoalMinutes || updates.dailyGoalMinutes > constraints.maxDailyGoalMinutes) {
                    errors.push({
                        field: 'dailyGoalMinutes',
                        code: 'INVALID_DAILY_GOAL',
                        message: `Daily goal must be between ${constraints.minDailyGoalMinutes} and ${constraints.maxDailyGoalMinutes} minutes`,
                        currentValue: updates.dailyGoalMinutes,
                        allowedValues: [`${constraints.minDailyGoalMinutes}-${constraints.maxDailyGoalMinutes}`]
                    });
                }
            }
            if (updates.weeklyGoalSessions !== undefined) {
                if (updates.weeklyGoalSessions < constraints.minWeeklyGoalSessions || updates.weeklyGoalSessions > constraints.maxWeeklyGoalSessions) {
                    errors.push({
                        field: 'weeklyGoalSessions',
                        code: 'INVALID_WEEKLY_GOAL',
                        message: `Weekly goal must be between ${constraints.minWeeklyGoalSessions} and ${constraints.maxWeeklyGoalSessions} sessions`,
                        currentValue: updates.weeklyGoalSessions,
                        allowedValues: [`${constraints.minWeeklyGoalSessions}-${constraints.maxWeeklyGoalSessions}`]
                    });
                }
            }
            if (updates.currentLevel && updates.targetLevel) {
                const allowedTargets = constraints.allowedLevelProgression[updates.currentLevel];
                if (!allowedTargets.includes(updates.targetLevel)) {
                    errors.push({
                        field: 'targetLevel',
                        code: 'INVALID_LEVEL_PROGRESSION',
                        message: `Target level ${updates.targetLevel} is not allowed from current level ${updates.currentLevel}`,
                        currentValue: updates.targetLevel,
                        allowedValues: allowedTargets
                    });
                }
            }
        }
        catch (error) {
            console.error('Error validating language configuration update:', error);
            errors.push({
                field: 'general',
                code: 'VALIDATION_ERROR',
                message: 'Error occurred during validation'
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    async getConfigurationConstraints() {
        try {
            const result = await this.db.query('SELECT * FROM user_configuration_constraints WHERE id = 1');
            if (result.rows.length === 0) {
                return UserLanguageConfiguration_1.DEFAULT_CONFIGURATION_CONSTRAINTS;
            }
            const row = result.rows[0];
            return {
                maxActiveLanguages: row.max_active_languages,
                minDailyGoalMinutes: row.min_daily_goal_minutes,
                maxDailyGoalMinutes: row.max_daily_goal_minutes,
                minWeeklyGoalSessions: row.min_weekly_goal_sessions,
                maxWeeklyGoalSessions: row.max_weekly_goal_sessions,
                allowedLevelProgression: row.allowed_level_progression
            };
        }
        catch (error) {
            console.error('Error getting configuration constraints:', error);
            return UserLanguageConfiguration_1.DEFAULT_CONFIGURATION_CONSTRAINTS;
        }
    }
    async ensureGlobalPreferencesExist(userId) {
        const existsResult = await this.db.query('SELECT id FROM global_learning_preferences WHERE user_id = $1', [userId]);
        if (existsResult.rows.length === 0) {
            await this.createDefaultGlobalPreferences(userId);
        }
    }
    async createDefaultGlobalPreferences(userId) {
        const id = (0, uuid_1.v4)();
        const defaults = UserLanguageConfiguration_1.DEFAULT_GLOBAL_PREFERENCES;
        const insertQuery = `
      INSERT INTO global_learning_preferences (
        id, user_id, preferred_study_time, session_duration_preference, break_interval_preference,
        competitive_mode, achievement_notifications, leaderboard_participation, streak_tracking,
        ai_personality, explanation_detail, feedback_frequency, data_analytics_opt_in,
        performance_tracking_opt_in, personalized_recommendations, font_size, color_scheme,
        reduced_motion, screen_reader_optimized, cloud_sync_enabled, offline_mode_enabled,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
        const result = await this.db.query(insertQuery, [
            id, userId, defaults.preferredStudyTime, defaults.sessionDurationPreference,
            defaults.breakIntervalPreference, defaults.competitiveMode, defaults.achievementNotifications,
            defaults.leaderboardParticipation, defaults.streakTracking, defaults.aiPersonality,
            defaults.explanationDetail, defaults.feedbackFrequency, defaults.dataAnalyticsOptIn,
            defaults.performanceTrackingOptIn, defaults.personalizedRecommendations, defaults.fontSize,
            defaults.colorScheme, defaults.reducedMotion, defaults.screenReaderOptimized,
            defaults.cloudSyncEnabled, defaults.offlineModeEnabled
        ]);
        return this.mapRowToGlobalPreferences(result.rows[0]);
    }
    async ensureUserCapabilityExists(client, userId, language, currentLevel, targetLevel) {
        const capabilityCheck = await client.query('SELECT id FROM user_capabilities WHERE user_id = $1 AND language = $2', [userId, language]);
        if (capabilityCheck.rows.length === 0) {
            const capabilityId = (0, uuid_1.v4)();
            await client.query(`
        INSERT INTO user_capabilities (
          id, user_id, language, current_level, learning_goal, overall_level,
          confidence_score, listening_level, speaking_level, reading_level, writing_level,
          estimated_vocabulary_size, mastered_words_count, learning_words_count,
          last_assessed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
                capabilityId, userId, language, currentLevel, targetLevel || 'C2'
            ]);
        }
    }
    async ensureLearningProgressExists(client, userId, language) {
        const progressCheck = await client.query('SELECT id FROM learning_progress WHERE user_id = $1 AND language = $2', [userId, language]);
        if (progressCheck.rows.length === 0) {
            const progressId = (0, uuid_1.v4)();
            await client.query(`
        INSERT INTO learning_progress (id, user_id, language, total_study_time, streak_days, created_at, updated_at)
        VALUES ($1, $2, $3, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [progressId, userId, language]);
        }
    }
    camelToSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    mapRowToLanguageConfiguration(row) {
        return {
            id: row.id,
            userId: row.user_id,
            language: row.language,
            currentLevel: row.current_level,
            targetLevel: row.target_level,
            isPrimary: row.is_primary,
            isActive: row.is_active,
            learningIntensity: row.learning_intensity,
            preferredPracticeTypes: row.preferred_practice_types || ['mixed'],
            dailyGoalMinutes: row.daily_goal_minutes,
            weeklyGoalSessions: row.weekly_goal_sessions,
            difficultyPreference: row.difficulty_preference,
            visualLearningEnabled: row.visual_learning_enabled,
            auditoryLearningEnabled: row.auditory_learning_enabled,
            kinestheticLearningEnabled: row.kinesthetic_learning_enabled,
            practiceReminders: row.practice_reminders,
            milestoneNotifications: row.milestone_notifications,
            weeklyProgressReports: row.weekly_progress_reports,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastModifiedBy: row.last_modified_by
        };
    }
    mapRowToGlobalPreferences(row) {
        return {
            id: row.id,
            userId: row.user_id,
            preferredStudyTime: row.preferred_study_time,
            sessionDurationPreference: row.session_duration_preference,
            breakIntervalPreference: row.break_interval_preference,
            competitiveMode: row.competitive_mode,
            achievementNotifications: row.achievement_notifications,
            leaderboardParticipation: row.leaderboard_participation,
            streakTracking: row.streak_tracking,
            aiPersonality: row.ai_personality,
            explanationDetail: row.explanation_detail,
            feedbackFrequency: row.feedback_frequency,
            dataAnalyticsOptIn: row.data_analytics_opt_in,
            performanceTrackingOptIn: row.performance_tracking_opt_in,
            personalizedRecommendations: row.personalized_recommendations,
            fontSize: row.font_size,
            colorScheme: row.color_scheme,
            reducedMotion: row.reduced_motion,
            screenReaderOptimized: row.screen_reader_optimized,
            cloudSyncEnabled: row.cloud_sync_enabled,
            offlineModeEnabled: row.offline_mode_enabled,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    mapRowToConfigurationHistory(row) {
        return {
            id: row.id,
            userId: row.user_id,
            language: row.language,
            changeType: row.change_type,
            fieldChanged: row.field_changed,
            previousValue: row.previous_value,
            newValue: row.new_value,
            changeReason: row.change_reason,
            changedBy: row.changed_by,
            changeSource: row.change_source,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            createdAt: row.created_at
        };
    }
}
exports.UserConfigurationService = UserConfigurationService;
//# sourceMappingURL=UserConfigurationService.js.map