import { TaskResult } from '../types/task';
export interface TaskResultCacheOptions {
    ttl?: number;
    compress?: boolean;
    maxSize?: number;
}
export interface TaskNotificationConfig {
    webhookUrl?: string;
    emailNotification?: boolean;
    pushNotification?: boolean;
    userId: string;
}
export interface TaskCleanupPolicy {
    maxAge: number;
    maxResults: number;
    cleanupInterval: number;
}
export declare class TaskResultManager {
    private static instance;
    private cleanupTimer?;
    private readonly defaultCacheOptions;
    private readonly defaultCleanupPolicy;
    private constructor();
    static getInstance(): TaskResultManager;
    storeTaskResult(taskId: string, result: TaskResult, options?: TaskResultCacheOptions): Promise<void>;
    getTaskResult(taskId: string): Promise<TaskResult | null>;
    deleteTaskResult(taskId: string): Promise<boolean>;
    getUserTaskResults(userId: string, limit?: number, offset?: number): Promise<TaskResult[]>;
    getUserSuccessfulResults(userId: string, limit?: number): Promise<TaskResult[]>;
    getUserFailedResults(userId: string, limit?: number): Promise<TaskResult[]>;
    sendTaskCompletionNotification(taskId: string, result: TaskResult, config: TaskNotificationConfig): Promise<void>;
    storeBatchTaskResults(results: Array<{
        taskId: string;
        result: TaskResult;
        options?: TaskResultCacheOptions;
    }>): Promise<void>;
    getBatchTaskResults(taskIds: string[]): Promise<(TaskResult | null)[]>;
    getTaskResultStats(userId?: string): Promise<{
        total: number;
        successful: number;
        failed: number;
        averageExecutionTime: number;
        totalTokensUsed: number;
    }>;
    cleanupExpiredResults(policy?: Partial<TaskCleanupPolicy>): Promise<number>;
    private startCleanupTimer;
    stopCleanupTimer(): void;
    private getResultCacheKey;
    private getResultMetadataKey;
    private getUserResultIndexKey;
    private compressData;
    private decompressData;
    private extractUserIdFromResult;
    private extractTaskTypeFromResult;
    private addToUserResultIndex;
    private removeFromUserResultIndex;
    private getUserResultTaskIds;
    private getAllUserIndexKeys;
    private extractUserIdFromIndexKey;
    private getTaskResultMetadata;
    private getAllTaskResults;
    private sendWebhookNotification;
    private sendEmailNotification;
    private sendPushNotification;
}
export declare const taskResultManager: TaskResultManager;
//# sourceMappingURL=TaskResultManager.d.ts.map