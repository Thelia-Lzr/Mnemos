import { RedisService } from '../config/redis';
import { TaskResult, TaskStatus, TaskExecutionStatus, AITaskType } from '../types/task';
import { v4 as uuidv4 } from 'uuid';

export interface TaskResultCacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Whether to compress large results
  maxSize?: number; // Maximum size in bytes before compression
}

export interface TaskNotificationConfig {
  webhookUrl?: string;
  emailNotification?: boolean;
  pushNotification?: boolean;
  userId: string;
}

export interface TaskCleanupPolicy {
  maxAge: number; // Maximum age in milliseconds
  maxResults: number; // Maximum number of results to keep per user
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export class TaskResultManager {
  private static instance: TaskResultManager;
  private cleanupTimer?: NodeJS.Timeout;
  private readonly defaultCacheOptions: TaskResultCacheOptions = {
    ttl: 86400, // 24 hours
    compress: true,
    maxSize: 1024 * 1024 // 1MB
  };

  private readonly defaultCleanupPolicy: TaskCleanupPolicy = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxResults: 100, // Keep max 100 results per user
    cleanupInterval: 60 * 60 * 1000 // Cleanup every hour
  };

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): TaskResultManager {
    if (!TaskResultManager.instance) {
      TaskResultManager.instance = new TaskResultManager();
    }
    return TaskResultManager.instance;
  }

  // 存储任务结果
  public async storeTaskResult(
    taskId: string, 
    result: TaskResult, 
    options: TaskResultCacheOptions = {}
  ): Promise<void> {
    const cacheOptions = { ...this.defaultCacheOptions, ...options };
    
    try {
      // 准备存储的数�?
      let resultData = JSON.stringify(result);
      
      // 如果结果太大，进行压�?
      if (cacheOptions.compress && resultData.length > (cacheOptions.maxSize || 0)) {
        resultData = await this.compressData(resultData);
      }

      // 存储到Redis
      const cacheKey = this.getResultCacheKey(taskId);
      await RedisService.set(cacheKey, resultData, cacheOptions.ttl);

      // 存储结果元数�?
      const metadataKey = this.getResultMetadataKey(taskId);
      const metadata = {
        taskId,
        userId: this.extractUserIdFromResult(result),
        taskType: this.extractTaskTypeFromResult(result),
        success: result.success,
        completedAt: result.completedAt,
        executionTime: result.executionTime,
        tokensUsed: result.tokensUsed,
        compressed: cacheOptions.compress && resultData.length > (cacheOptions.maxSize || 0)
      };
      
      await RedisService.set(metadataKey, JSON.stringify(metadata), cacheOptions.ttl);

      // 添加到用户结果索�?
      if (metadata.userId) {
        await this.addToUserResultIndex(metadata.userId, taskId, result.completedAt);
      }

      console.log(`📦 Stored result for task ${taskId}`);
    } catch (error) {
      console.error(`Error storing task result ${taskId}:`, error);
      throw error;
    }
  }

  // 获取任务结果
  public async getTaskResult(taskId: string): Promise<TaskResult | null> {
    try {
      const cacheKey = this.getResultCacheKey(taskId);
      const resultData = await RedisService.get(cacheKey);
      
      if (!resultData) {
        return null;
      }

      // 检查是否需要解压缩
      const metadataKey = this.getResultMetadataKey(taskId);
      const metadataStr = await RedisService.get(metadataKey);
      
      let finalResultData = resultData;
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        if (metadata.compressed) {
          finalResultData = await this.decompressData(resultData);
        }
      }

      const result = JSON.parse(finalResultData) as TaskResult;
      
      // 标记为从缓存获取
      result.cached = true;
      result.cacheKey = cacheKey;

      return result;
    } catch (error) {
      console.error(`Error getting task result ${taskId}:`, error);
      return null;
    }
  }

  // 删除任务结果
  public async deleteTaskResult(taskId: string): Promise<boolean> {
    try {
      const cacheKey = this.getResultCacheKey(taskId);
      const metadataKey = this.getResultMetadataKey(taskId);
      
      // 获取元数据以便从用户索引中删�?
      const metadataStr = await RedisService.get(metadataKey);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        if (metadata.userId) {
          await this.removeFromUserResultIndex(metadata.userId, taskId);
        }
      }

      // 删除结果和元数据
      const deletedCount = await Promise.all([
        RedisService.del(cacheKey),
        RedisService.del(metadataKey)
      ]);

      return deletedCount.some(count => count > 0);
    } catch (error) {
      console.error(`Error deleting task result ${taskId}:`, error);
      return false;
    }
  }

  // 获取用户的所有任务结�?
  public async getUserTaskResults(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<TaskResult[]> {
    try {
      const indexKey = this.getUserResultIndexKey(userId);
      const taskIds = await this.getUserResultTaskIds(userId, limit, offset);
      
      const results: TaskResult[] = [];
      for (const taskId of taskIds) {
        const result = await this.getTaskResult(taskId);
        if (result) {
          results.push(result);
        }
      }

      return results.sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    } catch (error) {
      console.error(`Error getting user task results for ${userId}:`, error);
      return [];
    }
  }

  // 获取用户成功的任务结�?
  public async getUserSuccessfulResults(userId: string, limit: number = 20): Promise<TaskResult[]> {
    const allResults = await this.getUserTaskResults(userId, limit * 2); // 获取更多以过�?
    return allResults.filter(result => result.success).slice(0, limit);
  }

  // 获取用户失败的任务结�?
  public async getUserFailedResults(userId: string, limit: number = 20): Promise<TaskResult[]> {
    const allResults = await this.getUserTaskResults(userId, limit * 2); // 获取更多以过�?
    return allResults.filter(result => !result.success).slice(0, limit);
  }

  // 发送任务完成通知
  public async sendTaskCompletionNotification(
    taskId: string, 
    result: TaskResult, 
    config: TaskNotificationConfig
  ): Promise<void> {
    try {
      // Webhook通知
      if (config.webhookUrl) {
        await this.sendWebhookNotification(config.webhookUrl, taskId, result);
      }

      // 邮件通知
      if (config.emailNotification) {
        await this.sendEmailNotification(config.userId, taskId, result);
      }

      // 推送通知
      if (config.pushNotification) {
        await this.sendPushNotification(config.userId, taskId, result);
      }

      console.log(`📬 Sent notifications for task ${taskId}`);
    } catch (error) {
      console.error(`Error sending notifications for task ${taskId}:`, error);
    }
  }

  // 批量存储任务结果
  public async storeBatchTaskResults(
    results: Array<{ taskId: string; result: TaskResult; options?: TaskResultCacheOptions }>
  ): Promise<void> {
    const promises = results.map(({ taskId, result, options }) => 
      this.storeTaskResult(taskId, result, options)
    );
    
    await Promise.all(promises);
  }

  // 批量获取任务结果
  public async getBatchTaskResults(taskIds: string[]): Promise<(TaskResult | null)[]> {
    const promises = taskIds.map(taskId => this.getTaskResult(taskId));
    return await Promise.all(promises);
  }

  // 获取任务结果统计
  public async getTaskResultStats(userId?: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    averageExecutionTime: number;
    totalTokensUsed: number;
  }> {
    try {
      let results: TaskResult[];
      
      if (userId) {
        results = await this.getUserTaskResults(userId, 1000); // 获取大量数据用于统计
      } else {
        // 获取所有结果（管理员功能）
        results = await this.getAllTaskResults(1000);
      }

      const total = results.length;
      const successful = results.filter(r => r.success).length;
      const failed = total - successful;
      const averageExecutionTime = total > 0 
        ? results.reduce((sum, r) => sum + r.executionTime, 0) / total 
        : 0;
      const totalTokensUsed = results.reduce((sum, r) => sum + r.tokensUsed, 0);

      return {
        total,
        successful,
        failed,
        averageExecutionTime,
        totalTokensUsed
      };
    } catch (error) {
      console.error('Error getting task result stats:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        averageExecutionTime: 0,
        totalTokensUsed: 0
      };
    }
  }

  // 清理过期结果
  public async cleanupExpiredResults(policy: Partial<TaskCleanupPolicy> = {}): Promise<number> {
    const cleanupPolicy = { ...this.defaultCleanupPolicy, ...policy };
    let cleanedCount = 0;

    try {
      // 获取所有用户的结果索引
      const userIndexKeys = await this.getAllUserIndexKeys();
      
      for (const indexKey of userIndexKeys) {
        const userId = this.extractUserIdFromIndexKey(indexKey);
        const taskIds = await this.getUserResultTaskIds(userId, 1000); // 获取所有任务ID
        
        // 按时间排序，保留最新的结果
        const taskResults: Array<{ taskId: string; completedAt: Date }> = [];
        
        for (const taskId of taskIds) {
          const metadata = await this.getTaskResultMetadata(taskId);
          if (metadata) {
            taskResults.push({
              taskId,
              completedAt: new Date(metadata.completedAt)
            });
          }
        }

        // 排序：最新的在前
        taskResults.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

        // 删除过期或超出数量限制的结果
        const now = Date.now();
        for (let i = 0; i < taskResults.length; i++) {
          const { taskId, completedAt } = taskResults[i];
          const age = now - completedAt.getTime();
          
          // 如果超过最大年龄或超出保留数量限制
          if (age > cleanupPolicy.maxAge || i >= cleanupPolicy.maxResults) {
            const deleted = await this.deleteTaskResult(taskId);
            if (deleted) {
              cleanedCount++;
            }
          }
        }
      }

      console.log(`🧹 Cleaned up ${cleanedCount} expired task results`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired results:', error);
      return cleanedCount;
    }
  }

  // 启动定期清理
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredResults();
    }, this.defaultCleanupPolicy.cleanupInterval);
  }

  // 停止定期清理
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  // 私有辅助方法
  private getResultCacheKey(taskId: string): string {
    return `task:result:${taskId}`;
  }

  private getResultMetadataKey(taskId: string): string {
    return `task:result:meta:${taskId}`;
  }

  private getUserResultIndexKey(userId: string): string {
    return `user:results:${userId}`;
  }

  private async compressData(data: string): Promise<string> {
    // 简化实现：实际应用中可以使用gzip等压缩算�?
    return Buffer.from(data).toString('base64');
  }

  private async decompressData(compressedData: string): Promise<string> {
    // 简化实现：对应上面的压缩方�?
    return Buffer.from(compressedData, 'base64').toString();
  }

  private extractUserIdFromResult(result: TaskResult): string | null {
    // 从结果中提取用户ID（需要根据实际结构调整）
    return null; // 简化实�?
  }

  private extractTaskTypeFromResult(result: TaskResult): AITaskType | null {
    // 从结果中提取任务类型（需要根据实际结构调整）
    return null; // 简化实�?
  }

  private async addToUserResultIndex(userId: string, taskId: string, completedAt: Date): Promise<void> {
    const indexKey = this.getUserResultIndexKey(userId);
    const score = completedAt.getTime();
    
    // 使用Redis的有序集合存储用户结果索�?
    try {
      // 简化实现：使用列表而不是有序集�?
      await RedisService.lPush(indexKey, taskId);
    } catch (error) {
      console.error('Error adding to user result index:', error);
    }
  }

  private async removeFromUserResultIndex(userId: string, taskId: string): Promise<void> {
    // 简化实现：实际应用中需要从有序集合中删�?
    console.log(`Removing ${taskId} from user ${userId} index`);
  }

  private async getUserResultTaskIds(userId: string, limit: number, offset: number = 0): Promise<string[]> {
    // 简化实现：从用户索引获取任务ID列表
    return [];
  }

  private async getAllUserIndexKeys(): Promise<string[]> {
    // 简化实现：获取所有用户索引键
    return [];
  }

  private extractUserIdFromIndexKey(indexKey: string): string {
    return indexKey.replace('user:results:', '');
  }

  private async getTaskResultMetadata(taskId: string): Promise<any> {
    const metadataKey = this.getResultMetadataKey(taskId);
    const metadataStr = await RedisService.get(metadataKey);
    return metadataStr ? JSON.parse(metadataStr) : null;
  }

  private async getAllTaskResults(limit: number): Promise<TaskResult[]> {
    // 简化实现：获取所有任务结�?
    return [];
  }

  private async sendWebhookNotification(webhookUrl: string, taskId: string, result: TaskResult): Promise<void> {
    // TODO: 实现Webhook通知
    console.log(`Sending webhook notification for task ${taskId} to ${webhookUrl}`);
  }

  private async sendEmailNotification(userId: string, taskId: string, result: TaskResult): Promise<void> {
    // TODO: 实现邮件通知
    console.log(`Sending email notification for task ${taskId} to user ${userId}`);
  }

  private async sendPushNotification(userId: string, taskId: string, result: TaskResult): Promise<void> {
    // TODO: 实现推送通知
    console.log(`Sending push notification for task ${taskId} to user ${userId}`);
  }
}

// 导出单例实例
export const taskResultManager = TaskResultManager.getInstance();
