export declare enum TaskType {
    CONVERSATION = "conversation",
    MATERIAL_ANALYSIS = "analysis",
    EXERCISE_GENERATION = "exercise",
    LEVEL_ASSESSMENT = "assessment",
    VOCABULARY_EXTRACTION = "vocab",
    FUNCTION_CALLING = "function",
    INTENT_RECOGNITION = "intent"
}
export declare enum Language {
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
    costPerToken: number;
}
export interface TokenUsageRecord {
    userId: string;
    taskType: TaskType;
    model: string;
    tokensUsed: number;
    creditCost: number;
    timestamp: Date;
}
//# sourceMappingURL=openrouter.d.ts.map