export declare enum AITaskType {
    CHAT_RESPONSE = "chat_response",
    PRACTICE_GENERATION = "practice_generation",
    MATERIAL_ANALYSIS = "material_analysis",
    LEVEL_ASSESSMENT = "level_assessment",
    DAILY_RECOMMENDATION = "daily_recommendation",
    VOCABULARY_EXTRACTION = "vocabulary_extraction",
    FUNCTION_CALL = "function_call"
}
export declare enum TaskPriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    URGENT = 4
}
export declare enum TaskExecutionStatus {
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    TIMEOUT = "timeout"
}
export interface AITask {
    id: string;
    userId: string;
    type: AITaskType;
    priority: TaskPriority;
    model: string;
    prompt: string;
    context?: any;
    createdAt: Date;
    scheduledAt?: Date;
    maxRetries: number;
    timeout: number;
    dependencies?: string[];
    webhookUrl?: string;
    notifyUser: boolean;
}
export interface TaskStatus {
    taskId: string;
    status: TaskExecutionStatus;
    progress: number;
    startedAt?: Date;
    completedAt?: Date;
    estimatedCompletion?: Date;
    error?: TaskError;
    retryCount: number;
    tokensUsed?: number;
    executionTime?: number;
}
export interface TaskResult {
    taskId: string;
    success: boolean;
    result?: any;
    error?: TaskError;
    executionTime: number;
    tokensUsed: number;
    retryCount: number;
    cached: boolean;
    cacheKey?: string;
    completedAt: Date;
}
export interface TaskError {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
}
export interface QueueMetrics {
    totalTasks: number;
    queuedTasks: number;
    processingTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageWaitTime: number;
    averageProcessingTime: number;
    throughputPerMinute: number;
    resourceUtilization: number;
    errorRate: number;
}
export interface TaskJobData {
    taskId: string;
    userId: string;
    type: AITaskType;
    model: string;
    prompt: string;
    context?: any;
    maxRetries: number;
    timeout: number;
    notifyUser: boolean;
}
export interface TaskProcessorOptions {
    concurrency?: number;
    maxStalledCount?: number;
    stalledInterval?: number;
    maxConcurrency?: number;
}
//# sourceMappingURL=task.d.ts.map