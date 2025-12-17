"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocabularyController = void 0;
const VocabularyService_1 = require("../services/VocabularyService");
const VocabularyPracticeService_1 = require("../services/VocabularyPracticeService");
const VocabularyWord_1 = require("../models/VocabularyWord");
const database_1 = require("../config/database");
class VocabularyController {
    constructor() {
        this.vocabularyService = new VocabularyService_1.VocabularyService(database_1.pool);
        this.vocabularyPracticeService = new VocabularyPracticeService_1.VocabularyPracticeService(database_1.pool);
    }
    async getVocabularyWords(req, res, next) {
        try {
            const userId = req.user.id;
            const { language, masteryLevel } = req.query;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language parameter is required (en, ja, fr)'
                });
                return;
            }
            const words = await this.vocabularyService.getUserVocabulary(userId, language, masteryLevel);
            res.status(200).json({
                success: true,
                data: { words }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addWords(req, res, next) {
        try {
            const userId = req.user.id;
            const { text, language } = req.body;
            if (!text || !language) {
                res.status(400).json({
                    success: false,
                    error: 'Text and language are required'
                });
                return;
            }
            if (!Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language is required (en, ja, fr)'
                });
                return;
            }
            const result = await this.vocabularyService.extractAndAddWordsFromText(userId, text, language);
            res.status(201).json({
                success: true,
                data: result,
                message: `Added ${result.newWordsAdded.length} new words to vocabulary`
            });
        }
        catch (error) {
            next(error);
        }
    }
    async removeWord(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Word ID is required'
                });
                return;
            }
            const success = await this.vocabularyService.removeWord(userId, id);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Word not found or access denied'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Word removed successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMastery(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { practiceScore, responseTime } = req.body;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'Word ID is required'
                });
                return;
            }
            if (practiceScore === undefined || responseTime === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'Practice score and response time are required'
                });
                return;
            }
            const result = await this.vocabularyService.updateMasteryFromPractice(userId, id, practiceScore, responseTime);
            res.status(200).json({
                success: true,
                data: result,
                message: `Word mastery updated from ${result.previousLevel} to ${result.newLevel}`
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMasteryStats(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.query;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language parameter is required (en, ja, fr)'
                });
                return;
            }
            const stats = await this.vocabularyService.getMasteryStats(userId, language);
            res.status(200).json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMasteryFromPractice(req, res, next) {
        try {
            const userId = req.user.id;
            const { wordId, practiceScore, responseTime } = req.body;
            if (!wordId || practiceScore === undefined || responseTime === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'Word ID, practice score, and response time are required'
                });
                return;
            }
            const result = await this.vocabularyService.updateMasteryFromPractice(userId, wordId, practiceScore, responseTime);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getWordsNeedingReview(req, res, next) {
        try {
            const userId = req.user.id;
            const { language, limit } = req.query;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language parameter is required (en, ja, fr)'
                });
                return;
            }
            const words = await this.vocabularyService.getWordsNeedingReview(userId, language, limit ? parseInt(limit) : 20);
            res.status(200).json({
                success: true,
                data: { words }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async applyDailyDecay(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.body;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language is required (en, ja, fr)'
                });
                return;
            }
            await this.vocabularyService.applyDailyDecay(userId, language);
            res.status(200).json({
                success: true,
                message: 'Daily decay applied successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getScheduledReviews(req, res, next) {
        try {
            const userId = req.user.id;
            const { language, limit } = req.query;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language parameter is required (en, ja, fr)'
                });
                return;
            }
            const schedules = await this.vocabularyService.getScheduledReviews(userId, language, limit ? parseInt(limit) : 50);
            res.status(200).json({
                success: true,
                data: { schedules }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getReviewReminders(req, res, next) {
        try {
            const userId = req.user.id;
            const reminders = await this.vocabularyService.generateReviewReminders(userId);
            res.status(200).json({
                success: true,
                data: { reminders }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getForgettingCurveMetrics(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.query;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language parameter is required (en, ja, fr)'
                });
                return;
            }
            const metrics = await this.vocabularyService.getForgettingCurveMetrics(userId, language);
            res.status(200).json({
                success: true,
                data: metrics
            });
        }
        catch (error) {
            next(error);
        }
    }
    async optimizeReviewSchedule(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.body;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language is required (en, ja, fr)'
                });
                return;
            }
            await this.vocabularyService.optimizeReviewSchedule(userId, language);
            res.status(200).json({
                success: true,
                message: 'Review schedule optimized successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async generateVocabularyPractice(req, res, next) {
        try {
            const userId = req.user.id;
            const { language, wordIds, masteryLevels, maxWords, focusOnWeakWords, includeReviewWords } = req.body;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language is required (en, ja, fr)'
                });
                return;
            }
            const options = {
                userId,
                language: language,
                wordIds,
                masteryLevels,
                maxWords,
                focusOnWeakWords,
                includeReviewWords
            };
            const practiceGroup = await this.vocabularyPracticeService.generateVocabularyPracticeGroup(options);
            res.status(200).json({
                success: true,
                data: practiceGroup
            });
        }
        catch (error) {
            next(error);
        }
    }
    async generateAdaptivePractice(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.body;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language is required (en, ja, fr)'
                });
                return;
            }
            const practiceGroup = await this.vocabularyPracticeService.generateAdaptivePractice(userId, language);
            res.status(200).json({
                success: true,
                data: practiceGroup
            });
        }
        catch (error) {
            next(error);
        }
    }
    async submitPracticeResults(req, res, next) {
        try {
            const userId = req.user.id;
            const { results } = req.body;
            if (!results || !Array.isArray(results)) {
                res.status(400).json({
                    success: false,
                    error: 'Practice results array is required'
                });
                return;
            }
            await this.vocabularyPracticeService.processPracticeResults(userId, results);
            res.status(200).json({
                success: true,
                message: 'Practice results processed successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getLearningEfficiencyMetrics(req, res, next) {
        try {
            const userId = req.user.id;
            const { language, days } = req.query;
            if (!language || !Object.values(VocabularyWord_1.Language).includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language parameter is required (en, ja, fr)'
                });
                return;
            }
            const metrics = await this.vocabularyPracticeService.getLearningEfficiencyMetrics(userId, language, days ? parseInt(days) : 30);
            res.status(200).json({
                success: true,
                data: metrics
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.VocabularyController = VocabularyController;
//# sourceMappingURL=VocabularyController.js.map