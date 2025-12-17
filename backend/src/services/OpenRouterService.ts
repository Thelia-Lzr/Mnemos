import axios, { AxiosInstance, AxiosError } from 'axios';
import { TaskType, Language, AIResponse, OpenRouterRequest, OpenRouterResponse, ModelConfig, TokenUsageRecord } from '../types/openrouter';

export class OpenRouterService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private tokenUsageRecords: TokenUsageRecord[] = [];
  private testMode: boolean;

  constructor(testMode: boolean = false) {
    this.testMode = testMode;
    this.apiKey = process.env.OPENROUTER_API_KEY || (testMode ? 'test-key' : '');
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey && !testMode) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
        'X-Title': 'AI Language Learning App'
      },
      timeout: 30000 // 30 seconds timeout
    });

    this.initializeModelConfigs();
    this.setupRetryInterceptor();
  }

  private initializeModelConfigs(): void {
    // Get default model from environment or use fallback
    const defaultModel = process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
    
    this.modelConfigs = new Map([
      // Primary model - ChatGPT-5.1-Chat for all tasks (configured via environment)
      [defaultModel, {
        name: defaultModel,
        maxTokens: 8192,
        temperature: 0.7,
        costPerToken: 0.005 // Advanced model cost
      }],
      
      // Fallback models (kept for compatibility)
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
        costPerToken: 0.001 // 1 credit per 1000 tokens
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

  private setupRetryInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any;
        
        // Retry logic for specific error codes
        if (config && this.shouldRetry(error) && !config.retryCount) {
          config.retryCount = 0;
        }
        
        if (config?.retryCount < 3 && this.shouldRetry(error)) {
          config.retryCount++;
          
          // Exponential backoff
          const delay = Math.pow(2, config.retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.client.request(config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true; // Network error
    
    const status = error.response.status;
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  /**
   * Select the appropriate AI model based on task type and language
   */
  public selectModel(taskType: TaskType, language: Language): string {
    // Get model from environment variables based on task type
    const modelMap: Record<TaskType, string> = {
      [TaskType.CONVERSATION]: process.env.CHAT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
      [TaskType.MATERIAL_ANALYSIS]: process.env.ANALYSIS_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
      [TaskType.EXERCISE_GENERATION]: process.env.PRACTICE_GENERATION_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
      [TaskType.LEVEL_ASSESSMENT]: process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
      [TaskType.VOCABULARY_EXTRACTION]: process.env.VOCABULARY_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
      [TaskType.FUNCTION_CALLING]: process.env.FUNCTION_CALLING_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o',
      [TaskType.INTENT_RECOGNITION]: process.env.INTENT_RECOGNITION_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o'
    };

    const selectedModel = modelMap[taskType];
    
    // Verify selected model is available in our config
    if (this.modelConfigs.has(selectedModel)) {
      return selectedModel;
    }
    
    // Fallback to default model
    const defaultModel = process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
    if (this.modelConfigs.has(defaultModel)) {
      return defaultModel;
    }
    
    // Final fallback to first available model
    const availableModels = Array.from(this.modelConfigs.keys());
    return availableModels[0] || 'openai/gpt-4o';
  }

  /**
   * Call AI model with streaming support
   */
  public async callAIStream(
    model: string,
    prompt: string,
    context?: any,
    userId?: string
  ): Promise<any> {
    // Return mock stream in test mode
    if (this.testMode) {
      return this.generateMockStream(model, prompt, context);
    }

    try {
      const modelConfig = this.modelConfigs.get(model);
      if (!modelConfig) {
        throw new Error(`Unsupported model: ${model}`);
      }

      const messages = this.buildMessages(prompt, context);
      
      const request: OpenRouterRequest = {
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
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`OpenRouter API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Generate mock stream for testing
   */
  private generateMockStream(model: string, prompt: string, context?: any): ReadableStream {
    const mockResponse = "这是一个模拟的流式响应。AI正在分析您的问题并提供详细的回答。";
    const chunks = mockResponse.split('');
    let index = 0;

    return new ReadableStream({
      start(controller) {
        const interval = setInterval(() => {
          if (index < chunks.length) {
            controller.enqueue(new TextEncoder().encode(chunks[index]));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 50); // 50ms delay between characters
      }
    });
  }

  /**
   * Call AI model with the given prompt and context
   */
  public async callAI(
    model: string, 
    prompt: string, 
    context?: any,
    userId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Return mock response in test mode
    if (this.testMode) {
      return this.generateMockResponse(model, prompt, context, startTime);
    }
    
    try {
      const modelConfig = this.modelConfigs.get(model);
      if (!modelConfig) {
        throw new Error(`Unsupported model: ${model}`);
      }

      const messages = this.buildMessages(prompt, context);
      
      const request: OpenRouterRequest = {
        model,
        messages,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        stream: false
      };

      const response = await this.client.post<OpenRouterResponse>('/chat/completions', request);
      const processingTime = Date.now() - startTime;
      
      const choice = response.data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from OpenRouter API');
      }

      const tokensUsed = response.data.usage.total_tokens;
      const creditCost = this.calculateCreditCost(model, tokensUsed);

      // Record token usage
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
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`OpenRouter API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Generate mock response for testing
   */
  private generateMockResponse(model: string, prompt: string, context?: any, startTime?: number): AIResponse {
    const actualStartTime = startTime || Date.now();
    const processingTime = Date.now() - actualStartTime;
    const mockTokens = Math.floor(prompt.length / 4) + 50; // Rough token estimation
    const creditCost = this.calculateCreditCost(model, mockTokens);
    
    // Generate contextual mock response based on prompt content
    let mockContent = 'Mock AI response for testing';
    
    if (prompt.toLowerCase().includes('intent') || prompt.toLowerCase().includes('parse') || 
        prompt.includes('意图') || prompt.includes('分析用户消息')) {
      // Determine appropriate intent based on the actual user message in the prompt
      let intent = 'language_learning';
      let isPrivacySensitive = false;
      
      // Extract the user message from the prompt (support both English and Chinese formats)
      const userMessageMatch = prompt.match(/(?:User message|用户消息)：?"([^"]+)"/);
      const userMessage = userMessageMatch ? userMessageMatch[1].toLowerCase() : prompt.toLowerCase();
      
      if (userMessage.includes('practice') || userMessage.includes('exercise') || 
          userMessage.includes('练习') || userMessage.includes('生成')) {
        intent = 'generate_practice';
      } else if (userMessage.includes('vocabulary') || userMessage.includes('words') || 
                 userMessage.includes('词汇')) {
        intent = 'generate_practice'; // 词汇练习也是练习生成
      } else if (userMessage.includes('progress') || userMessage.includes('learning progress') ||
                 userMessage.includes('进度')) {
        intent = 'check_progress';
      } else if (userMessage.includes('credit') || userMessage.includes('balance')) {
        intent = 'check_credits';
      } else if (userMessage.includes('password') || userMessage.includes('account') || userMessage.includes('payment') || userMessage.includes('delete')) {
        intent = 'account_management';
        isPrivacySensitive = true;
      } else if (userMessage.includes('history')) {
        intent = 'view_practice_history';
      } else if (userMessage.includes('statistics') || userMessage.includes('stats')) {
        intent = 'view_statistics';
      }
      
      mockContent = JSON.stringify({
        intent: intent,
        confidence: 0.85,
        parameters: { language: 'en', skill: 'vocabulary' },
        isPrivacySensitive: isPrivacySensitive,
        requiresConfirmation: isPrivacySensitive
      });
    } else if (prompt.toLowerCase().includes('privacy') || prompt.toLowerCase().includes('sensitive')) {
      mockContent = JSON.stringify({
        intent: 'account_management',
        confidence: 0.95,
        parameters: {},
        isPrivacySensitive: true,
        requiresConfirmation: true
      });
    } else if (prompt.toLowerCase().includes('chat') || prompt.toLowerCase().includes('message')) {
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

  /**
   * Build messages array for the API request
   */
  private buildMessages(prompt: string, context?: any): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];

    // Add system context if provided
    if (context?.systemPrompt) {
      messages.push({
        role: 'system',
        content: context.systemPrompt
      });
    }

    // Add conversation history if provided
    if (context?.history && Array.isArray(context.history)) {
      for (const msg of context.history) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add the current user prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  /**
   * Calculate credit cost based on model and token usage
   */
  public calculateCreditCost(model: string, tokens: number): number {
    const modelConfig = this.modelConfigs.get(model);
    if (!modelConfig) {
      return 0;
    }

    return Math.ceil(tokens * modelConfig.costPerToken);
  }

  /**
   * Record token usage for tracking and billing
   */
  private recordTokenUsage(userId: string, model: string, tokensUsed: number, creditCost: number): void {
    // Determine task type based on model (reverse lookup)
    let taskType = TaskType.CONVERSATION;
    for (const [type, modelName] of Object.entries({
      [TaskType.CONVERSATION]: process.env.CHAT_MODEL || 'openai/gpt-4o',
      [TaskType.MATERIAL_ANALYSIS]: process.env.ANALYSIS_MODEL || 'openai/gpt-4o',
      [TaskType.EXERCISE_GENERATION]: process.env.PRACTICE_GENERATION_MODEL || 'openai/gpt-4o',
      [TaskType.LEVEL_ASSESSMENT]: process.env.ASSESSMENT_MODEL || 'openai/gpt-4o',
      [TaskType.VOCABULARY_EXTRACTION]: process.env.VOCABULARY_MODEL || 'openai/gpt-4o',
      [TaskType.FUNCTION_CALLING]: process.env.FUNCTION_CALLING_MODEL || 'openai/gpt-4o',
      [TaskType.INTENT_RECOGNITION]: process.env.INTENT_RECOGNITION_MODEL || 'openai/gpt-4o'
    })) {
      if (modelName === model) {
        taskType = type as TaskType;
        break;
      }
    }

    const record: TokenUsageRecord = {
      userId,
      taskType,
      model,
      tokensUsed,
      creditCost,
      timestamp: new Date()
    };

    this.tokenUsageRecords.push(record);
    
    // Keep only last 1000 records in memory
    if (this.tokenUsageRecords.length > 1000) {
      this.tokenUsageRecords = this.tokenUsageRecords.slice(-1000);
    }
  }

  /**
   * Get token usage statistics for a user
   */
  public getTokenUsageStats(userId: string, timeRange?: { start: Date, end: Date }): {
    totalTokens: number;
    totalCredits: number;
    usageByModel: Record<string, { tokens: number, credits: number }>;
    usageByTaskType: Record<TaskType, { tokens: number, credits: number }>;
  } {
    let records = this.tokenUsageRecords.filter(record => record.userId === userId);
    
    if (timeRange) {
      records = records.filter(record => 
        record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );
    }

    const stats = {
      totalTokens: 0,
      totalCredits: 0,
      usageByModel: {} as Record<string, { tokens: number, credits: number }>,
      usageByTaskType: {} as Record<TaskType, { tokens: number, credits: number }>
    };

    for (const record of records) {
      stats.totalTokens += record.tokensUsed;
      stats.totalCredits += record.creditCost;

      // By model
      if (!stats.usageByModel[record.model]) {
        stats.usageByModel[record.model] = { tokens: 0, credits: 0 };
      }
      stats.usageByModel[record.model].tokens += record.tokensUsed;
      stats.usageByModel[record.model].credits += record.creditCost;

      // By task type
      if (!stats.usageByTaskType[record.taskType]) {
        stats.usageByTaskType[record.taskType] = { tokens: 0, credits: 0 };
      }
      stats.usageByTaskType[record.taskType].tokens += record.tokensUsed;
      stats.usageByTaskType[record.taskType].credits += record.creditCost;
    }

    return stats;
  }

  /**
   * Get available models and their configurations
   */
  public getAvailableModels(): ModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  /**
   * Update model configuration
   */
  public updateModelConfig(model: string, config: Partial<ModelConfig>): void {
    const existingConfig = this.modelConfigs.get(model);
    if (existingConfig) {
      this.modelConfigs.set(model, { ...existingConfig, ...config });
    }
  }
}

// Export singleton instance factory
export const createOpenRouterService = (testMode: boolean = false) => new OpenRouterService(testMode);

// Default instance for production use - only create if API key is available
export const openRouterService = process.env.OPENROUTER_API_KEY || process.env.NODE_ENV === 'test'
  ? (process.env.NODE_ENV === 'test' ? createOpenRouterService(true) : createOpenRouterService())
  : null;
