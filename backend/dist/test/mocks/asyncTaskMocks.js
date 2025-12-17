"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAsyncTaskMocks = exports.setupAsyncTaskMocks = exports.mockOpenRouterService = exports.mockBullQueue = exports.mockRedisService = exports.MockTaskStorage = void 0;
class MockTaskStorage {
    constructor() {
        this.taskStatuses = new Map();
        this.taskResults = new Map();
        this.tasks = new Map();
        this.retrievalCounts = new Map();
    }
    static getInstance() {
        if (!MockTaskStorage.instance) {
            MockTaskStorage.instance = new MockTaskStorage();
        }
        return MockTaskStorage.instance;
    }
    clear() {
        this.taskStatuses.clear();
        this.taskResults.clear();
        this.tasks.clear();
        this.retrievalCounts.clear();
    }
    storeTask(taskId, task) {
        this.tasks.set(taskId, task);
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    storeTaskStatus(taskId, status) {
        this.taskStatuses.set(taskId, status);
    }
    getTaskStatus(taskId) {
        return this.taskStatuses.get(taskId) || null;
    }
    storeTaskResult(taskId, result) {
        this.taskResults.set(taskId, result);
    }
    getTaskResult(taskId) {
        const result = this.taskResults.get(taskId) || null;
        if (result) {
            const count = this.retrievalCounts.get(taskId) || 0;
            this.retrievalCounts.set(taskId, count + 1);
            if (count > 0) {
                return { ...result, cached: true };
            }
        }
        return result;
    }
    getAllTasksByUser(userId) {
        const userTasks = [];
        for (const [taskId, task] of this.tasks) {
            if (task.userId === userId) {
                const status = this.getTaskStatus(taskId);
                if (status) {
                    userTasks.push(status);
                }
            }
        }
        return userTasks;
    }
    deleteTask(taskId) {
        const hadTask = this.tasks.has(taskId);
        this.tasks.delete(taskId);
        this.taskStatuses.delete(taskId);
        this.taskResults.delete(taskId);
        this.retrievalCounts.delete(taskId);
        return hadTask;
    }
}
exports.MockTaskStorage = MockTaskStorage;
exports.mockRedisService = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(true),
    hSet: jest.fn().mockResolvedValue(1),
    hGet: jest.fn().mockResolvedValue(undefined),
    hGetAll: jest.fn().mockResolvedValue({}),
    lPush: jest.fn().mockResolvedValue(1),
    rPop: jest.fn().mockResolvedValue(null),
    lLen: jest.fn().mockResolvedValue(0)
};
exports.mockBullQueue = {
    add: jest.fn().mockImplementation((data, options) => {
        return Promise.resolve({
            id: `job-${Date.now()}`,
            data,
            opts: options,
            attemptsMade: 0,
            processedOn: Date.now(),
            remove: jest.fn().mockResolvedValue(undefined),
            retry: jest.fn().mockResolvedValue(undefined)
        });
    }),
    process: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
};
exports.mockOpenRouterService = {
    callAI: jest.fn().mockImplementation((model, prompt, context) => {
        return Promise.resolve({
            content: `Mock response for: ${prompt.substring(0, 50)}...`,
            model,
            tokensUsed: Math.floor(Math.random() * 200) + 50,
            processingTime: Math.floor(Math.random() * 2000) + 500,
            metadata: { mock: true }
        });
    })
};
function setupAsyncTaskMocks() {
    jest.doMock('../../config/redis', () => ({
        RedisService: exports.mockRedisService,
        redisClient: {
            connect: jest.fn().mockResolvedValue(undefined),
            quit: jest.fn().mockResolvedValue(undefined)
        },
        connectRedis: jest.fn().mockResolvedValue(undefined),
        closeRedis: jest.fn().mockResolvedValue(undefined)
    }));
    jest.doMock('bull', () => {
        return jest.fn().mockImplementation(() => exports.mockBullQueue);
    });
    jest.doMock('../../services/OpenRouterService', () => ({
        OpenRouterService: jest.fn().mockImplementation(() => exports.mockOpenRouterService)
    }));
}
exports.setupAsyncTaskMocks = setupAsyncTaskMocks;
function resetAsyncTaskMocks() {
    MockTaskStorage.getInstance().clear();
    jest.clearAllMocks();
}
exports.resetAsyncTaskMocks = resetAsyncTaskMocks;
//# sourceMappingURL=asyncTaskMocks.js.map