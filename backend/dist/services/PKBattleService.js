"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKBattleService = exports.BattleStatus = void 0;
const database_1 = require("../config/database");
const PracticeGenerationService_1 = require("./PracticeGenerationService");
const PKRewardService_1 = require("./PKRewardService");
const UserCapabilityService_1 = require("./UserCapabilityService");
const CreditService_1 = require("./CreditService");
const AsyncTaskManager_1 = require("./AsyncTaskManager");
const AIService_1 = require("./AIService");
var BattleStatus;
(function (BattleStatus) {
    BattleStatus["WAITING"] = "waiting";
    BattleStatus["GENERATING_PRACTICE"] = "generating_practice";
    BattleStatus["IN_PROGRESS"] = "in_progress";
    BattleStatus["COMPLETED"] = "completed";
    BattleStatus["CANCELLED"] = "cancelled";
    BattleStatus["TIMEOUT"] = "timeout";
})(BattleStatus = exports.BattleStatus || (exports.BattleStatus = {}));
class PKBattleService {
    constructor() {
        this.io = null;
        this.BATTLE_TIMEOUT_MINUTES = 10;
        this.creditService = new CreditService_1.CreditService(database_1.pool);
        this.asyncTaskManager = AsyncTaskManager_1.AsyncTaskManager.getInstance();
        this.userCapabilityService = new UserCapabilityService_1.UserCapabilityService(database_1.pool, new AIService_1.AIService(database_1.pool));
        this.practiceService = new PracticeGenerationService_1.PracticeGenerationService(database_1.pool, this.userCapabilityService, this.creditService, this.asyncTaskManager);
        this.rewardService = new PKRewardService_1.PKRewardService();
    }
    setSocketIO(io) {
        this.io = io;
    }
    async startBattle(battleId) {
        try {
            const battle = await this.getBattle(battleId);
            if (!battle) {
                throw new Error('Battle not found');
            }
            if (battle.status !== BattleStatus.WAITING) {
                throw new Error('Battle is not in waiting status');
            }
            await this.updateBattleStatus(battleId, BattleStatus.GENERATING_PRACTICE);
            const practiceGroup = await this.generateBattlePractice(battle);
            const updatedBattle = await database_1.pool.query(`UPDATE pk_battles SET 
          practice_group_id = $1, 
          status = $2, 
          start_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 
        RETURNING *`, [practiceGroup.id, BattleStatus.IN_PROGRESS, battleId]);
            const battleData = this.mapBattleFromDB(updatedBattle.rows[0]);
            if (this.io) {
                this.io.to(`battle_${battleId}`).emit('battle_started', {
                    battle: battleData,
                    practiceGroup
                });
            }
            return battleData;
        }
        catch (error) {
            console.error('Error starting battle:', error);
            await this.updateBattleStatus(battleId, BattleStatus.CANCELLED);
            throw error;
        }
    }
    async generateBattlePractice(battle) {
        try {
            const [player1Capability, player2Capability] = await Promise.all([
                this.getUserCapability(battle.player1Id, battle.language),
                this.getUserCapability(battle.player2Id, battle.language)
            ]);
            const avgLevel = this.calculateAverageLevel(player1Capability, player2Capability);
            const practiceGroup = await this.practiceService.generatePracticeGroup({
                userId: battle.player1Id,
                language: battle.language,
                difficulty: avgLevel,
                type: 'general',
                focusAreas: ['vocabulary', 'grammar', 'reading'],
                count: 10
            });
            return practiceGroup;
        }
        catch (error) {
            console.error('Error generating battle practice:', error);
            throw error;
        }
    }
    async getUserCapability(userId, language) {
        const result = await database_1.pool.query(`SELECT * FROM user_capabilities WHERE user_id = $1 AND language = $2`, [userId, language]);
        return result.rows[0] || null;
    }
    calculateAverageLevel(cap1, cap2) {
        if (!cap1 || !cap2)
            return 'intermediate';
        const avg1 = (cap1.listening_level + cap1.speaking_level + cap1.reading_level + cap1.writing_level) / 4;
        const avg2 = (cap2.listening_level + cap2.speaking_level + cap2.reading_level + cap2.writing_level) / 4;
        const overallAvg = (avg1 + avg2) / 2;
        if (overallAvg < 40)
            return 'beginner';
        if (overallAvg < 70)
            return 'intermediate';
        return 'advanced';
    }
    async submitAnswer(battleId, userId, questionId, answer) {
        try {
            const battle = await this.getBattle(battleId);
            if (!battle) {
                throw new Error('Battle not found');
            }
            if (battle.status !== BattleStatus.IN_PROGRESS) {
                throw new Error('Battle is not in progress');
            }
            if (battle.player1Id !== userId && battle.player2Id !== userId) {
                throw new Error('User is not part of this battle');
            }
            const questionResult = await database_1.pool.query(`SELECT * FROM questions WHERE id = $1 AND practice_group_id = $2`, [questionId, battle.practiceGroupId]);
            if (questionResult.rows.length === 0) {
                throw new Error('Question not found');
            }
            const question = questionResult.rows[0];
            const isCorrect = question.correct_answer === answer;
            const timeSpent = this.calculateTimeSpent(battle.startTime);
            const answerResult = await database_1.pool.query(`INSERT INTO battle_answers (
          battle_id, user_id, question_id, answer, is_correct, time_spent
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`, [battleId, userId, questionId, answer, isCorrect, timeSpent]);
            const battleAnswer = {
                battleId: answerResult.rows[0].battle_id,
                userId: answerResult.rows[0].user_id,
                questionId: answerResult.rows[0].question_id,
                answer: answerResult.rows[0].answer,
                isCorrect: answerResult.rows[0].is_correct,
                timeSpent: answerResult.rows[0].time_spent,
                answeredAt: answerResult.rows[0].created_at
            };
            const progress = await this.updateBattleProgress(battleId);
            if (this.io) {
                this.io.to(`battle_${battleId}`).emit('progress_update', progress);
            }
            if (progress.player1Progress.isFinished && progress.player2Progress.isFinished) {
                await this.finishBattle(battleId);
            }
            return battleAnswer;
        }
        catch (error) {
            console.error('Error submitting answer:', error);
            throw error;
        }
    }
    calculateTimeSpent(startTime) {
        return Math.floor((Date.now() - startTime.getTime()) / 1000);
    }
    async updateBattleProgress(battleId) {
        try {
            const [player1Progress, player2Progress] = await Promise.all([
                this.getPlayerProgress(battleId, 'player1'),
                this.getPlayerProgress(battleId, 'player2')
            ]);
            return {
                battleId,
                player1Progress,
                player2Progress
            };
        }
        catch (error) {
            console.error('Error updating battle progress:', error);
            throw error;
        }
    }
    async getPlayerProgress(battleId, playerRole) {
        try {
            const battle = await this.getBattle(battleId);
            if (!battle) {
                throw new Error('Battle not found');
            }
            const userId = playerRole === 'player1' ? battle.player1Id : battle.player2Id;
            const answersResult = await database_1.pool.query(`SELECT * FROM battle_answers 
         WHERE battle_id = $1 AND user_id = $2 
         ORDER BY created_at ASC`, [battleId, userId]);
            const answers = answersResult.rows;
            const correctAnswers = answers.filter((a) => a.is_correct).length;
            const totalTime = answers.reduce((sum, a) => sum + a.time_spent, 0);
            const currentQuestion = answers.length;
            const questionsResult = await database_1.pool.query(`SELECT COUNT(*) as total FROM questions WHERE practice_group_id = $1`, [battle.practiceGroupId]);
            const totalQuestions = parseInt(questionsResult.rows[0].total);
            return {
                userId,
                currentQuestion,
                correctAnswers,
                totalTime,
                isFinished: currentQuestion >= totalQuestions
            };
        }
        catch (error) {
            console.error('Error getting player progress:', error);
            throw error;
        }
    }
    async finishBattle(battleId) {
        try {
            const progress = await this.updateBattleProgress(battleId);
            const { winnerId, player1Score, player2Score } = this.determineWinner(progress);
            const result = await database_1.pool.query(`UPDATE pk_battles SET 
          status = $1,
          end_time = CURRENT_TIMESTAMP,
          player1_score = $2,
          player2_score = $3,
          player1_time = $4,
          player2_time = $5,
          winner_id = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 
        RETURNING *`, [
                BattleStatus.COMPLETED,
                player1Score,
                player2Score,
                progress.player1Progress.totalTime,
                progress.player2Progress.totalTime,
                winnerId,
                battleId
            ]);
            const battle = this.mapBattleFromDB(result.rows[0]);
            const rewardResult = await this.rewardService.processBattleRewards(battleId);
            if (this.io) {
                this.io.to(`battle_${battleId}`).emit('battle_finished', {
                    battle,
                    progress,
                    rewards: rewardResult
                });
            }
            return battle;
        }
        catch (error) {
            console.error('Error finishing battle:', error);
            throw error;
        }
    }
    determineWinner(progress) {
        const player1Score = progress.player1Progress.correctAnswers;
        const player2Score = progress.player2Progress.correctAnswers;
        let winnerId;
        if (player1Score > player2Score) {
            winnerId = progress.player1Progress.userId;
        }
        else if (player2Score > player1Score) {
            winnerId = progress.player2Progress.userId;
        }
        else {
            if (progress.player1Progress.totalTime < progress.player2Progress.totalTime) {
                winnerId = progress.player1Progress.userId;
            }
            else if (progress.player2Progress.totalTime < progress.player1Progress.totalTime) {
                winnerId = progress.player2Progress.userId;
            }
        }
        return {
            winnerId,
            player1Score,
            player2Score
        };
    }
    async getBattle(battleId) {
        try {
            const result = await database_1.pool.query(`SELECT * FROM pk_battles WHERE id = $1`, [battleId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapBattleFromDB(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting battle:', error);
            throw error;
        }
    }
    async updateBattleStatus(battleId, status) {
        try {
            await database_1.pool.query(`UPDATE pk_battles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, battleId]);
        }
        catch (error) {
            console.error('Error updating battle status:', error);
            throw error;
        }
    }
    async getBattleHistory(userId, limit = 20) {
        try {
            const result = await database_1.pool.query(`SELECT * FROM pk_battles 
         WHERE (player1_id = $1 OR player2_id = $1) 
         AND status = $2
         ORDER BY created_at DESC 
         LIMIT $3`, [userId, BattleStatus.COMPLETED, limit]);
            return result.rows.map((row) => this.mapBattleFromDB(row));
        }
        catch (error) {
            console.error('Error getting battle history:', error);
            throw error;
        }
    }
    mapBattleFromDB(row) {
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
            status: row.status,
            createdAt: row.created_at
        };
    }
    joinBattleRoom(socketId, battleId) {
        if (this.io) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(`battle_${battleId}`);
                console.log(`Socket ${socketId} joined battle room ${battleId}`);
            }
        }
    }
    leaveBattleRoom(socketId, battleId) {
        if (this.io) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.leave(`battle_${battleId}`);
                console.log(`Socket ${socketId} left battle room ${battleId}`);
            }
        }
    }
}
exports.PKBattleService = PKBattleService;
//# sourceMappingURL=PKBattleService.js.map