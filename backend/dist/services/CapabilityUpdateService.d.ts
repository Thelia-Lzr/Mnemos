import { UserCapabilityService } from './UserCapabilityService';
import { PracticeResult, SkillArea, Language } from '../models/PracticeGroup';
export declare class CapabilityUpdateService {
    private userCapabilityService;
    constructor(userCapabilityService: UserCapabilityService);
    applyPracticeResults(practiceResult: PracticeResult): Promise<void>;
    private applyCapabilityUpdates;
    private mergeCapabilityUpdates;
    private calculateOverallLevel;
    private applyVocabularyUpdates;
    private applyMilestoneUpdates;
    private updateOverallCapability;
    analyzePerformanceTrends(userId: string, language: Language): Promise<{
        improvingAreas: SkillArea[];
        decliningAreas: SkillArea[];
        stableAreas: SkillArea[];
        recommendations: string[];
    }>;
    generateLearningInsights(userId: string, language: Language): Promise<{
        strengths: string[];
        weaknesses: string[];
        nextSteps: string[];
        estimatedTimeToNextLevel: number;
    }>;
    private identifyStrengths;
    private identifyWeaknesses;
    private generateNextSteps;
    private estimateTimeToNextLevel;
}
//# sourceMappingURL=CapabilityUpdateService.d.ts.map