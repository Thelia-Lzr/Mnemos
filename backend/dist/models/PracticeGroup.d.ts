import { Pool } from 'pg';
export interface PracticeGroup {
    id: string;
    userId: string;
    title: string;
    description: string;
    language: Language;
    difficulty: DifficultyLevel;
    type: PracticeType;
    questions: Question[];
    createdAt: Date;
    estimatedDuration: number;
    focusAreas: string[];
}
export interface Question {
    id: string;
    practiceGroupId: string;
    type: QuestionType;
    content: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    vocabularyWords: string[];
    grammarPoints: string[];
    difficulty: number;
    orderIndex: number;
}
export interface PracticeResult {
    id: string;
    userId: string;
    practiceGroupId: string;
    answers: QuestionAnswer[];
    wrongAnswersSummary?: WrongAnswerSummary[];
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    totalTime: number;
    averageTimePerQuestion: number;
    weakAreas: string[];
    improvedAreas: string[];
    recommendedFocus: string[];
    capabilityUpdates: CapabilityUpdate[];
    vocabularyUpdates: VocabularyUpdate[];
    milestoneProgress: MilestoneProgressUpdate[];
    completedAt: Date;
}
export interface QuestionAnswer {
    questionId: string;
    userAnswer: string;
    userAnswerText?: string;
    userAnswerLetter?: string;
    correctAnswer?: string;
    correctAnswerText?: string;
    isCorrect: boolean;
    timeSpent: number;
    attempts: number;
    questionContent?: string;
    options?: string[];
    explanation?: string;
    vocabularyWords?: string[];
    grammarPoints?: string[];
}
export interface WrongAnswerSummary {
    questionId: string;
    userChoice: string;
    userChoiceText: string;
    correctChoice: string;
    correctChoiceText: string;
    questionContent: string;
}
export interface CapabilityUpdate {
    skillArea: SkillArea;
    previousScore: number;
    newScore: number;
    changeReason: string;
    confidence: number;
}
export interface VocabularyUpdate {
    wordId: string;
    word: string;
    previousMasteryLevel: MasteryLevel;
    newMasteryLevel: MasteryLevel;
    masteryScoreChange: number;
}
export interface MilestoneProgressUpdate {
    milestoneId: string;
    taskId?: string;
    progressChange: number;
    isCompleted: boolean;
}
export declare enum Language {
    ENGLISH = "en",
    JAPANESE = "ja",
    FRENCH = "fr"
}
export declare enum DifficultyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
}
export declare enum PracticeType {
    GENERAL = "general",
    VOCABULARY = "vocabulary",
    GRAMMAR = "grammar",
    MATERIAL_BASED = "material_based",
    REVIEW = "review",
    COMPREHENSIVE = "comprehensive"
}
export declare enum QuestionType {
    MULTIPLE_CHOICE = "multiple_choice",
    FILL_BLANK = "fill_blank",
    TRANSLATION = "translation",
    VOCABULARY = "vocabulary"
}
export declare enum SkillArea {
    VOCABULARY = "vocabulary",
    GRAMMAR = "grammar",
    LISTENING = "listening",
    SPEAKING = "speaking",
    READING = "reading",
    WRITING = "writing",
    PRONUNCIATION = "pronunciation",
    FLUENCY = "fluency"
}
export declare enum MasteryLevel {
    NEW = "new",
    LEARNING = "learning",
    SHORT_TERM = "short_term",
    LONG_TERM = "long_term",
    MASTERED = "mastered"
}
export declare class PracticeGroupModel {
    private db;
    constructor(db: Pool);
    create(practiceGroup: Omit<PracticeGroup, 'id' | 'createdAt'>): Promise<PracticeGroup>;
    findById(id: string): Promise<PracticeGroup | null>;
    findByUserId(userId: string, limit?: number, offset?: number): Promise<PracticeGroup[]>;
    createResult(result: Omit<PracticeResult, 'id' | 'completedAt'>): Promise<PracticeResult>;
    delete(id: string): Promise<void>;
    deletePracticeResults(practiceGroupIds: string[], userId: string): Promise<number>;
}
//# sourceMappingURL=PracticeGroup.d.ts.map