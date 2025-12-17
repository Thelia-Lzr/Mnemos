import { AITask, TaskPriority, TaskStatus, TaskResult } from '../types/task';
export declare class AsyncTaskManager {
    private static instance;
    private static testInstance;
    private taskQueueManager;
    private constructor();
    static getInstance(testMode?: boolean): AsyncTaskManager;
    createTask(task: Omit<AITask, 'id' | 'createdAt'>): Promise<string>;
    createChatTask(userId: string, model: string, prompt: string, context?: any, priority?: TaskPriority): Promise<string>;
    createPracticeGenerationTask(userId: string, model: string, prompt: string, context?: any, priority?: TaskPriority): Promise<string>;
    createMaterialAnalysisTask(userId: string, model: string, prompt: string, context?: any, priority?: TaskPriority): Promise<string>;
    createLevelAssessmentTask(userId: string, model: string, prompt: string, context?: any, priority?: TaskPriority): Promise<string>;
    createDailyRecommendationTask(userId: string, model: string, prompt: string, context?: any, priority?: TaskPriority): Promise<string>;
    createVocabularyExtractionTask(userId: string, model: string, prompt: string, context?: any, priority?: TaskPriority): Promise<string>;
    createFunctionCallTask(userId: string, model: string, prompt: string, context?: any, priority?: TaskPriority): Promise<string>;
    getTaskStatus(taskId: string): Promise<TaskStatus | null>;
    getTaskResult(taskId: string): Promise<TaskResult | null>;
    waitForTaskCompletion(taskId: string, timeoutMs?: number, pollIntervalMs?: number): Promise<TaskResult>;
    cancelTask(taskId: string): Promise<boolean>;
    retryTask(taskId: string): Promise<boolean>;
    createBatchTasks(tasks: Omit<AITask, 'id' | 'createdAt'>[]): Promise<string[]>;
    getBatchTaskStatus(taskIds: string[]): Promise<(TaskStatus | null)[]>;
    cancelBatchTasks(taskIds: string[]): Promise<boolean[]>;
    getUserTasks(userId: string): Promise<TaskStatus[]>;
    getUserActiveTasks(userId: string): Promise<TaskStatus[]>;
    getUserCompletedTasks(userId: string): Promise<TaskStatus[]>;
    isTaskCompleted(taskId: string): Promise<boolean>;
    isTaskSuccessful(taskId: string): Promise<boolean>;
    getQueueMetrics(): Promise<import("../types/task").QueueMetrics>;
}
//# sourceMappingURL=AsyncTaskManager.d.ts.map