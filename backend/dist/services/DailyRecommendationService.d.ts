import { Pool } from 'pg';
import { AIService } from './AIService';
import { UserCapabilityService } from './UserCapabilityService';
import { VocabularyService } from './VocabularyService';
import { AsyncTaskManager } from './AsyncTaskManager';
import { Language } from '../types/openrouter';
import { UserCapability, Milestone, SkillArea } from '../models/UserCapability';
import { VocabularyWord } from '../models/VocabularyWord';
export interface DailyLearningRecommendation {
    id: string;
    userId: string;
    language: Language;
    date: string;
    recommendations: LearningRecommendation[];
    quickPracticeOptions: QuickPracticeOption[];
    basedOnCapability?: UserCapability;
    basedOnMilestones?: Milestone[];
    basedOnVocabulary?: VocabularyWord[];
    userFeedback?: RecommendationFeedback;
    isViewed: boolean;
    viewedAt?: Date;
    aiModel: string;
    generationTime: number;
    tokensUsed: number;
    createdAt: Date;
}
export interface LearningRecommendation {
    id: string;
    type: RecommendationType;
    title: string;
    description: string;
    priority: number;
    focusAreas: SkillArea[];
    suggestedActivities: string[];
    estimatedTime: number;
    relatedVocabulary?: string[];
    relatedGrammar?: string[];
    relatedMilestone?: string;
}
export interface QuickPracticeOption {
    id: string;
    title: string;
    description: string;
    type: PracticeType;
    estimatedQuestions: number;
    estimatedTime: number;
    focusAreas: SkillArea[];
    difficultyLevel: DifficultyLevel;
    includeVocabulary: string[];
    canGenerateImmediately: boolean;
}
export interface RecommendationFeedback {
    rating: number;
    isHelpful: boolean;
    followedRecommendations: string[];
    comments?: string;
    submittedAt: Date;
}
export declare enum RecommendationType {
    VOCABULARY_FOCUS = "vocabulary_focus",
    GRAMMAR_PRACTICE = "grammar_practice",
    SKILL_IMPROVEMENT = "skill_improvement",
    MILESTONE_PROGRESS = "milestone_progress",
    REVIEW_REMINDER = "review_reminder",
    WEAKNESS_TARGETING = "weakness_targeting"
}
export declare enum PracticeType {
    GENERAL = "general",
    VOCABULARY = "vocabulary",
    GRAMMAR = "grammar",
    MATERIAL_BASED = "material_based",
    REVIEW = "review",
    COMPREHENSIVE = "comprehensive"
}
export declare enum DifficultyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
}
export declare class DailyRecommendationService {
    private db;
    private aiService;
    private userCapabilityService;
    private vocabularyService;
    private asyncTaskManager;
    constructor(db: Pool, aiService: AIService, userCapabilityService: UserCapabilityService, vocabularyService: VocabularyService, asyncTaskManager: AsyncTaskManager);
    generateDailyRecommendation(userId: string, language: Language): Promise<DailyLearningRecommendation>;
    generateDailyRecommendationAsync(userId: string, language: Language): Promise<string>;
    generateQuickPracticeAsync(userId: string, language: Language, practiceOptionId: string): Promise<string>;
    getTodaysRecommendation(userId: string, language: Language, date?: string): Promise<DailyLearningRecommendation | null>;
    markRecommendationAsViewed(userId: string, language: Language, date?: string): Promise<boolean>;
    submitRecommendationFeedback(userId: string, language: Language, feedback: Omit<RecommendationFeedback, 'submittedAt'>, date?: string): Promise<boolean>;
    getRecommendationHistory(userId: string, language: Language, limit?: number): Promise<DailyLearningRecommendation[]>;
    private gatherUserData;
    private generateAIRecommendations;
    private buildRecommendationPrompt;
    private generateQuickPracticeOptions;
    private parseRecommendationResponse;
    private generateFallbackRecommendations;
    private buildQuickPracticePrompt;
    private determineDifficultyLevel;
    private selectAIModel;
    private getLanguageName;
    private saveRecommendation;
    private mapRowToRecommendation;
    private parseJsonField;
}
//# sourceMappingURL=DailyRecommendationService.d.ts.map