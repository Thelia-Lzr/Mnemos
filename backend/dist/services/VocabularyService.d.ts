import { Pool } from 'pg';
import { VocabularyWord, MasteryLevel, Language, MasteryStats, ForgettingCurveParams } from '../models/VocabularyWord';
import { ReviewSchedule } from './ForgettingCurveService';
export interface WordExtractionResult {
    words: string[];
    extractedCount: number;
    duplicateCount: number;
    newWordsAdded: VocabularyWord[];
}
export interface MasteryUpdateResult {
    word: VocabularyWord;
    previousLevel: MasteryLevel;
    newLevel: MasteryLevel;
    scoreChange: number;
    shouldRemove: boolean;
}
export interface ForgettingCurveCalculation {
    nextReviewAt: Date;
    masteryScore: number;
    forgettingCurveParams: ForgettingCurveParams;
}
export declare class VocabularyService {
    private db;
    private vocabularyModel;
    private userCapabilityService;
    private forgettingCurveService;
    constructor(db: Pool);
    extractAndAddWordsFromText(userId: string, text: string, language: Language): Promise<WordExtractionResult>;
    getUserVocabulary(userId: string, language: Language, masteryLevel?: MasteryLevel): Promise<VocabularyWord[]>;
    updateMasteryFromPractice(userId: string, wordId: string, practiceScore: number, responseTime: number): Promise<MasteryUpdateResult>;
    applyDailyDecay(userId: string, language: Language): Promise<void>;
    getWordsNeedingReview(userId: string, language: Language, limit?: number): Promise<VocabularyWord[]>;
    getMasteryStats(userId: string, language: Language): Promise<MasteryStats>;
    removeWord(userId: string, wordId: string): Promise<boolean>;
    private calculateForgettingCurve;
    private calculateMasteryScoreChange;
    private determineMasteryLevel;
    private calculateDecayAmount;
    private shouldAutoRemoveWord;
    private extractWordsFromText;
    private estimateWordDifficulty;
    private estimateWordFrequency;
    getScheduledReviews(userId: string, language: Language, limit?: number): Promise<ReviewSchedule[]>;
    generateReviewReminders(userId: string): Promise<import("./ForgettingCurveService").ReviewReminder[]>;
    getForgettingCurveMetrics(userId: string, language: Language): Promise<import("./ForgettingCurveService").ForgettingCurveMetrics>;
    optimizeReviewSchedule(userId: string, language: Language): Promise<void>;
    private updateUserVocabularyStats;
}
//# sourceMappingURL=VocabularyService.d.ts.map