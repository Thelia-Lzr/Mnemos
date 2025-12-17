"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocabularyService = void 0;
const VocabularyWord_1 = require("../models/VocabularyWord");
const UserCapabilityService_1 = require("./UserCapabilityService");
const ForgettingCurveService_1 = require("./ForgettingCurveService");
class VocabularyService {
    constructor(db) {
        this.db = db;
        this.vocabularyModel = new VocabularyWord_1.VocabularyWordModel(db);
        const aiService = new (require('./AIService')).AIService();
        this.userCapabilityService = new UserCapabilityService_1.UserCapabilityService(db, aiService);
        this.forgettingCurveService = new ForgettingCurveService_1.ForgettingCurveService(db);
    }
    async extractAndAddWordsFromText(userId, text, language) {
        const words = this.extractWordsFromText(text, language);
        const uniqueWords = [...new Set(words)];
        const newWordsData = uniqueWords.map(word => ({
            userId,
            word: word.toLowerCase(),
            language,
            definition: `Definition for ${word}`,
            difficulty: this.estimateWordDifficulty(word),
            frequency: this.estimateWordFrequency(word)
        }));
        const newWordsAdded = await this.vocabularyModel.bulkCreate(newWordsData);
        await this.updateUserVocabularyStats(userId, language);
        return {
            words: uniqueWords,
            extractedCount: uniqueWords.length,
            duplicateCount: uniqueWords.length - newWordsAdded.length,
            newWordsAdded
        };
    }
    async getUserVocabulary(userId, language, masteryLevel) {
        let words = await this.vocabularyModel.findByUserAndLanguage(userId, language);
        if (masteryLevel) {
            words = words.filter(word => word.masteryLevel === masteryLevel);
        }
        return words;
    }
    async updateMasteryFromPractice(userId, wordId, practiceScore, responseTime) {
        const word = await this.vocabularyModel.findById(wordId);
        if (!word || word.userId !== userId) {
            throw new Error('Word not found or access denied');
        }
        const previousLevel = word.masteryLevel;
        const previousScore = word.masteryScore;
        const scoreChange = this.calculateMasteryScoreChange(practiceScore, responseTime, word.masteryScore);
        const newScore = Math.max(0, Math.min(100, word.masteryScore + scoreChange));
        const newLevel = this.determineMasteryLevel(newScore, word.masteryLevel);
        const forgettingCurveCalc = this.calculateForgettingCurve(word, practiceScore, responseTime);
        const updatedParams = {
            ...word.forgettingCurveParams,
            reviewCount: word.forgettingCurveParams.reviewCount + 1,
            lastReviewScore: practiceScore
        };
        const updateData = {
            masteryScore: newScore,
            masteryLevel: newLevel,
            lastReviewedAt: new Date(),
            nextReviewAt: forgettingCurveCalc.nextReviewAt,
            forgettingCurveParams: updatedParams
        };
        const updatedWord = await this.vocabularyModel.update(wordId, updateData);
        if (!updatedWord) {
            throw new Error('Failed to update word');
        }
        const shouldRemove = this.shouldAutoRemoveWord(updatedWord);
        if (shouldRemove) {
            await this.vocabularyModel.delete(wordId);
        }
        await this.updateUserVocabularyStats(userId, word.language);
        return {
            word: updatedWord,
            previousLevel,
            newLevel,
            scoreChange,
            shouldRemove
        };
    }
    async applyDailyDecay(userId, language) {
        const words = await this.vocabularyModel.findByUserAndLanguage(userId, language);
        const decayedWords = await this.forgettingCurveService.applyForgettingCurveDecay(words);
        for (let i = 0; i < words.length; i++) {
            const originalWord = words[i];
            const decayedWord = decayedWords[i];
            if (originalWord.masteryScore !== decayedWord.masteryScore ||
                originalWord.masteryLevel !== decayedWord.masteryLevel) {
                await this.vocabularyModel.update(originalWord.id, {
                    masteryScore: decayedWord.masteryScore,
                    masteryLevel: decayedWord.masteryLevel
                });
            }
        }
        await this.updateUserVocabularyStats(userId, language);
    }
    async getWordsNeedingReview(userId, language, limit = 20) {
        return this.vocabularyModel.findWordsNeedingReview(userId, language, limit);
    }
    async getMasteryStats(userId, language) {
        return this.vocabularyModel.getMasteryStats(userId, language);
    }
    async removeWord(userId, wordId) {
        const word = await this.vocabularyModel.findById(wordId);
        if (!word || word.userId !== userId) {
            return false;
        }
        const success = await this.vocabularyModel.delete(wordId);
        if (success) {
            await this.updateUserVocabularyStats(userId, word.language);
        }
        return success;
    }
    calculateForgettingCurve(word, practiceScore, responseTime = 3000) {
        const reviewSchedule = this.forgettingCurveService.calculateNextReview(word, practiceScore, responseTime);
        const masteryBoost = Math.min(10, practiceScore / 10);
        const newMasteryScore = Math.min(100, word.masteryScore + masteryBoost);
        return {
            nextReviewAt: reviewSchedule.nextReviewAt,
            masteryScore: newMasteryScore,
            forgettingCurveParams: {
                ...word.forgettingCurveParams,
                reviewCount: word.forgettingCurveParams.reviewCount + 1,
                lastReviewScore: practiceScore
            }
        };
    }
    calculateMasteryScoreChange(practiceScore, responseTime, currentScore) {
        let scoreChange = (practiceScore - 50) / 5;
        const timeBonus = Math.max(0, (5000 - responseTime) / 1000);
        scoreChange += timeBonus;
        if (currentScore > 80) {
            scoreChange *= 0.5;
        }
        else if (currentScore > 60) {
            scoreChange *= 0.7;
        }
        return Math.round(scoreChange);
    }
    determineMasteryLevel(score, currentLevel) {
        if (score >= 90)
            return VocabularyWord_1.MasteryLevel.MASTERED;
        if (score >= 70)
            return VocabularyWord_1.MasteryLevel.LONG_TERM;
        if (score >= 50)
            return VocabularyWord_1.MasteryLevel.SHORT_TERM;
        if (score >= 25)
            return VocabularyWord_1.MasteryLevel.LEARNING;
        return VocabularyWord_1.MasteryLevel.NEW;
    }
    calculateDecayAmount(word, daysSinceReview) {
        const { decayRate } = word.forgettingCurveParams;
        const decayFactor = Math.pow(1 - decayRate, daysSinceReview);
        const retainedScore = word.masteryScore * decayFactor;
        return word.masteryScore - retainedScore;
    }
    shouldAutoRemoveWord(word) {
        if (word.masteryLevel === VocabularyWord_1.MasteryLevel.MASTERED && word.masteryScore > 95) {
            const daysSinceMastery = word.lastReviewedAt
                ? Math.floor((Date.now() - word.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            return daysSinceMastery > 30;
        }
        return false;
    }
    extractWordsFromText(text, language) {
        const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
        const words = cleanText.split(/\s+/).filter(word => word.length > 2);
        const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        return words.filter(word => !stopWords.has(word));
    }
    estimateWordDifficulty(word) {
        if (word.length <= 4)
            return 1;
        if (word.length <= 6)
            return 3;
        if (word.length <= 8)
            return 5;
        if (word.length <= 10)
            return 7;
        return 9;
    }
    estimateWordFrequency(word) {
        const commonWords = new Set(['time', 'person', 'year', 'way', 'day', 'thing', 'man', 'world', 'life', 'hand']);
        if (commonWords.has(word))
            return 10;
        if (word.length <= 4)
            return 7;
        if (word.length <= 6)
            return 5;
        return 3;
    }
    async getScheduledReviews(userId, language, limit = 50) {
        return this.forgettingCurveService.getScheduledReviews(userId, language, limit);
    }
    async generateReviewReminders(userId) {
        return this.forgettingCurveService.generateReviewReminders(userId);
    }
    async getForgettingCurveMetrics(userId, language) {
        return this.forgettingCurveService.getForgettingCurveMetrics(userId, language);
    }
    async optimizeReviewSchedule(userId, language) {
        await this.forgettingCurveService.optimizeReviewSchedule(userId, language);
    }
    async updateUserVocabularyStats(userId, language) {
        const stats = await this.getMasteryStats(userId, language);
        console.log(`Updated vocabulary stats for user ${userId} in ${language}:`, {
            estimatedVocabularySize: stats.totalWords,
            masteredWordsCount: stats.masteredWords,
            learningWordsCount: stats.learningWords + stats.shortTermWords + stats.longTermWords
        });
    }
}
exports.VocabularyService = VocabularyService;
//# sourceMappingURL=VocabularyService.js.map