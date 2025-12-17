import { pool } from '../config/database';
import { Language } from '../models/PracticeGroup';
import { MMRService, UserMMR } from './MMRService';
import { CreditService } from './CreditService';
import { PKRewardService } from './PKRewardService';

export interface MatchRequest {
  id: string;
  userId: string;
  language: Language;
  mmr: number;
  requestedAt: Date;
  expiresAt: Date;
  status: 'waiting' | 'matched' | 'cancelled' | 'expired';
}

export interface MatchResult {
  matchId: string;
  player1Id: string;
  player2Id: string;
  language: Language;
  practiceGroupId?: string;
  createdAt: Date;
}

export class PKMatchingService {
  private mmrService: MMRService;
  private creditService: CreditService;
  private rewardService: PKRewardService;
  private readonly MATCH_TIMEOUT_MINUTES = 5; // 匹配超时时间
  private readonly MMR_TOLERANCE_BASE = 100; // 基础MMR容差
  private readonly MMR_TOLERANCE_GROWTH = 20; // 每分钟增长的容差
  private readonly PK_ENTRY_FEE = 1; // PK参与�?

  constructor() {
    this.mmrService = new MMRService();
    this.creditService = new CreditService(pool);
    this.rewardService = new PKRewardService();
  }

  /**
   * 发起匹配请求
   */
  async requestMatch(userId: string, language: Language): Promise<MatchRequest> {
    try {
      // 检查用户是否有足够的credits
      const userCredits = await this.creditService.getUserCredits(userId);
      if (!userCredits || userCredits.currentBalance < this.PK_ENTRY_FEE) {
        throw new Error('Insufficient credits for PK battle');
      }

      // 检查用户是否已经在匹配队列�?
      const existingRequest = await this.getActiveMatchRequest(userId, language);
      if (existingRequest) {
        return existingRequest;
      }

      // 获取或初始化用户MMR
      let userMMR = await this.mmrService.getUserMMR(userId, language);
      if (!userMMR) {
        userMMR = await this.mmrService.initializeUserMMR(userId, language);
      }

      // 创建匹配请求
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.MATCH_TIMEOUT_MINUTES);

      const result = await pool.query(
        `INSERT INTO match_requests (user_id, language, mmr, expires_at) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userId, language, userMMR.currentMMR, expiresAt]
      );

      const matchRequest: MatchRequest = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        language: result.rows[0].language,
        mmr: result.rows[0].mmr,
        requestedAt: result.rows[0].created_at,
        expiresAt: result.rows[0].expires_at,
        status: result.rows[0].status
      };

      // 尝试立即匹配
      const match = await this.findMatch(matchRequest);
      if (match) {
        return {
          ...matchRequest,
          status: 'matched'
        };
      }

      return matchRequest;
    } catch (error) {
      console.error('Error requesting match:', error);
      throw error;
    }
  }

  /**
   * 查找匹配对手
   */
  private async findMatch(matchRequest: MatchRequest): Promise<MatchResult | null> {
    try {
      const waitingTime = Date.now() - matchRequest.requestedAt.getTime();
      const waitingMinutes = Math.floor(waitingTime / (1000 * 60));
      
      // 计算当前的MMR容差（随时间增长�?
      const currentTolerance = this.MMR_TOLERANCE_BASE + (waitingMinutes * this.MMR_TOLERANCE_GROWTH);
      const minMMR = matchRequest.mmr - currentTolerance;
      const maxMMR = matchRequest.mmr + currentTolerance;

      // 查找合适的对手
      const result = await pool.query(
        `SELECT * FROM match_requests 
         WHERE user_id != $1 
         AND language = $2 
         AND status = 'waiting'
         AND mmr BETWEEN $3 AND $4
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY ABS(mmr - $5), created_at ASC
         LIMIT 1`,
        [matchRequest.userId, matchRequest.language, minMMR, maxMMR, matchRequest.mmr]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const opponent = result.rows[0];

      // 创建匹配结果
      const match = await this.createMatch(matchRequest, opponent);
      
      return match;
    } catch (error) {
      console.error('Error finding match:', error);
      throw error;
    }
  }

  /**
   * 创建匹配结果
   */
  private async createMatch(player1Request: MatchRequest, player2Request: any): Promise<MatchResult> {
    try {
      // 开始事�?
      await pool.query('BEGIN');

      try {
        // 更新匹配请求状�?
        await pool.query(
          `UPDATE match_requests SET status = 'matched' 
           WHERE id IN ($1, $2)`,
          [player1Request.id, player2Request.id]
        );

        // 扣除两位玩家的credits
        await this.rewardService.deductEntryFee(player1Request.userId);
        await this.rewardService.deductEntryFee(player2Request.user_id);

        // 创建PK对战记录
        const battleResult = await pool.query(
          `INSERT INTO pk_battles (
            player1_id, player2_id, language, status
          ) VALUES ($1, $2, $3, 'waiting') 
          RETURNING *`,
          [player1Request.userId, player2Request.user_id, player1Request.language]
        );

        await pool.query('COMMIT');

        const match: MatchResult = {
          matchId: battleResult.rows[0].id,
          player1Id: player1Request.userId,
          player2Id: player2Request.user_id,
          language: player1Request.language,
          createdAt: battleResult.rows[0].created_at
        };

        return match;
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  /**
   * 取消匹配请求
   */
  async cancelMatch(userId: string, language: Language): Promise<boolean> {
    try {
      const result = await pool.query(
        `UPDATE match_requests 
         SET status = 'cancelled' 
         WHERE user_id = $1 AND language = $2 AND status = 'waiting'`,
        [userId, language]
      );

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error cancelling match:', error);
      throw error;
    }
  }

  /**
   * 获取用户当前的匹配请�?
   */
  async getActiveMatchRequest(userId: string, language: Language): Promise<MatchRequest | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM match_requests 
         WHERE user_id = $1 AND language = $2 AND status IN ('waiting', 'matched')
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId, language]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        language: row.language,
        mmr: row.mmr,
        requestedAt: row.created_at,
        expiresAt: row.expires_at,
        status: row.status
      };
    } catch (error) {
      console.error('Error getting active match request:', error);
      throw error;
    }
  }

  /**
   * 获取匹配状�?
   */
  async getMatchStatus(userId: string, language: Language): Promise<{
    isMatching: boolean;
    matchRequest?: MatchRequest;
    battle?: any;
    estimatedWaitTime?: number;
  }> {
    try {
      const matchRequest = await this.getActiveMatchRequest(userId, language);
      
      if (!matchRequest) {
        return { isMatching: false };
      }

      if (matchRequest.status === 'matched') {
        // 查找对应的战�?
        const battleResult = await pool.query(
          `SELECT * FROM pk_battles 
           WHERE (player1_id = $1 OR player2_id = $1) 
           AND language = $2 
           AND status IN ('waiting', 'in_progress')
           ORDER BY created_at DESC 
           LIMIT 1`,
          [userId, language]
        );

        if (battleResult.rows.length > 0) {
          return {
            isMatching: false,
            battle: battleResult.rows[0]
          };
        }
      }

      // 计算预估等待时间
      const estimatedWaitTime = await this.calculateEstimatedWaitTime(matchRequest);

      return {
        isMatching: true,
        matchRequest,
        estimatedWaitTime
      };
    } catch (error) {
      console.error('Error getting match status:', error);
      throw error;
    }
  }

  /**
   * 计算预估等待时间
   */
  private async calculateEstimatedWaitTime(matchRequest: MatchRequest): Promise<number> {
    try {
      // 查找相似MMR范围内的活跃用户数量
      const tolerance = this.MMR_TOLERANCE_BASE;
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM match_requests 
         WHERE language = $1 
         AND status = 'waiting'
         AND mmr BETWEEN $2 AND $3
         AND expires_at > CURRENT_TIMESTAMP`,
        [
          matchRequest.language, 
          matchRequest.mmr - tolerance, 
          matchRequest.mmr + tolerance
        ]
      );

      const waitingPlayers = parseInt(result.rows[0].count);
      
      // 基于等待玩家数量估算时间（分钟）
      if (waitingPlayers >= 2) return 30; // 30�?
      if (waitingPlayers >= 1) return 120; // 2分钟
      return 300; // 5分钟
    } catch (error) {
      console.error('Error calculating estimated wait time:', error);
      return 300; // 默认5分钟
    }
  }

  /**
   * 清理过期的匹配请�?
   */
  async cleanupExpiredRequests(): Promise<void> {
    try {
      await pool.query(
        `UPDATE match_requests 
         SET status = 'expired' 
         WHERE status = 'waiting' AND expires_at <= CURRENT_TIMESTAMP`
      );
    } catch (error) {
      console.error('Error cleaning up expired requests:', error);
    }
  }

  /**
   * 获取匹配统计信息
   */
  async getMatchingStats(language: Language): Promise<{
    totalWaiting: number;
    averageWaitTime: number;
    matchesCreatedToday: number;
  }> {
    try {
      const [waitingResult, avgWaitResult, todayMatchesResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as count FROM match_requests 
           WHERE language = $1 AND status = 'waiting' AND expires_at > CURRENT_TIMESTAMP`,
          [language]
        ),
        pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_wait 
           FROM match_requests 
           WHERE language = $1 AND status = 'matched' 
           AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
          [language]
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM pk_battles 
           WHERE language = $1 AND created_at >= CURRENT_DATE`,
          [language]
        )
      ]);

      return {
        totalWaiting: parseInt(waitingResult.rows[0].count),
        averageWaitTime: parseFloat(avgWaitResult.rows[0].avg_wait) || 0,
        matchesCreatedToday: parseInt(todayMatchesResult.rows[0].count)
      };
    } catch (error) {
      console.error('Error getting matching stats:', error);
      throw error;
    }
  }
}
