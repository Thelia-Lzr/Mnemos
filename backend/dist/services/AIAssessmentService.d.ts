import { UserCapability, AssessmentRequest, SkillArea, VocabularyCapability, GrammarCapability, ComprehensionCapability, LearningStyle } from '../models/UserCapability';
import { AIService } from './AIService';
export interface AIAssessmentResult {
    overallScore: number;
    skillScores: Record<SkillArea, number>;
    confidenceLevel: number;
    improvementAreas: SkillArea[];
    regressionAreas: SkillArea[];
    recommendations: string[];
    nextSteps: string[];
    vocabularyCapability: VocabularyCapability;
    grammarCapability: GrammarCapability;
    comprehensionCapability: ComprehensionCapability;
    suggestedLearningStyle: LearningStyle;
}
export interface AssessmentData {
    chatHistory?: any[];
    practiceResults?: any[];
    vocabularyData?: any[];
    userSelfReport?: any;
    allData?: any;
}
export declare class AIAssessmentService {
    private aiService;
    constructor(aiService: AIService);
    performComprehensiveAssessment(data: AssessmentData, currentCapability: UserCapability, request: AssessmentRequest): Promise<AIAssessmentResult>;
    private assessFromChatAnalysis;
    private assessFromPracticePerformance;
    private assessFromVocabularyTracking;
    private assessFromAllData;
    private assessFromSelfReport;
    generateTargetedReassessment(focusAreas: SkillArea[], currentCapability: UserCapability, reason: string): Promise<string[]>;
    private parseAIResponse;
    private validateScore;
    private validateSkillScores;
    private validateSkillAreas;
    private validateVocabularyCapability;
    private validateGrammarCapability;
    private validateComprehensionCapability;
    private validateLearningStyle;
    private generateFallbackAssessment;
    private generateFallbackQuestions;
}
//# sourceMappingURL=AIAssessmentService.d.ts.map