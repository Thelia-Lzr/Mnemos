/**
 * AI Model Configuration
 * Centralized configuration for all AI models used in the application
 */

export interface ModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  costPerToken: number;
}

export class ModelConfigManager {
  /**
   * Get the default AI model from environment variables
   */
  static getDefaultModel(): string {
    return process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
  }

  /**
   * Get model for specific task type
   */
  static getModelForTask(taskType: string): string {
    const modelMap: Record<string, string> = {
      'chat': process.env.CHAT_MODEL || this.getDefaultModel(),
      'conversation': process.env.CHAT_MODEL || this.getDefaultModel(),
      'practice_generation': process.env.PRACTICE_GENERATION_MODEL || this.getDefaultModel(),
      'analysis': process.env.ANALYSIS_MODEL || this.getDefaultModel(),
      'assessment': process.env.ASSESSMENT_MODEL || this.getDefaultModel(),
      'vocabulary': process.env.VOCABULARY_MODEL || this.getDefaultModel(),
      'function_calling': process.env.FUNCTION_CALLING_MODEL || this.getDefaultModel(),
      'intent_recognition': process.env.INTENT_RECOGNITION_MODEL || this.getDefaultModel(),
      'daily_recommendation': process.env.DAILY_RECOMMENDATION_MODEL || this.getDefaultModel(),
    };

    return modelMap[taskType.toLowerCase()] || this.getDefaultModel();
  }

  /**
   * Get all configured models
   */
  static getAllConfiguredModels(): Record<string, string> {
    return {
      default: this.getDefaultModel(),
      chat: process.env.CHAT_MODEL || this.getDefaultModel(),
      practiceGeneration: process.env.PRACTICE_GENERATION_MODEL || this.getDefaultModel(),
      analysis: process.env.ANALYSIS_MODEL || this.getDefaultModel(),
      assessment: process.env.ASSESSMENT_MODEL || this.getDefaultModel(),
      vocabulary: process.env.VOCABULARY_MODEL || this.getDefaultModel(),
      functionCalling: process.env.FUNCTION_CALLING_MODEL || this.getDefaultModel(),
      intentRecognition: process.env.INTENT_RECOGNITION_MODEL || this.getDefaultModel(),
      dailyRecommendation: process.env.DAILY_RECOMMENDATION_MODEL || this.getDefaultModel(),
    };
  }

  /**
   * Validate that all required environment variables are set
   */
  static validateConfiguration(): { isValid: boolean; missingVars: string[] } {
    const requiredVars = [
      'DEFAULT_AI_MODEL',
      'OPENROUTER_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    return {
      isValid: missingVars.length === 0,
      missingVars
    };
  }

  /**
   * Get model configuration for a specific model
   */
  static getModelConfig(modelName: string): ModelConfig {
    // Default configuration for ChatGPT-5.1-Chat
    const defaultConfig: ModelConfig = {
      name: modelName,
      maxTokens: 8192,
      temperature: 0.7,
      costPerToken: 0.005
    };

    // Model-specific configurations
    const modelConfigs: Record<string, Partial<ModelConfig>> = {
      'openai/gpt-4o': {
        maxTokens: 8192,
        temperature: 0.7,
        costPerToken: 0.005
      },
      'openai/gpt-4': {
        maxTokens: 2048,
        temperature: 0.7,
        costPerToken: 0.005
      },
      'openai/gpt-3.5-turbo': {
        maxTokens: 2048,
        temperature: 0.7,
        costPerToken: 0.001
      }
    };

    const specificConfig = modelConfigs[modelName];
    return specificConfig ? { ...defaultConfig, ...specificConfig } : defaultConfig;
  }

  /**
   * Log current model configuration (for debugging)
   */
  static logConfiguration(): void {
    const config = this.getAllConfiguredModels();
    console.log('🤖 AI Model Configuration:');
    Object.entries(config).forEach(([task, model]) => {
      console.log(`  ${task}: ${model}`);
    });
  }
}

export default ModelConfigManager;