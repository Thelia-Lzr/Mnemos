import { Pool } from 'pg';
import { VocabularyWord } from '../models/VocabularyWord';
export interface ReviewSchedule {
    wordId: string;
    nextReviewAt: Date;
    priority: number;
    estimatedDifficulty: number;
}
export interface ForgettingCurveMetrics {
    retentionRate: number;
    averageInterval: number;
    successRate: number;
    totalReviews: number;
}
export interface ReviewReminder {
    userId: string;
    language: string;
    wordsCount: number;
    urgentWordsCount: number;
    scheduledFor: Date;
}
export declare class ForgettingCurveService {
    private db;
    constructor(db: Pool);
    calculateNextReview(word: VocabularyWord, practiceScore: number, responseTime: number): ReviewSchedule;
    applyForgettingCurveDecay(words: VocabularyWord[]): Promise<VocabularyWord[]>;
    getScheduledReviews(userId: string, language: string, limit?: number): Promise<ReviewSchedule[]>;
    generateReviewReminders(userId: string): Promise<ReviewReminder[]>;
    getForgettingCurveMetrics(userId: string, language: string): Promise<ForgettingCurveMetrics>;
    optimizeReviewSchedule(userId: string, language: string): Promise<void>;
    private calculatePerformanceFactor;
    private calculateDecayedScore;
    private calculateReviewPriority;
    private applyIntervalBounds;
    private estimateReviewDifficulty;
    private getDaysSinceLastReview;
    private getPreviousInterval;
    private calculateCurrentPriority;
    private determineMasteryLevelFromScore;
    private calculateScheduleAdjustment;
    private mapRowToVocabularyWord;
}
//# sourceMappingURL=ForgettingCurveService.d.ts.map