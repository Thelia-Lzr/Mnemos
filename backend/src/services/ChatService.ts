import { Pool } from 'pg';
import { ChatMessage } from '../models/ChatMessage';
import { AIService } from './AIService';
import { AsyncTaskManager } from './AsyncTaskManager';
import { aiPromptService } from './AIPromptService';
import { openRouterService } from './OpenRouterService';
import { 
  Message, 
  MessageType, 
  ProcessingStatus, 
  SendMessageRequest, 
  SendMessageResponse,
  UploadMaterialRequest,
  UploadMaterialResponse,
  ChatHistoryResponse,
  FileAttachment
} from '../types/chat';
import { TaskType, Language } from '../types/openrouter';
import { AITaskType } from '../types/task';
import fs from 'fs/promises';
import path from 'path';

export class ChatService {
  private chatMessage: ChatMessage;
  private aiService: AIService;
  private asyncTaskManager: AsyncTaskManager;

  constructor(database: Pool, testMode: boolean = false) {
    this.chatMessage = new ChatMessage(database);
    this.aiService = new AIService(database, testMode);
    this.asyncTaskManager = AsyncTaskManager.getInstance(testMode);
  }

  /**
   * Send a message and get AI response (synchronous)
   */
  async sendMessage(
    userId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      // Create user message
      const userMessage = await this.chatMessage.createMessage(
        userId,
        request.content,
        MessageType.USER_TEXT
      );

      // Get recent context for AI
      const recentMessages = await this.chatMessage.getRecentMessages(userId, 5);
      const context = {
        ...request.context,
        history: recentMessages.map(msg => ({
          role: msg.type === MessageType.USER_TEXT ? 'user' : 'assistant',
          content: msg.content
        }))
      };

      // Determine language
      const language = (request.language as Language) || Language.ENGLISH;

      // Generate conversation prompt using AI prompt service
      const conversationPrompt = aiPromptService.generatePrompt(
        TaskType.CONVERSATION,
        {
          language,
          userLevel: 'B1', // TODO: Get from user capability
          focusAreas: 'vocabulary, grammar',
          userMessage: request.content
        }
      );

      if (!conversationPrompt) {
        throw new Error('Failed to generate conversation prompt');
      }

      // Select appropriate model
      const model = openRouterService?.selectModel(TaskType.CONVERSATION, language) || process.env.CHAT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';

      // Call AI service with generated prompt
      const aiResponse = await openRouterService?.callAI(
        model,
        conversationPrompt.userPrompt,
        {
          systemPrompt: conversationPrompt.systemPrompt,
          history: context.history
        },
        userId
      );

      if (!aiResponse) {
        throw new Error('AI service unavailable');
      }

      // Update user message with AI response first
      const updatedMessage = await this.chatMessage.updateMessageWithAIResponse(
        userMessage.id,
        {
          content: aiResponse.content,
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          processingTime: aiResponse.processingTime,
          metadata: aiResponse.metadata
        }
      );

      // Create AI response message with completed status
      const aiMessage = await this.chatMessage.createMessage(
        userId,
        aiResponse.content,
        MessageType.AI_RESPONSE
      );

      // Update AI message status to completed
      await this.chatMessage.updateProcessingStatus(aiMessage.id, ProcessingStatus.COMPLETED);

      // Return the AI message with completed status
      const completedAiMessage = await this.chatMessage.getMessageById(aiMessage.id);

      return {
        success: true,
        message: completedAiMessage || aiMessage
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send a message and get AI response (asynchronous)
   */
  async sendMessageAsync(
    userId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      // Create user message
      const userMessage = await this.chatMessage.createMessage(
        userId,
        request.content,
        MessageType.USER_TEXT
      );

      // In test mode, process synchronously to avoid Redis issues
      if (process.env.NODE_ENV === 'test') {
        // Process synchronously in test mode
        const result = await this.sendMessage(userId, request);
        return {
          success: result.success,
          message: result.message,
          taskId: `test-task-${Date.now()}`, // Mock task ID
          error: result.error
        };
      }

      // Set processing status
      await this.chatMessage.updateProcessingStatus(userMessage.id, ProcessingStatus.PROCESSING);

      // Get recent context for AI
      const recentMessages = await this.chatMessage.getRecentMessages(userId, 5);
      const context = {
        ...request.context,
        history: recentMessages.map(msg => ({
          role: msg.type === MessageType.USER_TEXT ? 'user' : 'assistant',
          content: msg.content
        })),
        messageId: userMessage.id // Pass message ID for updating
      };

      // Determine language and model
      const language = (request.language as Language) || Language.ENGLISH;
      const model = this.getModelForTask(TaskType.CONVERSATION, language);

      // Create async task
      const taskId = await this.asyncTaskManager.createChatTask(
        userId,
        model,
        request.content,
        context
      );

      return {
        success: true,
        message: userMessage,
        taskId
      };
    } catch (error) {
      console.error('Error in sendMessageAsync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Upload and analyze material (synchronous)
   */
  async uploadMaterial(
    userId: string,
    file: Express.Multer.File,
    request: UploadMaterialRequest
  ): Promise<UploadMaterialResponse> {
    try {
      // Process file and extract content
      const extractedContent = await this.extractFileContent(file);
      
      // Create file attachment
      const attachment: FileAttachment = {
        id: file.filename,
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date(),
        processedAt: new Date(),
        extractedContent
      };

      // Create user message with file attachment
      const userMessage = await this.chatMessage.createMessage(
        userId,
        `Uploaded file: ${file.originalname}`,
        MessageType.USER_FILE,
        [attachment]
      );

      // Determine language
      const language = (request.language as Language) || Language.ENGLISH;

      // Generate material analysis prompt using AI prompt service
      const materialPrompt = aiPromptService.generateMaterialAnalysisPrompt(
        {
          language,
          userLevel: 'B1' // TODO: Get from user capability
        },
        extractedContent
      );

      if (!materialPrompt) {
        throw new Error('Failed to generate material analysis prompt');
      }

      // Select appropriate model
      const model = openRouterService?.selectModel(TaskType.MATERIAL_ANALYSIS, language) || process.env.ANALYSIS_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';

      // Call AI service for material analysis
      const aiResponse = await openRouterService?.callAI(
        model,
        materialPrompt.userPrompt,
        {
          systemPrompt: materialPrompt.systemPrompt,
          ...request.context
        },
        userId
      );

      if (!aiResponse) {
        throw new Error('AI service unavailable');
      }

      // Extract vocabulary and grammar from AI response
      const { vocabulary, grammar } = this.extractLearningData(aiResponse.content);

      // Create AI response message
      const aiMessage = await this.chatMessage.createMessage(
        userId,
        aiResponse.content,
        MessageType.AI_RESPONSE
      );

      // Update user message with AI response and extracted data
      await this.chatMessage.updateMessageWithAIResponse(
        userMessage.id,
        {
          content: aiResponse.content,
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          processingTime: aiResponse.processingTime,
          metadata: aiResponse.metadata
        },
        vocabulary,
        grammar
      );

      // Clean up uploaded file
      await this.cleanupFile(file.path);

      return {
        success: true,
        message: aiMessage,
        extractedContent
      };
    } catch (error) {
      console.error('Error in uploadMaterial:', error);
      // Clean up file on error
      if (file?.path) {
        await this.cleanupFile(file.path).catch(() => {});
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Upload and analyze material (asynchronous)
   */
  async uploadMaterialAsync(
    userId: string,
    file: Express.Multer.File,
    request: UploadMaterialRequest
  ): Promise<UploadMaterialResponse> {
    try {
      // Process file and extract content
      const extractedContent = await this.extractFileContent(file);
      
      // Create file attachment
      const attachment: FileAttachment = {
        id: file.filename,
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date(),
        processedAt: new Date(),
        extractedContent
      };

      // Create user message with file attachment
      const userMessage = await this.chatMessage.createMessage(
        userId,
        `Uploaded file: ${file.originalname}`,
        MessageType.USER_FILE,
        [attachment]
      );

      // Set processing status
      await this.chatMessage.updateProcessingStatus(userMessage.id, ProcessingStatus.PROCESSING);

      // Prepare prompt for material analysis
      const analysisPrompt = `Please analyze the following learning material and provide insights:

File: ${file.originalname}
Content: ${extractedContent}

Please provide:
1. A summary of the content
2. Key vocabulary words
3. Grammar points covered
4. Difficulty level assessment
5. Learning suggestions`;

      // Determine language and model
      const language = (request.language as Language) || Language.ENGLISH;
      const model = this.getModelForTask(TaskType.MATERIAL_ANALYSIS, language);

      // Create context with message ID for updating
      const context = {
        ...request.context,
        messageId: userMessage.id,
        extractedContent,
        filename: file.originalname
      };

      // Create async task
      const taskId = await this.asyncTaskManager.createMaterialAnalysisTask(
        userId,
        model,
        analysisPrompt,
        context
      );

      // Clean up uploaded file
      await this.cleanupFile(file.path);

      return {
        success: true,
        message: userMessage,
        taskId,
        extractedContent
      };
    } catch (error) {
      console.error('Error in uploadMaterialAsync:', error);
      // Clean up file on error
      if (file?.path) {
        await this.cleanupFile(file.path).catch(() => {});
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get chat history for a user
   */
  async getChatHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    language?: string
  ): Promise<ChatHistoryResponse> {
    try {
      const { messages, totalCount } = await this.chatMessage.getChatHistory(
        userId,
        limit,
        offset,
        language
      );

      return {
        success: true,
        messages,
        totalCount,
        hasMore: offset + messages.length < totalCount
      };
    } catch (error) {
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

  /**
   * Clear chat history for a user
   */
  async clearChatHistory(userId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const deletedCount = await this.chatMessage.clearUserMessages(userId);
      return {
        success: true,
        deletedCount
      };
    } catch (error) {
      console.error('Error in clearChatHistory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    return await this.chatMessage.getMessageById(messageId);
  }

  /**
   * Search messages
   */
  async searchMessages(
    userId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      const messages = await this.chatMessage.searchMessages(userId, searchTerm, limit);
      return {
        success: true,
        messages
      };
    } catch (error) {
      console.error('Error in searchMessages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Extract content from uploaded file
   */
  private async extractFileContent(file: Express.Multer.File): Promise<string> {
    try {
      const content = await fs.readFile(file.path, 'utf-8');
      
      // Basic content extraction based on file type
      if (file.mimetype === 'text/plain') {
        return content;
      } else if (file.mimetype === 'application/json') {
        return JSON.stringify(JSON.parse(content), null, 2);
      } else {
        // For other file types, return as-is or implement specific parsers
        return content;
      }
    } catch (error) {
      throw new Error(`Failed to extract content from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract vocabulary and grammar from AI response
   */
  private extractLearningData(aiResponse: string): { vocabulary: string[]; grammar: string[] } {
    const vocabulary: string[] = [];
    const grammar: string[] = [];

    // Simple regex-based extraction (can be improved with more sophisticated NLP)
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
      vocabulary: [...new Set(vocabulary)], // Remove duplicates
      grammar: [...new Set(grammar)]
    };
  }

  /**
   * Get appropriate model for task type and language
   */
  private getModelForTask(taskType: TaskType, language: Language): string {
    // Use configured model for chat-related tasks
    return process.env.CHAT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
  }

  /**
   * Clean up uploaded file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }
}
