import { Pool } from 'pg';
import { OpenRouterService } from './OpenRouterService';
import { CreditService } from './CreditService';
import { TaskType, Language, AIResponse } from '../types/openrouter';

export class AIService {
  private openRouterService: OpenRouterService;
  private creditService: CreditService;
  private testMode: boolean;

  constructor(database: Pool, testMode: boolean = false) {
    this.testMode = testMode;
    this.openRouterService = new OpenRouterService(testMode);
    this.creditService = new CreditService(database);
  }

  /**
   * Simple AI call for testing (bypasses credit system)
   */
  async callAI(
    model: string,
    prompt: string,
    context?: any
  ): Promise<AIResponse> {
    return this.openRouterService.callAI(model, prompt, context);
  }

  /**
   * Call AI with automatic credit consumption
   */
  async callAIWithCredits(
    userId: string,
    taskType: TaskType,
    language: Language,
    prompt: string,
    context?: any,
    relatedId?: string
  ): Promise<AIResponse> {
    // In test mode, bypass credit checks and use simple AI call
    if (this.testMode) {
      const model = this.openRouterService.selectModel(taskType, language);
      return this.openRouterService.callAI(model, prompt, context, userId);
    }

    // Select appropriate model
    const model = this.openRouterService.selectModel(taskType, language);
    
    // Map task type to service name for credit calculation
    const serviceName = this.mapTaskTypeToService(taskType);
    
    // Estimate token usage for credit check (rough estimation)
    const estimatedTokens = this.estimateTokenUsage(prompt, context);
    
    // Check if user has sufficient credits
    const creditCheck = await this.creditService.checkSufficientCredits(userId, serviceName, estimatedTokens);
    if (creditCheck.isInsufficient) {
      throw new Error(`Insufficient credits. Required: ${creditCheck.requiredAmount}, Available: ${creditCheck.currentBalance}`);
    }

    try {
      // Call AI service
      const response = await this.openRouterService.callAI(model, prompt, context, userId);
      
      // Consume credits based on actual token usage
      await this.creditService.consumeCredits(
        userId,
        serviceName,
        response.tokensUsed,
        `${taskType} - ${language}`,
        relatedId,
        response.model
      );

      return response;
    } catch (error) {
      // If AI call fails, we don't consume credits
      throw error;
    }
  }

  /**
   * Get AI service usage statistics for a user
   */
  async getAIUsageStats(userId: string, days: number = 30) {
    const creditStats = await this.creditService.getCreditUsageStats(userId, days);
    const tokenStats = this.openRouterService.getTokenUsageStats(userId, {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date()
    });

    return {
      creditUsage: creditStats,
      tokenUsage: tokenStats,
      availableModels: this.openRouterService.getAvailableModels(),
      consumptionRules: this.creditService.getConsumptionRules()
    };
  }

  /**
   * Check if user can afford a specific AI operation
   */
  async canAffordOperation(userId: string, taskType: TaskType, estimatedPromptLength: number = 1000): Promise<{
    canAfford: boolean;
    currentBalance: number;
    estimatedCost: number;
    requiredCredits?: number;
  }> {
    const serviceName = this.mapTaskTypeToService(taskType);
    const estimatedTokens = Math.ceil(estimatedPromptLength / 4); // Rough token estimation
    
    const creditCheck = await this.creditService.checkSufficientCredits(userId, serviceName, estimatedTokens);
    const estimatedCost = this.creditService.calculateCreditCost(serviceName, estimatedTokens);

    return {
      canAfford: !creditCheck.isInsufficient,
      currentBalance: creditCheck.currentBalance,
      estimatedCost,
      requiredCredits: creditCheck.requiredAmount
    };
  }

  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string) {
    return this.creditService.getUserCredits(userId);
  }

  /**
   * Initialize credits for new user
   */
  async initializeUserCredits(userId: string, initialBalance: number = 10) {
    return this.creditService.initializeUserCredits(userId, initialBalance);
  }

  /**
   * Process PK battle transactions
   */
  async processPKEntry(userId: string, battleId: string) {
    return this.creditService.processPKEntry(userId, battleId);
  }

  async processPKReward(userId: string, battleId: string) {
    return this.creditService.processPKReward(userId, battleId);
  }

  /**
   * Admin functions
   */
  async adjustUserCredits(userId: string, amount: number, description: string, adminId: string) {
    return this.creditService.adjustUserCredits(userId, amount, description, adminId);
  }

  /**
   * Map task type to service name for credit calculation
   */
  private mapTaskTypeToService(taskType: TaskType): string {
    const mapping: Record<TaskType, string> = {
      [TaskType.CONVERSATION]: 'chat_message',
      [TaskType.MATERIAL_ANALYSIS]: 'material_analysis',
      [TaskType.EXERCISE_GENERATION]: 'practice_generation',
      [TaskType.LEVEL_ASSESSMENT]: 'level_assessment',
      [TaskType.VOCABULARY_EXTRACTION]: 'vocabulary_practice',
      [TaskType.FUNCTION_CALLING]: 'function_call',
      [TaskType.INTENT_RECOGNITION]: 'function_call'
    };

    return mapping[taskType] || 'chat_message';
  }

  /**
   * Estimate token usage for credit pre-check
   */
  private estimateTokenUsage(prompt: string, context?: any): number {
    let totalLength = prompt.length;
    
    if (context?.systemPrompt) {
      totalLength += context.systemPrompt.length;
    }
    
    if (context?.history && Array.isArray(context.history)) {
      for (const msg of context.history) {
        totalLength += msg.content.length;
      }
    }
    
    // Rough estimation: 1 token �?4 characters for English, adjust for other languages
    return Math.ceil(totalLength / 4);
  }

  /**
   * Get available AI models and their costs
   */
  getAvailableModels() {
    return this.openRouterService.getAvailableModels();
  }

  /**
   * Get consumption rules
   */
  getConsumptionRules() {
    return this.creditService.getConsumptionRules();
  }

  /**
   * Update model configuration (admin only)
   */
  updateModelConfig(model: string, config: any) {
    return this.openRouterService.updateModelConfig(model, config);
  }

  /**
   * Update consumption rule (admin only)
   */
  updateConsumptionRule(service: string, rule: any) {
    return this.creditService.updateConsumptionRule(service, rule);
  }
}

// Export singleton instance factory
export const createAIService = (database: Pool, testMode: boolean = false) => new AIService(database, testMode);
