import { Pool } from 'pg';
export declare enum MasteryLevel {
    NEW = "new",
    LEARNING = "learning",
    SHORT_TERM = "short_term",
    LONG_TERM = "long_term",
    MASTERED = "mastered"
}
export declare enum Language {
    ENGLISH = "en",
    JAPANESE = "ja",
    FRENCH = "fr"
}
export interface ForgettingCurveParams {
    initialStrength: number;
    decayRate: number;
    reviewCount: number;
    lastReviewScore: number;
}
export interface VocabularyWord {
    id: string;
    userId: string;
    word: string;
    language: Language;
    definition?: string;
    pronunciation?: string;
    partOfSpeech?: string;
    difficulty: number;
    frequency: number;
    masteryLevel: MasteryLevel;
    masteryScore: number;
    lastReviewedAt?: Date;
    nextReviewAt?: Date;
    addedAt: Date;
    firstEncounteredAt: Date;
    forgettingCurveParams: ForgettingCurveParams;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateVocabularyWordData {
    userId: string;
    word: string;
    language: Language;
    definition?: string;
    pronunciation?: string;
    partOfSpeech?: string;
    difficulty?: number;
    frequency?: number;
}
export interface UpdateVocabularyWordData {
    definition?: string;
    pronunciation?: string;
    partOfSpeech?: string;
    difficulty?: number;
    frequency?: number;
    masteryLevel?: MasteryLevel;
    masteryScore?: number;
    lastReviewedAt?: Date;
    nextReviewAt?: Date;
    forgettingCurveParams?: Partial<ForgettingCurveParams>;
}
export interface VocabularyPracticeRecord {
    practiceId: string;
    score: number;
    timeSpent: number;
    practiceType: string;
    practiceDate: Date;
}
export interface MasteryStats {
    totalWords: number;
    newWords: number;
    learningWords: number;
    shortTermWords: number;
    longTermWords: number;
    masteredWords: number;
    averageMasteryScore: number;
    wordsNeedingReview: number;
    dailyReviewTarget: number;
}
export declare class VocabularyWordModel {
    private db;
    constructor(db: Pool);
    create(data: CreateVocabularyWordData): Promise<VocabularyWord>;
    findByUserAndLanguage(userId: string, language: Language): Promise<VocabularyWord[]>;
    findById(id: string): Promise<VocabularyWord | null>;
    findByUserWordAndLanguage(userId: string, word: string, language: Language): Promise<VocabularyWord | null>;
    update(id: string, data: UpdateVocabularyWordData): Promise<VocabularyWord | null>;
    delete(id: string): Promise<boolean>;
    findWordsNeedingReview(userId: string, language: Language, limit?: number): Promise<VocabularyWord[]>;
    getMasteryStats(userId: string, language: Language): Promise<MasteryStats>;
    bulkCreate(words: CreateVocabularyWordData[]): Promise<VocabularyWord[]>;
    private mapRowToVocabularyWord;
    private camelToSnakeCase;
}
//# sourceMappingURL=VocabularyWord.d.ts.map