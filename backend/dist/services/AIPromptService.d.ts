import { TaskType, Language } from '../types/openrouter';
export interface PromptTemplate {
    id: string;
    taskType: TaskType;
    language?: Language;
    systemPrompt: string;
    userPromptTemplate: string;
    parameters: string[];
    description: string;
}
export interface PromptContext {
    userId?: string;
    language: Language;
    userLevel?: string;
    userCapabilities?: any;
    vocabulary?: string[];
    milestones?: any[];
    practiceHistory?: any[];
    [key: string]: any;
}
export declare class AIPromptService {
    private promptTemplates;
    constructor();
    private initializePromptTemplates;
    getPromptTemplate(taskType: TaskType, language?: Language): PromptTemplate | null;
    generatePrompt(taskType: TaskType, context: PromptContext, additionalParams?: Record<string, any>): {
        systemPrompt: string;
        userPrompt: string;
    } | null;
    generateDailyRecommendationPrompt(context: PromptContext): {
        systemPrompt: string;
        userPrompt: string;
    } | null;
    generatePracticePrompt(context: PromptContext, practiceType: string, topic?: string, focusVocabulary?: string[], focusGrammar?: string[]): {
        systemPrompt: string;
        userPrompt: string;
    } | null;
    generateMaterialAnalysisPrompt(context: PromptContext, content: string): {
        systemPrompt: string;
        userPrompt: string;
    } | null;
    generateIntentRecognitionPrompt(userMessage: string, language: Language, conversationContext?: string): {
        systemPrompt: string;
        userPrompt: string;
    } | null;
    generateCapabilityAssessmentPrompt(context: PromptContext, assessmentData: {
        chatAnalysis?: string;
        practicePerformance?: string;
        vocabularyMastery?: string;
        selfReportedLevel?: string;
        studyTime?: number;
    }): {
        systemPrompt: string;
        userPrompt: string;
    } | null;
    getAllTemplates(): PromptTemplate[];
    setPromptTemplate(template: PromptTemplate): void;
    removePromptTemplate(templateId: string): boolean;
}
export declare const aiPromptService: AIPromptService;
//# sourceMappingURL=AIPromptService.d.ts.map