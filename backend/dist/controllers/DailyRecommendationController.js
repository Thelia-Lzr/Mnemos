"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyRecommendationController = void 0;
const DailyRecommendationService_1 = require("../services/DailyRecommendationService");
const AIService_1 = require("../services/AIService");
const UserCapabilityService_1 = require("../services/UserCapabilityService");
const VocabularyService_1 = require("../services/VocabularyService");
const AsyncTaskManager_1 = require("../services/AsyncTaskManager");
const openrouter_1 = require("../types/openrouter");
class DailyRecommendationController {
    constructor(database) {
        const aiService = new AIService_1.AIService(database);
        const userCapabilityService = new UserCapabilityService_1.UserCapabilityService(database, aiService);
        const vocabularyService = new VocabularyService_1.VocabularyService(database);
        const asyncTaskManager = AsyncTaskManager_1.AsyncTaskManager.getInstance();
        this.dailyRecommendationService = new DailyRecommendationService_1.DailyRecommendationService(database, aiService, userCapabilityService, vocabularyService, asyncTaskManager);
    }
    async getTodaysRecommendation(req, res) {
        try {
            const userId = req.user?.id;
            const { language } = req.params;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            const recommendation = await this.dailyRecommendationService.getTodaysRecommendation(userId, language);
            if (!recommendation) {
                res.status(404).json({ error: 'No recommendation found for today' });
                return;
            }
            if (!recommendation.isViewed) {
                await this.dailyRecommendationService.markRecommendationAsViewed(userId, language);
                recommendation.isViewed = true;
                recommendation.viewedAt = new Date();
            }
            res.json({
                success: true,
                data: recommendation
            });
        }
        catch (error) {
            console.error('Error getting today\'s recommendation:', error);
            res.status(500).json({
                error: 'Failed to get daily recommendation',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async generateRecommendation(req, res) {
        try {
            const userId = req.user?.id;
            const { language } = req.params;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            const recommendation = await this.dailyRecommendationService.generateDailyRecommendation(userId, language);
            res.json({
                success: true,
                data: recommendation
            });
        }
        catch (error) {
            console.error('Error generating recommendation:', error);
            res.status(500).json({
                error: 'Failed to generate daily recommendation',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async generateRecommendationAsync(req, res) {
        try {
            const userId = req.user?.id;
            const { language } = req.params;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            const taskId = await this.dailyRecommendationService.generateDailyRecommendationAsync(userId, language);
            res.json({
                success: true,
                data: {
                    taskId,
                    message: 'Daily recommendation generation started',
                    status: 'processing'
                }
            });
        }
        catch (error) {
            console.error('Error starting async recommendation generation:', error);
            res.status(500).json({
                error: 'Failed to start recommendation generation',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async generateQuickPractice(req, res) {
        try {
            const userId = req.user?.id;
            const { language, practiceOptionId } = req.params;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            if (!practiceOptionId) {
                res.status(400).json({ error: 'Practice option ID is required' });
                return;
            }
            const taskId = await this.dailyRecommendationService.generateQuickPracticeAsync(userId, language, practiceOptionId);
            res.json({
                success: true,
                data: {
                    taskId,
                    message: 'Quick practice generation started',
                    status: 'processing'
                }
            });
        }
        catch (error) {
            console.error('Error generating quick practice:', error);
            res.status(500).json({
                error: 'Failed to generate quick practice',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async submitFeedback(req, res) {
        try {
            const userId = req.user?.id;
            const { language } = req.params;
            const { rating, isHelpful, followedRecommendations, comments } = req.body;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            if (typeof rating !== 'number' || rating < 1 || rating > 5) {
                res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
                return;
            }
            if (typeof isHelpful !== 'boolean') {
                res.status(400).json({ error: 'isHelpful must be a boolean' });
                return;
            }
            if (!Array.isArray(followedRecommendations)) {
                res.status(400).json({ error: 'followedRecommendations must be an array' });
                return;
            }
            const feedback = {
                rating,
                isHelpful,
                followedRecommendations,
                comments: comments || undefined
            };
            const success = await this.dailyRecommendationService.submitRecommendationFeedback(userId, language, feedback);
            if (!success) {
                res.status(404).json({ error: 'No recommendation found to update' });
                return;
            }
            res.json({
                success: true,
                message: 'Feedback submitted successfully'
            });
        }
        catch (error) {
            console.error('Error submitting feedback:', error);
            res.status(500).json({
                error: 'Failed to submit feedback',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getRecommendationHistory(req, res) {
        try {
            const userId = req.user?.id;
            const { language } = req.params;
            const { limit } = req.query;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            const limitNum = limit ? parseInt(limit, 10) : 30;
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                res.status(400).json({ error: 'Limit must be a number between 1 and 100' });
                return;
            }
            const history = await this.dailyRecommendationService.getRecommendationHistory(userId, language, limitNum);
            res.json({
                success: true,
                data: {
                    history,
                    count: history.length
                }
            });
        }
        catch (error) {
            console.error('Error getting recommendation history:', error);
            res.status(500).json({
                error: 'Failed to get recommendation history',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async markAsViewed(req, res) {
        try {
            const userId = req.user?.id;
            const { language } = req.params;
            const { date } = req.body;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            const success = await this.dailyRecommendationService.markRecommendationAsViewed(userId, language, date);
            if (!success) {
                res.status(404).json({ error: 'No recommendation found to update' });
                return;
            }
            res.json({
                success: true,
                message: 'Recommendation marked as viewed'
            });
        }
        catch (error) {
            console.error('Error marking recommendation as viewed:', error);
            res.status(500).json({
                error: 'Failed to mark recommendation as viewed',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getRecommendationByDate(req, res) {
        try {
            const userId = req.user?.id;
            const { language, date } = req.params;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            if (!this.isValidLanguage(language)) {
                res.status(400).json({ error: 'Invalid language parameter' });
                return;
            }
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
                return;
            }
            const recommendation = await this.dailyRecommendationService.getTodaysRecommendation(userId, language, date);
            if (!recommendation) {
                res.status(404).json({ error: 'No recommendation found for the specified date' });
                return;
            }
            res.json({
                success: true,
                data: recommendation
            });
        }
        catch (error) {
            console.error('Error getting recommendation by date:', error);
            res.status(500).json({
                error: 'Failed to get recommendation',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    isValidLanguage(language) {
        return Object.values(openrouter_1.Language).includes(language);
    }
}
exports.DailyRecommendationController = DailyRecommendationController;
//# sourceMappingURL=DailyRecommendationController.js.map