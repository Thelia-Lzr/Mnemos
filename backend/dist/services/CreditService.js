"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditService = void 0;
const uuid_1 = require("uuid");
const credit_1 = require("../types/credit");
class CreditService {
    constructor(database) {
        this.consumptionRules = new Map();
        this.db = database;
        this.initializeConsumptionRules();
    }
    initializeConsumptionRules() {
        this.consumptionRules = new Map([
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
            ['pk_entry', {
                    service: 'pk_entry',
                    baseRate: 2,
                    description: 'PK对战参与'
                }],
            ['pk_reward', {
                    service: 'pk_reward',
                    baseRate: -3,
                    description: 'PK对战胜利奖励'
                }],
            ['function_call', {
                    service: 'function_call',
                    baseRate: 1,
                    tokenMultiplier: 0.001,
                    description: 'AI功能调用'
                }],
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
    async getUserCredits(userId) {
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
    async checkSufficientCredits(userId, service, tokenUsage = 0) {
        const userCredits = await this.getUserCredits(userId);
        const currentBalance = userCredits?.currentBalance || 0;
        const requiredCredits = this.calculateCreditCost(service, tokenUsage);
        return {
            currentBalance,
            isInsufficient: currentBalance < requiredCredits,
            requiredAmount: currentBalance < requiredCredits ? requiredCredits : undefined
        };
    }
    calculateCreditCost(service, tokenUsage = 0) {
        const rule = this.consumptionRules.get(service);
        if (!rule) {
            throw new Error(`Unknown service: ${service}`);
        }
        let cost = rule.baseRate;
        if (rule.tokenMultiplier && tokenUsage > 0) {
            cost += Math.ceil(tokenUsage * rule.tokenMultiplier);
        }
        return Math.max(0, cost);
    }
    async consumeCredits(userId, service, tokenUsage = 0, description, relatedId, aiModel) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const creditCheck = await this.checkSufficientCredits(userId, service, tokenUsage);
            if (creditCheck.isInsufficient) {
                throw new Error(`Insufficient credits. Required: ${creditCheck.requiredAmount}, Available: ${creditCheck.currentBalance}`);
            }
            const creditCost = this.calculateCreditCost(service, tokenUsage);
            const rule = this.consumptionRules.get(service);
            let transactionType;
            if (service === 'pk_entry') {
                transactionType = credit_1.TransactionType.PK_ENTRY;
            }
            else if (service === 'pk_reward') {
                transactionType = credit_1.TransactionType.PK_REWARD;
            }
            else if (service.includes('chat') || service.includes('material')) {
                transactionType = credit_1.TransactionType.CHAT;
            }
            else if (service.includes('practice') || service.includes('assessment')) {
                transactionType = credit_1.TransactionType.PRACTICE;
            }
            else {
                transactionType = credit_1.TransactionType.CHAT;
            }
            const transactionId = (0, uuid_1.v4)();
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
                -creditCost,
                description || rule?.description || `${service} service usage`,
                service,
                relatedId,
                tokenUsage,
                aiModel
            ]);
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async addCredits(userId, amount, type, description, relatedId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            await this.ensureUserCreditsRecord(userId, client);
            const transactionId = (0, uuid_1.v4)();
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
            let updateCreditsQuery;
            let queryParams;
            if (amount >= 0) {
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
            }
            else {
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getCreditUsageStats(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const transactionsQuery = `
      SELECT type, amount, description, related_service, created_at
      FROM credit_transactions 
      WHERE user_id = $1 AND created_at >= $2 AND amount < 0
      ORDER BY created_at DESC
    `;
        const transactionsResult = await this.db.query(transactionsQuery, [userId, startDate]);
        const transactions = transactionsResult.rows;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        let totalSpent = 0;
        let spentToday = 0;
        let spentThisWeek = 0;
        let spentThisMonth = 0;
        const usageByService = {};
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
    getConsumptionRules() {
        return Array.from(this.consumptionRules.values());
    }
    updateConsumptionRule(service, rule) {
        const existingRule = this.consumptionRules.get(service);
        if (existingRule) {
            this.consumptionRules.set(service, { ...existingRule, ...rule });
        }
    }
    async adjustUserCredits(userId, amount, description, adminId) {
        return this.addCredits(userId, amount, credit_1.TransactionType.ADMIN_ADJUST, `Admin adjustment: ${description} (by ${adminId})`, adminId);
    }
    async processPKEntry(userId, battleId) {
        return this.consumeCredits(userId, 'pk_entry', 0, 'PK对战参与', battleId);
    }
    async processPKReward(userId, battleId) {
        const rewardAmount = Math.abs(this.calculateCreditCost('pk_reward'));
        return this.addCredits(userId, rewardAmount, credit_1.TransactionType.PK_REWARD, 'PK对战胜利奖励', battleId);
    }
    async ensureUserCreditsRecord(userId, client) {
        const dbClient = client || this.db;
        const checkQuery = `SELECT id FROM user_credits WHERE user_id = $1`;
        const checkResult = await dbClient.query(checkQuery, [userId]);
        if (checkResult.rows.length === 0) {
            const insertQuery = `
        INSERT INTO user_credits (id, user_id, current_balance, total_earned, created_at, updated_at)
        VALUES ($1, $2, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(insertQuery, [(0, uuid_1.v4)(), userId]);
        }
    }
    async initializeUserCredits(userId, initialBalance = 10) {
        const query = `
      INSERT INTO user_credits (id, user_id, current_balance, total_earned, created_at, updated_at)
      VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id, user_id as "userId", current_balance as "currentBalance", 
                total_earned as "totalEarned", total_spent as "totalSpent",
                last_purchase_at as "lastPurchaseAt", average_monthly_spending as "averageMonthlySpending",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await this.db.query(query, [(0, uuid_1.v4)(), userId, initialBalance]);
        if (result.rows.length > 0) {
            await this.addCredits(userId, initialBalance, credit_1.TransactionType.ADMIN_ADJUST, '新用户注册赠送Credits');
        }
        return result.rows[0] || await this.getUserCredits(userId);
    }
}
exports.CreditService = CreditService;
//# sourceMappingURL=CreditService.js.map