import { Pool } from 'pg';
import { OpenRouterService } from './OpenRouterService';
import { UserCapabilityService } from './UserCapabilityService';
import { AsyncTaskManager } from './AsyncTaskManager';
import { CreditService } from './CreditService';
import { PracticeGroup, Language, DifficultyLevel, PracticeType, SkillArea } from '../models/PracticeGroup';
export interface PracticeGenerationRequest {
    userId: string;
    language: Language;
    difficulty?: DifficultyLevel;
    type: PracticeType;
    focusAreas?: SkillArea[];
    vocabularyWords?: string[];
    grammarPoints?: string[];
    count?: number;
}
export interface ComprehensivePracticeRequest {
    userId: string;
    language: Language;
    includeCapabilityData?: boolean;
    includeMilestones?: boolean;
    includeVocabulary?: boolean;
}
export declare class PracticeGenerationService {
    private db;
    private userCapabilityService;
    private creditService;
    private asyncTaskManager;
    private openRouterService;
    constructor(db: Pool, userCapabilityService: UserCapabilityService, creditService: CreditService, asyncTaskManager: AsyncTaskManager, openRouterService?: OpenRouterService);
    private convertLanguageLevelToDifficulty;
    generatePracticeGroup(request: PracticeGenerationRequest): Promise<PracticeGroup>;
    generatePracticeGroupAsync(request: PracticeGenerationRequest): Promise<string>;
    generateComprehensivePractice(request: ComprehensivePracticeRequest): Promise<PracticeGroup>;
    generateVocabularyPractice(userId: string, language: Language, vocabularyWords: string[]): Promise<PracticeGroup>;
    private generatePracticeContent;
    private generateComprehensivePracticeContent;
    private generateVocabularyPracticeContent;
    private buildGenerationPrompt;
    private buildComprehensivePrompt;
    private buildVocabularyPrompt;
    private parsePracticeResponse;
    private selectAIModel;
    private determineDifficulty;
    private calculateOverallScore;
    private calculateEstimatedDuration;
    private extractFocusAreas;
    private calculateCreditCost;
    private getLanguageName;
    private getPracticeTopicName;
    private gatherComprehensiveUserData;
}
//# sourceMappingURL=PracticeGenerationService.d.ts.map