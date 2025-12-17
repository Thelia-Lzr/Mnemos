export interface ModelConfig {
    name: string;
    maxTokens: number;
    temperature: number;
    costPerToken: number;
}
export declare class ModelConfigManager {
    static getDefaultModel(): string;
    static getModelForTask(taskType: string): string;
    static getAllConfiguredModels(): Record<string, string>;
    static validateConfiguration(): {
        isValid: boolean;
        missingVars: string[];
    };
    static getModelConfig(modelName: string): ModelConfig;
    static logConfiguration(): void;
}
export default ModelConfigManager;
//# sourceMappingURL=modelConfig.d.ts.map