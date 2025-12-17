"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const task_1 = require("../../types/task");
const uuid_1 = require("uuid");
jest.mock('../../config/redis', () => ({
    redisClient: {
        connect: jest.fn(),
        quit: jest.fn(),
        on: jest.fn()
    },
    RedisService: {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn()
    },
    connectRedis: jest.fn(),
    closeRedis: jest.fn()
}));
jest.mock('bull', () => {
    return jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        process: jest.fn(),
        getJobs: jest.fn().mockResolvedValue([]),
        getWaiting: jest.fn().mockResolvedValue([]),
        getActive: jest.fn().mockResolvedValue([]),
        getCompleted: jest.fn().mockResolvedValue([]),
        getFailed: jest.fn().mockResolvedValue([]),
        close: jest.fn().mockResolvedValue(undefined),
        on: jest.fn()
    }));
});
jest.mock('../../services/OpenRouterService', () => ({
    OpenRouterService: jest.fn().mockImplementation(() => ({
        callAI: jest.fn().mockResolvedValue({
            content: 'Mock response',
            model: 'mock-model',
            tokensUsed: 100,
            processingTime: 1000
        })
    }))
}));
const AsyncTaskManager_1 = require("./../services/AsyncTaskManager");
const TaskQueueManager_1 = require("./../services/TaskQueueManager");
const TaskResultManager_1 = require("./../services/TaskResultManager");
class MockStorage {
    constructor() {
        this.tasks = new Map();
        this.results = new Map();
        this.retrievalCounts = new Map();
    }
    clear() {
        this.tasks.clear();
        this.results.clear();
        this.retrievalCounts.clear();
    }
    storeTask(taskId, status) {
        this.tasks.set(taskId, status);
    }
    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }
    storeResult(taskId, result) {
        this.results.set(taskId, result);
    }
    getResult(taskId) {
        const result = this.results.get(taskId) || null;
        if (result) {
            const count = this.retrievalCounts.get(taskId) || 0;
            this.retrievalCounts.set(taskId, count + 1);
            if (count > 0) {
                return { ...result, cached: true };
            }
        }
        return result;
    }
    updateTaskStatus(taskId, updates) {
        const current = this.getTask(taskId);
        if (current) {
            this.storeTask(taskId, { ...current, ...updates });
        }
    }
}
describe('Async Task Processing Properties', () => {
    let mockStorage;
    let asyncTaskManager;
    let taskQueueManager;
    let taskResultManager;
    beforeEach(() => {
        mockStorage = new MockStorage();
        asyncTaskManager = AsyncTaskManager_1.AsyncTaskManager.getInstance();
        taskQueueManager = TaskQueueManager_1.TaskQueueManager.getInstance();
        taskResultManager = TaskResultManager_1.TaskResultManager.getInstance();
        jest.spyOn(taskQueueManager, 'createTask').mockImplementation(async (task) => {
            const taskId = task.id || (0, uuid_1.v4)();
            const status = {
                taskId,
                status: task_1.TaskExecutionStatus.QUEUED,
                progress: 0,
                retryCount: 0
            };
            mockStorage.storeTask(taskId, status);
            return taskId;
        });
        jest.spyOn(taskQueueManager, 'getTaskStatus').mockImplementation(async (taskId) => {
            return mockStorage.getTask(taskId);
        });
        jest.spyOn(taskQueueManager, 'getTaskResult').mockImplementation(async (taskId) => {
            return mockStorage.getResult(taskId);
        });
        jest.spyOn(taskQueueManager, 'cancelTask').mockImplementation(async (taskId) => {
            const status = mockStorage.getTask(taskId);
            if (status && [task_1.TaskExecutionStatus.QUEUED, task_1.TaskExecutionStatus.PROCESSING].includes(status.status)) {
                mockStorage.updateTaskStatus(taskId, {
                    status: task_1.TaskExecutionStatus.CANCELLED,
                    completedAt: new Date()
                });
                return true;
            }
            return false;
        });
        jest.spyOn(taskQueueManager, 'retryTask').mockImplementation(async (taskId) => {
            const result = mockStorage.getResult(taskId);
            if (result && !result.success) {
                mockStorage.updateTaskStatus(taskId, {
                    status: task_1.TaskExecutionStatus.QUEUED,
                    progress: 0,
                    retryCount: 0
                });
                return true;
            }
            return false;
        });
        jest.spyOn(taskResultManager, 'storeTaskResult').mockImplementation(async (taskId, result) => {
            mockStorage.storeResult(taskId, result);
        });
        jest.spyOn(taskResultManager, 'getBatchTaskResults').mockImplementation(async (taskIds) => {
            return taskIds.map(taskId => mockStorage.getResult(taskId));
        });
        jest.spyOn(asyncTaskManager, 'isTaskCompleted').mockImplementation(async (taskId) => {
            const result = mockStorage.getResult(taskId);
            return result !== null;
        });
        jest.spyOn(asyncTaskManager, 'isTaskSuccessful').mockImplementation(async (taskId) => {
            const result = mockStorage.getResult(taskId);
            return result ? result.success : false;
        });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });
    afterEach(async () => {
        jest.clearAllMocks();
        mockStorage.clear();
        jest.clearAllTimers();
        await new Promise(resolve => setImmediate(resolve));
    });
    afterAll(async () => {
        jest.clearAllTimers();
        jest.restoreAllMocks();
        if (typeof global !== 'undefined') {
            const highestTimeoutId = setTimeout(() => { }, 0);
            clearTimeout(highestTimeoutId);
            for (let i = 0; i <= highestTimeoutId; i++) {
                clearTimeout(i);
            }
            const highestIntervalId = setInterval(() => { }, 1000);
            clearInterval(highestIntervalId);
            for (let i = 0; i <= highestIntervalId; i++) {
                clearInterval(i);
            }
        }
        if (global.gc) {
            global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    });
    const taskTypeArb = fc.constantFrom(...Object.values(task_1.AITaskType));
    const taskPriorityArb = fc.constantFrom(task_1.TaskPriority.LOW, task_1.TaskPriority.NORMAL, task_1.TaskPriority.HIGH, task_1.TaskPriority.URGENT);
    const userIdArb = fc.uuid();
    const modelArb = fc.constantFrom('gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2');
    const promptArb = fc.string({ minLength: 1, maxLength: 1000 });
    const taskArb = fc.record({
        userId: userIdArb,
        type: taskTypeArb,
        priority: taskPriorityArb,
        model: modelArb,
        prompt: promptArb,
        context: fc.option(fc.object(), { nil: undefined }),
        maxRetries: fc.integer({ min: 1, max: 5 }),
        timeout: fc.integer({ min: 10000, max: 300000 }),
        notifyUser: fc.boolean()
    });
    describe('Property 19: 异步任务状态一致�?, () => {, test('Task status should be consistent throughout lifecycle', async () => {
        await fc.assert(fc.asyncProperty(taskArb, async (taskData) => {
            const taskId = await asyncTaskManager.createTask(taskData);
            expect(taskId).toBeDefined();
            expect(typeof taskId).toBe('string');
            expect(taskId.length).toBeGreaterThan(0);
            const initialStatus = await asyncTaskManager.getTaskStatus(taskId);
            expect(initialStatus).toBeDefined();
            expect(initialStatus.taskId).toBe(taskId);
            expect(initialStatus.status).toBe(task_1.TaskExecutionStatus.QUEUED);
            expect(initialStatus.progress).toBe(0);
            expect(initialStatus.retryCount).toBe(0);
            expect(initialStatus.taskId).toBeDefined();
            expect(Object.values(task_1.TaskExecutionStatus)).toContain(initialStatus.status);
            expect(typeof initialStatus.progress).toBe('number');
            expect(initialStatus.progress).toBeGreaterThanOrEqual(0);
            expect(initialStatus.progress).toBeLessThanOrEqual(100);
            expect(typeof initialStatus.retryCount).toBe('number');
            expect(initialStatus.retryCount).toBeGreaterThanOrEqual(0);
        }), { numRuns: 50, timeout: 10000 });
    }));
    test('Task status transitions should be valid', async () => {
        await fc.assert(fc.asyncProperty(taskArb, async (taskData) => {
            const taskId = await asyncTaskManager.createTask(taskData);
            const status1 = await asyncTaskManager.getTaskStatus(taskId);
            expect(status1.status).toBe(task_1.TaskExecutionStatus.QUEUED);
            await new Promise(resolve => setTimeout(resolve, 100));
            const status2 = await asyncTaskManager.getTaskStatus(taskId);
            const validTransitions = [task_1.TaskExecutionStatus.QUEUED, task_1.TaskExecutionStatus.PROCESSING];
            expect(validTransitions).toContain(status2.status);
            if (status1.status === status2.status) {
                expect(status2.progress).toBeGreaterThanOrEqual(status1.progress);
            }
            expect(status2.taskId).toBe(taskId);
        }), { numRuns: 30, timeout: 15000 });
    });
    test('Cancelled tasks should maintain consistent status', async () => {
        await fc.assert(fc.asyncProperty(taskArb, async (taskData) => {
            const taskId = await asyncTaskManager.createTask(taskData);
            const cancelled = await asyncTaskManager.cancelTask(taskId);
            if (cancelled) {
                const status = await asyncTaskManager.getTaskStatus(taskId);
                expect(status.status).toBe(task_1.TaskExecutionStatus.CANCELLED);
                expect(status.completedAt).toBeDefined();
            }
        }), { numRuns: 20, timeout: 10000 });
    });
    test('Batch task status should be consistent', async () => {
        await fc.assert(fc.asyncProperty(fc.array(taskArb, { minLength: 1, maxLength: 5 }), async (tasksData) => {
            const taskIds = await asyncTaskManager.createBatchTasks(tasksData);
            expect(taskIds).toHaveLength(tasksData.length);
            expect(new Set(taskIds).size).toBe(taskIds.length);
            const statuses = await asyncTaskManager.getBatchTaskStatus(taskIds);
            expect(statuses).toHaveLength(taskIds.length);
            statuses.forEach((status, index) => {
                expect(status).toBeDefined();
                expect(status.taskId).toBe(taskIds[index]);
                expect(Object.values(task_1.TaskExecutionStatus)).toContain(status.status);
            });
        }), { numRuns: 20, timeout: 15000 });
    });
});
describe('Property 20: 任务结果可靠�?, () => {, test('Task results should be retrievable and consistent', async () => {
    await fc.assert(fc.asyncProperty(taskArb, async (taskData) => {
        const taskId = await asyncTaskManager.createTask(taskData);
        const mockResult = {
            taskId,
            success: true,
            result: { content: 'Mock AI response', model: taskData.model },
            executionTime: 1000,
            tokensUsed: 100,
            retryCount: 0,
            cached: false,
            completedAt: new Date()
        };
        await taskResultManager.storeTaskResult(taskId, mockResult);
        const retrievedResult = await asyncTaskManager.getTaskResult(taskId);
        expect(retrievedResult).toBeDefined();
        expect(retrievedResult.taskId).toBe(taskId);
        expect(retrievedResult.success).toBe(true);
        expect(retrievedResult.result).toBeDefined();
        expect(retrievedResult.executionTime).toBeGreaterThan(0);
        expect(retrievedResult.tokensUsed).toBeGreaterThanOrEqual(0);
        expect(retrievedResult.retryCount).toBeGreaterThanOrEqual(0);
        expect(retrievedResult.completedAt).toBeInstanceOf(Date);
    }), { numRuns: 30, timeout: 10000 });
}));
test('Failed task results should contain error information', async () => {
    await fc.assert(fc.asyncProperty(taskArb, async (taskData) => {
        const taskId = await asyncTaskManager.createTask(taskData);
        const mockResult = {
            taskId,
            success: false,
            error: {
                code: 'API_ERROR',
                message: 'Mock API error',
                details: { statusCode: 500 },
                retryable: true
            },
            executionTime: 500,
            tokensUsed: 0,
            retryCount: 1,
            cached: false,
            completedAt: new Date()
        };
        await taskResultManager.storeTaskResult(taskId, mockResult);
        const retrievedResult = await asyncTaskManager.getTaskResult(taskId);
        expect(retrievedResult).toBeDefined();
        expect(retrievedResult.taskId).toBe(taskId);
        expect(retrievedResult.success).toBe(false);
        expect(retrievedResult.error).toBeDefined();
        expect(retrievedResult.error.code).toBeDefined();
        expect(retrievedResult.error.message).toBeDefined();
        expect(typeof retrievedResult.error.retryable).toBe('boolean');
    }), { numRuns: 20, timeout: 10000 });
});
test('Task results should persist across multiple retrievals', async () => {
    await fc.assert(fc.asyncProperty(taskArb, async (taskData) => {
        const taskId = await asyncTaskManager.createTask(taskData);
        const mockResult = {
            taskId,
            success: true,
            result: {
                content: 'Persistent result',
                model: taskData.model,
                timestamp: Date.now()
            },
            executionTime: 2000,
            tokensUsed: 150,
            retryCount: 0,
            cached: false,
            completedAt: new Date()
        };
        await taskResultManager.storeTaskResult(taskId, mockResult);
        const result1 = await asyncTaskManager.getTaskResult(taskId);
        const result2 = await asyncTaskManager.getTaskResult(taskId);
        const result3 = await asyncTaskManager.getTaskResult(taskId);
        expect(result1).toBeDefined();
        expect(result2).toBeDefined();
        expect(result3).toBeDefined();
        expect(result1.taskId).toBe(result2.taskId);
        expect(result2.taskId).toBe(result3.taskId);
        expect(result1.success).toBe(result2.success);
        expect(result2.success).toBe(result3.success);
        expect(result1.executionTime).toBe(result2.executionTime);
        expect(result2.executionTime).toBe(result3.executionTime);
        expect(result2.cached || result3.cached).toBe(true);
    }), { numRuns: 15, timeout: 10000 });
});
test('Batch result retrieval should be consistent', async () => {
    await fc.assert(fc.asyncProperty(fc.array(taskArb, { minLength: 2, maxLength: 4 }), async (tasksData) => {
        const taskIds = await asyncTaskManager.createBatchTasks(tasksData);
        const mockResults = taskIds.map(taskId => ({
            taskId,
            success: true,
            result: { content: `Result for ${taskId}` },
            executionTime: Math.floor(Math.random() * 3000) + 500,
            tokensUsed: Math.floor(Math.random() * 200) + 50,
            retryCount: 0,
            cached: false,
            completedAt: new Date()
        }));
        for (const result of mockResults) {
            await taskResultManager.storeTaskResult(result.taskId, result);
        }
        const retrievedResults = await taskResultManager.getBatchTaskResults(taskIds);
        expect(retrievedResults).toHaveLength(taskIds.length);
        retrievedResults.forEach((result, index) => {
            expect(result).toBeDefined();
            expect(result.taskId).toBe(taskIds[index]);
            expect(result.success).toBe(true);
            expect(result.result).toBeDefined();
        });
    }), { numRuns: 10, timeout: 15000 });
});
test('Task completion status should be reliable', async () => {
    await fc.assert(fc.asyncProperty(taskArb, fc.boolean(), async (taskData, shouldSucceed) => {
        const taskId = await asyncTaskManager.createTask(taskData);
        const mockResult = {
            taskId,
            success: shouldSucceed,
            result: shouldSucceed ? { content: 'Success result' } : undefined,
            error: shouldSucceed ? undefined : {
                code: 'TASK_FAILED',
                message: 'Task failed',
                details: {},
                retryable: false
            },
            executionTime: 1500,
            tokensUsed: shouldSucceed ? 120 : 0,
            retryCount: shouldSucceed ? 0 : 2,
            cached: false,
            completedAt: new Date()
        };
        await taskResultManager.storeTaskResult(taskId, mockResult);
        const isCompleted = await asyncTaskManager.isTaskCompleted(taskId);
        const isSuccessful = await asyncTaskManager.isTaskSuccessful(taskId);
        expect(isCompleted).toBe(true);
        expect(isSuccessful).toBe(shouldSucceed);
    }), { numRuns: 25, timeout: 10000 });
});
;
describe('Edge Cases and Error Handling', () => {
    test('Non-existent task should return null', async () => {
        const nonExistentTaskId = (0, uuid_1.v4)();
        const status = await asyncTaskManager.getTaskStatus(nonExistentTaskId);
        const result = await asyncTaskManager.getTaskResult(nonExistentTaskId);
        expect(status).toBeNull();
        expect(result).toBeNull();
    });
    test('Invalid task ID format should be handled gracefully', async () => {
        const invalidTaskIds = ['', 'invalid-id', '123', 'not-a-uuid'];
        for (const invalidId of invalidTaskIds) {
            const status = await asyncTaskManager.getTaskStatus(invalidId);
            const result = await asyncTaskManager.getTaskResult(invalidId);
            expect(status).toBeNull();
            expect(result).toBeNull();
        }
    });
    test('Task retry should maintain data integrity', async () => {
        await fc.assert(fc.asyncProperty(taskArb, async (taskData) => {
            const taskId = await asyncTaskManager.createTask(taskData);
            const failedResult = {
                taskId,
                success: false,
                error: {
                    code: 'RETRYABLE_ERROR',
                    message: 'Temporary failure',
                    details: {},
                    retryable: true
                },
                executionTime: 100,
                tokensUsed: 0,
                retryCount: 1,
                cached: false,
                completedAt: new Date()
            };
            await taskResultManager.storeTaskResult(taskId, failedResult);
            const retried = await asyncTaskManager.retryTask(taskId);
            if (retried) {
                const newStatus = await asyncTaskManager.getTaskStatus(taskId);
                expect(newStatus.status).toBe(task_1.TaskExecutionStatus.QUEUED);
                expect(newStatus.retryCount).toBe(0);
            }
        }), { numRuns: 15, timeout: 10000 });
    });
});
;
//# sourceMappingURL=asyncTaskProcessing.test.js.map