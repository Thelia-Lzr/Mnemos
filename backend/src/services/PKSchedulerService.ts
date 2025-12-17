import { PKMatchingService } from './PKMatchingService';
import { PKRewardService } from './PKRewardService';

export class PKSchedulerService {
  private matchingService: PKMatchingService;
  private rewardService: PKRewardService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute

  constructor() {
    this.matchingService = new PKMatchingService();
    this.rewardService = new PKRewardService();
  }

  /**
   * 启动定期清理服务
   */
  start(): void {
    if (this.cleanupInterval) {
      return; // Already running
    }

    console.log('Starting PK scheduler service...');
    
    // 立即执行一次清�?
    this.performCleanup();
    
    // 设置定期清理
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * 停止定期清理服务
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('PK scheduler service stopped');
    }
  }

  /**
   * 执行清理任务
   */
  private async performCleanup(): Promise<void> {
    try {
      // 清理过期的匹配请求
      await this.matchingService.cleanupExpiredRequests();
    } catch (error) {
      console.error('Error cleaning up expired requests:', error);
      // Continue with other cleanup tasks even if this one fails
    }

    try {
      // 处理未处理的对战奖励
      await this.rewardService.processUnprocessedBattles();
    } catch (error) {
      console.error('Error processing unprocessed battles:', error);
      // Log but don't throw - this is a background task
    }
  }
}

// 创建全局实例
export const pkScheduler = new PKSchedulerService();
