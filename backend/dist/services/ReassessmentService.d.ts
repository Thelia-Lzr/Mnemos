import { Pool } from 'pg';
import { CapabilityAssessment, ReassessmentRequest, SkillArea, Language } from '../models/UserCapability';
import { UserCapabilityService } from './UserCapabilityService';
import { AIService } from './AIService';
export interface ReassessmentCase {
    id: string;
    userId: string;
    language: Language;
    originalAssessmentId: string;
    reason: string;
    focusAreas: SkillArea[];
    userObjections: string[];
    status: ReassessmentStatus;
    targetedQuestions: string[];
    userResponses: ReassessmentResponse[];
    newAssessmentId?: string;
    resolutionNotes?: string;
    createdAt: Date;
    resolvedAt?: Date;
}
export interface ReassessmentResponse {
    questionId: string;
    question: string;
    userAnswer: string;
    aiEvaluation: {
        score: number;
        feedback: string;
        skillAreas: SkillArea[];
    };
    submittedAt: Date;
}
export type ReassessmentStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export declare class ReassessmentService {
    private db;
    private aiService;
    private userCapabilityService;
    private aiAssessmentService;
    constructor(db: Pool, aiService: AIService, userCapabilityService: UserCapabilityService);
    initiateReassessment(request: ReassessmentRequest): Promise<ReassessmentCase | null>;
    submitReassessmentResponse(reassessmentId: string, questionId: string, userAnswer: string): Promise<ReassessmentResponse | null>;
    completeReassessment(reassessmentId: string): Promise<CapabilityAssessment | null>;
    getReassessmentCase(reassessmentId: string): Promise<ReassessmentCase | null>;
    getUserReassessmentHistory(userId: string, language: Language): Promise<ReassessmentCase[]>;
    cancelReassessment(reassessmentId: string, reason: string): Promise<boolean>;
    private evaluateUserResponse;
    private generateReassessmentResult;
    private updateCapabilityFromReassessment;
    private updateKnowledgePoints;
    private mapRowToReassessmentCase;
}
//# sourceMappingURL=ReassessmentService.d.ts.map