"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskQueueManager = void 0;
const bull_1 = __importDefault(require("bull"));
const uuid_1 = require("uuid");
const task_1 = require("../types/task");
const OpenRouterService_1 = require("./OpenRouterService");
const redis_1 = require("../config/redis");
class TaskQueueManager {
    constructor(testMode = false) {
        this.queues = new Map();
        this.taskStatuses = new Map();
        this.taskResults = new Map();
        this.testMode = testMode;
        this.openRouterService = new OpenRouterService_1.OpenRouterService(testMode);
        this.initializeQueues();
    }
    static getInstance(testMode = false) {
        if (testMode) {
            if (!TaskQueueManager.testInstance) {
                TaskQueueManager.testInstance = new TaskQueueManager(true);
            }
            return TaskQueueManager.testInstance;
        }
        else {
            if (!TaskQueueManager.instance) {
                TaskQueueManager.instance = new TaskQueueManager(false);
            }
            return TaskQueueManager.instance;
        }
    }
    initializeQueues() {
        Object.values(task_1.AITaskType).forEach(taskType => {
            const queue = new bull_1.default(`ai-task-${taskType}`, {
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD
                },
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            });
            this.setupQueueProcessor(queue, taskType);
            this.setupQueueEvents(queue, taskType);
            this.queues.set(taskType, queue);
        });
    }
    setupQueueProcessor(queue, taskType) {
        const processorOptions = {
            concurrency: this.getConcurrencyForTaskType(taskType)
        };
        queue.process(processorOptions.concurrency || 1, async (job) => {
            const { taskId, userId, type, model, prompt, context, timeout } = job.data;
            try {
                await this.updateTaskStatus(taskId, {
                    taskId,
                    status: task_1.TaskExecutionStatus.PROCESSING,
                    progress: 0,
                    startedAt: new Date(),
                    retryCount: job.attemptsMade
                });
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Task timeout')), timeout);
                });
                const aiPromise = this.executeAITask(type, model, prompt, context, (progress) => {
                    this.updateTaskStatus(taskId, {
                        taskId,
                        status: task_1.TaskExecutionStatus.PROCESSING,
                        progress,
                        retryCount: job.attemptsMade
                    });
                });
                const result = await Promise.race([aiPromise, timeoutPromise]);
                const taskResult = {
                    taskId,
                    success: true,
                    result,
                    executionTime: Date.now() - (job.processedOn || Date.now()),
                    tokensUsed: result.tokensUsed || 0,
                    retryCount: job.attemptsMade,
                    cached: false,
                    completedAt: new Date()
                };
                await this.storeTaskResult(taskId, taskResult);
                await this.updateTaskStatus(taskId, {
                    taskId,
                    status: task_1.TaskExecutionStatus.COMPLETED,
                    progress: 100,
                    completedAt: new Date(),
                    retryCount: job.attemptsMade,
                    tokensUsed: taskResult.tokensUsed,
                    executionTime: taskResult.executionTime
                });
                return taskResult;
            }
            catch (error) {
                const taskError = {
                    code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    details: error,
                    retryable: this.isRetryableError(error)
                };
                const taskResult = {
                    taskId,
                    success: false,
                    error: taskError,
                    executionTime: Date.now() - (job.processedOn || Date.now()),
                    tokensUsed: 0,
                    retryCount: job.attemptsMade,
                    cached: false,
                    completedAt: new Date()
                };
                await this.storeTaskResult(taskId, taskResult);
                await this.updateTaskStatus(taskId, {
                    taskId,
                    status: task_1.TaskExecutionStatus.FAILED,
                    progress: 0,
                    completedAt: new Date(),
                    error: taskError,
                    retryCount: job.attemptsMade
                });
                throw error;
            }
        });
    }
    setupQueueEvents(queue, taskType) {
        queue.on('completed', (job, result) => {
            console.log(`�?Task ${job.data.taskId} of type ${taskType} completed successfully`);
        });
        queue.on('failed', (job, error) => {
            console.error(`�?Task ${job.data.taskId} of type ${taskType} failed:`, error.message);
        });
        queue.on('stalled', (job) => {
            console.warn(`⚠️ Task ${job.data.taskId} of type ${taskType} stalled`);
        });
        queue.on('progress', (job, progress) => {
            console.log(`🔄 Task ${job.data.taskId} progress: ${progress}%`);
        });
    }
    getConcurrencyForTaskType(taskType) {
        switch (taskType) {
            case task_1.AITaskType.CHAT_RESPONSE:
                return 5;
            case task_1.AITaskType.PRACTICE_GENERATION:
                return 3;
            case task_1.AITaskType.MATERIAL_ANALYSIS:
                return 2;
            case task_1.AITaskType.LEVEL_ASSESSMENT:
                return 2;
            case task_1.AITaskType.DAILY_RECOMMENDATION:
                return 1;
            case task_1.AITaskType.VOCABULARY_EXTRACTION:
                return 3;
            case task_1.AITaskType.FUNCTION_CALL:
                return 4;
            default:
                return 1;
        }
    }
    async executeAITask(type, model, prompt, context, progressCallback) {
        progressCallback(10);
        try {
            const response = await this.openRouterService.callAI(model, prompt, context);
            progressCallback(90);
            return response;
        }
        catch (error) {
            throw error;
        }
    }
    isRetryableError(error) {
        if (error instanceof Error) {
            return error.message.includes('timeout') ||
                error.message.includes('network') ||
                error.message.includes('503') ||
                error.message.includes('502') ||
                error.message.includes('500');
        }
        return false;
    }
    async createTask(task) {
        const taskId = task.id || (0, uuid_1.v4)();
        const queue = this.queues.get(task.type);
        if (!queue) {
            throw new Error(`Queue for task type ${task.type} not found`);
        }
        const jobOptions = {
            priority: this.convertPriorityToNumber(task.priority),
            delay: task.scheduledAt ? task.scheduledAt.getTime() - Date.now() : 0,
            attempts: task.maxRetries,
            timeout: task.timeout,
            removeOnComplete: 100,
            removeOnFail: 50
        };
        const jobData = {
            taskId,
            userId: task.userId,
            type: task.type,
            model: task.model,
            prompt: task.prompt,
            context: task.context,
            maxRetries: task.maxRetries,
            timeout: task.timeout,
            notifyUser: task.notifyUser
        };
        const job = await queue.add(jobData, jobOptions);
        const initialStatus = {
            taskId,
            status: task_1.TaskExecutionStatus.QUEUED,
            progress: 0,
            retryCount: 0
        };
        await this.updateTaskStatus(taskId, initialStatus);
        console.log(`📋 Created task ${taskId} of type ${task.type} for user ${task.userId}`);
        return taskId;
    }
    async createBatchTasks(tasks) {
        const taskIds = [];
        for (const task of tasks) {
            const taskId = await this.createTask(task);
            taskIds.push(taskId);
        }
        return taskIds;
    }
    async getTaskStatus(taskId) {
        const cachedStatus = this.taskStatuses.get(taskId);
        if (cachedStatus) {
            return cachedStatus;
        }
        try {
            const statusData = await redis_1.RedisService.get(`task:status:${taskId}`);
            if (statusData) {
                const status = JSON.parse(statusData);
                this.taskStatuses.set(taskId, status);
                return status;
            }
        }
        catch (error) {
            console.error('Error getting task status from Redis:', error);
        }
        return null;
    }
    async getTaskResult(taskId) {
        const cachedResult = this.taskResults.get(taskId);
        if (cachedResult) {
            return cachedResult;
        }
        try {
            const resultData = await redis_1.RedisService.get(`task:result:${taskId}`);
            if (resultData) {
                const result = JSON.parse(resultData);
                this.taskResults.set(taskId, result);
                return result;
            }
        }
        catch (error) {
            console.error('Error getting task result from Redis:', error);
        }
        return null;
    }
    async cancelTask(taskId) {
        try {
            for (const [taskType, queue] of this.queues) {
                const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
                for (const job of jobs) {
                    if (job.data.taskId === taskId) {
                        await job.remove();
                        await this.updateTaskStatus(taskId, {
                            taskId,
                            status: task_1.TaskExecutionStatus.CANCELLED,
                            progress: 0,
                            completedAt: new Date(),
                            retryCount: job.attemptsMade
                        });
                        console.log(`🚫 Cancelled task ${taskId} of type ${taskType}`);
                        return true;
                    }
                }
            }
            return false;
        }
        catch (error) {
            console.error('Error cancelling task:', error);
            return false;
        }
    }
    async retryTask(taskId) {
        try {
            const taskResult = await this.getTaskResult(taskId);
            if (!taskResult || taskResult.success) {
                return false;
            }
            for (const [taskType, queue] of this.queues) {
                const jobs = await queue.getJobs(['failed']);
                for (const job of jobs) {
                    if (job.data.taskId === taskId) {
                        await job.retry();
                        await this.updateTaskStatus(taskId, {
                            taskId,
                            status: task_1.TaskExecutionStatus.QUEUED,
                            progress: 0,
                            retryCount: 0
                        });
                        console.log(`🔄 Retrying task ${taskId} of type ${taskType}`);
                        return true;
                    }
                }
            }
            return false;
        }
        catch (error) {
            console.error('Error retrying task:', error);
            return false;
        }
    }
    async getQueueMetrics() {
        let totalTasks = 0;
        let queuedTasks = 0;
        let processingTasks = 0;
        let completedTasks = 0;
        let failedTasks = 0;
        for (const [taskType, queue] of this.queues) {
            const waiting = await queue.getWaiting();
            const active = await queue.getActive();
            const completed = await queue.getCompleted();
            const failed = await queue.getFailed();
            queuedTasks += waiting.length;
            processingTasks += active.length;
            completedTasks += completed.length;
            failedTasks += failed.length;
            totalTasks += waiting.length + active.length + completed.length + failed.length;
        }
        const averageWaitTime = 0;
        const averageProcessingTime = 0;
        const throughputPerMinute = 0;
        const resourceUtilization = processingTasks / (processingTasks + queuedTasks) * 100;
        const errorRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;
        return {
            totalTasks,
            queuedTasks,
            processingTasks,
            completedTasks,
            failedTasks,
            averageWaitTime,
            averageProcessingTime,
            throughputPerMinute,
            resourceUtilization,
            errorRate
        };
    }
    async getUserTasks(userId) {
        const userTasks = [];
        for (const [taskType, queue] of this.queues) {
            const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed']);
            for (const job of jobs) {
                if (job.data.userId === userId) {
                    const status = await this.getTaskStatus(job.data.taskId);
                    if (status) {
                        userTasks.push(status);
                    }
                }
            }
        }
        return userTasks.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
    }
    convertPriorityToNumber(priority) {
        return priority;
    }
    async updateTaskStatus(taskId, status) {
        const currentStatus = this.taskStatuses.get(taskId) || { taskId, status: task_1.TaskExecutionStatus.QUEUED, progress: 0, retryCount: 0 };
        const updatedStatus = { ...currentStatus, ...status };
        this.taskStatuses.set(taskId, updatedStatus);
        try {
            await redis_1.RedisService.set(`task:status:${taskId}`, JSON.stringify(updatedStatus), 3600);
        }
        catch (error) {
            console.error('Error storing task status to Redis:', error);
        }
    }
    async storeTaskResult(taskId, result) {
        this.taskResults.set(taskId, result);
        try {
            await redis_1.RedisService.set(`task:result:${taskId}`, JSON.stringify(result), 86400);
        }
        catch (error) {
            console.error('Error storing task result to Redis:', error);
        }
    }
    async cleanupExpiredTasks() {
        const now = Date.now();
        const expiredThreshold = 24 * 60 * 60 * 1000;
        for (const [taskId, status] of this.taskStatuses) {
            if (status.completedAt && (now - status.completedAt.getTime()) > expiredThreshold) {
                this.taskStatuses.delete(taskId);
            }
        }
        for (const [taskId, result] of this.taskResults) {
            if ((now - result.completedAt.getTime()) > expiredThreshold) {
                this.taskResults.delete(taskId);
            }
        }
    }
    async shutdown() {
        console.log('Shutting down task queues...');
        for (const [taskType, queue] of this.queues) {
            await queue.close();
            console.log(`Queue ${taskType} closed`);
        }
        console.log('All task queues shut down');
    }
    async completeTask(taskId, result) {
        const taskStatus = {
            taskId,
            status: task_1.TaskExecutionStatus.COMPLETED,
            progress: 100,
            retryCount: 0,
            startedAt: new Date(),
            completedAt: new Date()
        };
        const taskResult = {
            taskId,
            success: true,
            result,
            executionTime: 0,
            tokensUsed: 0,
            retryCount: 0,
            cached: false,
            completedAt: new Date()
        };
        this.taskStatuses.set(taskId, taskStatus);
        this.taskResults.set(taskId, taskResult);
    }
    async failTask(taskId, error) {
        const taskStatus = {
            taskId,
            status: task_1.TaskExecutionStatus.FAILED,
            progress: 0,
            retryCount: 0,
            startedAt: new Date(),
            completedAt: new Date()
        };
        const taskResult = {
            taskId,
            success: false,
            error: {
                message: error.message,
                code: 'GENERATION_ERROR',
                details: error.stack,
                retryable: false
            },
            executionTime: 0,
            tokensUsed: 0,
            retryCount: 0,
            cached: false,
            completedAt: new Date()
        };
        this.taskStatuses.set(taskId, taskStatus);
        this.taskResults.set(taskId, taskResult);
    }
}
exports.TaskQueueManager = TaskQueueManager;
//# sourceMappingURL=TaskQueueManager.js.map