"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const ChatMessage_1 = require("../models/ChatMessage");
const AIService_1 = require("./AIService");
const AsyncTaskManager_1 = require("./AsyncTaskManager");
const AIPromptService_1 = require("./AIPromptService");
const OpenRouterService_1 = require("./OpenRouterService");
const chat_1 = require("../types/chat");
const openrouter_1 = require("../types/openrouter");
const promises_1 = __importDefault(require("fs/promises"));
class ChatService {
    constructor(database, testMode = false) {
        this.chatMessage = new ChatMessage_1.ChatMessage(database);
        this.aiService = new AIService_1.AIService(database, testMode);
        this.asyncTaskManager = AsyncTaskManager_1.AsyncTaskManager.getInstance(testMode);
    }
    async sendMessage(userId, request) {
        try {
            const userMessage = await this.chatMessage.createMessage(userId, request.content, chat_1.MessageType.USER_TEXT);
            const recentMessages = await this.chatMessage.getRecentMessages(userId, 5);
            const context = {
                ...request.context,
                history: recentMessages.map(msg => ({
                    role: msg.type === chat_1.MessageType.USER_TEXT ? 'user' : 'assistant',
                    content: msg.content
                }))
            };
            const language = request.language || openrouter_1.Language.ENGLISH;
            const conversationPrompt = AIPromptService_1.aiPromptService.generatePrompt(openrouter_1.TaskType.CONVERSATION, {
                language,
                userLevel: 'B1',
                focusAreas: 'vocabulary, grammar',
                userMessage: request.content
            });
            if (!conversationPrompt) {
                throw new Error('Failed to generate conversation prompt');
            }
            const model = OpenRouterService_1.openRouterService?.selectModel(openrouter_1.TaskType.CONVERSATION, language) || process.env.CHAT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
            const aiResponse = await OpenRouterService_1.openRouterService?.callAI(model, conversationPrompt.userPrompt, {
                systemPrompt: conversationPrompt.systemPrompt,
                history: context.history
            }, userId);
            if (!aiResponse) {
                throw new Error('AI service unavailable');
            }
            const updatedMessage = await this.chatMessage.updateMessageWithAIResponse(userMessage.id, {
                content: aiResponse.content,
                model: aiResponse.model,
                tokensUsed: aiResponse.tokensUsed,
                processingTime: aiResponse.processingTime,
                metadata: aiResponse.metadata
            });
            const aiMessage = await this.chatMessage.createMessage(userId, aiResponse.content, chat_1.MessageType.AI_RESPONSE);
            await this.chatMessage.updateProcessingStatus(aiMessage.id, chat_1.ProcessingStatus.COMPLETED);
            const completedAiMessage = await this.chatMessage.getMessageById(aiMessage.id);
            return {
                success: true,
                message: completedAiMessage || aiMessage
            };
        }
        catch (error) {
            console.error('Error in sendMessage:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async sendMessageAsync(userId, request) {
        try {
            const userMessage = await this.chatMessage.createMessage(userId, request.content, chat_1.MessageType.USER_TEXT);
            if (process.env.NODE_ENV === 'test') {
                const result = await this.sendMessage(userId, request);
                return {
                    success: result.success,
                    message: result.message,
                    taskId: `test-task-${Date.now()}`,
                    error: result.error
                };
            }
            await this.chatMessage.updateProcessingStatus(userMessage.id, chat_1.ProcessingStatus.PROCESSING);
            const recentMessages = await this.chatMessage.getRecentMessages(userId, 5);
            const context = {
                ...request.context,
                history: recentMessages.map(msg => ({
                    role: msg.type === chat_1.MessageType.USER_TEXT ? 'user' : 'assistant',
                    content: msg.content
                })),
                messageId: userMessage.id
            };
            const language = request.language || openrouter_1.Language.ENGLISH;
            const model = this.getModelForTask(openrouter_1.TaskType.CONVERSATION, language);
            const taskId = await this.asyncTaskManager.createChatTask(userId, model, request.content, context);
            return {
                success: true,
                message: userMessage,
                taskId
            };
        }
        catch (error) {
            console.error('Error in sendMessageAsync:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async uploadMaterial(userId, file, request) {
        try {
            const extractedContent = await this.extractFileContent(file);
            const attachment = {
                id: file.filename,
                filename: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                uploadedAt: new Date(),
                processedAt: new Date(),
                extractedContent
            };
            const userMessage = await this.chatMessage.createMessage(userId, `Uploaded file: ${file.originalname}`, chat_1.MessageType.USER_FILE, [attachment]);
            const language = request.language || openrouter_1.Language.ENGLISH;
            const materialPrompt = AIPromptService_1.aiPromptService.generateMaterialAnalysisPrompt({
                language,
                userLevel: 'B1'
            }, extractedContent);
            if (!materialPrompt) {
                throw new Error('Failed to generate material analysis prompt');
            }
            const model = OpenRouterService_1.openRouterService?.selectModel(openrouter_1.TaskType.MATERIAL_ANALYSIS, language) || process.env.ANALYSIS_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
            const aiResponse = await OpenRouterService_1.openRouterService?.callAI(model, materialPrompt.userPrompt, {
                systemPrompt: materialPrompt.systemPrompt,
                ...request.context
            }, userId);
            if (!aiResponse) {
                throw new Error('AI service unavailable');
            }
            const { vocabulary, grammar } = this.extractLearningData(aiResponse.content);
            const aiMessage = await this.chatMessage.createMessage(userId, aiResponse.content, chat_1.MessageType.AI_RESPONSE);
            await this.chatMessage.updateMessageWithAIResponse(userMessage.id, {
                content: aiResponse.content,
                model: aiResponse.model,
                tokensUsed: aiResponse.tokensUsed,
                processingTime: aiResponse.processingTime,
                metadata: aiResponse.metadata
            }, vocabulary, grammar);
            await this.cleanupFile(file.path);
            return {
                success: true,
                message: aiMessage,
                extractedContent
            };
        }
        catch (error) {
            console.error('Error in uploadMaterial:', error);
            if (file?.path) {
                await this.cleanupFile(file.path).catch(() => { });
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async uploadMaterialAsync(userId, file, request) {
        try {
            const extractedContent = await this.extractFileContent(file);
            const attachment = {
                id: file.filename,
                filename: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                uploadedAt: new Date(),
                processedAt: new Date(),
                extractedContent
            };
            const userMessage = await this.chatMessage.createMessage(userId, `Uploaded file: ${file.originalname}`, chat_1.MessageType.USER_FILE, [attachment]);
            await this.chatMessage.updateProcessingStatus(userMessage.id, chat_1.ProcessingStatus.PROCESSING);
            const analysisPrompt = `Please analyze the following learning material and provide insights:

File: ${file.originalname}
Content: ${extractedContent}

Please provide:
1. A summary of the content
2. Key vocabulary words
3. Grammar points covered
4. Difficulty level assessment
5. Learning suggestions`;
            const language = request.language || openrouter_1.Language.ENGLISH;
            const model = this.getModelForTask(openrouter_1.TaskType.MATERIAL_ANALYSIS, language);
            const context = {
                ...request.context,
                messageId: userMessage.id,
                extractedContent,
                filename: file.originalname
            };
            const taskId = await this.asyncTaskManager.createMaterialAnalysisTask(userId, model, analysisPrompt, context);
            await this.cleanupFile(file.path);
            return {
                success: true,
                message: userMessage,
                taskId,
                extractedContent
            };
        }
        catch (error) {
            console.error('Error in uploadMaterialAsync:', error);
            if (file?.path) {
                await this.cleanupFile(file.path).catch(() => { });
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async getChatHistory(userId, limit = 50, offset = 0, language) {
        try {
            const { messages, totalCount } = await this.chatMessage.getChatHistory(userId, limit, offset, language);
            return {
                success: true,
                messages,
                totalCount,
                hasMore: offset + messages.length < totalCount
            };
        }
        catch (error) {
            console.error('Error in getChatHistory:', error);
            return {
                success: false,
                messages: [],
                totalCount: 0,
                hasMore: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async clearChatHistory(userId) {
        try {
            const deletedCount = await this.chatMessage.clearUserMessages(userId);
            return {
                success: true,
                deletedCount
            };
        }
        catch (error) {
            console.error('Error in clearChatHistory:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async getMessageById(messageId) {
        return await this.chatMessage.getMessageById(messageId);
    }
    async searchMessages(userId, searchTerm, limit = 20) {
        try {
            const messages = await this.chatMessage.searchMessages(userId, searchTerm, limit);
            return {
                success: true,
                messages
            };
        }
        catch (error) {
            console.error('Error in searchMessages:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async extractFileContent(file) {
        try {
            const content = await promises_1.default.readFile(file.path, 'utf-8');
            if (file.mimetype === 'text/plain') {
                return content;
            }
            else if (file.mimetype === 'application/json') {
                return JSON.stringify(JSON.parse(content), null, 2);
            }
            else {
                return content;
            }
        }
        catch (error) {
            throw new Error(`Failed to extract content from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    extractLearningData(aiResponse) {
        const vocabulary = [];
        const grammar = [];
        const vocabMatches = aiResponse.match(/(?:vocabulary|words?):\s*([^\n]+)/gi);
        if (vocabMatches) {
            vocabMatches.forEach(match => {
                const words = match.split(':')[1]?.split(',').map(w => w.trim().toLowerCase());
                if (words) {
                    vocabulary.push(...words);
                }
            });
        }
        const grammarMatches = aiResponse.match(/(?:grammar|grammatical?):\s*([^\n]+)/gi);
        if (grammarMatches) {
            grammarMatches.forEach(match => {
                const points = match.split(':')[1]?.split(',').map(g => g.trim());
                if (points) {
                    grammar.push(...points);
                }
            });
        }
        return {
            vocabulary: [...new Set(vocabulary)],
            grammar: [...new Set(grammar)]
        };
    }
    getModelForTask(taskType, language) {
        return process.env.CHAT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
    }
    async cleanupFile(filePath) {
        try {
            await promises_1.default.unlink(filePath);
        }
        catch (error) {
            console.warn(`Failed to cleanup file ${filePath}:`, error);
        }
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map