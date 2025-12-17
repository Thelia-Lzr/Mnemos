import { pool } from '../config/database';
import { Language } from '../models/PracticeGroup';
import { MMRService } from './MMRService';
import { CreditService } from './CreditService';
import { PKBattle, BattleStatus } from './PKBattleService';
import { TransactionType } from '../types/credit';

export interface PKRewardResult {
  winnerId?: string;
  winnerReward: number;
  loserPenalty: number;
  player1MMRChange: number;
  player2MMRChange: number;
  player1NewMMR: number;
  player2NewMMR: number;
}

export class PKRewardService {
  private mmrService: MMRService;
  private creditService: CreditService;
  private readonly PK_WINNER_REWARD = 3; // 胜者奖�? credits
  private readonly PK_LOSER_PENALTY = 0; // 败者不扣除额外credits（已在参与时扣除�?

  constructor() {
    this.mmrService = new MMRService();
    this.creditService = new CreditService(pool);
  }

  /**
   * 扣除PK参与费用
   */
  async deductEntryFee(userId: string): Promise<boolean> {
    try {
      const PK_ENTRY_FEE = 1; // 参与�? credit
      
      // 检查用户余�?
      const userCredits = await this.creditService.getUserCredits(userId);
      if (!userCredits || userCredits.currentBalance < PK_ENTRY_FEE) {
        return false; // 余额不足
      }

      // 扣除参与�?
      await this.creditService.consumeCredits(
        userId,
        'pk_entry',
        0, // no token usage for entry fee
        'PK battle entry fee'
      );

      return true;
    } catch (error) {
      console.error('Error deducting entry fee:', error);
      return false;
    }
  }

  /**
   * 处理PK对战结束后的奖励和MMR调整
   */
  async processBattleRewards(battleId: string): Promise<PKRewardResult> {
    try {
      // 获取对战信息
      const battleResult = await pool.query(
        `SELECT * FROM pk_battles WHERE id = $1`,
        [battleId]
      );

      if (battleResult.rows.length === 0) {
        throw new Error('Battle not found');
      }

      const battle = battleResult.rows[0];

      if (battle.status !== BattleStatus.COMPLETED) {
        throw new Error('Battle is not completed');
      }

      // 获取两位玩家的MMR
      const [player1MMR, player2MMR] = await Promise.all([
        this.mmrService.getUserMMR(battle.player1_id, battle.language),
        this.mmrService.getUserMMR(battle.player2_id, battle.language)
      ]);

      if (!player1MMR || !player2MMR) {
        throw new Error('Player MMR not found');
      }

      // 计算MMR变化
      const { player1MMRChange, player2MMRChange } = this.calculateMMRChanges(
        battle,
        player1MMR.currentMMR,
        player2MMR.currentMMR
      );

      // 开始事务处理奖�?
      await pool.query('BEGIN');

      try {
        // 更新MMR
        const [updatedPlayer1MMR, updatedPlayer2MMR] = await Promise.all([
          this.mmrService.updateMMR(
            battle.player1_id,
            battle.language,
            player1MMRChange,
            battle.winner_id === battle.player1_id ? 'win' : 'loss',
            `PK Battle ${battleId}`
          ),
          this.mmrService.updateMMR(
            battle.player2_id,
            battle.language,
            player2MMRChange,
            battle.winner_id === battle.player2_id ? 'win' : 'loss',
            `PK Battle ${battleId}`
          )
        ]);

        // 处理Credit奖励
        let winnerReward = 0;
        let loserPenalty = 0;

        if (battle.winner_id) {
          // 有胜者，给予奖励
          await this.creditService.addCredits(
            battle.winner_id,
            this.PK_WINNER_REWARD,
            TransactionType.PK_REWARD,
            'PK battle victory reward',
            battleId
          );
          winnerReward = this.PK_WINNER_REWARD;
        }

        // 更新对战记录中的MMR变化
        await pool.query(
          `UPDATE pk_battles SET 
            player1_mmr_change = $1,
            player2_mmr_change = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
          [player1MMRChange, player2MMRChange, battleId]
        );

        await pool.query('COMMIT');

        const result: PKRewardResult = {
          winnerId: battle.winner_id,
          winnerReward,
          loserPenalty,
          player1MMRChange,
          player2MMRChange,
          player1NewMMR: updatedPlayer1MMR.currentMMR,
          player2NewMMR: updatedPlayer2MMR.currentMMR
        };

        return result;
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error processing battle rewards:', error);
      throw error;
    }
  }

  /**
   * 计算MMR变化
   */
  private calculateMMRChanges(
    battle: any,
    player1MMR: number,
    player2MMR: number
  ): { player1MMRChange: number; player2MMRChange: number } {
    // 确定胜负结果
    let player1Result: 'win' | 'loss' | 'draw';
    let player2Result: 'win' | 'loss' | 'draw';

    if (battle.winner_id === battle.player1_id) {
      player1Result = 'win';
      player2Result = 'loss';
    } else if (battle.winner_id === battle.player2_id) {
      player1Result = 'loss';
      player2Result = 'win';
    } else {
      // 平局
      player1Result = 'draw';
      player2Result = 'draw';
    }

    // 使用ELO算法计算MMR变化
    const player1MMRChange = this.calculateELOChange(
      player1MMR,
      player2MMR,
      player1Result
    );

    const player2MMRChange = this.calculateELOChange(
      player2MMR,
      player1MMR,
      player2Result
    );

    return { player1MMRChange, player2MMRChange };
  }

  /**
   * 使用ELO算法计算MMR变化
   */
  private calculateELOChange(
    playerMMR: number,
    opponentMMR: number,
    result: 'win' | 'loss' | 'draw'
  ): number {
    const K_FACTOR = 32; // K因子，可以根据需要调�?

    // 计算期望胜率
    const expectedScore = 1 / (1 + Math.pow(10, (opponentMMR - playerMMR) / 400));

    // 实际得分
    let actualScore: number;
    switch (result) {
      case 'win':
        actualScore = 1;
        break;
      case 'loss':
        actualScore = 0;
        break;
      case 'draw':
        actualScore = 0.5;
        break;
    }

    // 计算MMR变化
    const mmrChange = Math.round(K_FACTOR * (actualScore - expectedScore));

    return mmrChange;
  }

  /**
   * 获取PK对战统计信息
   */
  async getPKStats(userId: string, language: Language): Promise<{
    totalBattles: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalCreditsEarned: number;
    totalCreditsSpent: number;
    currentMMR: number;
    peakMMR: number;
    averageMMRChange: number;
  }> {
    try {
      // 获取对战统计
      const battleStatsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_battles,
          COUNT(CASE WHEN winner_id = $1 THEN 1 END) as wins,
          COUNT(CASE WHEN winner_id != $1 AND winner_id IS NOT NULL THEN 1 END) as losses,
          COUNT(CASE WHEN winner_id IS NULL THEN 1 END) as draws
        FROM pk_battles 
        WHERE (player1_id = $1 OR player2_id = $1) 
        AND language = $2 
        AND status = $3`,
        [userId, language, BattleStatus.COMPLETED]
      );

      const battleStats = battleStatsResult.rows[0];
      const totalBattles = parseInt(battleStats.total_battles);
      const wins = parseInt(battleStats.wins);
      const losses = parseInt(battleStats.losses);
      const draws = parseInt(battleStats.draws);
      const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;

      // 获取Credit统计
      const creditStatsResult = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'pk_reward' THEN amount ELSE 0 END), 0) as credits_earned,
          COALESCE(SUM(CASE WHEN type = 'pk_entry' THEN ABS(amount) ELSE 0 END), 0) as credits_spent
        FROM credit_transactions 
        WHERE user_id = $1`,
        [userId]
      );

      const creditStats = creditStatsResult.rows[0];
      const totalCreditsEarned = parseInt(creditStats.credits_earned);
      const totalCreditsSpent = parseInt(creditStats.credits_spent);

      // 获取MMR信息
      const userMMR = await this.mmrService.getUserMMR(userId, language);
      const currentMMR = userMMR?.currentMMR || 1000;
      const peakMMR = userMMR?.peakMMR || 1000;

      // 计算平均MMR变化
      const mmrHistoryResult = await pool.query(
        `SELECT AVG(ABS(change_amount)) as avg_change 
        FROM mmr_history 
        WHERE user_id = $1 AND language = $2`,
        [userId, language]
      );

      const averageMMRChange = parseFloat(mmrHistoryResult.rows[0]?.avg_change) || 0;

      return {
        totalBattles,
        wins,
        losses,
        draws,
        winRate,
        totalCreditsEarned,
        totalCreditsSpent,
        currentMMR,
        peakMMR,
        averageMMRChange
      };
    } catch (error) {
      console.error('Error getting PK stats:', error);
      throw error;
    }
  }

  /**
   * 获取PK排行榜（按胜率和MMR综合排名�?
   */
  async getPKLeaderboard(language: Language, limit: number = 50): Promise<Array<{
    userId: string;
    username: string;
    currentMMR: number;
    totalBattles: number;
    wins: number;
    winRate: number;
    rank: number;
  }>> {
    try {
      const result = await pool.query(
        `WITH battle_stats AS (
          SELECT 
            COALESCE(pb.player1_id, pb.player2_id) as user_id,
            COUNT(*) as total_battles,
            COUNT(CASE WHEN pb.winner_id = COALESCE(pb.player1_id, pb.player2_id) THEN 1 END) as wins
          FROM pk_battles pb
          WHERE pb.language = $1 AND pb.status = $2
          GROUP BY COALESCE(pb.player1_id, pb.player2_id)
        )
        SELECT 
          u.id as user_id,
          u.username,
          umr.current_mmr,
          COALESCE(bs.total_battles, 0) as total_battles,
          COALESCE(bs.wins, 0) as wins,
          CASE 
            WHEN COALESCE(bs.total_battles, 0) > 0 
            THEN (COALESCE(bs.wins, 0)::DECIMAL / bs.total_battles * 100)
            ELSE 0 
          END as win_rate,
          ROW_NUMBER() OVER (ORDER BY umr.current_mmr DESC, COALESCE(bs.wins, 0) DESC) as rank
        FROM users u
        JOIN user_mmr umr ON u.id = umr.user_id
        LEFT JOIN battle_stats bs ON u.id = bs.user_id
        WHERE umr.language = $1 AND umr.total_battles >= 5
        ORDER BY umr.current_mmr DESC, COALESCE(bs.wins, 0) DESC
        LIMIT $3`,
        [language, BattleStatus.COMPLETED, limit]
      );

      return result.rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        currentMMR: row.current_mmr,
        totalBattles: parseInt(row.total_battles),
        wins: parseInt(row.wins),
        winRate: parseFloat(row.win_rate),
        rank: parseInt(row.rank)
      }));
    } catch (error) {
      console.error('Error getting PK leaderboard:', error);
      throw error;
    }
  }

  /**
   * 检查并处理未处理的对战奖励
   */
  async processUnprocessedBattles(): Promise<void> {
    try {
      // 查找已完成但未处理奖励的对战
      const unprocessedResult = await pool.query(
        `SELECT id FROM pk_battles 
        WHERE status = $1 AND player1_mmr_change = 0 AND player2_mmr_change = 0`,
        [BattleStatus.COMPLETED]
      );

      for (const battle of unprocessedResult.rows) {
        try {
          await this.processBattleRewards(battle.id);
          console.log(`Processed rewards for battle ${battle.id}`);
        } catch (error) {
          console.error(`Error processing rewards for battle ${battle.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing unprocessed battles:', error);
    }
  }
}
