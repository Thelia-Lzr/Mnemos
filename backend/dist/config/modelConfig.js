"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelConfigManager = void 0;
class ModelConfigManager {
    static getDefaultModel() {
        return process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
    }
    static getModelForTask(taskType) {
        const modelMap = {
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
    static getAllConfiguredModels() {
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
    static validateConfiguration() {
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
    static getModelConfig(modelName) {
        const defaultConfig = {
            name: modelName,
            maxTokens: 8192,
            temperature: 0.7,
            costPerToken: 0.005
        };
        const modelConfigs = {
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
    static logConfiguration() {
        const config = this.getAllConfiguredModels();
        console.log('🤖 AI Model Configuration:');
        Object.entries(config).forEach(([task, model]) => {
            console.log(`  ${task}: ${model}`);
        });
    }
}
exports.ModelConfigManager = ModelConfigManager;
exports.default = ModelConfigManager;
//# sourceMappingURL=modelConfig.js.map