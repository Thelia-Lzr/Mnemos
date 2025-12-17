import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType, UserCredit, CreditTransaction, CreditConsumptionRule, CreditBalance, CreditUsageStats } from '../types/credit';

export class CreditService {
  private db: Pool;
  private consumptionRules: Map<string, CreditConsumptionRule> = new Map();

  constructor(database: Pool) {
    this.db = database;
    this.initializeConsumptionRules();
  }

  private initializeConsumptionRules(): void {
    this.consumptionRules = new Map([
      // AI Chat services
      ['chat_message', {
        service: 'chat_message',
        baseRate: 1,
        tokenMultiplier: 0.001,
        description: 'AI聊天消息处理'
      }],
      ['material_analysis', {
        service: 'material_analysis',
        baseRate: 2,
        tokenMultiplier: 0.002,
        description: '学习材料分析'
      }],
      
      // Practice services
      ['practice_generation', {
        service: 'practice_generation',
        baseRate: 3,
        tokenMultiplier: 0.003,
        description: '练习组生成'
      }],
      ['vocabulary_practice', {
        service: 'vocabulary_practice',
        baseRate: 2,
        tokenMultiplier: 0.002,
        description: '词汇练习生成'
      }],
      ['comprehensive_assessment', {
        service: 'comprehensive_assessment',
        baseRate: 5,
        tokenMultiplier: 0.005,
        description: '综合评估练习'
      }],
      
      // Assessment services
      ['level_assessment', {
        service: 'level_assessment',
        baseRate: 4,
        tokenMultiplier: 0.004,
        description: '水平评估分析'
      }],
      ['ai_analysis', {
        service: 'ai_analysis',
        baseRate: 2,
        tokenMultiplier: 0.002,
        description: 'AI练习结果分析'
      }],
      ['daily_recommendation', {
        service: 'daily_recommendation',
        baseRate: 2,
        tokenMultiplier: 0.002,
        description: '每日学习建议'
      }],
      
      // PK services
      ['pk_entry', {
        service: 'pk_entry',
        baseRate: 2,
        description: 'PK对战参与'
      }],
      ['pk_reward', {
        service: 'pk_reward',
        baseRate: -3, // Negative means credit reward
        description: 'PK对战胜利奖励'
      }],
      
      // Function calling
      ['function_call', {
        service: 'function_call',
        baseRate: 1,
        tokenMultiplier: 0.001,
        description: 'AI功能调用'
      }],
      
      // Follow-up services
      ['question_followup', {
        service: 'question_followup',
        baseRate: 1,
        tokenMultiplier: 0.001,
        description: '题目追问'
      }],
      ['practice_followup', {
        service: 'practice_followup',
        baseRate: 1,
        tokenMultiplier: 0.001,
        description: '练习组追问'
      }]
    ]);
  }

  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string): Promise<UserCredit | null> {
    const query = `
      SELECT id, user_id as "userId", current_balance as "currentBalance", 
             total_earned as "totalEarned", total_spent as "totalSpent",
             last_purchase_at as "lastPurchaseAt", average_monthly_spending as "averageMonthlySpending",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM user_credits 
      WHERE user_id = $1
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Check if user has sufficient credits for a service
   */
  async checkSufficientCredits(userId: string, service: string, tokenUsage: number = 0): Promise<CreditBalance> {
    const userCredits = await this.getUserCredits(userId);
    const currentBalance = userCredits?.currentBalance || 0;
    
    const requiredCredits = this.calculateCreditCost(service, tokenUsage);
    
    return {
      currentBalance,
      isInsufficient: currentBalance < requiredCredits,
      requiredAmount: currentBalance < requiredCredits ? requiredCredits : undefined
    };
  }

  /**
   * Calculate credit cost for a service
   */
  calculateCreditCost(service: string, tokenUsage: number = 0): number {
    const rule = this.consumptionRules.get(service);
    if (!rule) {
      throw new Error(`Unknown service: ${service}`);
    }

    let cost = rule.baseRate;
    if (rule.tokenMultiplier && tokenUsage > 0) {
      cost += Math.ceil(tokenUsage * rule.tokenMultiplier);
    }

    return Math.max(0, cost); // Ensure non-negative cost
  }

  /**
   * Consume credits for a service
   */
  async consumeCredits(
    userId: string, 
    service: string, 
    tokenUsage: number = 0,
    description?: string,
    relatedId?: string,
    aiModel?: string
  ): Promise<CreditTransaction> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check current balance
      const creditCheck = await this.checkSufficientCredits(userId, service, tokenUsage);
      if (creditCheck.isInsufficient) {
        throw new Error(`Insufficient credits. Required: ${creditCheck.requiredAmount}, Available: ${creditCheck.currentBalance}`);
      }

      const creditCost = this.calculateCreditCost(service, tokenUsage);
      const rule = this.consumptionRules.get(service);
      
      // Determine transaction type based on service
      let transactionType: TransactionType;
      if (service === 'pk_entry') {
        transactionType = TransactionType.PK_ENTRY;
      } else if (service === 'pk_reward') {
        transactionType = TransactionType.PK_REWARD;
      } else if (service.includes('chat') || service.includes('material')) {
        transactionType = TransactionType.CHAT;
      } else if (service.includes('practice') || service.includes('assessment')) {
        transactionType = TransactionType.PRACTICE;
      } else {
        transactionType = TransactionType.CHAT; // Default
      }

      // Create transaction record
      const transactionId = uuidv4();
      const transactionQuery = `
        INSERT INTO credit_transactions 
        (id, user_id, type, amount, description, related_service, related_id, token_usage, ai_model, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const transactionResult = await client.query(transactionQuery, [
        transactionId,
        userId,
        transactionType,
        -creditCost, // Negative for consumption
        description || rule?.description || `${service} service usage`,
        service,
        relatedId,
        tokenUsage,
        aiModel
      ]);

      // Update user credits
      const updateCreditsQuery = `
        UPDATE user_credits 
        SET current_balance = current_balance - $1,
            total_spent = total_spent + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING *
      `;
      
      await client.query(updateCreditsQuery, [creditCost, userId]);
      
      await client.query('COMMIT');
      
      return {
        id: transactionResult.rows[0].id,
        userId: transactionResult.rows[0].user_id,
        type: transactionResult.rows[0].type,
        amount: transactionResult.rows[0].amount,
        description: transactionResult.rows[0].description,
        relatedService: transactionResult.rows[0].related_service,
        relatedId: transactionResult.rows[0].related_id,
        tokenUsage: transactionResult.rows[0].token_usage,
        aiModel: transactionResult.rows[0].ai_model,
        createdAt: transactionResult.rows[0].created_at
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add credits to user account (for purchases or rewards)
   */
  async addCredits(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    relatedId?: string
  ): Promise<CreditTransaction> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Ensure user has a credits record
      await this.ensureUserCreditsRecord(userId, client);
      
      // Create transaction record
      const transactionId = uuidv4();
      const transactionQuery = `
        INSERT INTO credit_transactions 
        (id, user_id, type, amount, description, related_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const transactionResult = await client.query(transactionQuery, [
        transactionId,
        userId,
        type,
        amount,
        description,
        relatedId
      ]);

      // Update user credits based on amount (positive or negative)
      let updateCreditsQuery: string;
      let queryParams: any[];
      
      if (amount >= 0) {
        // Adding credits - increase both balance and total_earned
        updateCreditsQuery = `
          UPDATE user_credits 
          SET current_balance = current_balance + $1,
              total_earned = total_earned + $1,
              last_purchase_at = CASE WHEN $3 = 'purchase' THEN CURRENT_TIMESTAMP ELSE last_purchase_at END,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
          RETURNING *
        `;
        queryParams = [amount, userId, type];
      } else {
        // Deducting credits - decrease balance and increase total_spent
        const deductAmount = Math.abs(amount);
        updateCreditsQuery = `
          UPDATE user_credits 
          SET current_balance = current_balance - $1,
              total_spent = total_spent + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
          RETURNING *
        `;
        queryParams = [deductAmount, userId];
      }
      
      const updateResult = await client.query(updateCreditsQuery, queryParams);
      
      // Check if the update affected any rows
      if (updateResult.rowCount === 0) {
        throw new Error('Failed to update user credits - user credits record not found');
      }
      
      await client.query('COMMIT');
      
      return {
        id: transactionResult.rows[0].id,
        userId: transactionResult.rows[0].user_id,
        type: transactionResult.rows[0].type,
        amount: transactionResult.rows[0].amount,
        description: transactionResult.rows[0].description,
        relatedService: transactionResult.rows[0].related_service,
        relatedId: transactionResult.rows[0].related_id,
        tokenUsage: transactionResult.rows[0].token_usage,
        aiModel: transactionResult.rows[0].ai_model,
        createdAt: transactionResult.rows[0].created_at
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's credit usage statistics
   */
  async getCreditUsageStats(userId: string, days: number = 30): Promise<CreditUsageStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get transactions within the time range
    const transactionsQuery = `
      SELECT type, amount, description, related_service, created_at
      FROM credit_transactions 
      WHERE user_id = $1 AND created_at >= $2 AND amount < 0
      ORDER BY created_at DESC
    `;
    
    const transactionsResult = await this.db.query(transactionsQuery, [userId, startDate]);
    const transactions = transactionsResult.rows;
    
    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let totalSpent = 0;
    let spentToday = 0;
    let spentThisWeek = 0;
    let spentThisMonth = 0;
    const usageByService: Record<string, number> = {};
    
    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      const createdAt = new Date(transaction.created_at);
      
      totalSpent += amount;
      
      if (createdAt >= today) {
        spentToday += amount;
      }
      if (createdAt >= weekAgo) {
        spentThisWeek += amount;
      }
      if (createdAt >= monthAgo) {
        spentThisMonth += amount;
      }
      
      const service = transaction.related_service || 'unknown';
      usageByService[service] = (usageByService[service] || 0) + amount;
    }
    
    // Get recent transactions for display
    const recentTransactionsQuery = `
      SELECT id, user_id as "userId", type, amount, description, 
             related_service as "relatedService", related_id as "relatedId",
             token_usage as "tokenUsage", ai_model as "aiModel", created_at as "createdAt"
      FROM credit_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const recentResult = await this.db.query(recentTransactionsQuery, [userId]);
    
    return {
      totalSpent,
      spentToday,
      spentThisWeek,
      spentThisMonth,
      usageByService,
      recentTransactions: recentResult.rows
    };
  }

  /**
   * Get all available consumption rules
   */
  getConsumptionRules(): CreditConsumptionRule[] {
    return Array.from(this.consumptionRules.values());
  }

  /**
   * Update consumption rule
   */
  updateConsumptionRule(service: string, rule: Partial<CreditConsumptionRule>): void {
    const existingRule = this.consumptionRules.get(service);
    if (existingRule) {
      this.consumptionRules.set(service, { ...existingRule, ...rule });
    }
  }

  /**
   * Admin function: Adjust user credits
   */
  async adjustUserCredits(
    userId: string,
    amount: number,
    description: string,
    adminId: string
  ): Promise<CreditTransaction> {
    return this.addCredits(
      userId,
      amount,
      TransactionType.ADMIN_ADJUST,
      `Admin adjustment: ${description} (by ${adminId})`,
      adminId
    );
  }

  /**
   * Process PK battle entry fee
   */
  async processPKEntry(userId: string, battleId: string): Promise<CreditTransaction> {
    return this.consumeCredits(
      userId,
      'pk_entry',
      0,
      'PK对战参与',
      battleId
    );
  }

  /**
   * Process PK battle reward
   */
  async processPKReward(userId: string, battleId: string): Promise<CreditTransaction> {
    // PK reward is handled as adding credits (negative consumption rule)
    const rewardAmount = Math.abs(this.calculateCreditCost('pk_reward'));
    return this.addCredits(
      userId,
      rewardAmount,
      TransactionType.PK_REWARD,
      'PK对战胜利奖励',
      battleId
    );
  }

  /**
   * Ensure user has a credits record (private helper method)
   */
  private async ensureUserCreditsRecord(userId: string, client?: any): Promise<void> {
    const dbClient = client || this.db;
    
    const checkQuery = `SELECT id FROM user_credits WHERE user_id = $1`;
    const checkResult = await dbClient.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      // Create initial credits record
      const insertQuery = `
        INSERT INTO user_credits (id, user_id, current_balance, total_earned, created_at, updated_at)
        VALUES ($1, $2, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await dbClient.query(insertQuery, [uuidv4(), userId]);
    }
  }

  /**
   * Initialize user credits account
   */
  async initializeUserCredits(userId: string, initialBalance: number = 10): Promise<UserCredit> {
    const query = `
      INSERT INTO user_credits (id, user_id, current_balance, total_earned, created_at, updated_at)
      VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id, user_id as "userId", current_balance as "currentBalance", 
                total_earned as "totalEarned", total_spent as "totalSpent",
                last_purchase_at as "lastPurchaseAt", average_monthly_spending as "averageMonthlySpending",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const result = await this.db.query(query, [uuidv4(), userId, initialBalance]);
    
    if (result.rows.length > 0) {
      // Record initial credit transaction
      await this.addCredits(
        userId,
        initialBalance,
        TransactionType.ADMIN_ADJUST,
        '新用户注册赠送Credits'
      );
    }
    
    return result.rows[0] || await this.getUserCredits(userId);
  }
}
