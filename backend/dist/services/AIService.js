"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAIService = exports.AIService = void 0;
const OpenRouterService_1 = require("./OpenRouterService");
const CreditService_1 = require("./CreditService");
const openrouter_1 = require("../types/openrouter");
class AIService {
    constructor(database, testMode = false) {
        this.testMode = testMode;
        this.openRouterService = new OpenRouterService_1.OpenRouterService(testMode);
        this.creditService = new CreditService_1.CreditService(database);
    }
    async callAI(model, prompt, context) {
        return this.openRouterService.callAI(model, prompt, context);
    }
    async callAIWithCredits(userId, taskType, language, prompt, context, relatedId) {
        if (this.testMode) {
            const model = this.openRouterService.selectModel(taskType, language);
            return this.openRouterService.callAI(model, prompt, context, userId);
        }
        const model = this.openRouterService.selectModel(taskType, language);
        const serviceName = this.mapTaskTypeToService(taskType);
        const estimatedTokens = this.estimateTokenUsage(prompt, context);
        const creditCheck = await this.creditService.checkSufficientCredits(userId, serviceName, estimatedTokens);
        if (creditCheck.isInsufficient) {
            throw new Error(`Insufficient credits. Required: ${creditCheck.requiredAmount}, Available: ${creditCheck.currentBalance}`);
        }
        try {
            const response = await this.openRouterService.callAI(model, prompt, context, userId);
            await this.creditService.consumeCredits(userId, serviceName, response.tokensUsed, `${taskType} - ${language}`, relatedId, response.model);
            return response;
        }
        catch (error) {
            throw error;
        }
    }
    async getAIUsageStats(userId, days = 30) {
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
    async canAffordOperation(userId, taskType, estimatedPromptLength = 1000) {
        const serviceName = this.mapTaskTypeToService(taskType);
        const estimatedTokens = Math.ceil(estimatedPromptLength / 4);
        const creditCheck = await this.creditService.checkSufficientCredits(userId, serviceName, estimatedTokens);
        const estimatedCost = this.creditService.calculateCreditCost(serviceName, estimatedTokens);
        return {
            canAfford: !creditCheck.isInsufficient,
            currentBalance: creditCheck.currentBalance,
            estimatedCost,
            requiredCredits: creditCheck.requiredAmount
        };
    }
    async getUserCredits(userId) {
        return this.creditService.getUserCredits(userId);
    }
    async initializeUserCredits(userId, initialBalance = 10) {
        return this.creditService.initializeUserCredits(userId, initialBalance);
    }
    async processPKEntry(userId, battleId) {
        return this.creditService.processPKEntry(userId, battleId);
    }
    async processPKReward(userId, battleId) {
        return this.creditService.processPKReward(userId, battleId);
    }
    async adjustUserCredits(userId, amount, description, adminId) {
        return this.creditService.adjustUserCredits(userId, amount, description, adminId);
    }
    mapTaskTypeToService(taskType) {
        const mapping = {
            [openrouter_1.TaskType.CONVERSATION]: 'chat_message',
            [openrouter_1.TaskType.MATERIAL_ANALYSIS]: 'material_analysis',
            [openrouter_1.TaskType.EXERCISE_GENERATION]: 'practice_generation',
            [openrouter_1.TaskType.LEVEL_ASSESSMENT]: 'level_assessment',
            [openrouter_1.TaskType.VOCABULARY_EXTRACTION]: 'vocabulary_practice',
            [openrouter_1.TaskType.FUNCTION_CALLING]: 'function_call',
            [openrouter_1.TaskType.INTENT_RECOGNITION]: 'function_call'
        };
        return mapping[taskType] || 'chat_message';
    }
    estimateTokenUsage(prompt, context) {
        let totalLength = prompt.length;
        if (context?.systemPrompt) {
            totalLength += context.systemPrompt.length;
        }
        if (context?.history && Array.isArray(context.history)) {
            for (const msg of context.history) {
                totalLength += msg.content.length;
            }
        }
        return Math.ceil(totalLength / 4);
    }
    getAvailableModels() {
        return this.openRouterService.getAvailableModels();
    }
    getConsumptionRules() {
        return this.creditService.getConsumptionRules();
    }
    updateModelConfig(model, config) {
        return this.openRouterService.updateModelConfig(model, config);
    }
    updateConsumptionRule(service, rule) {
        return this.creditService.updateConsumptionRule(service, rule);
    }
}
exports.AIService = AIService;
const createAIService = (database, testMode = false) => new AIService(database, testMode);
exports.createAIService = createAIService;
//# sourceMappingURL=AIService.js.map