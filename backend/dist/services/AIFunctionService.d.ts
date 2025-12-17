import { Pool } from 'pg';
import { FunctionCallRequest, FunctionCallResponse, ParseIntentRequest, ParseIntentResponse, AvailableFunctionsResponse } from '../types/chat';
export declare class AIFunctionService {
    private _chatMessage;
    private aiService;
    private asyncTaskManager;
    private _db;
    constructor(database: Pool, testMode?: boolean);
    parseIntent(userId: string, request: ParseIntentRequest): Promise<ParseIntentResponse>;
    executeFunction(userId: string, request: FunctionCallRequest): Promise<FunctionCallResponse>;
    executeFunctionAsync(userId: string, request: FunctionCallRequest): Promise<FunctionCallResponse>;
    getAvailableFunctions(): Promise<AvailableFunctionsResponse>;
    private createIntentRecognitionPrompt;
    private parseIntentFromAIResponse;
    private isPrivacySensitive;
    private executeFunctionInternal;
    private handleGeneratePractice;
    private handleViewPracticeHistory;
    private handleCheckProgress;
    private handleViewCapabilities;
    private handleAddVocabulary;
    private handleViewVocabulary;
    private handleCheckCredits;
    private handleViewStatistics;
    private handleViewMilestones;
}
//# sourceMappingURL=AIFunctionService.d.ts.map