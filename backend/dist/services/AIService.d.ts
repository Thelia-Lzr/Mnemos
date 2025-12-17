import { Pool } from 'pg';
import { TaskType, Language, AIResponse } from '../types/openrouter';
export declare class AIService {
    private openRouterService;
    private creditService;
    private testMode;
    constructor(database: Pool, testMode?: boolean);
    callAI(model: string, prompt: string, context?: any): Promise<AIResponse>;
    callAIWithCredits(userId: string, taskType: TaskType, language: Language, prompt: string, context?: any, relatedId?: string): Promise<AIResponse>;
    getAIUsageStats(userId: string, days?: number): Promise<{
        creditUsage: import("../types/credit").CreditUsageStats;
        tokenUsage: {
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
        availableModels: import("../types/openrouter").ModelConfig[];
        consumptionRules: import("../types/credit").CreditConsumptionRule[];
    }>;
    canAffordOperation(userId: string, taskType: TaskType, estimatedPromptLength?: number): Promise<{
        canAfford: boolean;
        currentBalance: number;
        estimatedCost: number;
        requiredCredits?: number;
    }>;
    getUserCredits(userId: string): Promise<import("../types/credit").UserCredit | null>;
    initializeUserCredits(userId: string, initialBalance?: number): Promise<import("../types/credit").UserCredit>;
    processPKEntry(userId: string, battleId: string): Promise<import("../types/credit").CreditTransaction>;
    processPKReward(userId: string, battleId: string): Promise<import("../types/credit").CreditTransaction>;
    adjustUserCredits(userId: string, amount: number, description: string, adminId: string): Promise<import("../types/credit").CreditTransaction>;
    private mapTaskTypeToService;
    private estimateTokenUsage;
    getAvailableModels(): import("../types/openrouter").ModelConfig[];
    getConsumptionRules(): import("../types/credit").CreditConsumptionRule[];
    updateModelConfig(model: string, config: any): void;
    updateConsumptionRule(service: string, rule: any): void;
}
export declare const createAIService: (database: Pool, testMode?: boolean) => AIService;
//# sourceMappingURL=AIService.d.ts.map