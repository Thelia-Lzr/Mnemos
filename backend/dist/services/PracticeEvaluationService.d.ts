import { UserCapabilityService } from './UserCapabilityService';
import { PracticeGroup, PracticeResult } from '../models/PracticeGroup';
export interface SubmittedAnswer {
    questionId: string;
    userAnswer: string;
    timeSpent?: number;
    attempts?: number;
}
export declare class PracticeEvaluationService {
    private userCapabilityService;
    constructor(userCapabilityService: UserCapabilityService);
    evaluatePracticeGroup(userId: string, practiceGroup: PracticeGroup, submittedAnswers: SubmittedAnswer[], totalTime: number): Promise<Omit<PracticeResult, 'id' | 'completedAt'>>;
    updateUserCapabilities(userId: string, practiceResultId: string): Promise<void>;
    private evaluateAnswers;
    private analyzePerformance;
    private identifySkillAreas;
    private generateRecommendations;
    private generateCapabilityUpdates;
    private generateAICapabilityAnalysis;
    private calculateSkillPerformance;
    private getCurrentSkillScore;
    private generateVocabularyUpdates;
    private generateMilestoneProgress;
}
//# sourceMappingURL=PracticeEvaluationService.d.ts.map