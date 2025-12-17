"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openRouterService = exports.createOpenRouterService = exports.OpenRouterService = void 0;
const axios_1 = __importStar(require("axios"));
const openrouter_1 = require("../types/openrouter");
class OpenRouterService {
    constructor(testMode = false) {
        this.modelConfigs = new Map();
        this.tokenUsageRecords = [];
        this.testMode = testMode;
        this.apiKey = process.env.OPENROUTER_API_KEY || (testMode ? 'test-key' : '');
        this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
        if (!this.apiKey && !testMode) {
            throw new Error('OPENROUTER_API_KEY environment variable is required');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
                'X-Title': 'AI Language Learning App'
            },
            timeout: 30000
        });
        this.initializeModelConfigs();
        this.setupRetryInterceptor();
    }
    initializeModelConfigs() {
        const defaultModel = process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
        this.modelConfigs = new Map([
            [defaultModel, {
                    name: defaultModel,
                    maxTokens: 8192,
                    temperature: 0.7,
                    costPerToken: 0.005
                }],
            ['openai/gpt-4o', {
                    name: 'openai/gpt-4o',
                    maxTokens: 8192,
                    temperature: 0.7,
                    costPerToken: 0.005
                }],
            ['openai/gpt-4o', {
                    name: 'openai/gpt-4o',
                    maxTokens: 8192,
                    temperature: 0.7,
                    costPerToken: 0.005
                }],
            ['mistralai/mistral-7b-instruct', {
                    name: 'mistralai/mistral-7b-instruct',
                    maxTokens: 4096,
                    temperature: 0.7,
                    costPerToken: 0.001
                }],
            ['microsoft/wizardlm-2-8x22b', {
                    name: 'microsoft/wizardlm-2-8x22b',
                    maxTokens: 4096,
                    temperature: 0.7,
                    costPerToken: 0.002
                }],
            ['meta-llama/llama-3.1-8b-instruct', {
                    name: 'meta-llama/llama-3.1-8b-instruct',
                    maxTokens: 4096,
                    temperature: 0.7,
                    costPerToken: 0.001
                }],
            ['openai/gpt-3.5-turbo', {
                    name: 'openai/gpt-3.5-turbo',
                    maxTokens: 2048,
                    temperature: 0.7,
                    costPerToken: 0.001
                }],
            ['openai/gpt-4', {
                    name: 'openai/gpt-4',
                    maxTokens: 2048,
                    temperature: 0.7,
                    costPerToken: 0.005
                }],
            ['anthropic/claude-3-haiku', {
                    name: 'anthropic/claude-3-haiku',
                    maxTokens: 4096,
                    temperature: 0.3,
                    costPerToken: 0.002
                }]
        ]);
    }
    setupRetryInterceptor() {
        this.client.interceptors.response.use((response) => response, async (error) => {
            const config = error.config;
            if (config && this.shouldRetry(error) && !config.retryCount) {
                config.retryCount = 0;
            }
            if (config?.retryCount < 3 && this.shouldRetry(error)) {
                config.retryCount++;
                const delay = Math.pow(2, config.retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.client.request(config);
            }
            return Promise.reject(error);
        });
    }
    shouldRetry(error) {
        if (!error.response)
            return true;
        const status = error.response.status;
        return status === 429 || status === 502 || status === 503 || status === 504;
    }
    selectModel(taskType, language) {
        const modelMap = {
            [openrouter_1.TaskType.CONVERSATION]: process.env.CHAT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.MATERIAL_ANALYSIS]: process.env.ANALYSIS_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.EXERCISE_GENERATION]: process.env.PRACTICE_GENERATION_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.LEVEL_ASSESSMENT]: process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.VOCABULARY_EXTRACTION]: process.env.VOCABULARY_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.FUNCTION_CALLING]: process.env.FUNCTION_CALLING_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.INTENT_RECOGNITION]: process.env.INTENT_RECOGNITION_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o'
        };
        const selectedModel = modelMap[taskType];
        if (this.modelConfigs.has(selectedModel)) {
            return selectedModel;
        }
        const defaultModel = process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
        if (this.modelConfigs.has(defaultModel)) {
            return defaultModel;
        }
        const availableModels = Array.from(this.modelConfigs.keys());
        return availableModels[0] || 'openai/gpt-4o';
    }
    async callAIStream(model, prompt, context, userId) {
        if (this.testMode) {
            return this.generateMockStream(model, prompt, context);
        }
        try {
            const modelConfig = this.modelConfigs.get(model);
            if (!modelConfig) {
                throw new Error(`Unsupported model: ${model}`);
            }
            const messages = this.buildMessages(prompt, context);
            const request = {
                model,
                messages,
                max_tokens: modelConfig.maxTokens,
                temperature: modelConfig.temperature,
                stream: true
            };
            const response = await this.client.post('/chat/completions', request, {
                responseType: 'stream'
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError) {
                const errorMessage = error.response?.data?.error?.message || error.message;
                throw new Error(`OpenRouter API error: ${errorMessage}`);
            }
            throw error;
        }
    }
    generateMockStream(model, prompt, context) {
        const mockResponse = "这是一个模拟的流式响应。AI正在分析您的问题并提供详细的回答。";
        const chunks = mockResponse.split('');
        let index = 0;
        return new ReadableStream({
            start(controller) {
                const interval = setInterval(() => {
                    if (index < chunks.length) {
                        controller.enqueue(new TextEncoder().encode(chunks[index]));
                        index++;
                    }
                    else {
                        clearInterval(interval);
                        controller.close();
                    }
                }, 50);
            }
        });
    }
    async callAI(model, prompt, context, userId) {
        const startTime = Date.now();
        if (this.testMode) {
            return this.generateMockResponse(model, prompt, context, startTime);
        }
        try {
            const modelConfig = this.modelConfigs.get(model);
            if (!modelConfig) {
                throw new Error(`Unsupported model: ${model}`);
            }
            const messages = this.buildMessages(prompt, context);
            const request = {
                model,
                messages,
                max_tokens: modelConfig.maxTokens,
                temperature: modelConfig.temperature,
                stream: false
            };
            const response = await this.client.post('/chat/completions', request);
            const processingTime = Date.now() - startTime;
            const choice = response.data.choices[0];
            if (!choice || !choice.message) {
                throw new Error('Invalid response from OpenRouter API');
            }
            const tokensUsed = response.data.usage.total_tokens;
            const creditCost = this.calculateCreditCost(model, tokensUsed);
            if (userId) {
                this.recordTokenUsage(userId, model, tokensUsed, creditCost);
            }
            return {
                content: choice.message.content,
                model,
                tokensUsed,
                processingTime,
                metadata: {
                    finishReason: choice.finish_reason,
                    promptTokens: response.data.usage.prompt_tokens,
                    completionTokens: response.data.usage.completion_tokens,
                    creditCost
                }
            };
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError) {
                const errorMessage = error.response?.data?.error?.message || error.message;
                throw new Error(`OpenRouter API error: ${errorMessage}`);
            }
            throw error;
        }
    }
    generateMockResponse(model, prompt, context, startTime) {
        const actualStartTime = startTime || Date.now();
        const processingTime = Date.now() - actualStartTime;
        const mockTokens = Math.floor(prompt.length / 4) + 50;
        const creditCost = this.calculateCreditCost(model, mockTokens);
        let mockContent = 'Mock AI response for testing';
        if (prompt.toLowerCase().includes('intent') || prompt.toLowerCase().includes('parse') ||
            prompt.includes('意图') || prompt.includes('分析用户消息')) {
            let intent = 'language_learning';
            let isPrivacySensitive = false;
            const userMessageMatch = prompt.match(/(?:User message|用户消息)：?"([^"]+)"/);
            const userMessage = userMessageMatch ? userMessageMatch[1].toLowerCase() : prompt.toLowerCase();
            if (userMessage.includes('practice') || userMessage.includes('exercise') ||
                userMessage.includes('练习') || userMessage.includes('生成')) {
                intent = 'generate_practice';
            }
            else if (userMessage.includes('vocabulary') || userMessage.includes('words') ||
                userMessage.includes('词汇')) {
                intent = 'generate_practice';
            }
            else if (userMessage.includes('progress') || userMessage.includes('learning progress') ||
                userMessage.includes('进度')) {
                intent = 'check_progress';
            }
            else if (userMessage.includes('credit') || userMessage.includes('balance')) {
                intent = 'check_credits';
            }
            else if (userMessage.includes('password') || userMessage.includes('account') || userMessage.includes('payment') || userMessage.includes('delete')) {
                intent = 'account_management';
                isPrivacySensitive = true;
            }
            else if (userMessage.includes('history')) {
                intent = 'view_practice_history';
            }
            else if (userMessage.includes('statistics') || userMessage.includes('stats')) {
                intent = 'view_statistics';
            }
            mockContent = JSON.stringify({
                intent: intent,
                confidence: 0.85,
                parameters: { language: 'en', skill: 'vocabulary' },
                isPrivacySensitive: isPrivacySensitive,
                requiresConfirmation: isPrivacySensitive
            });
        }
        else if (prompt.toLowerCase().includes('privacy') || prompt.toLowerCase().includes('sensitive')) {
            mockContent = JSON.stringify({
                intent: 'account_management',
                confidence: 0.95,
                parameters: {},
                isPrivacySensitive: true,
                requiresConfirmation: true
            });
        }
        else if (prompt.toLowerCase().includes('chat') || prompt.toLowerCase().includes('message')) {
            mockContent = 'This is a mock AI response to your message. In test mode, I can help you practice languages!';
        }
        return {
            content: mockContent,
            model,
            tokensUsed: mockTokens,
            processingTime,
            metadata: {
                finishReason: 'stop',
                promptTokens: Math.floor(mockTokens * 0.7),
                completionTokens: Math.floor(mockTokens * 0.3),
                creditCost
            }
        };
    }
    buildMessages(prompt, context) {
        const messages = [];
        if (context?.systemPrompt) {
            messages.push({
                role: 'system',
                content: context.systemPrompt
            });
        }
        if (context?.history && Array.isArray(context.history)) {
            for (const msg of context.history) {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }
        messages.push({
            role: 'user',
            content: prompt
        });
        return messages;
    }
    calculateCreditCost(model, tokens) {
        const modelConfig = this.modelConfigs.get(model);
        if (!modelConfig) {
            return 0;
        }
        return Math.ceil(tokens * modelConfig.costPerToken);
    }
    recordTokenUsage(userId, model, tokensUsed, creditCost) {
        let taskType = openrouter_1.TaskType.CONVERSATION;
        for (const [type, modelName] of Object.entries({
            [openrouter_1.TaskType.CONVERSATION]: process.env.CHAT_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.MATERIAL_ANALYSIS]: process.env.ANALYSIS_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.EXERCISE_GENERATION]: process.env.PRACTICE_GENERATION_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.LEVEL_ASSESSMENT]: process.env.ASSESSMENT_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.VOCABULARY_EXTRACTION]: process.env.VOCABULARY_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.FUNCTION_CALLING]: process.env.FUNCTION_CALLING_MODEL || 'openai/gpt-4o',
            [openrouter_1.TaskType.INTENT_RECOGNITION]: process.env.INTENT_RECOGNITION_MODEL || 'openai/gpt-4o'
        })) {
            if (modelName === model) {
                taskType = type;
                break;
            }
        }
        const record = {
            userId,
            taskType,
            model,
            tokensUsed,
            creditCost,
            timestamp: new Date()
        };
        this.tokenUsageRecords.push(record);
        if (this.tokenUsageRecords.length > 1000) {
            this.tokenUsageRecords = this.tokenUsageRecords.slice(-1000);
        }
    }
    getTokenUsageStats(userId, timeRange) {
        let records = this.tokenUsageRecords.filter(record => record.userId === userId);
        if (timeRange) {
            records = records.filter(record => record.timestamp >= timeRange.start && record.timestamp <= timeRange.end);
        }
        const stats = {
            totalTokens: 0,
            totalCredits: 0,
            usageByModel: {},
            usageByTaskType: {}
        };
        for (const record of records) {
            stats.totalTokens += record.tokensUsed;
            stats.totalCredits += record.creditCost;
            if (!stats.usageByModel[record.model]) {
                stats.usageByModel[record.model] = { tokens: 0, credits: 0 };
            }
            stats.usageByModel[record.model].tokens += record.tokensUsed;
            stats.usageByModel[record.model].credits += record.creditCost;
            if (!stats.usageByTaskType[record.taskType]) {
                stats.usageByTaskType[record.taskType] = { tokens: 0, credits: 0 };
            }
            stats.usageByTaskType[record.taskType].tokens += record.tokensUsed;
            stats.usageByTaskType[record.taskType].credits += record.creditCost;
        }
        return stats;
    }
    getAvailableModels() {
        return Array.from(this.modelConfigs.values());
    }
    updateModelConfig(model, config) {
        const existingConfig = this.modelConfigs.get(model);
        if (existingConfig) {
            this.modelConfigs.set(model, { ...existingConfig, ...config });
        }
    }
}
exports.OpenRouterService = OpenRouterService;
const createOpenRouterService = (testMode = false) => new OpenRouterService(testMode);
exports.createOpenRouterService = createOpenRouterService;
exports.openRouterService = process.env.OPENROUTER_API_KEY || process.env.NODE_ENV === 'test'
    ? (process.env.NODE_ENV === 'test' ? (0, exports.createOpenRouterService)(true) : (0, exports.createOpenRouterService)())
    : null;
//# sourceMappingURL=OpenRouterService.js.map