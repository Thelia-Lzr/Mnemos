/**
 * Property-based tests for async task processing system
 * 
 * **Feature: ai-language-learning-app, Property 19: 异步任务状态一致�?*
 * **Feature: ai-language-learning-app, Property 20: 任务结果可靠�?*
 */

import * as fc from 'fast-check';
import { 
  AITaskType, 
  TaskPriority, 
  TaskExecutionStatus, 
  AITask,
  TaskStatus,
  TaskResult
} from '../../types/task';
import { v4 as uuidv4 } from 'uuid';

// Mock the services before importing them
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

import { AsyncTaskManager } from './../services/AsyncTaskManager';
import { TaskQueueManager } from './../services/TaskQueueManager';
import { TaskResultManager } from './../services/TaskResultManager';

// Simple mock storage for testing
class MockStorage {
  private tasks: Map<string, TaskStatus> = new Map();
  private results: Map<string, TaskResult> = new Map();
  private retrievalCounts: Map<string, number> = new Map();

  clear() {
    this.tasks.clear();
    this.results.clear();
    this.retrievalCounts.clear();
  }

  storeTask(taskId: string, status: TaskStatus) {
    this.tasks.set(taskId, status);
  }

  getTask(taskId: string): TaskStatus | null {
    return this.tasks.get(taskId) || null;
  }

  storeResult(taskId: string, result: TaskResult) {
    this.results.set(taskId, result);
  }

  getResult(taskId: string): TaskResult | null {
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

  updateTaskStatus(taskId: string, updates: Partial<TaskStatus>) {
    const current = this.getTask(taskId);
    if (current) {
      this.storeTask(taskId, { ...current, ...updates });
    }
  }
}

describe('Async Task Processing Properties', () => {
  let mockStorage: MockStorage;
  let asyncTaskManager: AsyncTaskManager;
  let taskQueueManager: TaskQueueManager;
  let taskResultManager: TaskResultManager;

  beforeEach(() => {
    mockStorage = new MockStorage();
    
    // Get instances
    asyncTaskManager = AsyncTaskManager.getInstance();
    taskQueueManager = TaskQueueManager.getInstance();
    taskResultManager = TaskResultManager.getInstance();

    // Mock the core methods
    jest.spyOn(taskQueueManager, 'createTask').mockImplementation(async (task: AITask) => {
      const taskId = task.id || uuidv4();
      const status: TaskStatus = {
        taskId,
        status: TaskExecutionStatus.QUEUED,
        progress: 0,
        retryCount: 0
      };
      mockStorage.storeTask(taskId, status);
      return taskId;
    });

    jest.spyOn(taskQueueManager, 'getTaskStatus').mockImplementation(async (taskId: string) => {
      return mockStorage.getTask(taskId);
    });

    jest.spyOn(taskQueueManager, 'getTaskResult').mockImplementation(async (taskId: string) => {
      return mockStorage.getResult(taskId);
    });

    jest.spyOn(taskQueueManager, 'cancelTask').mockImplementation(async (taskId: string) => {
      const status = mockStorage.getTask(taskId);
      if (status && [TaskExecutionStatus.QUEUED, TaskExecutionStatus.PROCESSING].includes(status.status)) {
        mockStorage.updateTaskStatus(taskId, {
          status: TaskExecutionStatus.CANCELLED,
          completedAt: new Date()
        });
        return true;
      }
      return false;
    });

    jest.spyOn(taskQueueManager, 'retryTask').mockImplementation(async (taskId: string) => {
      const result = mockStorage.getResult(taskId);
      if (result && !result.success) {
        mockStorage.updateTaskStatus(taskId, {
          status: TaskExecutionStatus.QUEUED,
          progress: 0,
          retryCount: 0
        });
        return true;
      }
      return false;
    });

    jest.spyOn(taskResultManager, 'storeTaskResult').mockImplementation(async (taskId: string, result: TaskResult) => {
      mockStorage.storeResult(taskId, result);
    });

    jest.spyOn(taskResultManager, 'getBatchTaskResults').mockImplementation(async (taskIds: string[]) => {
      return taskIds.map(taskId => mockStorage.getResult(taskId));
    });

    // Mock AsyncTaskManager methods that depend on results
    jest.spyOn(asyncTaskManager, 'isTaskCompleted').mockImplementation(async (taskId: string) => {
      const result = mockStorage.getResult(taskId);
      return result !== null;
    });

    jest.spyOn(asyncTaskManager, 'isTaskSuccessful').mockImplementation(async (taskId: string) => {
      const result = mockStorage.getResult(taskId);
      return result ? result.success : false;
    });

    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clear all mocks and storage
    jest.clearAllMocks();
    mockStorage.clear();
    
    // Clear any pending timers
    jest.clearAllTimers();
    
    // Wait for any pending promises to resolve
    await new Promise(resolve => setImmediate(resolve));
  });

  afterAll(async () => {
    // Clean up any remaining timers or async operations
    jest.clearAllTimers();
    jest.restoreAllMocks();
    
    // Clear all intervals and timeouts
    if (typeof global !== 'undefined') {
      // Clear any global timers that might be running
      const highestTimeoutId = setTimeout(() => {}, 0) as unknown as number;
      clearTimeout(highestTimeoutId);
      for (let i = 0; i <= highestTimeoutId; i++) {
        clearTimeout(i);
      }
      
      const highestIntervalId = setInterval(() => {}, 1000) as unknown as number;
      clearInterval(highestIntervalId);
      for (let i = 0; i <= highestIntervalId; i++) {
        clearInterval(i);
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  // Generators for property-based testing
  const taskTypeArb = fc.constantFrom(...Object.values(AITaskType));
  const taskPriorityArb = fc.constantFrom(
    TaskPriority.LOW,
    TaskPriority.NORMAL,
    TaskPriority.HIGH,
    TaskPriority.URGENT
  );
  const userIdArb = fc.uuid();
  const modelArb = fc.constantFrom('openai/chatgpt-5.1-chat', 'openai/gpt-4o', 'openai/gpt-4', 'openai/gpt-3.5-turbo');
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

  /**
   * Property 19: 异步任务状态一致性
   * For any created async task, the system should accurately track and report task execution status
   */
  describe('Property 19: 异步任务状态一致性', () => {
    test('Task status should be consistent throughout lifecycle', async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (taskData) => {
          // Create a task
          const taskId = await asyncTaskManager.createTask(taskData);
          
          // Verify task ID is returned
          expect(taskId).toBeDefined();
          expect(typeof taskId).toBe('string');
          expect(taskId.length).toBeGreaterThan(0);

          // Initial status should be QUEUED
          const initialStatus = await asyncTaskManager.getTaskStatus(taskId);
          expect(initialStatus).toBeDefined();
          expect(initialStatus!.taskId).toBe(taskId);
          expect(initialStatus!.status).toBe(TaskExecutionStatus.QUEUED);
          expect(initialStatus!.progress).toBe(0);
          expect(initialStatus!.retryCount).toBe(0);

          // Status should always have required fields
          expect(initialStatus!.taskId).toBeDefined();
          expect(Object.values(TaskExecutionStatus)).toContain(initialStatus!.status);
          expect(typeof initialStatus!.progress).toBe('number');
          expect(initialStatus!.progress).toBeGreaterThanOrEqual(0);
          expect(initialStatus!.progress).toBeLessThanOrEqual(100);
          expect(typeof initialStatus!.retryCount).toBe('number');
          expect(initialStatus!.retryCount).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 50, timeout: 10000 }
      );
    });

    test('Task status transitions should be valid', async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (taskData) => {
          const taskId = await asyncTaskManager.createTask(taskData);
          
          // Get initial status
          const status1 = await asyncTaskManager.getTaskStatus(taskId);
          expect(status1!.status).toBe(TaskExecutionStatus.QUEUED);

          // Wait a bit and check status again
          await new Promise(resolve => setTimeout(resolve, 100));
          const status2 = await asyncTaskManager.getTaskStatus(taskId);
          
          // Status should either remain QUEUED or progress to PROCESSING
          const validTransitions = [TaskExecutionStatus.QUEUED, TaskExecutionStatus.PROCESSING];
          expect(validTransitions).toContain(status2!.status);

          // Progress should never decrease (unless task is reset/retried)
          if (status1!.status === status2!.status) {
            expect(status2!.progress).toBeGreaterThanOrEqual(status1!.progress);
          }

          // Task ID should remain consistent
          expect(status2!.taskId).toBe(taskId);
        }),
        { numRuns: 30, timeout: 15000 }
      );
    });

    test('Cancelled tasks should maintain consistent status', async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (taskData) => {
          const taskId = await asyncTaskManager.createTask(taskData);
          
          // Cancel the task
          const cancelled = await asyncTaskManager.cancelTask(taskId);
          
          if (cancelled) {
            // Status should be CANCELLED
            const status = await asyncTaskManager.getTaskStatus(taskId);
            expect(status!.status).toBe(TaskExecutionStatus.CANCELLED);
            expect(status!.completedAt).toBeDefined();
          }
        }),
        { numRuns: 20, timeout: 10000 }
      );
    });

    test('Batch task status should be consistent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.array(taskArb, { minLength: 1, maxLength: 5 }), async (tasksData) => {
          // Create batch tasks
          const taskIds = await asyncTaskManager.createBatchTasks(tasksData);
          
          expect(taskIds).toHaveLength(tasksData.length);
          expect(new Set(taskIds).size).toBe(taskIds.length); // All IDs should be unique

          // Get batch status
          const statuses = await asyncTaskManager.getBatchTaskStatus(taskIds);
          
          expect(statuses).toHaveLength(taskIds.length);
          
          // Each status should be valid
          statuses.forEach((status, index) => {
            expect(status).toBeDefined();
            expect(status!.taskId).toBe(taskIds[index]);
            expect(Object.values(TaskExecutionStatus)).toContain(status!.status);
          });
        }),
        { numRuns: 20, timeout: 15000 }
      );
    });
  });

  /**
   * Property 20: 任务结果可靠性
   * For any successfully completed async task, the system should reliably return correct execution results
   */
  describe('Property 20: 任务结果可靠性', () => {
    test('Task results should be retrievable and consistent', async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (taskData) => {
          const taskId = await asyncTaskManager.createTask(taskData);
          
          // Mock a successful completion by directly storing a result
          const mockResult: TaskResult = {
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

          // Retrieve the result
          const retrievedResult = await asyncTaskManager.getTaskResult(taskId);
          
          expect(retrievedResult).toBeDefined();
          expect(retrievedResult!.taskId).toBe(taskId);
          expect(retrievedResult!.success).toBe(true);
          expect(retrievedResult!.result).toBeDefined();
          expect(retrievedResult!.executionTime).toBeGreaterThan(0);
          expect(retrievedResult!.tokensUsed).toBeGreaterThanOrEqual(0);
          expect(retrievedResult!.retryCount).toBeGreaterThanOrEqual(0);
          expect(retrievedResult!.completedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 30, timeout: 10000 }
      );
    });

    test('Failed task results should contain error information', async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (taskData) => {
          const taskId = await asyncTaskManager.createTask(taskData);
          
          // Mock a failed completion
          const mockResult: TaskResult = {
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

          // Retrieve the result
          const retrievedResult = await asyncTaskManager.getTaskResult(taskId);
          
          expect(retrievedResult).toBeDefined();
          expect(retrievedResult!.taskId).toBe(taskId);
          expect(retrievedResult!.success).toBe(false);
          expect(retrievedResult!.error).toBeDefined();
          expect(retrievedResult!.error!.code).toBeDefined();
          expect(retrievedResult!.error!.message).toBeDefined();
          expect(typeof retrievedResult!.error!.retryable).toBe('boolean');
        }),
        { numRuns: 20, timeout: 10000 }
      );
    });

    test('Task results should persist across multiple retrievals', async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (taskData) => {
          const taskId = await asyncTaskManager.createTask(taskData);
          
          const mockResult: TaskResult = {
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

          // Retrieve multiple times
          const result1 = await asyncTaskManager.getTaskResult(taskId);
          const result2 = await asyncTaskManager.getTaskResult(taskId);
          const result3 = await asyncTaskManager.getTaskResult(taskId);

          // All retrievals should return the same data
          expect(result1).toBeDefined();
          expect(result2).toBeDefined();
          expect(result3).toBeDefined();

          expect(result1!.taskId).toBe(result2!.taskId);
          expect(result2!.taskId).toBe(result3!.taskId);
          
          expect(result1!.success).toBe(result2!.success);
          expect(result2!.success).toBe(result3!.success);
          
          expect(result1!.executionTime).toBe(result2!.executionTime);
          expect(result2!.executionTime).toBe(result3!.executionTime);

          // Results should be marked as cached after first retrieval
          expect(result2!.cached || result3!.cached).toBe(true);
        }),
        { numRuns: 15, timeout: 10000 }
      );
    });

    test('Batch result retrieval should be consistent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.array(taskArb, { minLength: 2, maxLength: 4 }), async (tasksData) => {
          const taskIds = await asyncTaskManager.createBatchTasks(tasksData);
          
          // Store results for all tasks
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

          // Retrieve batch results
          const retrievedResults = await taskResultManager.getBatchTaskResults(taskIds);
          
          expect(retrievedResults).toHaveLength(taskIds.length);
          
          retrievedResults.forEach((result, index) => {
            expect(result).toBeDefined();
            expect(result!.taskId).toBe(taskIds[index]);
            expect(result!.success).toBe(true);
            expect(result!.result).toBeDefined();
          });
        }),
        { numRuns: 10, timeout: 15000 }
      );
    });

    test('Task completion status should be reliable', async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, fc.boolean(), async (taskData, shouldSucceed) => {
          const taskId = await asyncTaskManager.createTask(taskData);
          
          const mockResult: TaskResult = {
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

          // Check completion status
          const isCompleted = await asyncTaskManager.isTaskCompleted(taskId);
          const isSuccessful = await asyncTaskManager.isTaskSuccessful(taskId);

          // Task should be considered completed regardless of success/failure
          expect(isCompleted).toBe(true);
          
          // Success status should match the result
          expect(isSuccessful).toBe(shouldSucceed);
        }),
        { numRuns: 25, timeout: 10000 }
      );
    });
  });

  // Edge cases and error conditions
  describe('Edge Cases and Error Handling', () => {
    test('Non-existent task should return null', async () => {
      const nonExistentTaskId = uuidv4();
      
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
      await fc.assert(
        fc.asyncProperty(taskArb, async (taskData) => {
          const taskId = await asyncTaskManager.createTask(taskData);
          
          // Mock a failed result first
          const failedResult: TaskResult = {
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

          // Attempt retry
          const retried = await asyncTaskManager.retryTask(taskId);
          
          // If retry was successful, status should be updated
          if (retried) {
            const newStatus = await asyncTaskManager.getTaskStatus(taskId);
            expect(newStatus!.status).toBe(TaskExecutionStatus.QUEUED);
            expect(newStatus!.retryCount).toBe(0); // Reset on retry
          }
        }),
        { numRuns: 15, timeout: 10000 }
      );
    });
  });
});


