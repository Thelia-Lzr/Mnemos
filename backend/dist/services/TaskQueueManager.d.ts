import { AITask, TaskStatus, TaskResult, QueueMetrics } from '../types/task';
export declare class TaskQueueManager {
    private static instance;
    private static testInstance;
    private queues;
    private taskStatuses;
    private taskResults;
    private openRouterService;
    private testMode;
    private constructor();
    static getInstance(testMode?: boolean): TaskQueueManager;
    private initializeQueues;
    private setupQueueProcessor;
    private setupQueueEvents;
    private getConcurrencyForTaskType;
    private executeAITask;
    private isRetryableError;
    createTask(task: AITask): Promise<string>;
    createBatchTasks(tasks: AITask[]): Promise<string[]>;
    getTaskStatus(taskId: string): Promise<TaskStatus | null>;
    getTaskResult(taskId: string): Promise<TaskResult | null>;
    cancelTask(taskId: string): Promise<boolean>;
    retryTask(taskId: string): Promise<boolean>;
    getQueueMetrics(): Promise<QueueMetrics>;
    getUserTasks(userId: string): Promise<TaskStatus[]>;
    private convertPriorityToNumber;
    private updateTaskStatus;
    private storeTaskResult;
    cleanupExpiredTasks(): Promise<void>;
    shutdown(): Promise<void>;
    completeTask(taskId: string, result: any): Promise<void>;
    failTask(taskId: string, error: Error): Promise<void>;
}
//# sourceMappingURL=TaskQueueManager.d.ts.map