/// <reference types="jest" />
import { TaskStatus, TaskResult, AITask } from '../../types/task';
export declare class MockTaskStorage {
    private static instance;
    private taskStatuses;
    private taskResults;
    private tasks;
    private retrievalCounts;
    static getInstance(): MockTaskStorage;
    clear(): void;
    storeTask(taskId: string, task: AITask): void;
    getTask(taskId: string): AITask | undefined;
    storeTaskStatus(taskId: string, status: TaskStatus): void;
    getTaskStatus(taskId: string): TaskStatus | null;
    storeTaskResult(taskId: string, result: TaskResult): void;
    getTaskResult(taskId: string): TaskResult | null;
    getAllTasksByUser(userId: string): TaskStatus[];
    deleteTask(taskId: string): boolean;
}
export declare const mockRedisService: {
    set: jest.Mock<any, any, any>;
    get: jest.Mock<any, any, any>;
    del: jest.Mock<any, any, any>;
    exists: jest.Mock<any, any, any>;
    expire: jest.Mock<any, any, any>;
    hSet: jest.Mock<any, any, any>;
    hGet: jest.Mock<any, any, any>;
    hGetAll: jest.Mock<any, any, any>;
    lPush: jest.Mock<any, any, any>;
    rPop: jest.Mock<any, any, any>;
    lLen: jest.Mock<any, any, any>;
};
export declare const mockBullQueue: {
    add: jest.Mock<any, any, any>;
    process: jest.Mock<any, any, any>;
    getJobs: jest.Mock<any, any, any>;
    getWaiting: jest.Mock<any, any, any>;
    getActive: jest.Mock<any, any, any>;
    getCompleted: jest.Mock<any, any, any>;
    getFailed: jest.Mock<any, any, any>;
    close: jest.Mock<any, any, any>;
    on: jest.Mock<any, any, any>;
};
export declare const mockOpenRouterService: {
    callAI: jest.Mock<any, any, any>;
};
export declare function setupAsyncTaskMocks(): void;
export declare function resetAsyncTaskMocks(): void;
//# sourceMappingURL=asyncTaskMocks.d.ts.map