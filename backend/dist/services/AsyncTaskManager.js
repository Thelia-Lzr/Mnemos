"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncTaskManager = void 0;
const uuid_1 = require("uuid");
const TaskQueueManager_1 = require("./TaskQueueManager");
const task_1 = require("../types/task");
class AsyncTaskManager {
    constructor(testMode = false) {
        this.taskQueueManager = TaskQueueManager_1.TaskQueueManager.getInstance(testMode);
    }
    static getInstance(testMode = false) {
        if (testMode) {
            if (!AsyncTaskManager.testInstance) {
                AsyncTaskManager.testInstance = new AsyncTaskManager(true);
            }
            return AsyncTaskManager.testInstance;
        }
        else {
            if (!AsyncTaskManager.instance) {
                AsyncTaskManager.instance = new AsyncTaskManager(false);
            }
            return AsyncTaskManager.instance;
        }
    }
    async createTask(task) {
        const fullTask = {
            ...task,
            id: (0, uuid_1.v4)(),
            createdAt: new Date(),
            maxRetries: task.maxRetries || 3,
            timeout: task.timeout || 300000,
            notifyUser: task.notifyUser ?? true
        };
        return await this.taskQueueManager.createTask(fullTask);
    }
    async createChatTask(userId, model, prompt, context, priority = task_1.TaskPriority.NORMAL) {
        return await this.createTask({
            userId,
            type: task_1.AITaskType.CHAT_RESPONSE,
            priority,
            model,
            prompt,
            context,
            maxRetries: 2,
            timeout: 60000,
            notifyUser: true
        });
    }
    async createPracticeGenerationTask(userId, model, prompt, context, priority = task_1.TaskPriority.NORMAL) {
        return await this.createTask({
            userId,
            type: task_1.AITaskType.PRACTICE_GENERATION,
            priority,
            model,
            prompt,
            context,
            maxRetries: 3,
            timeout: 180000,
            notifyUser: true
        });
    }
    async createMaterialAnalysisTask(userId, model, prompt, context, priority = task_1.TaskPriority.HIGH) {
        return await this.createTask({
            userId,
            type: task_1.AITaskType.MATERIAL_ANALYSIS,
            priority,
            model,
            prompt,
            context,
            maxRetries: 2,
            timeout: 240000,
            notifyUser: true
        });
    }
    async createLevelAssessmentTask(userId, model, prompt, context, priority = task_1.TaskPriority.HIGH) {
        return await this.createTask({
            userId,
            type: task_1.AITaskType.LEVEL_ASSESSMENT,
            priority,
            model,
            prompt,
            context,
            maxRetries: 3,
            timeout: 300000,
            notifyUser: true
        });
    }
    async createDailyRecommendationTask(userId, model, prompt, context, priority = task_1.TaskPriority.LOW) {
        return await this.createTask({
            userId,
            type: task_1.AITaskType.DAILY_RECOMMENDATION,
            priority,
            model,
            prompt,
            context,
            maxRetries: 2,
            timeout: 120000,
            notifyUser: false
        });
    }
    async createVocabularyExtractionTask(userId, model, prompt, context, priority = task_1.TaskPriority.NORMAL) {
        return await this.createTask({
            userId,
            type: task_1.AITaskType.VOCABULARY_EXTRACTION,
            priority,
            model,
            prompt,
            context,
            maxRetries: 2,
            timeout: 90000,
            notifyUser: true
        });
    }
    async createFunctionCallTask(userId, model, prompt, context, priority = task_1.TaskPriority.HIGH) {
        return await this.createTask({
            userId,
            type: task_1.AITaskType.FUNCTION_CALL,
            priority,
            model,
            prompt,
            context,
            maxRetries: 2,
            timeout: 30000,
            notifyUser: true
        });
    }
    async getTaskStatus(taskId) {
        return await this.taskQueueManager.getTaskStatus(taskId);
    }
    async getTaskResult(taskId) {
        return await this.taskQueueManager.getTaskResult(taskId);
    }
    async waitForTaskCompletion(taskId, timeoutMs = 300000, pollIntervalMs = 1000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getTaskStatus(taskId);
            if (!status) {
                throw new Error(`Task ${taskId} not found`);
            }
            if (status.status === task_1.TaskExecutionStatus.COMPLETED) {
                const result = await this.getTaskResult(taskId);
                if (result) {
                    return result;
                }
            }
            if (status.status === task_1.TaskExecutionStatus.FAILED) {
                const result = await this.getTaskResult(taskId);
                if (result && result.error) {
                    throw new Error(`Task failed: ${result.error.message}`);
                }
                throw new Error(`Task ${taskId} failed`);
            }
            if (status.status === task_1.TaskExecutionStatus.CANCELLED) {
                throw new Error(`Task ${taskId} was cancelled`);
            }
            if (status.status === task_1.TaskExecutionStatus.TIMEOUT) {
                throw new Error(`Task ${taskId} timed out`);
            }
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }
        throw new Error(`Timeout waiting for task ${taskId} to complete`);
    }
    async cancelTask(taskId) {
        return await this.taskQueueManager.cancelTask(taskId);
    }
    async retryTask(taskId) {
        return await this.taskQueueManager.retryTask(taskId);
    }
    async createBatchTasks(tasks) {
        const fullTasks = tasks.map(task => ({
            ...task,
            id: (0, uuid_1.v4)(),
            createdAt: new Date(),
            maxRetries: task.maxRetries || 3,
            timeout: task.timeout || 300000,
            notifyUser: task.notifyUser ?? true
        }));
        return await this.taskQueueManager.createBatchTasks(fullTasks);
    }
    async getBatchTaskStatus(taskIds) {
        const promises = taskIds.map(taskId => this.getTaskStatus(taskId));
        return await Promise.all(promises);
    }
    async cancelBatchTasks(taskIds) {
        const promises = taskIds.map(taskId => this.cancelTask(taskId));
        return await Promise.all(promises);
    }
    async getUserTasks(userId) {
        return await this.taskQueueManager.getUserTasks(userId);
    }
    async getUserActiveTasks(userId) {
        const allTasks = await this.getUserTasks(userId);
        return allTasks.filter(task => task.status === task_1.TaskExecutionStatus.QUEUED ||
            task.status === task_1.TaskExecutionStatus.PROCESSING);
    }
    async getUserCompletedTasks(userId) {
        const allTasks = await this.getUserTasks(userId);
        return allTasks.filter(task => task.status === task_1.TaskExecutionStatus.COMPLETED ||
            task.status === task_1.TaskExecutionStatus.FAILED ||
            task.status === task_1.TaskExecutionStatus.CANCELLED);
    }
    async isTaskCompleted(taskId) {
        const status = await this.getTaskStatus(taskId);
        return status ? [
            task_1.TaskExecutionStatus.COMPLETED,
            task_1.TaskExecutionStatus.FAILED,
            task_1.TaskExecutionStatus.CANCELLED,
            task_1.TaskExecutionStatus.TIMEOUT
        ].includes(status.status) : false;
    }
    async isTaskSuccessful(taskId) {
        const result = await this.getTaskResult(taskId);
        return result ? result.success : false;
    }
    async getQueueMetrics() {
        return await this.taskQueueManager.getQueueMetrics();
    }
    async completeTask(taskId, result) {
        await this.taskQueueManager.completeTask(taskId, result);
    }
    async failTask(taskId, error) {
        await this.taskQueueManager.failTask(taskId, error);
    }
}
exports.AsyncTaskManager = AsyncTaskManager;
//# sourceMappingURL=AsyncTaskManager.js.map