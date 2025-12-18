import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PaymentService } from '../services/PaymentService';
import { CreditService } from '../services/CreditService';
import { OpenRouterService, createOpenRouterService } from '../services/OpenRouterService';
import { AsyncTaskManager } from '../services/AsyncTaskManager';
import { TaskResultManager } from '../services/TaskResultManager';
import { TaskQueueManager } from '../services/TaskQueueManager';
import { TaskExecutionStatus } from '../types/task';
import { pool } from '../config/database';

export class AdminController {
  private paymentService: PaymentService;
  private creditService: CreditService;
  private openRouterService: OpenRouterService;
  private asyncTaskManager: AsyncTaskManager;
  private taskResultManager: TaskResultManager;
  private taskQueueManager: TaskQueueManager;

  constructor() {
    this.paymentService = new PaymentService(pool);
    this.creditService = new CreditService(pool);
    this.openRouterService = createOpenRouterService();
    this.asyncTaskManager = AsyncTaskManager.getInstance();
    this.taskResultManager = TaskResultManager.getInstance();
    this.taskQueueManager = TaskQueueManager.getInstance();
  }

  // ============ Package Management ============

  /**
   * Get all packages (including inactive ones)
   */
  async getPackages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const packages = await this.paymentService.getAllPackages();
      const salesStats = await this.paymentService.getPackageSalesStats();

      res.status(200).json({
        success: true,
        data: {
          packages,
          salesStats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new package
   */
  async createPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const packageData = {
        ...req.body,
        createdBy: adminId
      };

      // Validate required fields
      const { name, description, priceInCents, creditAmount } = packageData;
      if (!name || !description || !priceInCents || !creditAmount) {
        res.status(400).json({
          success: false,
          message: 'Name, description, price, and credit amount are required'
        });
        return;
      }

      if (priceInCents <= 0 || creditAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Price and credit amount must be positive'
        });
        return;
      }

      const package_ = await this.paymentService.createPackage(packageData);

      res.status(201).json({
        success: true,
        data: package_
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing package
   */
  async updatePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate numeric fields if provided
      if (updateData.priceInCents !== undefined && updateData.priceInCents <= 0) {
        res.status(400).json({
          success: false,
          message: 'Price must be positive'
        });
        return;
      }

      if (updateData.creditAmount !== undefined && updateData.creditAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Credit amount must be positive'
        });
        return;
      }

      const package_ = await this.paymentService.updatePackage(id, updateData);

      if (!package_) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: package_
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a package
   */
  async deletePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.paymentService.deletePackage(id);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Package deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ============ Credit Management ============

  /**
   * Get user's credit information
   */
  async getUserCredits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      
      const credits = await this.creditService.getUserCredits(userId);
      const usageStats = await this.creditService.getCreditUsageStats(userId, 30);

      if (!credits) {
        res.status(404).json({
          success: false,
          message: 'User credits not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          credits,
          usageStats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adjust user's credit balance
   */
  async adjustUserCredits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { amount, description } = req.body;
      const adminId = req.user!.id;

      if (amount === undefined || amount === null || !description) {
        res.status(400).json({
          success: false,
          message: 'Amount and description are required'
        });
        return;
      }

      if (typeof amount !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Amount must be a number'
        });
        return;
      }

      const transaction = await this.creditService.adjustUserCredits(
        userId,
        amount,
        description,
        adminId
      );

      res.status(200).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system-wide credit statistics
   */
  async getCreditStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get overall credit statistics from database
      const query = `
        SELECT 
          SUM(current_balance) as total_credits_remaining,
          SUM(total_earned) as total_credits_issued,
          SUM(total_spent) as total_credits_consumed,
          AVG(current_balance) as average_credits_per_user,
          COUNT(*) as total_users_with_credits
        FROM user_credits
      `;

      const result = await pool.query(query);
      const stats = result.rows[0];

      // Get consumption by service type
      const consumptionQuery = `
        SELECT 
          type,
          SUM(ABS(amount)) as total_consumed
        FROM credit_transactions 
        WHERE amount < 0 
        GROUP BY type
        ORDER BY total_consumed DESC
      `;

      const consumptionResult = await pool.query(consumptionQuery);

      res.status(200).json({
        success: true,
        data: {
          totalCreditsRemaining: parseInt(stats.total_credits_remaining) || 0,
          totalCreditsIssued: parseInt(stats.total_credits_issued) || 0,
          totalCreditsConsumed: parseInt(stats.total_credits_consumed) || 0,
          averageCreditsPerUser: parseFloat(stats.average_credits_per_user) || 0,
          totalUsersWithCredits: parseInt(stats.total_users_with_credits) || 0,
          consumptionByFeature: consumptionResult.rows.reduce((acc, row) => {
            acc[row.type] = parseInt(row.total_consumed);
            return acc;
          }, {} as Record<string, number>)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const revenueStats = await this.paymentService.getRevenueStats(parseInt(days as string));

      res.status(200).json({
        success: true,
        data: revenueStats
      });
    } catch (error) {
      next(error);
    }
  }

  // ============ User Management ============

  /**
   * Get all users with search and pagination
   */
  async getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        search = '', 
        page = 1, 
        limit = 20, 
        sortBy = 'created_at', 
        sortOrder = 'desc' 
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      let query = `
        SELECT 
          u.id, u.username, u.email, u.role, u.created_at, u.last_login_at,
          uc.current_balance as credit_balance,
          uc.total_earned as total_credits_earned,
          uc.total_spent as total_credits_spent
        FROM users u
        LEFT JOIN user_credits uc ON u.id = uc.user_id
      `;
      
      const values: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` WHERE (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
      }

      // Add sorting
      const validSortFields = ['username', 'email', 'created_at', 'last_login_at', 'credit_balance'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'created_at';
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      if (sortField === 'credit_balance') {
        query += ` ORDER BY uc.current_balance ${order}`;
      } else {
        query += ` ORDER BY u.${sortField} ${order}`;
      }

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(parseInt(limit as string), offset);

      const result = await pool.query(query, values);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM users u';
      const countValues: any[] = [];
      
      if (search) {
        countQuery += ' WHERE (u.username ILIKE $1 OR u.email ILIKE $1)';
        countValues.push(`%${search}%`);
      }

      const countResult = await pool.query(countQuery, countValues);
      const totalUsers = parseInt(countResult.rows[0].count);

      res.status(200).json({
        success: true,
        data: {
          users: result.rows.map(row => ({
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            createdAt: row.created_at,
            lastLoginAt: row.last_login_at,
            creditBalance: row.credit_balance || 0,
            totalCreditsEarned: row.total_credits_earned || 0,
            totalCreditsSpent: row.total_credits_spent || 0
          })),
          pagination: {
            currentPage: parseInt(page as string),
            totalPages: Math.ceil(totalUsers / parseInt(limit as string)),
            totalUsers,
            limit: parseInt(limit as string)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed user information
   */
  async getUserDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      // Get user basic info
      const userQuery = `
        SELECT u.*, uc.current_balance, uc.total_earned, uc.total_spent, uc.updated_at as credits_updated_at
        FROM users u
        LEFT JOIN user_credits uc ON u.id = uc.user_id
        WHERE u.id = $1
      `;
      const userResult = await pool.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];

      // Get user capabilities
      const capabilitiesQuery = `
        SELECT language, current_level, overall_level, confidence_score,
               listening_level, speaking_level, reading_level, writing_level,
               last_assessed_at, updated_at
        FROM user_capabilities
        WHERE user_id = $1
      `;
      const capabilitiesResult = await pool.query(capabilitiesQuery, [userId]);

      // Get recent credit transactions
      const transactionsQuery = `
        SELECT type, amount, description, created_at
        FROM credit_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const transactionsResult = await pool.query(transactionsQuery, [userId]);

      // Get practice statistics
      const practiceStatsQuery = `
        SELECT 
          COUNT(*) as total_practices,
          AVG(accuracy) as average_accuracy,
          SUM(total_time) as total_practice_time,
          MAX(completed_at) as last_practice_at
        FROM practice_results
        WHERE user_id = $1
      `;
      const practiceStatsResult = await pool.query(practiceStatsQuery, [userId]);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at,
            creditBalance: user.current_balance || 0,
            totalCreditsEarned: user.total_earned || 0,
            totalCreditsSpent: user.total_spent || 0,
            creditsUpdatedAt: user.credits_updated_at
          },
          capabilities: capabilitiesResult.rows,
          recentTransactions: transactionsResult.rows,
          practiceStats: practiceStatsResult.rows[0] || {
            total_practices: 0,
            average_accuracy: 0,
            total_practice_time: 0,
            last_practice_at: null
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysInt = parseInt(days as string);

      // API usage statistics
      const apiUsageQuery = `
        SELECT 
          COUNT(*) as total_api_calls,
          SUM(CASE WHEN type = 'chat' THEN ABS(amount) ELSE 0 END) as chat_calls,
          SUM(CASE WHEN type = 'practice' THEN ABS(amount) ELSE 0 END) as practice_calls,
          SUM(CASE WHEN type = 'pk_entry' THEN ABS(amount) ELSE 0 END) as pk_calls
        FROM credit_transactions
        WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
        AND amount < 0
      `;

      const apiUsageResult = await pool.query(apiUsageQuery);

      // Daily usage trend
      const dailyUsageQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as api_calls,
          COUNT(DISTINCT user_id) as active_users
        FROM credit_transactions
        WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
        AND amount < 0
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const dailyUsageResult = await pool.query(dailyUsageQuery);

      // Feature usage distribution
      const featureUsageQuery = `
        SELECT 
          type,
          COUNT(*) as usage_count,
          SUM(ABS(amount)) as total_credits_consumed
        FROM credit_transactions
        WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
        AND amount < 0
        GROUP BY type
        ORDER BY usage_count DESC
      `;

      const featureUsageResult = await pool.query(featureUsageQuery);

      res.status(200).json({
        success: true,
        data: {
          totalApiCalls: parseInt(apiUsageResult.rows[0].total_api_calls) || 0,
          apiCallsByFeature: {
            chat: parseInt(apiUsageResult.rows[0].chat_calls) || 0,
            practice: parseInt(apiUsageResult.rows[0].practice_calls) || 0,
            pk: parseInt(apiUsageResult.rows[0].pk_calls) || 0
          },
          dailyUsageTrend: dailyUsageResult.rows,
          featureUsageDistribution: featureUsageResult.rows,
          periodDays: daysInt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive system statistics
   */
  async getStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get user statistics
      const userStatsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_week
        FROM users
      `;
      const userStatsResult = await pool.query(userStatsQuery);
      const userStats = userStatsResult.rows[0];

      // Get credit statistics
      const creditStatsQuery = `
        SELECT 
          COALESCE(SUM(current_balance), 0) as total_credits_remaining,
          COALESCE(SUM(total_earned), 0) as total_credits_issued,
          COALESCE(SUM(total_spent), 0) as total_credits_consumed
        FROM user_credits
      `;
      const creditStatsResult = await pool.query(creditStatsQuery);
      const creditStats = creditStatsResult.rows[0];

      // Get API usage statistics
      const apiStatsQuery = `
        SELECT 
          COUNT(*) as total_api_calls,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as api_calls_today
        FROM credit_transactions
        WHERE amount < 0
        AND created_at >= NOW() - INTERVAL '30 days'
      `;
      const apiStatsResult = await pool.query(apiStatsQuery);
      const apiStats = apiStatsResult.rows[0];

      res.status(200).json({
        success: true,
        data: {
          users: {
            total: parseInt(userStats.total_users) || 0,
            active: parseInt(userStats.active_users) || 0,
            newToday: parseInt(userStats.new_users_today) || 0,
            newThisWeek: parseInt(userStats.new_users_week) || 0
          },
          credits: {
            totalRemaining: parseInt(creditStats.total_credits_remaining) || 0,
            totalIssued: parseInt(creditStats.total_credits_issued) || 0,
            totalConsumed: parseInt(creditStats.total_credits_consumed) || 0
          },
          api: {
            totalCalls: parseInt(apiStats.total_api_calls) || 0,
            callsToday: parseInt(apiStats.api_calls_today) || 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Total users
      const totalUsersQuery = 'SELECT COUNT(*) as total FROM users';
      const totalUsersResult = await pool.query(totalUsersQuery);

      // Active users (logged in within last 30 days)
      const activeUsersQuery = `
        SELECT COUNT(*) as active 
        FROM users 
        WHERE last_login_at >= NOW() - INTERVAL '30 days'
      `;
      const activeUsersResult = await pool.query(activeUsersQuery);

      // New users by period
      const newUsersQuery = `
        SELECT 
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as this_month
        FROM users
      `;
      const newUsersResult = await pool.query(newUsersQuery);

      // Users by language
      const usersByLanguageQuery = `
        SELECT 
          language,
          COUNT(*) as user_count
        FROM user_capabilities
        GROUP BY language
        ORDER BY user_count DESC
      `;
      const usersByLanguageResult = await pool.query(usersByLanguageQuery);

      // Users by level
      const usersByLevelQuery = `
        SELECT 
          current_level,
          COUNT(*) as user_count
        FROM user_capabilities
        GROUP BY current_level
        ORDER BY 
          CASE current_level
            WHEN 'A1' THEN 1
            WHEN 'A2' THEN 2
            WHEN 'B1' THEN 3
            WHEN 'B2' THEN 4
            WHEN 'C1' THEN 5
            WHEN 'C2' THEN 6
            ELSE 7
          END
      `;
      const usersByLevelResult = await pool.query(usersByLevelQuery);

      // Daily/Weekly/Monthly active users
      const activityQuery = `
        SELECT 
          COUNT(CASE WHEN last_login_at >= CURRENT_DATE THEN 1 END) as daily_active,
          COUNT(CASE WHEN last_login_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as weekly_active,
          COUNT(CASE WHEN last_login_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_active
        FROM users
      `;
      const activityResult = await pool.query(activityQuery);

      res.status(200).json({
        success: true,
        data: {
          totalUsers: parseInt(totalUsersResult.rows[0].total),
          activeUsers: parseInt(activeUsersResult.rows[0].active),
          newUsersToday: parseInt(newUsersResult.rows[0].today),
          newUsersThisWeek: parseInt(newUsersResult.rows[0].this_week),
          newUsersThisMonth: parseInt(newUsersResult.rows[0].this_month),
          usersByLanguage: usersByLanguageResult.rows.reduce((acc, row) => {
            acc[row.language] = parseInt(row.user_count);
            return acc;
          }, {} as Record<string, number>),
          usersByLevel: usersByLevelResult.rows.reduce((acc, row) => {
            acc[row.current_level] = parseInt(row.user_count);
            return acc;
          }, {} as Record<string, number>),
          dailyActiveUsers: parseInt(activityResult.rows[0].daily_active),
          weeklyActiveUsers: parseInt(activityResult.rows[0].weekly_active),
          monthlyActiveUsers: parseInt(activityResult.rows[0].monthly_active)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ============ Task Queue Management ============

  /**
   * Get task queue metrics
   */
  async getQueueMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get metrics from AsyncTaskManager
      const queueMetrics = await this.asyncTaskManager.getQueueMetrics();
      
      // Get all tasks for additional statistics
      const allTasks = await this.asyncTaskManager.getAllTasks();
      
      // Calculate status breakdown
      const statusBreakdown = allTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate processing times for completed tasks
      const completedTasks = allTasks.filter(task => 
        task.status === 'completed' && task.startedAt && task.completedAt
      );
      
      const processingTimes = completedTasks.map(task => {
        const started = new Date(task.startedAt!).getTime();
        const completed = new Date(task.completedAt!).getTime();
        return (completed - started) / 1000; // Convert to seconds
      });

      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0;

      // Calculate throughput (completed tasks in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCompletedTasks = completedTasks.filter(task => 
        new Date(task.completedAt!) > oneHourAgo
      );
      const throughputPerMinute = recentCompletedTasks.length / 60;

      // Calculate error rate
      const totalTasks = allTasks.length || 1;
      const failedTasks = allTasks.filter(task => task.status === 'failed').length;
      const errorRate = (failedTasks / totalTasks) * 100;

      res.status(200).json({
        success: true,
        data: {
          totalTasks: allTasks.length,
          queuedTasks: allTasks.filter(task => task.status === TaskExecutionStatus.QUEUED).length,
          processingTasks: allTasks.filter(task => task.status === TaskExecutionStatus.PROCESSING).length,
          completedTasks: allTasks.filter(task => task.status === TaskExecutionStatus.COMPLETED).length,
          failedTasks: failedTasks,
          averageWaitTime: 0, // Would need more complex calculation
          averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
          throughputPerMinute: Math.round(throughputPerMinute * 100) / 100,
          resourceUtilization: queueMetrics.resourceUtilization || 0,
          errorRate: Math.round(errorRate * 100) / 100,
          statusBreakdown
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get failed tasks
   */
  async getFailedTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 50, offset = 0 } = req.query;

      // Get all tasks and filter failed ones
      const allTasks = await this.asyncTaskManager.getAllTasks();
      const failedTasks = allTasks.filter(task => task.status === TaskExecutionStatus.FAILED);
      
      // Sort by creation date (newest first)
      failedTasks.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Apply pagination
      const startIndex = parseInt(offset as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedTasks = failedTasks.slice(startIndex, endIndex);

      // Format tasks for frontend
      const formattedTasks = paginatedTasks.map(task => ({
        id: task.taskId,
        user_id: task.userId,
        type: task.type,
        priority: task.priority,
        created_at: task.createdAt,
        started_at: task.startedAt,
        completed_at: task.completedAt,
        error_message: task.error?.message || 'Unknown error',
        retry_count: task.retryCount || 0,
        context: {} // TaskStatus doesn't have context field
      }));

      res.status(200).json({
        success: true,
        data: {
          tasks: formattedTasks,
          totalCount: failedTasks.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry failed tasks
   */
  async retryFailedTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskIds } = req.body;

      if (!taskIds || !Array.isArray(taskIds)) {
        res.status(400).json({
          success: false,
          message: 'Task IDs array is required'
        });
        return;
      }

      // Retry tasks using AsyncTaskManager
      const retryResults = await Promise.all(
        taskIds.map(async (taskId: string) => {
          try {
            const success = await this.asyncTaskManager.retryTask(taskId);
            return { taskId, success };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { taskId, success: false, error: errorMessage };
          }
        })
      );

      const successfulRetries = retryResults.filter(result => result.success);

      res.status(200).json({
        success: true,
        data: {
          retriedTasks: successfulRetries.length,
          taskIds: successfulRetries.map(result => result.taskId),
          failures: retryResults.filter(result => !result.success)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tasks (admin function)
   */
  async getAllTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        status, 
        type, 
        userId, 
        limit = 50, 
        offset = 0 
      } = req.query;

      // Get all tasks
      let allTasks = await this.asyncTaskManager.getAllTasks();
      
      // Apply filters
      if (status && status !== 'all') {
        allTasks = allTasks.filter(task => task.status === status);
      }
      
      if (type && type !== 'all') {
        allTasks = allTasks.filter(task => task.type === type);
      }
      
      if (userId) {
        allTasks = allTasks.filter(task => task.userId === userId);
      }

      // Apply pagination
      const startIndex = parseInt(offset as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedTasks = allTasks.slice(startIndex, endIndex);

      // Format tasks for frontend
      const formattedTasks = paginatedTasks.map(task => ({
        id: task.taskId,
        user_id: task.userId || 'unknown',
        type: task.type || 'unknown',
        status: task.status,
        priority: task.priority || 0,
        created_at: task.createdAt,
        started_at: task.startedAt,
        completed_at: task.completedAt,
        progress: task.progress || 0,
        retry_count: task.retryCount || 0,
        execution_time: task.executionTime || 0,
        tokens_used: task.tokensUsed || 0,
        error_message: task.error?.message || null
      }));

      res.status(200).json({
        success: true,
        data: {
          tasks: formattedTasks,
          totalCount: allTasks.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear completed and failed tasks older than specified days
   */
  async clearQueue(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days = 7, includeCompleted = true, includeFailed = false } = req.body;

      if (!includeCompleted && !includeFailed) {
        res.status(400).json({
          success: false,
          message: 'Must specify at least one status to clear'
        });
        return;
      }

      // Get all tasks
      const allTasks = await this.asyncTaskManager.getAllTasks();
      
      // Filter tasks to clear based on criteria
      const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
      const tasksToDelete = allTasks.filter(task => {
        const taskDate = new Date(task.createdAt || task.startedAt || Date.now());
        const isOldEnough = taskDate < cutoffDate;
        const shouldInclude = (includeCompleted && task.status === TaskExecutionStatus.COMPLETED) || 
                             (includeFailed && task.status === TaskExecutionStatus.FAILED);
        return isOldEnough && shouldInclude;
      });

      // Delete tasks using AsyncTaskManager
      let deletedCount = 0;
      for (const task of tasksToDelete) {
        try {
          await this.asyncTaskManager.deleteTask(task.taskId);
          deletedCount++;
        } catch (error) {
          console.warn(`Failed to delete task ${task.taskId}:`, error);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deletedTasks: deletedCount,
          clearedDays: parseInt(days)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ============ OpenRouter API Key Management ============

  /**
   * Get current OpenRouter API configuration
   */
  async getOpenRouterConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get configuration from database
      const configQuery = `
        SELECT api_key, base_url, timeout, max_retries, retry_delay,
               daily_token_limit, monthly_token_limit, cost_threshold,
               is_active, last_tested_at, test_status, updated_at, updated_by
        FROM openrouter_config 
        ORDER BY updated_at DESC 
        LIMIT 1
      `;

      const result = await pool.query(configQuery);
      
      if (result.rows.length === 0) {
        // Return default configuration if none exists
        res.status(200).json({
          success: true,
          data: {
            apiKey: '',
            baseUrl: 'https://openrouter.ai/api/v1',
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000,
            dailyTokenLimit: null,
            monthlyTokenLimit: null,
            costThreshold: null,
            isActive: false,
            lastTestedAt: null,
            testStatus: 'untested',
            updatedAt: null,
            updatedBy: null
          }
        });
        return;
      }

      const config = result.rows[0];
      
      res.status(200).json({
        success: true,
        data: {
          apiKey: config.api_key ? '***' + config.api_key.slice(-4) : '', // Mask API key
          baseUrl: config.base_url,
          timeout: config.timeout,
          maxRetries: config.max_retries,
          retryDelay: config.retry_delay,
          dailyTokenLimit: config.daily_token_limit,
          monthlyTokenLimit: config.monthly_token_limit,
          costThreshold: config.cost_threshold,
          isActive: config.is_active,
          lastTestedAt: config.last_tested_at,
          testStatus: config.test_status,
          updatedAt: config.updated_at,
          updatedBy: config.updated_by
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test OpenRouter API key
   */
  async testOpenRouterKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { apiKey } = req.body;

      if (!apiKey || typeof apiKey !== 'string') {
        res.status(400).json({
          success: false,
          message: 'API key is required'
        });
        return;
      }

      // Validate API key format
      if (!this.validateApiKeyFormat(apiKey)) {
        res.status(400).json({
          success: false,
          message: 'Invalid API key format'
        });
        return;
      }

      const startTime = Date.now();

      try {
        // Test the API key directly with axios
        const axios = require('axios');
        
        const testClient = axios.create({
          baseURL: 'https://openrouter.ai/api/v1',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
            'X-Title': 'AI Language Learning App'
          },
          timeout: 30000
        });

        // Test basic connectivity with a simple request using a working model
        const testRequest = {
          model: 'mistralai/mistral-7b-instruct',
          messages: [
            {
              role: 'system',
              content: 'You are a test assistant. Respond only with "OK".'
            },
            {
              role: 'user',
              content: 'Test connection - respond with "OK"'
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        };

        const response = await testClient.post('/chat/completions', testRequest);
        const responseTime = Date.now() - startTime;

        if (response.data && response.data.choices && response.data.choices[0]) {
          const choice = response.data.choices[0];
          const tokensUsed = response.data.usage?.total_tokens || 0;
          const sampleResponse = choice.message?.content || 'No response content';

          // Get available models (static list of working models)
          const availableModels = [
            'mistralai/mistral-7b-instruct',
            'microsoft/wizardlm-2-8x22b',
            'meta-llama/llama-3.1-8b-instruct',
            'google/gemma-2-9b-it',
            'qwen/qwen-2-7b-instruct',
            'nvidia/llama-3.1-nemotron-70b-instruct'
          ];

          // Update test status in database
          await this.updateApiTestStatus(apiKey, 'success', undefined);

          res.status(200).json({
            success: true,
            data: {
              success: true,
              responseTime,
              availableModels,
              connectionTest: {
                success: true,
                latency: responseTime,
              },
              modelTests: [{
                model: 'mistralai/mistral-7b-instruct',
                success: true,
                responseTime,
                tokensUsed,
                sampleResponse
              }],
              testedAt: new Date()
            }
          });
        } else {
          throw new Error('Invalid response structure from OpenRouter API');
        }
      } catch (apiError: any) {
        const responseTime = Date.now() - startTime;
        let errorMessage = 'Unknown error';
        
        if (apiError.response) {
          // API returned an error response
          errorMessage = apiError.response.data?.error?.message || 
                        apiError.response.data?.message || 
                        `HTTP ${apiError.response.status}: ${apiError.response.statusText}`;
        } else if (apiError.request) {
          // Network error
          errorMessage = 'Network error - unable to reach OpenRouter API';
        } else {
          // Other error
          errorMessage = apiError.message || 'Unknown error occurred';
        }

        // Update test status in database
        await this.updateApiTestStatus(apiKey, 'failed', errorMessage);

        res.status(200).json({
          success: true,
          data: {
            success: false,
            responseTime,
            availableModels: [],
            errorMessage,
            connectionTest: {
              success: false,
              latency: responseTime,
              error: errorMessage
            },
            modelTests: [],
            testedAt: new Date()
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update OpenRouter API configuration
   */
  async updateOpenRouterConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const {
        apiKey,
        baseUrl,
        timeout,
        maxRetries,
        retryDelay,
        dailyTokenLimit,
        monthlyTokenLimit,
        costThreshold,
        isActive
      } = req.body;

      // Validate required fields
      if (!apiKey || !baseUrl) {
        res.status(400).json({
          success: false,
          message: 'API key and base URL are required'
        });
        return;
      }

      // Validate API key format
      if (!this.validateApiKeyFormat(apiKey)) {
        res.status(400).json({
          success: false,
          message: 'Invalid API key format'
        });
        return;
      }

      // Validate numeric fields
      if (timeout && (timeout < 1000 || timeout > 120000)) {
        res.status(400).json({
          success: false,
          message: 'Timeout must be between 1000 and 120000 milliseconds'
        });
        return;
      }

      if (maxRetries && (maxRetries < 0 || maxRetries > 10)) {
        res.status(400).json({
          success: false,
          message: 'Max retries must be between 0 and 10'
        });
        return;
      }

      // Insert or update configuration
      const upsertQuery = `
        INSERT INTO openrouter_config (
          api_key, base_url, timeout, max_retries, retry_delay,
          daily_token_limit, monthly_token_limit, cost_threshold,
          is_active, test_status, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'untested', CURRENT_TIMESTAMP, $10)
        ON CONFLICT (id) DO UPDATE SET
          api_key = EXCLUDED.api_key,
          base_url = EXCLUDED.base_url,
          timeout = EXCLUDED.timeout,
          max_retries = EXCLUDED.max_retries,
          retry_delay = EXCLUDED.retry_delay,
          daily_token_limit = EXCLUDED.daily_token_limit,
          monthly_token_limit = EXCLUDED.monthly_token_limit,
          cost_threshold = EXCLUDED.cost_threshold,
          is_active = EXCLUDED.is_active,
          test_status = 'untested',
          updated_at = CURRENT_TIMESTAMP,
          updated_by = EXCLUDED.updated_by
        RETURNING *
      `;

      const values = [
        apiKey,
        baseUrl || 'https://openrouter.ai/api/v1',
        timeout || 30000,
        maxRetries || 3,
        retryDelay || 1000,
        dailyTokenLimit,
        monthlyTokenLimit,
        costThreshold,
        isActive !== undefined ? isActive : true,
        adminId
      ];

      const result = await pool.query(upsertQuery, values);
      const config = result.rows[0];

      // Reinitialize OpenRouter service with new configuration
      try {
        this.openRouterService = createOpenRouterService();
        
        res.status(200).json({
          success: true,
          data: {
            apiKey: '***' + apiKey.slice(-4), // Mask API key in response
            baseUrl: config.base_url,
            timeout: config.timeout,
            maxRetries: config.max_retries,
            retryDelay: config.retry_delay,
            dailyTokenLimit: config.daily_token_limit,
            monthlyTokenLimit: config.monthly_token_limit,
            costThreshold: config.cost_threshold,
            isActive: config.is_active,
            testStatus: config.test_status,
            updatedAt: config.updated_at,
            updatedBy: config.updated_by
          },
          message: 'OpenRouter configuration updated successfully'
        });
      } catch (serviceError: any) {
        res.status(500).json({
          success: false,
          message: `Configuration saved but service initialization failed: ${serviceError.message}`
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get OpenRouter API usage statistics
   */
  async getOpenRouterUsageStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { timeRange = 'monthly' } = req.query;
      
      let interval = '30 days';
      if (timeRange === 'daily') interval = '1 day';
      else if (timeRange === 'weekly') interval = '7 days';
      else if (timeRange === 'monthly') interval = '30 days';

      // Get usage statistics from credit transactions (proxy for API usage)
      const usageQuery = `
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as total_requests,
          SUM(ABS(amount)) as total_credits,
          AVG(ABS(amount)) as avg_credits_per_request
        FROM credit_transactions
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND amount < 0
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `;

      const usageResult = await pool.query(usageQuery);

      // Get model usage distribution (estimated from transaction types)
      const modelUsageQuery = `
        SELECT 
          type,
          COUNT(*) as request_count,
          SUM(ABS(amount)) as total_credits,
          AVG(ABS(amount)) as avg_credits_per_request
        FROM credit_transactions
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND amount < 0
        GROUP BY type
        ORDER BY request_count DESC
      `;

      const modelUsageResult = await pool.query(modelUsageQuery);

      // Calculate totals
      const totalRequests = usageResult.rows.reduce((sum, row) => sum + parseInt(row.total_requests), 0);
      const totalCredits = usageResult.rows.reduce((sum, row) => sum + parseFloat(row.total_credits), 0);
      const totalCost = totalCredits * 0.001; // Estimate: 1 credit = $0.001

      // Calculate performance metrics
      const averageResponseTime = 1500; // Mock value - would need actual tracking
      const uptime = 99.5; // Mock value - would need actual monitoring
      const errorRate = 2.1; // Mock value - would need error tracking

      res.status(200).json({
        success: true,
        data: {
          daily: {
            totalRequests: Math.floor(totalRequests / 30),
            totalTokens: Math.floor(totalCredits * 100), // Estimate tokens
            totalCost: totalCost / 30,
            averageResponseTime,
            errorRate: errorRate / 30
          },
          weekly: {
            totalRequests: Math.floor(totalRequests / 4),
            totalTokens: Math.floor(totalCredits * 100 / 4),
            totalCost: totalCost / 4,
            averageResponseTime,
            errorRate: errorRate / 4
          },
          monthly: {
            totalRequests,
            totalTokens: Math.floor(totalCredits * 100),
            totalCost,
            averageResponseTime,
            errorRate
          },
          modelUsage: modelUsageResult.rows.reduce((acc, row) => {
            acc[row.type] = {
              requestCount: parseInt(row.request_count),
              tokenCount: Math.floor(parseFloat(row.total_credits) * 100),
              averageTokensPerRequest: Math.floor(parseFloat(row.avg_credits_per_request) * 100),
              averageResponseTime,
              errorCount: Math.floor(parseInt(row.request_count) * 0.02),
              totalCost: parseFloat(row.total_credits) * 0.001
            };
            return acc;
          }, {} as Record<string, any>),
          costAnalysis: {
            totalCost,
            costByModel: modelUsageResult.rows.reduce((acc, row) => {
              acc[row.type] = parseFloat(row.total_credits) * 0.001;
              return acc;
            }, {} as Record<string, number>),
            costByTaskType: {
              conversation: totalCost * 0.4,
              practice: totalCost * 0.3,
              analysis: totalCost * 0.2,
              assessment: totalCost * 0.1
            },
            projectedMonthlyCost: totalCost,
            costTrend: usageResult.rows.slice(0, 7).map(row => ({
              date: row.date,
              cost: parseFloat(row.total_credits) * 0.001,
              tokens: Math.floor(parseFloat(row.total_credits) * 100),
              requests: parseInt(row.total_requests)
            }))
          },
          performanceMetrics: {
            averageResponseTime,
            p95ResponseTime: averageResponseTime * 1.5,
            p99ResponseTime: averageResponseTime * 2,
            uptime,
            errorRate,
            throughput: totalRequests / 30 / 24 / 60 // requests per minute
          },
          generatedAt: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available OpenRouter models
   */
  async getOpenRouterModels(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const models = this.openRouterService.getAvailableModels();
      
      res.status(200).json({
        success: true,
        data: models.map(config => ({
          id: config.name,
          name: config.name,
          description: `AI model for language learning tasks`,
          contextLength: config.maxTokens,
          pricing: {
            prompt: config.costPerToken,
            completion: config.costPerToken
          },
          capabilities: ['text-generation', 'conversation', 'analysis'],
          isAvailable: true
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  // ============ Helper Methods ============

  /**
   * Validate API key format
   */
  private validateApiKeyFormat(apiKey: string): boolean {
    // OpenRouter API keys typically start with 'sk-or-' and are followed by base64-like characters
    // In development/test mode, be more lenient
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return apiKey.startsWith('sk-or-') && apiKey.length >= 10;
    }
    
    const apiKeyRegex = /^sk-or-[A-Za-z0-9+/]+=*$/;
    return apiKeyRegex.test(apiKey) && apiKey.length >= 20;
  }

  /**
   * Update API test status in database
   */
  private async updateApiTestStatus(apiKey: string, status: 'success' | 'failed', errorMessage?: string): Promise<void> {
    const updateQuery = `
      UPDATE openrouter_config 
      SET test_status = $1, 
          last_tested_at = CURRENT_TIMESTAMP,
          error_message = $2
      WHERE api_key = $3
    `;
    
    await pool.query(updateQuery, [status, errorMessage || null, apiKey]);
  }
}
