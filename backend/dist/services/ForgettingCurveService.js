"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForgettingCurveService = void 0;
const VocabularyWord_1 = require("../models/VocabularyWord");
class ForgettingCurveService {
    constructor(db) {
        this.db = db;
    }
    calculateNextReview(word, practiceScore, responseTime) {
        const { initialStrength, decayRate, reviewCount, lastReviewScore } = word.forgettingCurveParams;
        const performanceFactor = this.calculatePerformanceFactor(practiceScore, responseTime);
        let easinessFactor = Math.max(1.3, initialStrength + (0.1 - (5 - performanceFactor) * (0.08 + (5 - performanceFactor) * 0.02)));
        let interval;
        if (reviewCount === 0) {
            interval = 1;
        }
        else if (reviewCount === 1) {
            interval = Math.round(6 * performanceFactor);
        }
        else {
            const previousInterval = this.getPreviousInterval(word);
            interval = Math.round(previousInterval * easinessFactor * performanceFactor);
        }
        interval = this.applyIntervalBounds(interval, word.masteryLevel, reviewCount);
        const priority = this.calculateReviewPriority(word, interval, practiceScore);
        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + interval);
        return {
            wordId: word.id,
            nextReviewAt,
            priority,
            estimatedDifficulty: this.estimateReviewDifficulty(word, interval)
        };
    }
    async applyForgettingCurveDecay(words) {
        const updatedWords = [];
        for (const word of words) {
            if (word.masteryLevel === VocabularyWord_1.MasteryLevel.MASTERED) {
                updatedWords.push(word);
                continue;
            }
            const daysSinceLastReview = this.getDaysSinceLastReview(word);
            if (daysSinceLastReview > 0) {
                const decayedScore = this.calculateDecayedScore(word, daysSinceLastReview);
                const newMasteryLevel = this.determineMasteryLevelFromScore(decayedScore);
                const updatedWord = {
                    ...word,
                    masteryScore: decayedScore,
                    masteryLevel: newMasteryLevel
                };
                updatedWords.push(updatedWord);
            }
            else {
                updatedWords.push(word);
            }
        }
        return updatedWords;
    }
    async getScheduledReviews(userId, language, limit = 50) {
        const query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 
        AND next_review_at IS NOT NULL 
        AND next_review_at <= NOW()
        AND mastery_level != 'mastered'
      ORDER BY next_review_at ASC, mastery_score ASC
      LIMIT $3
    `;
        const result = await this.db.query(query, [userId, language, limit]);
        return result.rows.map(row => {
            const word = this.mapRowToVocabularyWord(row);
            return {
                wordId: word.id,
                nextReviewAt: word.nextReviewAt,
                priority: this.calculateCurrentPriority(word),
                estimatedDifficulty: word.difficulty
            };
        });
    }
    async generateReviewReminders(userId) {
        const languages = ['en', 'ja', 'fr'];
        const reminders = [];
        for (const language of languages) {
            const schedules = await this.getScheduledReviews(userId, language, 100);
            if (schedules.length > 0) {
                const urgentCount = schedules.filter(s => s.priority >= 8).length;
                reminders.push({
                    userId,
                    language,
                    wordsCount: schedules.length,
                    urgentWordsCount: urgentCount,
                    scheduledFor: new Date()
                });
            }
        }
        return reminders;
    }
    async getForgettingCurveMetrics(userId, language) {
        const query = `
      SELECT 
        AVG(mastery_score) as avg_retention,
        AVG(EXTRACT(EPOCH FROM (next_review_at - last_reviewed_at)) / 86400) as avg_interval_days,
        AVG(last_review_score) as avg_success_rate,
        SUM(review_count) as total_reviews
      FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 AND review_count > 0
    `;
        const result = await this.db.query(query, [userId, language]);
        const row = result.rows[0];
        return {
            retentionRate: parseFloat(row.avg_retention) || 0,
            averageInterval: parseFloat(row.avg_interval_days) || 0,
            successRate: parseFloat(row.avg_success_rate) || 0,
            totalReviews: parseInt(row.total_reviews) || 0
        };
    }
    async optimizeReviewSchedule(userId, language) {
        const metrics = await this.getForgettingCurveMetrics(userId, language);
        const adjustmentFactor = this.calculateScheduleAdjustment(metrics);
        const updateQuery = `
      UPDATE vocabulary_words 
      SET 
        decay_rate = GREATEST(0.05, LEAST(0.3, decay_rate * $3)),
        initial_strength = GREATEST(1.0, LEAST(3.0, initial_strength * $4))
      WHERE user_id = $1 AND language = $2
    `;
        await this.db.query(updateQuery, [
            userId,
            language,
            adjustmentFactor.decayRateMultiplier,
            adjustmentFactor.strengthMultiplier
        ]);
    }
    calculatePerformanceFactor(practiceScore, responseTime) {
        let performance = (practiceScore / 100) * 2.0;
        const timeBonus = Math.max(0, Math.min(0.5, (5000 - responseTime) / 10000));
        performance += timeBonus;
        return Math.max(0.0, Math.min(2.0, performance));
    }
    calculateDecayedScore(word, daysSinceReview) {
        const { decayRate } = word.forgettingCurveParams;
        const strength = 1 / decayRate;
        const retentionFactor = Math.exp(-daysSinceReview / strength);
        const decayedScore = word.masteryScore * retentionFactor;
        return Math.max(0, Math.round(decayedScore));
    }
    calculateReviewPriority(word, interval, practiceScore) {
        let priority = 5;
        switch (word.masteryLevel) {
            case VocabularyWord_1.MasteryLevel.NEW:
                priority += 3;
                break;
            case VocabularyWord_1.MasteryLevel.LEARNING:
                priority += 2;
                break;
            case VocabularyWord_1.MasteryLevel.SHORT_TERM:
                priority += 1;
                break;
        }
        priority += Math.min(2, word.difficulty / 5);
        if (practiceScore < 60) {
            priority += 2;
        }
        else if (practiceScore < 80) {
            priority += 1;
        }
        if (interval > 30) {
            priority -= 2;
        }
        else if (interval > 14) {
            priority -= 1;
        }
        return Math.max(1, Math.min(10, Math.round(priority)));
    }
    applyIntervalBounds(interval, masteryLevel, reviewCount) {
        const minIntervals = {
            [VocabularyWord_1.MasteryLevel.NEW]: 1,
            [VocabularyWord_1.MasteryLevel.LEARNING]: 1,
            [VocabularyWord_1.MasteryLevel.SHORT_TERM]: 2,
            [VocabularyWord_1.MasteryLevel.LONG_TERM]: 7,
            [VocabularyWord_1.MasteryLevel.MASTERED]: 30
        };
        const maxInterval = Math.min(365, Math.pow(2, reviewCount + 3));
        const minInterval = minIntervals[masteryLevel];
        return Math.max(minInterval, Math.min(maxInterval, interval));
    }
    estimateReviewDifficulty(word, interval) {
        let difficulty = word.difficulty;
        difficulty += Math.min(3, interval / 10);
        switch (word.masteryLevel) {
            case VocabularyWord_1.MasteryLevel.NEW:
                difficulty += 2;
                break;
            case VocabularyWord_1.MasteryLevel.LEARNING:
                difficulty += 1;
                break;
        }
        return Math.max(1, Math.min(10, Math.round(difficulty)));
    }
    getDaysSinceLastReview(word) {
        if (!word.lastReviewedAt) {
            return Math.floor((Date.now() - word.addedAt.getTime()) / (1000 * 60 * 60 * 24));
        }
        return Math.floor((Date.now() - word.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    getPreviousInterval(word) {
        if (!word.lastReviewedAt || !word.nextReviewAt) {
            return 1;
        }
        const intervalMs = word.nextReviewAt.getTime() - word.lastReviewedAt.getTime();
        return Math.max(1, Math.round(intervalMs / (1000 * 60 * 60 * 24)));
    }
    calculateCurrentPriority(word) {
        const daysOverdue = word.nextReviewAt
            ? Math.max(0, Math.floor((Date.now() - word.nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
        let priority = 5;
        priority += Math.min(3, daysOverdue);
        if (word.masteryScore < 30)
            priority += 2;
        else if (word.masteryScore < 60)
            priority += 1;
        return Math.max(1, Math.min(10, priority));
    }
    determineMasteryLevelFromScore(score) {
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
    calculateScheduleAdjustment(metrics) {
        let decayRateMultiplier = 1.0;
        let strengthMultiplier = 1.0;
        if (metrics.successRate > 85) {
            decayRateMultiplier = 0.9;
            strengthMultiplier = 1.1;
        }
        else if (metrics.successRate < 65) {
            decayRateMultiplier = 1.1;
            strengthMultiplier = 0.9;
        }
        if (metrics.retentionRate > 80) {
            strengthMultiplier *= 1.05;
        }
        else if (metrics.retentionRate < 60) {
            strengthMultiplier *= 0.95;
        }
        return { decayRateMultiplier, strengthMultiplier };
    }
    mapRowToVocabularyWord(row) {
        return {
            id: row.id,
            userId: row.user_id,
            word: row.word,
            language: row.language,
            definition: row.definition,
            pronunciation: row.pronunciation,
            partOfSpeech: row.part_of_speech,
            difficulty: row.difficulty,
            frequency: row.frequency,
            masteryLevel: row.mastery_level,
            masteryScore: row.mastery_score,
            lastReviewedAt: row.last_reviewed_at,
            nextReviewAt: row.next_review_at,
            addedAt: row.added_at,
            firstEncounteredAt: row.first_encountered_at,
            forgettingCurveParams: {
                initialStrength: row.initial_strength,
                decayRate: row.decay_rate,
                reviewCount: row.review_count,
                lastReviewScore: row.last_review_score
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.ForgettingCurveService = ForgettingCurveService;
//# sourceMappingURL=ForgettingCurveService.js.map