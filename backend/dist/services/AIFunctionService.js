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
exports.AIFunctionService = void 0;
const ChatMessage_1 = require("../models/ChatMessage");
const AIService_1 = require("./AIService");
const AsyncTaskManager_1 = require("./AsyncTaskManager");
const AIPromptService_1 = require("./AIPromptService");
const chat_1 = require("../types/chat");
const openrouter_1 = require("../types/openrouter");
const uuid_1 = require("uuid");
class AIFunctionService {
    constructor(database, testMode = false) {
        this._db = database;
        this._chatMessage = new ChatMessage_1.ChatMessage(database);
        this.aiService = new AIService_1.AIService(database, testMode);
        this.asyncTaskManager = AsyncTaskManager_1.AsyncTaskManager.getInstance(testMode);
    }
    async parseIntent(userId, request) {
        try {
            const language = request.language || openrouter_1.Language.ENGLISH;
            const intentPrompt = AIPromptService_1.aiPromptService.generateIntentRecognitionPrompt(request.message, language, request.context ? JSON.stringify(request.context) : undefined);
            if (!intentPrompt) {
                throw new Error('Failed to generate intent recognition prompt');
            }
            const aiResponse = await this.aiService.callAIWithCredits(userId, openrouter_1.TaskType.INTENT_RECOGNITION, language, intentPrompt.userPrompt, {
                systemPrompt: intentPrompt.systemPrompt,
                ...request.context
            });
            const intentResult = this.parseIntentFromAIResponse(aiResponse.content);
            return {
                success: true,
                result: intentResult
            };
        }
        catch (error) {
            console.error('Error in parseIntent:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async executeFunction(userId, request) {
        try {
            if (this.isPrivacySensitive(request.intent)) {
                return {
                    success: false,
                    error: 'This operation involves sensitive account information. Please use the appropriate interface to perform this action.'
                };
            }
            const functionIntent = {
                intent: request.intent,
                parameters: request.parameters,
                userId,
                language: request.language || 'en'
            };
            const startTime = Date.now();
            const result = await this.executeFunctionInternal(functionIntent);
            const executionTime = Date.now() - startTime;
            const _functionCall = {
                id: (0, uuid_1.v4)(),
                intent: request.intent,
                parameters: request.parameters,
                executedAt: new Date(),
                executionTime,
                success: result.success
            };
            return {
                success: true,
                result
            };
        }
        catch (error) {
            console.error('Error in executeFunction:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async executeFunctionAsync(userId, request) {
        try {
            if (this.isPrivacySensitive(request.intent)) {
                return {
                    success: false,
                    error: 'This operation involves sensitive account information. Please use the appropriate interface to perform this action.'
                };
            }
            const context = {
                intent: request.intent,
                parameters: request.parameters,
                language: request.language || 'en'
            };
            const taskId = await this.asyncTaskManager.createFunctionCallTask(userId, 'function-executor', JSON.stringify(request), context);
            return {
                success: true,
                taskId
            };
        }
        catch (error) {
            console.error('Error in executeFunctionAsync:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async getAvailableFunctions() {
        try {
            const functions = [
                {
                    intent: chat_1.UserIntent.GENERATE_PRACTICE,
                    description: 'Generate practice exercises based on user level and preferences',
                    parameters: {
                        type: 'string (optional)',
                        difficulty: 'string (optional)',
                        focusAreas: 'array (optional)',
                        count: 'number (optional, default: 10)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.VIEW_PRACTICE_HISTORY,
                    description: 'View user\'s practice history and performance',
                    parameters: {
                        limit: 'number (optional, default: 20)',
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.CHECK_PROGRESS,
                    description: 'Check user\'s learning progress and milestones',
                    parameters: {
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.VIEW_CAPABILITIES,
                    description: 'View user\'s language capabilities and assessments',
                    parameters: {
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.ADD_VOCABULARY,
                    description: 'Add words to user\'s vocabulary list',
                    parameters: {
                        words: 'array (required)',
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.VIEW_VOCABULARY,
                    description: 'View user\'s vocabulary list and mastery levels',
                    parameters: {
                        language: 'string (optional)',
                        masteryLevel: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.START_PK_MATCH,
                    description: 'Start a PK match with another user',
                    parameters: {
                        language: 'string (required)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.VIEW_PK_HISTORY,
                    description: 'View PK battle history and statistics',
                    parameters: {
                        limit: 'number (optional, default: 20)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.CHECK_MMR,
                    description: 'Check user\'s MMR rating and ranking',
                    parameters: {
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.VIEW_STATISTICS,
                    description: 'View user\'s learning statistics and analytics',
                    parameters: {
                        timeframe: 'string (optional, default: "month")'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.CHECK_CREDITS,
                    description: 'Check user\'s credit balance and transaction history',
                    parameters: {
                        includeHistory: 'boolean (optional, default: false)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.VIEW_MILESTONES,
                    description: 'View user\'s learning milestones and progress',
                    parameters: {
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.LANGUAGE_LEARNING,
                    description: 'General language learning conversation and assistance',
                    parameters: {
                        topic: 'string (optional)',
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                },
                {
                    intent: chat_1.UserIntent.MATERIAL_ANALYSIS,
                    description: 'Analyze uploaded learning materials',
                    parameters: {
                        content: 'string (required)',
                        language: 'string (optional)'
                    },
                    isPrivacySensitive: false
                }
            ];
            return {
                success: true,
                functions
            };
        }
        catch (error) {
            console.error('Error in getAvailableFunctions:', error);
            return {
                success: false,
                functions: [],
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    createIntentRecognitionPrompt(message, context) {
        return `Analyze the following user message and determine their intent. The user is in a language learning application.

User message: "${message}"

Available intents:
- GENERATE_PRACTICE: User wants to create practice exercises
- VIEW_PRACTICE_HISTORY: User wants to see their practice history
- CHECK_PROGRESS: User wants to check their learning progress
- VIEW_CAPABILITIES: User wants to see their language abilities
- ADD_VOCABULARY: User wants to add words to their vocabulary
- VIEW_VOCABULARY: User wants to see their vocabulary list
- START_PK_MATCH: User wants to start a PK battle
- VIEW_PK_HISTORY: User wants to see PK battle history
- CHECK_MMR: User wants to check their MMR rating
- VIEW_STATISTICS: User wants to see learning statistics
- CHECK_CREDITS: User wants to check credit balance
- VIEW_MILESTONES: User wants to see learning milestones
- UPDATE_PREFERENCES: User wants to update settings
- CHANGE_LANGUAGE: User wants to change learning language
- LANGUAGE_LEARNING: General language learning conversation
- MATERIAL_ANALYSIS: User wants to analyze learning material
- ACCOUNT_MANAGEMENT: User wants to manage account (PRIVACY SENSITIVE)
- PAYMENT_OPERATIONS: User wants to handle payments (PRIVACY SENSITIVE)
- PASSWORD_CHANGE: User wants to change password (PRIVACY SENSITIVE)

Respond with a JSON object containing (do NOT use markdown code blocks like \`\`\`json):
{
  "intent": "DETECTED_INTENT",
  "confidence": 0.95,
  "parameters": {},
  "requiresConfirmation": false,
  "isPrivacySensitive": false
}

If the intent is unclear, use "LANGUAGE_LEARNING" as the default intent. Return ONLY the JSON object, no additional text or formatting.`;
    }
    parseIntentFromAIResponse(aiResponse) {
        try {
            let cleanResponse = aiResponse.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            }
            else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    intent: parsed.intent,
                    confidence: parsed.confidence || 0.5,
                    parameters: parsed.parameters || {},
                    requiresConfirmation: parsed.requiresConfirmation || false,
                    isPrivacySensitive: parsed.isPrivacySensitive || false
                };
            }
        }
        catch (error) {
            console.warn('Failed to parse intent from AI response:', error);
            console.warn('Raw response:', aiResponse);
        }
        return {
            intent: chat_1.UserIntent.LANGUAGE_LEARNING,
            confidence: 0.3,
            parameters: {},
            requiresConfirmation: false,
            isPrivacySensitive: false
        };
    }
    isPrivacySensitive(intent) {
        const privacySensitiveIntents = [
            chat_1.UserIntent.ACCOUNT_MANAGEMENT,
            chat_1.UserIntent.PAYMENT_OPERATIONS,
            chat_1.UserIntent.PASSWORD_CHANGE
        ];
        return privacySensitiveIntents.includes(intent);
    }
    async executeFunctionInternal(functionIntent) {
        const { intent, parameters, userId, language } = functionIntent;
        try {
            switch (intent) {
                case chat_1.UserIntent.GENERATE_PRACTICE:
                    return await this.handleGeneratePractice(userId, parameters, language);
                case chat_1.UserIntent.VIEW_PRACTICE_HISTORY:
                    return await this.handleViewPracticeHistory(userId, parameters);
                case chat_1.UserIntent.CHECK_PROGRESS:
                    return await this.handleCheckProgress(userId, parameters, language);
                case chat_1.UserIntent.VIEW_CAPABILITIES:
                    return await this.handleViewCapabilities(userId, parameters, language);
                case chat_1.UserIntent.ADD_VOCABULARY:
                    return await this.handleAddVocabulary(userId, parameters, language);
                case chat_1.UserIntent.VIEW_VOCABULARY:
                    return await this.handleViewVocabulary(userId, parameters, language);
                case chat_1.UserIntent.CHECK_CREDITS:
                    return await this.handleCheckCredits(userId, parameters);
                case chat_1.UserIntent.VIEW_STATISTICS:
                    return await this.handleViewStatistics(userId, parameters);
                case chat_1.UserIntent.VIEW_MILESTONES:
                    return await this.handleViewMilestones(userId, parameters, language);
                default:
                    return {
                        success: false,
                        error: `Function for intent ${intent} is not yet implemented`
                    };
            }
        }
        catch (error) {
            console.error(`Error executing function for intent ${intent}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async handleGeneratePractice(userId, parameters, language) {
        try {
            const { PracticeGenerationService } = await Promise.resolve().then(() => __importStar(require('./PracticeGenerationService')));
            const { UserCapabilityService } = await Promise.resolve().then(() => __importStar(require('./UserCapabilityService')));
            const { CreditService } = await Promise.resolve().then(() => __importStar(require('./CreditService')));
            const { AsyncTaskManager } = await Promise.resolve().then(() => __importStar(require('./AsyncTaskManager')));
            const { OpenRouterService } = await Promise.resolve().then(() => __importStar(require('./OpenRouterService')));
            const userCapabilityService = new UserCapabilityService(this._db, this.aiService);
            const creditService = new CreditService(this._db);
            const asyncTaskManager = AsyncTaskManager.getInstance();
            const openRouterService = new OpenRouterService();
            const practiceGenerationService = new PracticeGenerationService(this._db, userCapabilityService, creditService, asyncTaskManager, openRouterService);
            const practiceType = parameters.type || 'general';
            const difficulty = parameters.difficulty || 'intermediate';
            const focusAreas = parameters.focusAreas || [];
            const vocabularyWords = parameters.vocabularyWords || [];
            const grammarPoints = parameters.grammarPoints || [];
            const count = parameters.count || 10;
            const practiceGroup = await practiceGenerationService.generatePracticeGroup({
                userId,
                language: language,
                difficulty: difficulty,
                type: practiceType,
                focusAreas: focusAreas,
                vocabularyWords,
                grammarPoints,
                count
            });
            return {
                success: true,
                data: {
                    practiceGroup,
                    message: `成功生成了${practiceGroup.questions.length}道${practiceType}练习题！`,
                    actionUrl: `/practice/group/${practiceGroup.id}`
                },
                requiresUserAction: false
            };
        }
        catch (error) {
            console.error('Error generating practice:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate practice'
            };
        }
    }
    async handleViewPracticeHistory(_userId, parameters) {
        return {
            success: true,
            data: {
                message: 'Practice history functionality will be implemented in the practice system module.',
                parameters
            },
            requiresUserAction: true,
            actionUrl: '/practice/history'
        };
    }
    async handleCheckProgress(_userId, parameters, language) {
        return {
            success: true,
            data: {
                message: 'Progress checking functionality will be implemented with the user capability system.',
                parameters,
                language
            },
            requiresUserAction: true,
            actionUrl: '/progress'
        };
    }
    async handleViewCapabilities(_userId, parameters, language) {
        return {
            success: true,
            data: {
                message: 'Capability viewing functionality will be implemented with the user capability system.',
                parameters,
                language
            },
            requiresUserAction: true,
            actionUrl: '/capabilities'
        };
    }
    async handleAddVocabulary(_userId, parameters, language) {
        return {
            success: true,
            data: {
                message: 'Vocabulary management functionality will be implemented in the vocabulary system module.',
                parameters,
                language
            },
            requiresUserAction: true,
            actionUrl: '/vocabulary'
        };
    }
    async handleViewVocabulary(_userId, parameters, language) {
        return {
            success: true,
            data: {
                message: 'Vocabulary viewing functionality will be implemented in the vocabulary system module.',
                parameters,
                language
            },
            requiresUserAction: true,
            actionUrl: '/vocabulary'
        };
    }
    async handleCheckCredits(userId, parameters) {
        try {
            const credits = await this.aiService.getUserCredits(userId);
            if (!credits) {
                return {
                    success: false,
                    error: 'User credits not found. Please contact support to initialize your account.'
                };
            }
            return {
                success: true,
                data: {
                    currentBalance: credits.currentBalance,
                    totalEarned: credits.totalEarned,
                    totalSpent: credits.totalSpent,
                    includeHistory: parameters.includeHistory || false
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Failed to retrieve credit information'
            };
        }
    }
    async handleViewStatistics(userId, parameters) {
        try {
            const stats = await this.aiService.getAIUsageStats(userId, 30);
            return {
                success: true,
                data: {
                    aiUsage: stats,
                    timeframe: parameters.timeframe || 'month'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Failed to retrieve statistics'
            };
        }
    }
    async handleViewMilestones(_userId, parameters, language) {
        return {
            success: true,
            data: {
                message: 'Milestone viewing functionality will be implemented with the progress tracking system.',
                parameters,
                language
            },
            requiresUserAction: true,
            actionUrl: '/milestones'
        };
    }
}
exports.AIFunctionService = AIFunctionService;
//# sourceMappingURL=AIFunctionService.js.map