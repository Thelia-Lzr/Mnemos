export enum TaskType {
  CONVERSATION = "conversation",      // 日常对话学习
  MATERIAL_ANALYSIS = "analysis",     // 材料分析
  EXERCISE_GENERATION = "exercise",   // 练习生成
  LEVEL_ASSESSMENT = "assessment",    // 水平评估
  VOCABULARY_EXTRACTION = "vocab",    // 词汇提取
  FUNCTION_CALLING = "function",      // 功能调用理解
  INTENT_RECOGNITION = "intent"       // 意图识别
}

export enum Language {
  ENGLISH = "en",
  JAPANESE = "ja", 
  FRENCH = "fr"
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  processingTime: number;
  metadata?: Record<string, any>;
}

export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  costPerToken: number; // Cost in credits per token
}

export interface TokenUsageRecord {
  userId: string;
  taskType: TaskType;
  model: string;
  tokensUsed: number;
  creditCost: number;
  timestamp: Date;
}
