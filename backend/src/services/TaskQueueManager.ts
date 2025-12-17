import Bull, { Queue, Job, JobOptions } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import { 
  AITask, 
  AITaskType, 
  TaskPriority, 
  TaskExecutionStatus, 
  TaskStatus, 
  TaskResult, 
  TaskError, 
  QueueMetrics,
  TaskJobData,
  TaskProcessorOptions
} from '../types/task';
import { OpenRouterService } from './OpenRouterService';
import { RedisService } from '../config/redis';

export class TaskQueueManager {
  private static instance: TaskQueueManager;
  private static testInstance: TaskQueueManager;
  private queues: Map<AITaskType, Queue> = new Map();
  private taskStatuses: Map<string, TaskStatus> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();
  private openRouterService: OpenRouterService;
  private testMode: boolean;

  private constructor(testMode: boolean = false) {
    this.testMode = testMode;
    this.openRouterService = new OpenRouterService(testMode);
    this.initializeQueues();
  }

  public static getInstance(testMode: boolean = false): TaskQueueManager {
    if (testMode) {
      if (!TaskQueueManager.testInstance) {
        TaskQueueManager.testInstance = new TaskQueueManager(true);
      }
      return TaskQueueManager.testInstance;
    } else {
      if (!TaskQueueManager.instance) {
        TaskQueueManager.instance = new TaskQueueManager(false);
      }
      return TaskQueueManager.instance;
    }
  }

  private initializeQueues(): void {
    // 为每种任务类型创建专门的队列
    Object.values(AITaskType).forEach(taskType => {
      const queue = new Bull(`ai-task-${taskType}`, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          removeOnComplete: 100, // 保留最�?00个完成的任务
          removeOnFail: 50,      // 保留最�?0个失败的任务
          attempts: 3,           // 默认重试3�?
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      // 设置任务处理�?
      this.setupQueueProcessor(queue, taskType);
      
      // 设置队列事件监听
      this.setupQueueEvents(queue, taskType);
      
      this.queues.set(taskType, queue);
    });
  }

  private setupQueueProcessor(queue: Queue, taskType: AITaskType): void {
    const processorOptions: TaskProcessorOptions = {
      concurrency: this.getConcurrencyForTaskType(taskType)
    };

    queue.process(processorOptions.concurrency || 1, async (job: Job<TaskJobData>) => {
      const { taskId, userId, type, model, prompt, context, timeout } = job.data;
      
      try {
        // 更新任务状态为处理�?
        await this.updateTaskStatus(taskId, {
          taskId,
          status: TaskExecutionStatus.PROCESSING,
          progress: 0,
          startedAt: new Date(),
          retryCount: job.attemptsMade
        });

        // 设置超时处理
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Task timeout')), timeout);
        });

        // 执行AI任务
        const aiPromise = this.executeAITask(type, model, prompt, context, (progress) => {
          // 更新进度
          this.updateTaskStatus(taskId, {
            taskId,
            status: TaskExecutionStatus.PROCESSING,
            progress,
            retryCount: job.attemptsMade
          });
        });

        const result = await Promise.race([aiPromise, timeoutPromise]);

        // 任务完成
        const taskResult: TaskResult = {
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
          status: TaskExecutionStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          retryCount: job.attemptsMade,
          tokensUsed: taskResult.tokensUsed,
          executionTime: taskResult.executionTime
        });

        return taskResult;

      } catch (error) {
        const taskError: TaskError = {
          code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error,
          retryable: this.isRetryableError(error)
        };

        const taskResult: TaskResult = {
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
          status: TaskExecutionStatus.FAILED,
          progress: 0,
          completedAt: new Date(),
          error: taskError,
          retryCount: job.attemptsMade
        });

        throw error;
      }
    });
  }

  private setupQueueEvents(queue: Queue, taskType: AITaskType): void {
    queue.on('completed', (job: Job, result: TaskResult) => {
      console.log(`�?Task ${job.data.taskId} of type ${taskType} completed successfully`);
    });

    queue.on('failed', (job: Job, error: Error) => {
      console.error(`�?Task ${job.data.taskId} of type ${taskType} failed:`, error.message);
    });

    queue.on('stalled', (job: Job) => {
      console.warn(`⚠️ Task ${job.data.taskId} of type ${taskType} stalled`);
    });

    queue.on('progress', (job: Job, progress: number) => {
      console.log(`🔄 Task ${job.data.taskId} progress: ${progress}%`);
    });
  }

  private getConcurrencyForTaskType(taskType: AITaskType): number {
    // 根据任务类型设置并发�?
    switch (taskType) {
      case AITaskType.CHAT_RESPONSE:
        return 5; // 聊天响应需要较高并�?
      case AITaskType.PRACTICE_GENERATION:
        return 3; // 练习生成需要中等并�?
      case AITaskType.MATERIAL_ANALYSIS:
        return 2; // 材料分析较复杂，低并�?
      case AITaskType.LEVEL_ASSESSMENT:
        return 2; // 水平评估较复杂，低并�?
      case AITaskType.DAILY_RECOMMENDATION:
        return 1; // 每日建议可以低并�?
      case AITaskType.VOCABULARY_EXTRACTION:
        return 3; // 词汇提取中等并发
      case AITaskType.FUNCTION_CALL:
        return 4; // 功能调用较快，高并发
      default:
        return 1;
    }
  }

  private async executeAITask(
    type: AITaskType, 
    model: string, 
    prompt: string, 
    context: any,
    progressCallback: (progress: number) => void
  ): Promise<any> {
    progressCallback(10);
    
    try {
      // 调用OpenRouter API
      const response = await this.openRouterService.callAI(model, prompt, context);
      progressCallback(90);
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      // 网络错误、超时、服务器错误等可重试
      return error.message.includes('timeout') ||
             error.message.includes('network') ||
             error.message.includes('503') ||
             error.message.includes('502') ||
             error.message.includes('500');
    }
    return false;
  }

  // 公共方法：创建任�?
  public async createTask(task: AITask): Promise<string> {
    const taskId = task.id || uuidv4();
    const queue = this.queues.get(task.type);
    
    if (!queue) {
      throw new Error(`Queue for task type ${task.type} not found`);
    }

    // 设置任务选项
    const jobOptions: JobOptions = {
      priority: this.convertPriorityToNumber(task.priority),
      delay: task.scheduledAt ? task.scheduledAt.getTime() - Date.now() : 0,
      attempts: task.maxRetries,
      timeout: task.timeout,
      removeOnComplete: 100,
      removeOnFail: 50
    };

    const jobData: TaskJobData = {
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

    // 添加任务到队�?
    const job = await queue.add(jobData, jobOptions);

    // 初始化任务状�?
    const initialStatus: TaskStatus = {
      taskId,
      status: TaskExecutionStatus.QUEUED,
      progress: 0,
      retryCount: 0
    };

    await this.updateTaskStatus(taskId, initialStatus);

    console.log(`📋 Created task ${taskId} of type ${task.type} for user ${task.userId}`);
    
    return taskId;
  }

  // 批量创建任务
  public async createBatchTasks(tasks: AITask[]): Promise<string[]> {
    const taskIds: string[] = [];
    
    for (const task of tasks) {
      const taskId = await this.createTask(task);
      taskIds.push(taskId);
    }
    
    return taskIds;
  }

  // 获取任务状�?
  public async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    // 先从内存缓存获取
    const cachedStatus = this.taskStatuses.get(taskId);
    if (cachedStatus) {
      return cachedStatus;
    }

    // 从Redis获取
    try {
      const statusData = await RedisService.get(`task:status:${taskId}`);
      if (statusData) {
        const status = JSON.parse(statusData) as TaskStatus;
        this.taskStatuses.set(taskId, status);
        return status;
      }
    } catch (error) {
      console.error('Error getting task status from Redis:', error);
    }

    return null;
  }

  // 获取任务结果
  public async getTaskResult(taskId: string): Promise<TaskResult | null> {
    // 先从内存缓存获取
    const cachedResult = this.taskResults.get(taskId);
    if (cachedResult) {
      return cachedResult;
    }

    // 从Redis获取
    try {
      const resultData = await RedisService.get(`task:result:${taskId}`);
      if (resultData) {
        const result = JSON.parse(resultData) as TaskResult;
        this.taskResults.set(taskId, result);
        return result;
      }
    } catch (error) {
      console.error('Error getting task result from Redis:', error);
    }

    return null;
  }

  // 取消任务
  public async cancelTask(taskId: string): Promise<boolean> {
    try {
      // 查找并取消所有队列中的任�?
      for (const [taskType, queue] of this.queues) {
        const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
        
        for (const job of jobs) {
          if (job.data.taskId === taskId) {
            await job.remove();
            
            await this.updateTaskStatus(taskId, {
              taskId,
              status: TaskExecutionStatus.CANCELLED,
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
    } catch (error) {
      console.error('Error cancelling task:', error);
      return false;
    }
  }

  // 重试任务
  public async retryTask(taskId: string): Promise<boolean> {
    try {
      const taskResult = await this.getTaskResult(taskId);
      if (!taskResult || taskResult.success) {
        return false;
      }

      // 查找原始任务数据
      for (const [taskType, queue] of this.queues) {
        const jobs = await queue.getJobs(['failed']);
        
        for (const job of jobs) {
          if (job.data.taskId === taskId) {
            await job.retry();
            
            await this.updateTaskStatus(taskId, {
              taskId,
              status: TaskExecutionStatus.QUEUED,
              progress: 0,
              retryCount: 0
            });
            
            console.log(`🔄 Retrying task ${taskId} of type ${taskType}`);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error retrying task:', error);
      return false;
    }
  }

  // 获取队列指标
  public async getQueueMetrics(): Promise<QueueMetrics> {
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

    // 计算平均指标（简化实现）
    const averageWaitTime = 0; // TODO: 实现实际计算
    const averageProcessingTime = 0; // TODO: 实现实际计算
    const throughputPerMinute = 0; // TODO: 实现实际计算
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

  // 获取用户任务
  public async getUserTasks(userId: string): Promise<TaskStatus[]> {
    const userTasks: TaskStatus[] = [];
    
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
    
    return userTasks.sort((a, b) => 
      new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
    );
  }

  // 私有辅助方法
  private convertPriorityToNumber(priority: TaskPriority): number {
    // Bull使用数字优先级，数字越大优先级越�?
    return priority;
  }

  private async updateTaskStatus(taskId: string, status: Partial<TaskStatus>): Promise<void> {
    const currentStatus = this.taskStatuses.get(taskId) || { taskId, status: TaskExecutionStatus.QUEUED, progress: 0, retryCount: 0 };
    const updatedStatus = { ...currentStatus, ...status };
    
    this.taskStatuses.set(taskId, updatedStatus);
    
    // 同时存储到Redis
    try {
      await RedisService.set(`task:status:${taskId}`, JSON.stringify(updatedStatus), 3600); // 1小时过期
    } catch (error) {
      console.error('Error storing task status to Redis:', error);
    }
  }

  private async storeTaskResult(taskId: string, result: TaskResult): Promise<void> {
    this.taskResults.set(taskId, result);
    
    // 同时存储到Redis
    try {
      await RedisService.set(`task:result:${taskId}`, JSON.stringify(result), 86400); // 24小时过期
    } catch (error) {
      console.error('Error storing task result to Redis:', error);
    }
  }

  // 清理过期任务
  public async cleanupExpiredTasks(): Promise<void> {
    const now = Date.now();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24小时

    // 清理内存中的过期任务状�?
    for (const [taskId, status] of this.taskStatuses) {
      if (status.completedAt && (now - status.completedAt.getTime()) > expiredThreshold) {
        this.taskStatuses.delete(taskId);
      }
    }

    // 清理内存中的过期任务结果
    for (const [taskId, result] of this.taskResults) {
      if ((now - result.completedAt.getTime()) > expiredThreshold) {
        this.taskResults.delete(taskId);
      }
    }
  }

  // 关闭所有队�?
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down task queues...');
    
    for (const [taskType, queue] of this.queues) {
      await queue.close();
      console.log(`�?Queue ${taskType} closed`);
    }
    
    console.log('�?All task queues shut down');
  }
}

// Export the class, not a singleton instance
// Use TaskQueueManager.getInstance(testMode) to get the appropriate instance
