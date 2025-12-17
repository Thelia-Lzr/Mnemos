import { pool } from '../config/database';
import { Language } from '../models/PracticeGroup';
import { PracticeGenerationService } from './PracticeGenerationService';
import { PKRewardService } from './PKRewardService';
import { UserCapabilityService } from './UserCapabilityService';
import { CreditService } from './CreditService';
import { AsyncTaskManager } from './AsyncTaskManager';
import { AIService } from './AIService';
import { Server } from 'socket.io';

export interface PKBattle {
  id: string;
  player1Id: string;
  player2Id: string;
  language: Language;
  practiceGroupId?: string;
  startTime: Date;
  endTime?: Date;
  player1Score: number;
  player2Score: number;
  player1Time: number;
  player2Time: number;
  winnerId?: string;
  player1MMRChange: number;
  player2MMRChange: number;
  status: BattleStatus;
  createdAt: Date;
}

export interface BattleAnswer {
  battleId: string;
  userId: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;
  answeredAt: Date;
}

export interface BattleProgress {
  battleId: string;
  player1Progress: PlayerProgress;
  player2Progress: PlayerProgress;
}

export interface PlayerProgress {
  userId: string;
  currentQuestion: number;
  correctAnswers: number;
  totalTime: number;
  isFinished: boolean;
}

export enum BattleStatus {
  WAITING = 'waiting',
  GENERATING_PRACTICE = 'generating_practice',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export class PKBattleService {
  private practiceService: PracticeGenerationService;
  private rewardService: PKRewardService;
  private userCapabilityService: UserCapabilityService;
  private creditService: CreditService;
  private asyncTaskManager: AsyncTaskManager;
  private io: Server | null = null;
  private readonly BATTLE_TIMEOUT_MINUTES = 10;

  constructor() {
    this.creditService = new CreditService(pool);
    this.asyncTaskManager = AsyncTaskManager.getInstance();
    this.userCapabilityService = new UserCapabilityService(pool, new AIService(pool));
    this.practiceService = new PracticeGenerationService(
      pool,
      this.userCapabilityService,
      this.creditService,
      this.asyncTaskManager
    );
    this.rewardService = new PKRewardService();
  }

  /**
   * 设置Socket.IO实例
   */
  setSocketIO(io: Server): void {
    this.io = io;
  }

  /**
   * 开始对战（生成练习组）
   */
  async startBattle(battleId: string): Promise<PKBattle> {
    try {
      // 获取对战信息
      const battle = await this.getBattle(battleId);
      if (!battle) {
        throw new Error('Battle not found');
      }

      if (battle.status !== BattleStatus.WAITING) {
        throw new Error('Battle is not in waiting status');
      }

      // 更新状态为生成练习�?
      await this.updateBattleStatus(battleId, BattleStatus.GENERATING_PRACTICE);

      // 生成练习组（基于两位玩家的水平）
      const practiceGroup = await this.generateBattlePractice(battle);

      // 更新对战信息
      const updatedBattle = await pool.query(
        `UPDATE pk_battles SET 
          practice_group_id = $1, 
          status = $2, 
          start_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 
        RETURNING *`,
        [practiceGroup.id, BattleStatus.IN_PROGRESS, battleId]
      );

      const battleData = this.mapBattleFromDB(updatedBattle.rows[0]);

      // 通知两位玩家对战开�?
      if (this.io) {
        this.io.to(`battle_${battleId}`).emit('battle_started', {
          battle: battleData,
          practiceGroup
        });
      }

      return battleData;
    } catch (error) {
      console.error('Error starting battle:', error);
      // 如果出错，将对战状态设为取�?
      await this.updateBattleStatus(battleId, BattleStatus.CANCELLED);
      throw error;
    }
  }

  /**
   * 为对战生成练习组
   */
  private async generateBattlePractice(battle: PKBattle): Promise<any> {
    try {
      // 获取两位玩家的能力信�?
      const [player1Capability, player2Capability] = await Promise.all([
        this.getUserCapability(battle.player1Id, battle.language),
        this.getUserCapability(battle.player2Id, battle.language)
      ]);

      // 计算平均水平
      const avgLevel = this.calculateAverageLevel(player1Capability, player2Capability);

      // 生成适合的练习组
      const practiceGroup = await this.practiceService.generatePracticeGroup({
        userId: battle.player1Id, // 使用player1的ID作为生成�?
        language: battle.language,
        difficulty: avgLevel as any, // Cast to match expected type
        type: 'general' as any, // Use general type for PK battles
        focusAreas: ['vocabulary', 'grammar', 'reading'] as any,
        count: 10
      });

      return practiceGroup;
    } catch (error) {
      console.error('Error generating battle practice:', error);
      throw error;
    }
  }

  /**
   * 获取用户能力信息
   */
  private async getUserCapability(userId: string, language: Language): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM user_capabilities WHERE user_id = $1 AND language = $2`,
      [userId, language]
    );
    return result.rows[0] || null;
  }

  /**
   * 计算平均水平
   */
  private calculateAverageLevel(cap1: any, cap2: any): 'beginner' | 'intermediate' | 'advanced' {
    if (!cap1 || !cap2) return 'intermediate';

    const avg1 = (cap1.listening_level + cap1.speaking_level + cap1.reading_level + cap1.writing_level) / 4;
    const avg2 = (cap2.listening_level + cap2.speaking_level + cap2.reading_level + cap2.writing_level) / 4;
    const overallAvg = (avg1 + avg2) / 2;

    if (overallAvg < 40) return 'beginner';
    if (overallAvg < 70) return 'intermediate';
    return 'advanced';
  }

  /**
   * 提交答案
   */
  async submitAnswer(
    battleId: string, 
    userId: string, 
    questionId: string, 
    answer: string
  ): Promise<BattleAnswer> {
    try {
      // 获取对战信息
      const battle = await this.getBattle(battleId);
      if (!battle) {
        throw new Error('Battle not found');
      }

      if (battle.status !== BattleStatus.IN_PROGRESS) {
        throw new Error('Battle is not in progress');
      }

      // 验证用户是否参与此对�?
      if (battle.player1Id !== userId && battle.player2Id !== userId) {
        throw new Error('User is not part of this battle');
      }

      // 获取问题信息以验证答�?
      const questionResult = await pool.query(
        `SELECT * FROM questions WHERE id = $1 AND practice_group_id = $2`,
        [questionId, battle.practiceGroupId]
      );

      if (questionResult.rows.length === 0) {
        throw new Error('Question not found');
      }

      const question = questionResult.rows[0];
      const isCorrect = question.correct_answer === answer;
      const timeSpent = this.calculateTimeSpent(battle.startTime!);

      // 记录答案
      const answerResult = await pool.query(
        `INSERT INTO battle_answers (
          battle_id, user_id, question_id, answer, is_correct, time_spent
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`,
        [battleId, userId, questionId, answer, isCorrect, timeSpent]
      );

      const battleAnswer: BattleAnswer = {
        battleId: answerResult.rows[0].battle_id,
        userId: answerResult.rows[0].user_id,
        questionId: answerResult.rows[0].question_id,
        answer: answerResult.rows[0].answer,
        isCorrect: answerResult.rows[0].is_correct,
        timeSpent: answerResult.rows[0].time_spent,
        answeredAt: answerResult.rows[0].created_at
      };

      // 更新对战进度
      const progress = await this.updateBattleProgress(battleId);

      // 通知对手进度更新
      if (this.io) {
        this.io.to(`battle_${battleId}`).emit('progress_update', progress);
      }

      // 检查是否对战结�?
      if (progress.player1Progress.isFinished && progress.player2Progress.isFinished) {
        await this.finishBattle(battleId);
      }

      return battleAnswer;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  /**
   * 计算答题时间
   */
  private calculateTimeSpent(startTime: Date): number {
    return Math.floor((Date.now() - startTime.getTime()) / 1000);
  }

  /**
   * 更新对战进度
   */
  private async updateBattleProgress(battleId: string): Promise<BattleProgress> {
    try {
      // 获取两位玩家的答题进�?
      const [player1Progress, player2Progress] = await Promise.all([
        this.getPlayerProgress(battleId, 'player1'),
        this.getPlayerProgress(battleId, 'player2')
      ]);

      return {
        battleId,
        player1Progress,
        player2Progress
      };
    } catch (error) {
      console.error('Error updating battle progress:', error);
      throw error;
    }
  }

  /**
   * 获取玩家进度
   */
  private async getPlayerProgress(battleId: string, playerRole: 'player1' | 'player2'): Promise<PlayerProgress> {
    try {
      const battle = await this.getBattle(battleId);
      if (!battle) {
        throw new Error('Battle not found');
      }

      const userId = playerRole === 'player1' ? battle.player1Id : battle.player2Id;

      // 获取玩家的答题记�?
      const answersResult = await pool.query(
        `SELECT * FROM battle_answers 
         WHERE battle_id = $1 AND user_id = $2 
         ORDER BY created_at ASC`,
        [battleId, userId]
      );

      const answers = answersResult.rows;
      const correctAnswers = answers.filter((a: any) => a.is_correct).length;
      const totalTime = answers.reduce((sum: number, a: any) => sum + a.time_spent, 0);
      const currentQuestion = answers.length;

      // 获取练习组的总题目数
      const questionsResult = await pool.query(
        `SELECT COUNT(*) as total FROM questions WHERE practice_group_id = $1`,
        [battle.practiceGroupId]
      );
      const totalQuestions = parseInt(questionsResult.rows[0].total);

      return {
        userId,
        currentQuestion,
        correctAnswers,
        totalTime,
        isFinished: currentQuestion >= totalQuestions
      };
    } catch (error) {
      console.error('Error getting player progress:', error);
      throw error;
    }
  }

  /**
   * 结束对战
   */
  private async finishBattle(battleId: string): Promise<PKBattle> {
    try {
      const progress = await this.updateBattleProgress(battleId);
      
      // 判定胜负
      const { winnerId, player1Score, player2Score } = this.determineWinner(progress);

      // 更新对战结果
      const result = await pool.query(
        `UPDATE pk_battles SET 
          status = $1,
          end_time = CURRENT_TIMESTAMP,
          player1_score = $2,
          player2_score = $3,
          player1_time = $4,
          player2_time = $5,
          winner_id = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 
        RETURNING *`,
        [
          BattleStatus.COMPLETED,
          player1Score,
          player2Score,
          progress.player1Progress.totalTime,
          progress.player2Progress.totalTime,
          winnerId,
          battleId
        ]
      );

      const battle = this.mapBattleFromDB(result.rows[0]);

      // 处理奖励和MMR调整
      const rewardResult = await this.rewardService.processBattleRewards(battleId);

      // 通知对战结束
      if (this.io) {
        this.io.to(`battle_${battleId}`).emit('battle_finished', {
          battle,
          progress,
          rewards: rewardResult
        });
      }

      return battle;
    } catch (error) {
      console.error('Error finishing battle:', error);
      throw error;
    }
  }

  /**
   * 判定胜负
   */
  private determineWinner(progress: BattleProgress): {
    winnerId?: string;
    player1Score: number;
    player2Score: number;
  } {
    const player1Score = progress.player1Progress.correctAnswers;
    const player2Score = progress.player2Progress.correctAnswers;

    let winnerId: string | undefined;

    if (player1Score > player2Score) {
      winnerId = progress.player1Progress.userId;
    } else if (player2Score > player1Score) {
      winnerId = progress.player2Progress.userId;
    } else {
      // 分数相同，比较用�?
      if (progress.player1Progress.totalTime < progress.player2Progress.totalTime) {
        winnerId = progress.player1Progress.userId;
      } else if (progress.player2Progress.totalTime < progress.player1Progress.totalTime) {
        winnerId = progress.player2Progress.userId;
      }
      // 如果分数和用时都相同，则为平局（winnerId为undefined�?
    }

    return {
      winnerId,
      player1Score,
      player2Score
    };
  }

  /**
   * 获取对战信息
   */
  async getBattle(battleId: string): Promise<PKBattle | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM pk_battles WHERE id = $1`,
        [battleId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapBattleFromDB(result.rows[0]);
    } catch (error) {
      console.error('Error getting battle:', error);
      throw error;
    }
  }

  /**
   * 更新对战状�?
   */
  async updateBattleStatus(battleId: string, status: BattleStatus): Promise<void> {
    try {
      await pool.query(
        `UPDATE pk_battles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [status, battleId]
      );
    } catch (error) {
      console.error('Error updating battle status:', error);
      throw error;
    }
  }

  /**
   * 获取用户对战历史
   */
  async getBattleHistory(userId: string, limit: number = 20): Promise<PKBattle[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM pk_battles 
         WHERE (player1_id = $1 OR player2_id = $1) 
         AND status = $2
         ORDER BY created_at DESC 
         LIMIT $3`,
        [userId, BattleStatus.COMPLETED, limit]
      );

      return result.rows.map((row: any) => this.mapBattleFromDB(row));
    } catch (error) {
      console.error('Error getting battle history:', error);
      throw error;
    }
  }

  /**
   * 将数据库行映射为PKBattle对象
   */
  private mapBattleFromDB(row: any): PKBattle {
    return {
      id: row.id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      language: row.language,
      practiceGroupId: row.practice_group_id,
      startTime: row.start_time,
      endTime: row.end_time,
      player1Score: row.player1_score || 0,
      player2Score: row.player2_score || 0,
      player1Time: row.player1_time || 0,
      player2Time: row.player2_time || 0,
      winnerId: row.winner_id,
      player1MMRChange: row.player1_mmr_change || 0,
      player2MMRChange: row.player2_mmr_change || 0,
      status: row.status as BattleStatus,
      createdAt: row.created_at
    };
  }

  /**
   * 加入对战房间（WebSocket�?
   */
  joinBattleRoom(socketId: string, battleId: string): void {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`battle_${battleId}`);
        console.log(`Socket ${socketId} joined battle room ${battleId}`);
      }
    }
  }

  /**
   * 离开对战房间（WebSocket�?
   */
  leaveBattleRoom(socketId: string, battleId: string): void {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`battle_${battleId}`);
        console.log(`Socket ${socketId} left battle room ${battleId}`);
      }
    }
  }
}
