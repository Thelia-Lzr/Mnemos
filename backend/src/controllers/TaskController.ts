import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AsyncTaskManager } from '../services/AsyncTaskManager';
import { TaskResultManager } from '../services/TaskResultManager';
import { TaskQueueManager } from '../services/TaskQueueManager';
import { body, param, query, validationResult } from 'express-validator';

export class TaskController {
  private asyncTaskManager: AsyncTaskManager;
  private taskResultManager: TaskResultManager;
  private taskQueueManager: TaskQueueManager;

  constructor() {
    this.asyncTaskManager = AsyncTaskManager.getInstance();
    this.taskResultManager = TaskResultManager.getInstance();
    this.taskQueueManager = TaskQueueManager.getInstance();
  }

  // 获取用户任务列表
  async getUserTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { status, limit = 50, offset = 0 } = req.query;

      let tasks;
      if (status === 'active') {
        tasks = await this.asyncTaskManager.getUserActiveTasks(userId);
      } else if (status === 'completed') {
        tasks = await this.asyncTaskManager.getUserCompletedTasks(userId);
      } else {
        tasks = await this.asyncTaskManager.getUserTasks(userId);
      }

      // 应用分页
      const paginatedTasks = tasks.slice(Number(offset), Number(offset) + Number(limit));

      res.status(200).json({
        success: true,
        data: {
          tasks: paginatedTasks,
          total: tasks.length,
          limit: Number(limit),
          offset: Number(offset)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取任务状�?
  async getTaskStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { taskId } = req.params;
      const userId = req.user!.id;

      const taskStatus = await this.asyncTaskManager.getTaskStatus(taskId);
      
      if (!taskStatus) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      // 验证任务所有权（简化实现，实际需要从任务数据中验证）
      // TODO: 添加任务所有权验证

      res.status(200).json({
        success: true,
        data: taskStatus
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取任务结果
  async getTaskResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { taskId } = req.params;
      const userId = req.user!.id;

      const taskResult = await this.asyncTaskManager.getTaskResult(taskId);
      
      if (!taskResult) {
        res.status(404).json({
          success: false,
          message: 'Task result not found'
        });
        return;
      }

      // 验证任务所有权
      // TODO: 添加任务所有权验证

      res.status(200).json({
        success: true,
        data: taskResult
      });
    } catch (error) {
      next(error);
    }
  }

  // 取消任务
  async cancelTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { taskId } = req.params;
      const userId = req.user!.id;

      // 验证任务所有权
      const taskStatus = await this.asyncTaskManager.getTaskStatus(taskId);
      if (!taskStatus) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      const cancelled = await this.asyncTaskManager.cancelTask(taskId);
      
      if (cancelled) {
        res.status(200).json({
          success: true,
          message: 'Task cancelled successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Task could not be cancelled'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // 重试任务
  async retryTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { taskId } = req.params;
      const userId = req.user!.id;

      // 验证任务所有权
      const taskStatus = await this.asyncTaskManager.getTaskStatus(taskId);
      if (!taskStatus) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      const retried = await this.asyncTaskManager.retryTask(taskId);
      
      if (retried) {
        res.status(200).json({
          success: true,
          message: 'Task retried successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Task could not be retried'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // 获取队列状�?
  async getQueueStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const queueMetrics = await this.asyncTaskManager.getQueueMetrics();
      
      res.status(200).json({
        success: true,
        data: queueMetrics
      });
    } catch (error) {
      next(error);
    }
  }

  // 批量获取任务状�?
  async getBatchStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { taskIds } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'taskIds must be a non-empty array'
        });
        return;
      }

      const statuses = await this.asyncTaskManager.getBatchTaskStatus(taskIds);
      
      res.status(200).json({
        success: true,
        data: statuses
      });
    } catch (error) {
      next(error);
    }
  }

  // 批量取消任务
  async cancelBatchTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { taskIds } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'taskIds must be a non-empty array'
        });
        return;
      }

      const results = await this.asyncTaskManager.cancelBatchTasks(taskIds);
      
      res.status(200).json({
        success: true,
        data: {
          results,
          cancelled: results.filter((r: boolean) => r).length,
          total: taskIds.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取任务结果统计
  async getTaskStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await this.taskResultManager.getTaskResultStats(userId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取用户任务结果历史
  async getUserTaskResults(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit = 20, offset = 0, success } = req.query;

      let results;
      if (success === 'true') {
        results = await this.taskResultManager.getUserSuccessfulResults(userId, Number(limit));
      } else if (success === 'false') {
        results = await this.taskResultManager.getUserFailedResults(userId, Number(limit));
      } else {
        results = await this.taskResultManager.getUserTaskResults(userId, Number(limit), Number(offset));
      }

      res.status(200).json({
        success: true,
        data: {
          results,
          limit: Number(limit),
          offset: Number(offset)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 验证中间�?
  static validateTaskId = [
    param('taskId').isUUID().withMessage('Task ID must be a valid UUID')
  ];

  static validateBatchRequest = [
    body('taskIds').isArray({ min: 1, max: 50 }).withMessage('taskIds must be an array with 1-50 items'),
    body('taskIds.*').isUUID().withMessage('Each task ID must be a valid UUID')
  ];

  static validatePagination = [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ];
}
