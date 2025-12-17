import { Language, MasteryLevel } from '../../models/VocabularyWord';
export interface TestVocabularyWord {
    id: string;
    userId: string;
    word: string;
    language: Language;
    definition: string;
    masteryLevel: MasteryLevel;
    masteryScore: number;
    addedAt: Date;
    lastReviewedAt?: Date;
    difficulty: number;
    frequency: number;
    firstEncounteredAt: Date;
    createdAt: Date;
    updatedAt: Date;
    forgettingCurveParams: {
        initialStrength: number;
        decayRate: number;
        reviewCount: number;
        lastReviewScore: number;
    };
}
export interface CreateVocabularyWordOptions {
    userId?: string;
    word?: string;
    language?: Language;
    definition?: string;
    masteryLevel?: MasteryLevel;
    masteryScore?: number;
}
export declare class VocabularyFactory {
    static create(options?: CreateVocabularyWordOptions): TestVocabularyWord;
    static createMany(count: number, options?: CreateVocabularyWordOptions): TestVocabularyWord[];
    static createWithMasteryLevel(masteryLevel: MasteryLevel, options?: CreateVocabularyWordOptions): TestVocabularyWord;
    static createEnglishWords(count: number, options?: CreateVocabularyWordOptions): TestVocabularyWord[];
}
//# sourceMappingURL=vocabularyFactory.d.ts.map