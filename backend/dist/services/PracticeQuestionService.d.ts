import { Pool } from 'pg';
import { OpenRouterService } from './OpenRouterService';
import { CreditService } from './CreditService';
export interface QuestionFollowUpRequest {
    userId: string;
    questionId: string;
    questionContent: string;
    correctAnswer: string;
    userAnswer: string;
    explanation: string;
    followUpQuestion: string;
    language: string;
    options?: string[];
    userAnswerText?: string;
    correctAnswerText?: string;
    vocabularyWords?: string[];
    grammarPoints?: string[];
}
export interface PracticeGroupFollowUpRequest {
    userId: string;
    practiceGroupId: string;
    practiceGroupTitle: string;
    practiceGroupDescription: string;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    followUpQuestion: string;
    language: string;
    wrongAnswers?: Array<{
        questionId: string;
        questionContent: string;
        userChoice: string;
        userChoiceText: string;
        correctChoice: string;
        correctChoiceText: string;
        options: string[];
        explanation?: string;
        vocabularyWords?: string[];
        grammarPoints?: string[];
    }>;
    existingAnalysis?: string;
}
export interface FollowUpResponse {
    answer: string;
    relatedConcepts?: string[];
    additionalTips?: string[];
    creditCost: number;
}
export interface StreamingFollowUpResponse {
    stream: any;
    creditCost: number;
}
export declare class PracticeQuestionService {
    private db;
    private openRouterService;
    private creditService;
    constructor(db: Pool, openRouterService: OpenRouterService, creditService: CreditService);
    askQuestionFollowUp(request: QuestionFollowUpRequest): Promise<FollowUpResponse>;
    askQuestionFollowUpStream(request: QuestionFollowUpRequest): Promise<StreamingFollowUpResponse>;
    askPracticeGroupFollowUp(request: PracticeGroupFollowUpRequest): Promise<FollowUpResponse>;
    askPracticeGroupFollowUpStream(request: PracticeGroupFollowUpRequest): Promise<StreamingFollowUpResponse>;
    private generateQuestionFollowUpPrompt;
    private generatePracticeGroupFollowUpPrompt;
    private parseAIResponse;
    private extractSections;
    private getLanguageName;
}
//# sourceMappingURL=PracticeQuestionService.d.ts.map