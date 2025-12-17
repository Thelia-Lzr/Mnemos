import { Pool } from 'pg';
import { ChatMessage } from '../models/ChatMessage';
import { AIService } from './AIService';
import { AsyncTaskManager } from './AsyncTaskManager';
import { aiPromptService } from './AIPromptService';

import { 
  UserIntent, 
  IntentResult, 
  FunctionIntent, 
  FunctionResult, 
  FunctionCall,
  FunctionCallRequest,
  FunctionCallResponse,
  ParseIntentRequest,
  ParseIntentResponse,
  AvailableFunctionsResponse
} from '../types/chat';
import { TaskType, Language } from '../types/openrouter';
import { v4 as uuidv4 } from 'uuid';

export class AIFunctionService {
  private _chatMessage: ChatMessage;
  private aiService: AIService;
  private asyncTaskManager: AsyncTaskManager;
  private _db: Pool;

  constructor(database: Pool, testMode: boolean = false) {
    this._db = database;
    this._chatMessage = new ChatMessage(database);
    this.aiService = new AIService(database, testMode);
    this.asyncTaskManager = AsyncTaskManager.getInstance(testMode);
  }

  /**
   * Parse user intent from message
   */
  async parseIntent(
    userId: string,
    request: ParseIntentRequest
  ): Promise<ParseIntentResponse> {
    try {
      const language = (request.language as Language) || Language.ENGLISH;
      
      // Use AI prompt service for intent recognition
      const intentPrompt = aiPromptService.generateIntentRecognitionPrompt(
        request.message,
        language,
        request.context ? JSON.stringify(request.context) : undefined
      );

      if (!intentPrompt) {
        throw new Error('Failed to generate intent recognition prompt');
      }

      // Call AI service for intent recognition using the local aiService instance
      const aiResponse = await this.aiService.callAIWithCredits(
        userId,
        TaskType.INTENT_RECOGNITION,
        language,
        intentPrompt.userPrompt,
        {
          systemPrompt: intentPrompt.systemPrompt,
          ...request.context
        }
      );

      // Parse AI response to extract intent
      const intentResult = this.parseIntentFromAIResponse(aiResponse.content);

      return {
        success: true,
        result: intentResult
      };
    } catch (error) {
      console.error('Error in parseIntent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Execute function based on intent (synchronous)
   */
  async executeFunction(
    userId: string,
    request: FunctionCallRequest
  ): Promise<FunctionCallResponse> {
    try {
      // Check if intent is privacy sensitive
      if (this.isPrivacySensitive(request.intent)) {
        return {
          success: false,
          error: 'This operation involves sensitive account information. Please use the appropriate interface to perform this action.'
        };
      }

      // Create function intent
      const functionIntent: FunctionIntent = {
        intent: request.intent,
        parameters: request.parameters,
        userId,
        language: request.language || 'en'
      };

      // Execute the function
      const startTime = Date.now();
      const result = await this.executeFunctionInternal(functionIntent);
      const executionTime = Date.now() - startTime;

      // Create function call record (for future logging/auditing)
      const _functionCall: FunctionCall = {
        id: uuidv4(),
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
    } catch (error) {
      console.error('Error in executeFunction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Execute function based on intent (asynchronous)
   */
  async executeFunctionAsync(
    userId: string,
    request: FunctionCallRequest
  ): Promise<FunctionCallResponse> {
    try {
      // Check if intent is privacy sensitive
      if (this.isPrivacySensitive(request.intent)) {
        return {
          success: false,
          error: 'This operation involves sensitive account information. Please use the appropriate interface to perform this action.'
        };
      }

      // Create context for async execution
      const context = {
        intent: request.intent,
        parameters: request.parameters,
        language: request.language || 'en'
      };

      // Create async task for function execution
      const taskId = await this.asyncTaskManager.createFunctionCallTask(
        userId,
        'function-executor', // Special model identifier for function calls
        JSON.stringify(request),
        context
      );

      return {
        success: true,
        taskId
      };
    } catch (error) {
      console.error('Error in executeFunctionAsync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get available functions
   */
  async getAvailableFunctions(): Promise<AvailableFunctionsResponse> {
    try {
      const functions = [
        {
          intent: UserIntent.GENERATE_PRACTICE,
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
          intent: UserIntent.VIEW_PRACTICE_HISTORY,
          description: 'View user\'s practice history and performance',
          parameters: {
            limit: 'number (optional, default: 20)',
            language: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.CHECK_PROGRESS,
          description: 'Check user\'s learning progress and milestones',
          parameters: {
            language: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.VIEW_CAPABILITIES,
          description: 'View user\'s language capabilities and assessments',
          parameters: {
            language: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.ADD_VOCABULARY,
          description: 'Add words to user\'s vocabulary list',
          parameters: {
            words: 'array (required)',
            language: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.VIEW_VOCABULARY,
          description: 'View user\'s vocabulary list and mastery levels',
          parameters: {
            language: 'string (optional)',
            masteryLevel: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.START_PK_MATCH,
          description: 'Start a PK match with another user',
          parameters: {
            language: 'string (required)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.VIEW_PK_HISTORY,
          description: 'View PK battle history and statistics',
          parameters: {
            limit: 'number (optional, default: 20)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.CHECK_MMR,
          description: 'Check user\'s MMR rating and ranking',
          parameters: {
            language: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.VIEW_STATISTICS,
          description: 'View user\'s learning statistics and analytics',
          parameters: {
            timeframe: 'string (optional, default: "month")'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.CHECK_CREDITS,
          description: 'Check user\'s credit balance and transaction history',
          parameters: {
            includeHistory: 'boolean (optional, default: false)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.VIEW_MILESTONES,
          description: 'View user\'s learning milestones and progress',
          parameters: {
            language: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.LANGUAGE_LEARNING,
          description: 'General language learning conversation and assistance',
          parameters: {
            topic: 'string (optional)',
            language: 'string (optional)'
          },
          isPrivacySensitive: false
        },
        {
          intent: UserIntent.MATERIAL_ANALYSIS,
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
    } catch (error) {
      console.error('Error in getAvailableFunctions:', error);
      return {
        success: false,
        functions: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create intent recognition prompt
   */
  private createIntentRecognitionPrompt(message: string, context?: Record<string, any>): string {
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

  /**
   * Parse intent from AI response
   */
  private parseIntentFromAIResponse(aiResponse: string): IntentResult {
    try {
      // Clean the response to handle markdown code blocks
      let cleanResponse = aiResponse.trim();
      
      // Remove markdown code block markers if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent as UserIntent,
          confidence: parsed.confidence || 0.5,
          parameters: parsed.parameters || {},
          requiresConfirmation: parsed.requiresConfirmation || false,
          isPrivacySensitive: parsed.isPrivacySensitive || false
        };
      }
    } catch (error) {
      console.warn('Failed to parse intent from AI response:', error);
      console.warn('Raw response:', aiResponse);
    }

    // Fallback to default intent
    return {
      intent: UserIntent.LANGUAGE_LEARNING,
      confidence: 0.3,
      parameters: {},
      requiresConfirmation: false,
      isPrivacySensitive: false
    };
  }

  /**
   * Check if intent is privacy sensitive
   */
  private isPrivacySensitive(intent: UserIntent): boolean {
    const privacySensitiveIntents = [
      UserIntent.ACCOUNT_MANAGEMENT,
      UserIntent.PAYMENT_OPERATIONS,
      UserIntent.PASSWORD_CHANGE
    ];
    return privacySensitiveIntents.includes(intent);
  }

  /**
   * Execute function based on intent
   */
  private async executeFunctionInternal(functionIntent: FunctionIntent): Promise<FunctionResult> {
    const { intent, parameters, userId, language } = functionIntent;

    try {
      switch (intent) {
        case UserIntent.GENERATE_PRACTICE:
          return await this.handleGeneratePractice(userId, parameters, language);
        
        case UserIntent.VIEW_PRACTICE_HISTORY:
          return await this.handleViewPracticeHistory(userId, parameters);
        
        case UserIntent.CHECK_PROGRESS:
          return await this.handleCheckProgress(userId, parameters, language);
        
        case UserIntent.VIEW_CAPABILITIES:
          return await this.handleViewCapabilities(userId, parameters, language);
        
        case UserIntent.ADD_VOCABULARY:
          return await this.handleAddVocabulary(userId, parameters, language);
        
        case UserIntent.VIEW_VOCABULARY:
          return await this.handleViewVocabulary(userId, parameters, language);
        
        case UserIntent.CHECK_CREDITS:
          return await this.handleCheckCredits(userId, parameters);
        
        case UserIntent.VIEW_STATISTICS:
          return await this.handleViewStatistics(userId, parameters);
        
        case UserIntent.VIEW_MILESTONES:
          return await this.handleViewMilestones(userId, parameters, language);
        
        default:
          return {
            success: false,
            error: `Function for intent ${intent} is not yet implemented`
          };
      }
    } catch (error) {
      console.error(`Error executing function for intent ${intent}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Handle generate practice function
   */
  private async handleGeneratePractice(userId: string, parameters: any, language: string): Promise<FunctionResult> {
    try {
      // Import PracticeGenerationService and dependencies
      const { PracticeGenerationService } = await import('./PracticeGenerationService');
      const { UserCapabilityService } = await import('./UserCapabilityService');
      const { CreditService } = await import('./CreditService');
      const { AsyncTaskManager } = await import('./AsyncTaskManager');
      const { OpenRouterService } = await import('./OpenRouterService');
      
      // Initialize services
      const userCapabilityService = new UserCapabilityService(this._db, this.aiService);
      const creditService = new CreditService(this._db);
      const asyncTaskManager = AsyncTaskManager.getInstance();
      const openRouterService = new OpenRouterService();
      
      const practiceGenerationService = new PracticeGenerationService(
        this._db,
        userCapabilityService,
        creditService,
        asyncTaskManager,
        openRouterService
      );

      // Parse parameters
      const practiceType = parameters.type || 'general';
      const difficulty = parameters.difficulty || 'intermediate';
      const focusAreas = parameters.focusAreas || [];
      const vocabularyWords = parameters.vocabularyWords || [];
      const grammarPoints = parameters.grammarPoints || [];
      const count = parameters.count || 10;

      // Generate practice group
      const practiceGroup = await practiceGenerationService.generatePracticeGroup({
        userId,
        language: language as any,
        difficulty: difficulty as any,
        type: practiceType as any,
        focusAreas: focusAreas as any,
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
    } catch (error) {
      console.error('Error generating practice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate practice'
      };
    }
  }

  /**
   * Handle view practice history function
   */
  private async handleViewPracticeHistory(_userId: string, parameters: any): Promise<FunctionResult> {
    // This would integrate with PracticeService
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

  /**
   * Handle check progress function
   */
  private async handleCheckProgress(_userId: string, parameters: any, language: string): Promise<FunctionResult> {
    // This would integrate with UserCapabilityService
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

  /**
   * Handle view capabilities function
   */
  private async handleViewCapabilities(_userId: string, parameters: any, language: string): Promise<FunctionResult> {
    // This would integrate with UserCapabilityService
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

  /**
   * Handle add vocabulary function
   */
  private async handleAddVocabulary(_userId: string, parameters: any, language: string): Promise<FunctionResult> {
    // This would integrate with VocabularyService
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

  /**
   * Handle view vocabulary function
   */
  private async handleViewVocabulary(_userId: string, parameters: any, language: string): Promise<FunctionResult> {
    // This would integrate with VocabularyService
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

  /**
   * Handle check credits function
   */
  private async handleCheckCredits(userId: string, parameters: any): Promise<FunctionResult> {
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
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve credit information'
      };
    }
  }

  /**
   * Handle view statistics function
   */
  private async handleViewStatistics(userId: string, parameters: any): Promise<FunctionResult> {
    try {
      const stats = await this.aiService.getAIUsageStats(userId, 30);
      return {
        success: true,
        data: {
          aiUsage: stats,
          timeframe: parameters.timeframe || 'month'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve statistics'
      };
    }
  }

  /**
   * Handle view milestones function
   */
  private async handleViewMilestones(_userId: string, parameters: any, language: string): Promise<FunctionResult> {
    // This would integrate with milestone/progress tracking
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
