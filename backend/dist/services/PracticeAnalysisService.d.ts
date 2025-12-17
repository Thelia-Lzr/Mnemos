import { Pool } from 'pg';
import { OpenRouterService } from './OpenRouterService';
import { CreditService } from './CreditService';
import { PracticeResult, Question, Language } from '../models/PracticeGroup';
export interface PracticeAnalysisResult {
    id: string;
    practiceResultId: string;
    userId: string;
    analysisContent: string;
    learningAdvice: string;
    strengthsIdentified: string[];
    weaknessesIdentified: string[];
    improvementSuggestions: string[];
    confidenceScore: number;
    aiModel: string;
    tokensUsed?: number;
    createdAt: Date;
}
export interface AnalysisRequest {
    practiceResult: PracticeResult;
    questions: Question[];
    userAnswers: Record<string, string>;
    language: Language;
}
export declare class PracticeAnalysisService {
    private db;
    private openRouterService;
    private creditService;
    constructor(db: Pool, openRouterService: OpenRouterService, creditService: CreditService);
    generatePracticeAnalysis(request: AnalysisRequest): Promise<PracticeAnalysisResult>;
    getAnalysisForPracticeResult(practiceResultId: string): Promise<PracticeAnalysisResult | null>;
    getUserAnalysisHistory(userId: string, limit?: number): Promise<PracticeAnalysisResult[]>;
    private buildAnalysisPrompt;
    private parseAnalysisResponse;
    private saveAnalysisResult;
    private updateUserCapabilityFromAnalysis;
    private mapRowToAnalysisResult;
}
//# sourceMappingURL=PracticeAnalysisService.d.ts.map