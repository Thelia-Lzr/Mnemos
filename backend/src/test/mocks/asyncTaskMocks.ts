import { 
  TaskStatus, 
  TaskResult, 
  TaskExecutionStatus, 
  AITask,
  QueueMetrics
} from '../../types/task';

// Mock data storage for testing
export class MockTaskStorage {
  private static instance: MockTaskStorage;
  private taskStatuses: Map<string, TaskStatus> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();
  private tasks: Map<string, AITask> = new Map();
  private retrievalCounts: Map<string, number> = new Map();

  public static getInstance(): MockTaskStorage {
    if (!MockTaskStorage.instance) {
      MockTaskStorage.instance = new MockTaskStorage();
    }
    return MockTaskStorage.instance;
  }

  public clear(): void {
    this.taskStatuses.clear();
    this.taskResults.clear();
    this.tasks.clear();
    this.retrievalCounts.clear();
  }

  public storeTask(taskId: string, task: AITask): void {
    this.tasks.set(taskId, task);
  }

  public getTask(taskId: string): AITask | undefined {
    return this.tasks.get(taskId);
  }

  public storeTaskStatus(taskId: string, status: TaskStatus): void {
    this.taskStatuses.set(taskId, status);
  }

  public getTaskStatus(taskId: string): TaskStatus | null {
    return this.taskStatuses.get(taskId) || null;
  }

  public storeTaskResult(taskId: string, result: TaskResult): void {
    this.taskResults.set(taskId, result);
  }

  public getTaskResult(taskId: string): TaskResult | null {
    const result = this.taskResults.get(taskId) || null;
    if (result) {
      // Track retrieval count
      const count = this.retrievalCounts.get(taskId) || 0;
      this.retrievalCounts.set(taskId, count + 1);
      
      // Mark as cached after first retrieval
      if (count > 0) {
        return { ...result, cached: true };
      }
    }
    return result;
  }

  public getAllTasksByUser(userId: string): TaskStatus[] {
    const userTasks: TaskStatus[] = [];
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

  public deleteTask(taskId: string): boolean {
    const hadTask = this.tasks.has(taskId);
    this.tasks.delete(taskId);
    this.taskStatuses.delete(taskId);
    this.taskResults.delete(taskId);
    this.retrievalCounts.delete(taskId);
    return hadTask;
  }
}

// Mock Redis Service
export const mockRedisService = {
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

// Mock Bull Queue
export const mockBullQueue = {
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

// Mock OpenRouter Service
export const mockOpenRouterService = {
  callAI: jest.fn().mockImplementation((model: string, prompt: string, context?: any) => {
    return Promise.resolve({
      content: `Mock response for: ${prompt.substring(0, 50)}...`,
      model,
      tokensUsed: Math.floor(Math.random() * 200) + 50,
      processingTime: Math.floor(Math.random() * 2000) + 500,
      metadata: { mock: true }
    });
  })
};

// Setup mocks
export function setupAsyncTaskMocks(): void {
  // Mock Redis
  jest.doMock('../../config/redis', () => ({
    RedisService: mockRedisService,
    redisClient: {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined)
    },
    connectRedis: jest.fn().mockResolvedValue(undefined),
    closeRedis: jest.fn().mockResolvedValue(undefined)
  }));

  // Mock Bull
  jest.doMock('bull', () => {
    return jest.fn().mockImplementation(() => mockBullQueue);
  });

  // Mock OpenRouter Service
  jest.doMock('../../services/OpenRouterService', () => ({
    OpenRouterService: jest.fn().mockImplementation(() => mockOpenRouterService)
  }));
}

export function resetAsyncTaskMocks(): void {
  MockTaskStorage.getInstance().clear();
  jest.clearAllMocks();
}


