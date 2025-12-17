import { TaskType, Language, AIResponse, ModelConfig } from '../types/openrouter';
export declare class OpenRouterService {
    private client;
    private apiKey;
    private baseUrl;
    private modelConfigs;
    private tokenUsageRecords;
    private testMode;
    constructor(testMode?: boolean);
    private initializeModelConfigs;
    private setupRetryInterceptor;
    private shouldRetry;
    selectModel(taskType: TaskType, language: Language): string;
    callAIStream(model: string, prompt: string, context?: any, userId?: string): Promise<any>;
    private generateMockStream;
    callAI(model: string, prompt: string, context?: any, userId?: string): Promise<AIResponse>;
    private generateMockResponse;
    private buildMessages;
    calculateCreditCost(model: string, tokens: number): number;
    private recordTokenUsage;
    getTokenUsageStats(userId: string, timeRange?: {
        start: Date;
        end: Date;
    }): {
        totalTokens: number;
        totalCredits: number;
        usageByModel: Record<string, {
            tokens: number;
            credits: number;
        }>;
        usageByTaskType: Record<TaskType, {
            tokens: number;
            credits: number;
        }>;
    };
    getAvailableModels(): ModelConfig[];
    updateModelConfig(model: string, config: Partial<ModelConfig>): void;
}
export declare const createOpenRouterService: (testMode?: boolean) => OpenRouterService;
export declare const openRouterService: OpenRouterService | null;
//# sourceMappingURL=OpenRouterService.d.ts.map