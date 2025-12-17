import { Pool } from 'pg';
import { UserCapability, LearningProgress, Milestone, CreateUserCapabilityRequest, UpdateUserCapabilityRequest, CapabilityAssessment, AssessmentRequest, ReassessmentRequest, SkillArea, Language, LearningStyle } from '../models/UserCapability';
import { AIService } from './AIService';
export declare class UserCapabilityService {
    private db;
    private aiService;
    private aiAssessmentService;
    constructor(db: Pool, aiService: AIService);
    createUserCapability(userId: string, data: CreateUserCapabilityRequest): Promise<UserCapability | null>;
    getUserCapability(userId: string, language: Language): Promise<UserCapability | null>;
    getAllUserCapabilities(userId: string): Promise<UserCapability[]>;
    updateUserCapability(userId: string, language: Language, updates: UpdateUserCapabilityRequest): Promise<boolean>;
    getLearningProgress(userId: string, language: Language): Promise<LearningProgress | null>;
    updateLearningProgress(userId: string, language: Language, studyTimeMinutes: number): Promise<boolean>;
    getUserMilestones(userId: string, language: Language): Promise<Milestone[]>;
    createMilestone(userId: string, language: Language, milestone: Omit<Milestone, 'id' | 'userId' | 'language' | 'createdAt' | 'updatedAt'>): Promise<Milestone | null>;
    completeMilestone(milestoneId: string): Promise<boolean>;
    private mapRowToUserCapability;
    private parseJsonField;
    private mapRowToLearningProgress;
    performComprehensiveAssessment(request: AssessmentRequest): Promise<CapabilityAssessment | null>;
    getAssessmentHistory(userId: string, language: Language, limit?: number): Promise<CapabilityAssessment[]>;
    requestReassessment(request: ReassessmentRequest): Promise<any>;
    analyzeCapabilityTrends(userId: string, language: Language, days?: number): Promise<any>;
    updateLearningCharacteristics(userId: string, language: Language, characteristics: {
        learningStyle?: LearningStyle;
        strengths?: SkillArea[];
        weaknesses?: SkillArea[];
    }): Promise<boolean>;
    private gatherAssessmentData;
    private getChatAnalysisData;
    private getPracticePerformanceData;
    private getVocabularyTrackingData;
    private getAllAssessmentData;
    private generateAIAssessment;
    private generateFallbackAssessment;
    private updateCapabilityFromAssessment;
    private scoreToLevel;
    private mapRowToAssessment;
    private mapRowToMilestone;
}
//# sourceMappingURL=UserCapabilityService.d.ts.map