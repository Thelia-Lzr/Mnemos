import { Pool } from 'pg';
import { VocabularyWord, Language, MasteryLevel } from '../models/VocabularyWord';
export interface VocabularyPracticeOptions {
    userId: string;
    language: Language;
    wordIds?: string[];
    masteryLevels?: MasteryLevel[];
    maxWords?: number;
    focusOnWeakWords?: boolean;
    includeReviewWords?: boolean;
}
export interface VocabularyPracticeGroup {
    id: string;
    title: string;
    description: string;
    words: VocabularyWord[];
    questions: VocabularyQuestion[];
    estimatedDuration: number;
    focusAreas: string[];
}
export interface VocabularyQuestion {
    id: string;
    type: VocabularyQuestionType;
    targetWord: VocabularyWord;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: number;
}
export declare enum VocabularyQuestionType {
    DEFINITION_TO_WORD = "definition_to_word",
    WORD_TO_DEFINITION = "word_to_definition",
    FILL_IN_BLANK = "fill_in_blank",
    SYNONYM_ANTONYM = "synonym_antonym",
    USAGE_IN_CONTEXT = "usage_in_context"
}
export interface PracticeResult {
    wordId: string;
    questionType: VocabularyQuestionType;
    isCorrect: boolean;
    responseTime: number;
    score: number;
}
export interface LearningEfficiencyMetrics {
    wordsLearned: number;
    averageLearningTime: number;
    retentionRate: number;
    masteryProgression: number;
    weaknessAreas: string[];
}
export declare class VocabularyPracticeService {
    private db;
    private vocabularyService;
    private practiceGenerationService;
    constructor(db: Pool);
    generateVocabularyPracticeGroup(options: VocabularyPracticeOptions): Promise<VocabularyPracticeGroup>;
    processPracticeResults(userId: string, results: PracticeResult[]): Promise<void>;
    getWordsForReview(userId: string, language: Language, limit?: number): Promise<VocabularyWord[]>;
    getLearningEfficiencyMetrics(userId: string, language: Language, days?: number): Promise<LearningEfficiencyMetrics>;
    generateAdaptivePractice(userId: string, language: Language): Promise<VocabularyPracticeGroup>;
    private selectWordsForPractice;
    private generateQuestionsForWords;
    private selectQuestionType;
    private generateQuestion;
    private generateWordToDefinitionQuestion;
    private generateDefinitionToWordQuestion;
    private generateFillInBlankQuestion;
    private generateUsageInContextQuestion;
    private calculatePracticeScore;
    private generateDefinitionDistractors;
    private generateWordDistractors;
    private generateSentenceWithWord;
    private generateIncorrectSentences;
    private shuffleArray;
    private generateId;
    private determineFocusAreas;
    private calculateMasteryProgression;
    private identifyWeaknessAreas;
    private selectAdaptiveWords;
    private generateAdaptiveQuestions;
    private updateLearningEfficiencyMetrics;
    private getWordsByIds;
    private mapRowToVocabularyWord;
}
//# sourceMappingURL=VocabularyPracticeService.d.ts.map