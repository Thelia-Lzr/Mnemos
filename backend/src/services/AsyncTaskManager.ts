import { v4 as uuidv4 } from 'uuid';
import { TaskQueueManager } from './TaskQueueManager';
import { 
  AITask, 
  AITaskType, 
  TaskPriority, 
  TaskStatus, 
  TaskResult,
  TaskExecutionStatus
} from '../types/task';

export class AsyncTaskManager {
  private static instance: AsyncTaskManager;
  private static testInstance: AsyncTaskManager;
  private taskQueueManager: TaskQueueManager;

  private constructor(testMode: boolean = false) {
    this.taskQueueManager = TaskQueueManager.getInstance(testMode);
  }

  public static getInstance(testMode: boolean = false): AsyncTaskManager {
    if (testMode) {
      if (!AsyncTaskManager.testInstance) {
        AsyncTaskManager.testInstance = new AsyncTaskManager(true);
      }
      return AsyncTaskManager.testInstance;
    } else {
      if (!AsyncTaskManager.instance) {
        AsyncTaskManager.instance = new AsyncTaskManager(false);
      }
      return AsyncTaskManager.instance;
    }
  }

  // 创建异步任务
  public async createTask(task: Omit<AITask, 'id' | 'createdAt'>): Promise<string> {
    const fullTask: AITask = {
      ...task,
      id: uuidv4(),
      createdAt: new Date(),
      maxRetries: task.maxRetries || 3,
      timeout: task.timeout || 300000, // 默认5分钟超时
      notifyUser: task.notifyUser ?? true
    };

    return await this.taskQueueManager.createTask(fullTask);
  }

  // 创建聊天响应任务
  public async createChatTask(
    userId: string,
    model: string,
    prompt: string,
    context?: any,
    priority: TaskPriority = TaskPriority.NORMAL
  ): Promise<string> {
    return await this.createTask({
      userId,
      type: AITaskType.CHAT_RESPONSE,
      priority,
      model,
      prompt,
      context,
      maxRetries: 2,
      timeout: 60000, // 1分钟超时
      notifyUser: true
    });
  }

  // 创建练习生成任务
  public async createPracticeGenerationTask(
    userId: string,
    model: string,
    prompt: string,
    context?: any,
    priority: TaskPriority = TaskPriority.NORMAL
  ): Promise<string> {
    return await this.createTask({
      userId,
      type: AITaskType.PRACTICE_GENERATION,
      priority,
      model,
      prompt,
      context,
      maxRetries: 3,
      timeout: 180000, // 3分钟超时
      notifyUser: true
    });
  }

  // 创建材料分析任务
  public async createMaterialAnalysisTask(
    userId: string,
    model: string,
    prompt: string,
    context?: any,
    priority: TaskPriority = TaskPriority.HIGH
  ): Promise<string> {
    return await this.createTask({
      userId,
      type: AITaskType.MATERIAL_ANALYSIS,
      priority,
      model,
      prompt,
      context,
      maxRetries: 2,
      timeout: 240000, // 4分钟超时
      notifyUser: true
    });
  }

  // 创建水平评估任务
  public async createLevelAssessmentTask(
    userId: string,
    model: string,
    prompt: string,
    context?: any,
    priority: TaskPriority = TaskPriority.HIGH
  ): Promise<string> {
    return await this.createTask({
      userId,
      type: AITaskType.LEVEL_ASSESSMENT,
      priority,
      model,
      prompt,
      context,
      maxRetries: 3,
      timeout: 300000, // 5分钟超时
      notifyUser: true
    });
  }

  // 创建每日建议任务
  public async createDailyRecommendationTask(
    userId: string,
    model: string,
    prompt: string,
    context?: any,
    priority: TaskPriority = TaskPriority.LOW
  ): Promise<string> {
    return await this.createTask({
      userId,
      type: AITaskType.DAILY_RECOMMENDATION,
      priority,
      model,
      prompt,
      context,
      maxRetries: 2,
      timeout: 120000, // 2分钟超时
      notifyUser: false // 每日建议不需要通知
    });
  }

  // 创建词汇提取任务
  public async createVocabularyExtractionTask(
    userId: string,
    model: string,
    prompt: string,
    context?: any,
    priority: TaskPriority = TaskPriority.NORMAL
  ): Promise<string> {
    return await this.createTask({
      userId,
      type: AITaskType.VOCABULARY_EXTRACTION,
      priority,
      model,
      prompt,
      context,
      maxRetries: 2,
      timeout: 90000, // 1.5分钟超时
      notifyUser: true
    });
  }

  // 创建功能调用任务
  public async createFunctionCallTask(
    userId: string,
    model: string,
    prompt: string,
    context?: any,
    priority: TaskPriority = TaskPriority.HIGH
  ): Promise<string> {
    return await this.createTask({
      userId,
      type: AITaskType.FUNCTION_CALL,
      priority,
      model,
      prompt,
      context,
      maxRetries: 2,
      timeout: 30000, // 30秒超�?
      notifyUser: true
    });
  }

  // 查询任务状�?
  public async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    return await this.taskQueueManager.getTaskStatus(taskId);
  }

  // 获取任务结果
  public async getTaskResult(taskId: string): Promise<TaskResult | null> {
    return await this.taskQueueManager.getTaskResult(taskId);
  }

  // 等待任务完成
  public async waitForTaskCompletion(
    taskId: string, 
    timeoutMs: number = 300000, // 默认5分钟超时
    pollIntervalMs: number = 1000 // 默认1秒轮询间�?
  ): Promise<TaskResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getTaskStatus(taskId);
      
      if (!status) {
        throw new Error(`Task ${taskId} not found`);
      }

      if (status.status === TaskExecutionStatus.COMPLETED) {
        const result = await this.getTaskResult(taskId);
        if (result) {
          return result;
        }
      }

      if (status.status === TaskExecutionStatus.FAILED) {
        const result = await this.getTaskResult(taskId);
        if (result && result.error) {
          throw new Error(`Task failed: ${result.error.message}`);
        }
        throw new Error(`Task ${taskId} failed`);
      }

      if (status.status === TaskExecutionStatus.CANCELLED) {
        throw new Error(`Task ${taskId} was cancelled`);
      }

      if (status.status === TaskExecutionStatus.TIMEOUT) {
        throw new Error(`Task ${taskId} timed out`);
      }

      // 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timeout waiting for task ${taskId} to complete`);
  }

  // 取消任务
  public async cancelTask(taskId: string): Promise<boolean> {
    return await this.taskQueueManager.cancelTask(taskId);
  }

  // 重试任务
  public async retryTask(taskId: string): Promise<boolean> {
    return await this.taskQueueManager.retryTask(taskId);
  }

  // 批量创建任务
  public async createBatchTasks(tasks: Omit<AITask, 'id' | 'createdAt'>[]): Promise<string[]> {
    const fullTasks: AITask[] = tasks.map(task => ({
      ...task,
      id: uuidv4(),
      createdAt: new Date(),
      maxRetries: task.maxRetries || 3,
      timeout: task.timeout || 300000,
      notifyUser: task.notifyUser ?? true
    }));

    return await this.taskQueueManager.createBatchTasks(fullTasks);
  }

  // 批量查询任务状�?
  public async getBatchTaskStatus(taskIds: string[]): Promise<(TaskStatus | null)[]> {
    const promises = taskIds.map(taskId => this.getTaskStatus(taskId));
    return await Promise.all(promises);
  }

  // 批量取消任务
  public async cancelBatchTasks(taskIds: string[]): Promise<boolean[]> {
    const promises = taskIds.map(taskId => this.cancelTask(taskId));
    return await Promise.all(promises);
  }

  // 获取用户的所有任�?
  public async getUserTasks(userId: string): Promise<TaskStatus[]> {
    return await this.taskQueueManager.getUserTasks(userId);
  }

  // 获取用户的活跃任�?
  public async getUserActiveTasks(userId: string): Promise<TaskStatus[]> {
    const allTasks = await this.getUserTasks(userId);
    return allTasks.filter(task => 
      task.status === TaskExecutionStatus.QUEUED || 
      task.status === TaskExecutionStatus.PROCESSING
    );
  }

  // 获取用户的已完成任务
  public async getUserCompletedTasks(userId: string): Promise<TaskStatus[]> {
    const allTasks = await this.getUserTasks(userId);
    return allTasks.filter(task => 
      task.status === TaskExecutionStatus.COMPLETED ||
      task.status === TaskExecutionStatus.FAILED ||
      task.status === TaskExecutionStatus.CANCELLED
    );
  }

  // 检查任务是否完�?
  public async isTaskCompleted(taskId: string): Promise<boolean> {
    const status = await this.getTaskStatus(taskId);
    return status ? [
      TaskExecutionStatus.COMPLETED,
      TaskExecutionStatus.FAILED,
      TaskExecutionStatus.CANCELLED,
      TaskExecutionStatus.TIMEOUT
    ].includes(status.status) : false;
  }

  // 检查任务是否成�?
  public async isTaskSuccessful(taskId: string): Promise<boolean> {
    const result = await this.getTaskResult(taskId);
    return result ? result.success : false;
  }

  // 获取队列统计信息
  public async getQueueMetrics() {
    return await this.taskQueueManager.getQueueMetrics();
  }

  // Manually complete a task (for fallback when queue is not available)
  public async completeTask(taskId: string, result: any): Promise<void> {
    await this.taskQueueManager.completeTask(taskId, result);
  }

  // Manually fail a task (for fallback when queue is not available)
  public async failTask(taskId: string, error: Error): Promise<void> {
    await this.taskQueueManager.failTask(taskId, error);
  }
}

// Export the class, not a singleton instance
// Use AsyncTaskManager.getInstance(testMode) to get the appropriate instance
