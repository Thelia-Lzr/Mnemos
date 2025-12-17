"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserConfigurationController = void 0;
const UserConfigurationService_1 = require("../services/UserConfigurationService");
class UserConfigurationController {
    constructor(db) {
        this.userConfigurationService = new UserConfigurationService_1.UserConfigurationService(db);
    }
    async getLanguageConfigurations(req, res, next) {
        try {
            const activeOnly = req.query.active === 'true';
            const configurations = await this.userConfigurationService.getUserLanguageConfigurations(req.user.id, activeOnly);
            res.status(200).json({
                success: true,
                data: configurations
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getLanguageConfiguration(req, res, next) {
        try {
            const { language } = req.params;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const configuration = await this.userConfigurationService.getUserLanguageConfiguration(req.user.id, language);
            if (!configuration) {
                res.status(404).json({
                    success: false,
                    error: 'Language configuration not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: configuration
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createLanguageConfiguration(req, res, next) {
        try {
            const configRequest = req.body;
            if (!configRequest.language || !configRequest.currentLevel) {
                res.status(400).json({
                    success: false,
                    error: 'Language and current level are required'
                });
                return;
            }
            const configuration = await this.userConfigurationService.createLanguageConfiguration(req.user.id, configRequest, req.user.id, 'user_profile');
            if (!configuration) {
                res.status(400).json({
                    success: false,
                    error: 'Failed to create language configuration'
                });
                return;
            }
            res.status(201).json({
                success: true,
                data: configuration,
                message: 'Language configuration created successfully'
            });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Validation failed')) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
                return;
            }
            next(error);
        }
    }
    async updateLanguageConfiguration(req, res, next) {
        try {
            const { language } = req.params;
            const updates = req.body;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const success = await this.userConfigurationService.updateLanguageConfiguration(req.user.id, language, updates, req.user.id, 'user_profile', req.ip, req.get('User-Agent'));
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Language configuration not found or no changes made'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Language configuration updated successfully'
            });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Validation failed')) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
                return;
            }
            next(error);
        }
    }
    async removeLanguageConfiguration(req, res, next) {
        try {
            const { language } = req.params;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const success = await this.userConfigurationService.removeLanguageConfiguration(req.user.id, language, req.user.id);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Language configuration not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Language configuration removed successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getGlobalPreferences(req, res, next) {
        try {
            const preferences = await this.userConfigurationService.getGlobalPreferences(req.user.id);
            if (!preferences) {
                res.status(404).json({
                    success: false,
                    error: 'Global preferences not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: preferences
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateGlobalPreferences(req, res, next) {
        try {
            const updates = req.body;
            const success = await this.userConfigurationService.updateGlobalPreferences(req.user.id, updates);
            if (!success) {
                res.status(400).json({
                    success: false,
                    error: 'No changes made to global preferences'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Global preferences updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getConfigurationHistory(req, res, next) {
        try {
            const { language } = req.query;
            const limit = parseInt(req.query.limit) || 50;
            const history = await this.userConfigurationService.getConfigurationHistory(req.user.id, language, limit);
            res.status(200).json({
                success: true,
                data: history
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getConfigurationSummary(req, res, next) {
        try {
            const summary = await this.userConfigurationService.getUserConfigurationSummary(req.user.id);
            if (!summary) {
                res.status(404).json({
                    success: false,
                    error: 'Configuration summary not available'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getConfigurationHealth(req, res, next) {
        try {
            const healthStatus = await this.userConfigurationService.getConfigurationHealthStatus(req.user.id);
            res.status(200).json({
                success: true,
                data: healthStatus
            });
        }
        catch (error) {
            next(error);
        }
    }
    async validateLanguageConfiguration(req, res, next) {
        try {
            const { language } = req.params;
            const configData = req.body;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: {
                    isValid: true,
                    errors: [],
                    warnings: []
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async bulkUpdateLanguageConfigurations(req, res, next) {
        try {
            const { configurations } = req.body;
            if (!Array.isArray(configurations)) {
                res.status(400).json({
                    success: false,
                    error: 'Configurations must be an array'
                });
                return;
            }
            const results = [];
            for (const config of configurations) {
                try {
                    const success = await this.userConfigurationService.updateLanguageConfiguration(req.user.id, config.language, config.updates, req.user.id, 'user_profile');
                    results.push({ language: config.language, success });
                }
                catch (error) {
                    results.push({
                        language: config.language,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            res.status(200).json({
                success: true,
                data: results,
                message: 'Bulk update completed'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async exportConfiguration(req, res, next) {
        try {
            const summary = await this.userConfigurationService.getUserConfigurationSummary(req.user.id);
            if (!summary) {
                res.status(404).json({
                    success: false,
                    error: 'No configuration to export'
                });
                return;
            }
            const exportData = {
                languageConfigurations: summary.languageConfigurations.map(config => ({
                    language: config.language,
                    currentLevel: config.currentLevel,
                    targetLevel: config.targetLevel,
                    learningIntensity: config.learningIntensity,
                    preferredPracticeTypes: config.preferredPracticeTypes,
                    dailyGoalMinutes: config.dailyGoalMinutes,
                    weeklyGoalSessions: config.weeklyGoalSessions,
                    difficultyPreference: config.difficultyPreference,
                    visualLearningEnabled: config.visualLearningEnabled,
                    auditoryLearningEnabled: config.auditoryLearningEnabled,
                    kinestheticLearningEnabled: config.kinestheticLearningEnabled,
                    practiceReminders: config.practiceReminders,
                    milestoneNotifications: config.milestoneNotifications,
                    weeklyProgressReports: config.weeklyProgressReports
                })),
                globalPreferences: {
                    preferredStudyTime: summary.globalPreferences.preferredStudyTime,
                    sessionDurationPreference: summary.globalPreferences.sessionDurationPreference,
                    breakIntervalPreference: summary.globalPreferences.breakIntervalPreference,
                    competitiveMode: summary.globalPreferences.competitiveMode,
                    achievementNotifications: summary.globalPreferences.achievementNotifications,
                    leaderboardParticipation: summary.globalPreferences.leaderboardParticipation,
                    streakTracking: summary.globalPreferences.streakTracking,
                    aiPersonality: summary.globalPreferences.aiPersonality,
                    explanationDetail: summary.globalPreferences.explanationDetail,
                    feedbackFrequency: summary.globalPreferences.feedbackFrequency,
                    fontSize: summary.globalPreferences.fontSize,
                    colorScheme: summary.globalPreferences.colorScheme,
                    reducedMotion: summary.globalPreferences.reducedMotion,
                    screenReaderOptimized: summary.globalPreferences.screenReaderOptimized
                },
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            res.status(200).json({
                success: true,
                data: exportData
            });
        }
        catch (error) {
            next(error);
        }
    }
    async importConfiguration(req, res, next) {
        try {
            const { configurationData, overwriteExisting = false } = req.body;
            if (!configurationData) {
                res.status(400).json({
                    success: false,
                    error: 'Configuration data is required'
                });
                return;
            }
            const results = {
                languageConfigurations: [],
                globalPreferences: null,
                errors: []
            };
            if (configurationData.globalPreferences) {
                try {
                    const success = await this.userConfigurationService.updateGlobalPreferences(req.user.id, configurationData.globalPreferences);
                    results.globalPreferences = success;
                }
                catch (error) {
                    results.errors.push(`Global preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            if (Array.isArray(configurationData.languageConfigurations)) {
                for (const config of configurationData.languageConfigurations) {
                    try {
                        const existing = await this.userConfigurationService.getUserLanguageConfiguration(req.user.id, config.language);
                        if (existing && !overwriteExisting) {
                            results.errors.push(`Language ${config.language}: Configuration already exists`);
                            continue;
                        }
                        let success;
                        if (existing) {
                            success = await this.userConfigurationService.updateLanguageConfiguration(req.user.id, config.language, config, req.user.id, 'user_profile');
                        }
                        else {
                            const created = await this.userConfigurationService.createLanguageConfiguration(req.user.id, config, req.user.id, 'user_profile');
                            success = !!created;
                        }
                        results.languageConfigurations.push({
                            language: config.language,
                            success,
                            action: existing ? 'updated' : 'created'
                        });
                    }
                    catch (error) {
                        results.errors.push(`Language ${config.language}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }
            }
            res.status(200).json({
                success: true,
                data: results,
                message: 'Configuration import completed'
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserConfigurationController = UserConfigurationController;
//# sourceMappingURL=UserConfigurationController.js.map