"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKRewardService = void 0;
const database_1 = require("../config/database");
const MMRService_1 = require("./MMRService");
const CreditService_1 = require("./CreditService");
const PKBattleService_1 = require("./PKBattleService");
const credit_1 = require("../types/credit");
class PKRewardService {
    constructor() {
        this.PK_WINNER_REWARD = 3;
        this.PK_LOSER_PENALTY = 0;
        this.mmrService = new MMRService_1.MMRService();
        this.creditService = new CreditService_1.CreditService(database_1.pool);
    }
    async deductEntryFee(userId) {
        try {
            const PK_ENTRY_FEE = 1;
            const userCredits = await this.creditService.getUserCredits(userId);
            if (!userCredits || userCredits.currentBalance < PK_ENTRY_FEE) {
                return false;
            }
            await this.creditService.consumeCredits(userId, 'pk_entry', 0, 'PK battle entry fee');
            return true;
        }
        catch (error) {
            console.error('Error deducting entry fee:', error);
            return false;
        }
    }
    async processBattleRewards(battleId) {
        try {
            const battleResult = await database_1.pool.query(`SELECT * FROM pk_battles WHERE id = $1`, [battleId]);
            if (battleResult.rows.length === 0) {
                throw new Error('Battle not found');
            }
            const battle = battleResult.rows[0];
            if (battle.status !== PKBattleService_1.BattleStatus.COMPLETED) {
                throw new Error('Battle is not completed');
            }
            const [player1MMR, player2MMR] = await Promise.all([
                this.mmrService.getUserMMR(battle.player1_id, battle.language),
                this.mmrService.getUserMMR(battle.player2_id, battle.language)
            ]);
            if (!player1MMR || !player2MMR) {
                throw new Error('Player MMR not found');
            }
            const { player1MMRChange, player2MMRChange } = this.calculateMMRChanges(battle, player1MMR.currentMMR, player2MMR.currentMMR);
            await database_1.pool.query('BEGIN');
            try {
                const [updatedPlayer1MMR, updatedPlayer2MMR] = await Promise.all([
                    this.mmrService.updateMMR(battle.player1_id, battle.language, player1MMRChange, battle.winner_id === battle.player1_id ? 'win' : 'loss', `PK Battle ${battleId}`),
                    this.mmrService.updateMMR(battle.player2_id, battle.language, player2MMRChange, battle.winner_id === battle.player2_id ? 'win' : 'loss', `PK Battle ${battleId}`)
                ]);
                let winnerReward = 0;
                let loserPenalty = 0;
                if (battle.winner_id) {
                    await this.creditService.addCredits(battle.winner_id, this.PK_WINNER_REWARD, credit_1.TransactionType.PK_REWARD, 'PK battle victory reward', battleId);
                    winnerReward = this.PK_WINNER_REWARD;
                }
                await database_1.pool.query(`UPDATE pk_battles SET 
            player1_mmr_change = $1,
            player2_mmr_change = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`, [player1MMRChange, player2MMRChange, battleId]);
                await database_1.pool.query('COMMIT');
                const result = {
                    winnerId: battle.winner_id,
                    winnerReward,
                    loserPenalty,
                    player1MMRChange,
                    player2MMRChange,
                    player1NewMMR: updatedPlayer1MMR.currentMMR,
                    player2NewMMR: updatedPlayer2MMR.currentMMR
                };
                return result;
            }
            catch (error) {
                await database_1.pool.query('ROLLBACK');
                throw error;
            }
        }
        catch (error) {
            console.error('Error processing battle rewards:', error);
            throw error;
        }
    }
    calculateMMRChanges(battle, player1MMR, player2MMR) {
        let player1Result;
        let player2Result;
        if (battle.winner_id === battle.player1_id) {
            player1Result = 'win';
            player2Result = 'loss';
        }
        else if (battle.winner_id === battle.player2_id) {
            player1Result = 'loss';
            player2Result = 'win';
        }
        else {
            player1Result = 'draw';
            player2Result = 'draw';
        }
        const player1MMRChange = this.calculateELOChange(player1MMR, player2MMR, player1Result);
        const player2MMRChange = this.calculateELOChange(player2MMR, player1MMR, player2Result);
        return { player1MMRChange, player2MMRChange };
    }
    calculateELOChange(playerMMR, opponentMMR, result) {
        const K_FACTOR = 32;
        const expectedScore = 1 / (1 + Math.pow(10, (opponentMMR - playerMMR) / 400));
        let actualScore;
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
        const mmrChange = Math.round(K_FACTOR * (actualScore - expectedScore));
        return mmrChange;
    }
    async getPKStats(userId, language) {
        try {
            const battleStatsResult = await database_1.pool.query(`SELECT 
          COUNT(*) as total_battles,
          COUNT(CASE WHEN winner_id = $1 THEN 1 END) as wins,
          COUNT(CASE WHEN winner_id != $1 AND winner_id IS NOT NULL THEN 1 END) as losses,
          COUNT(CASE WHEN winner_id IS NULL THEN 1 END) as draws
        FROM pk_battles 
        WHERE (player1_id = $1 OR player2_id = $1) 
        AND language = $2 
        AND status = $3`, [userId, language, PKBattleService_1.BattleStatus.COMPLETED]);
            const battleStats = battleStatsResult.rows[0];
            const totalBattles = parseInt(battleStats.total_battles);
            const wins = parseInt(battleStats.wins);
            const losses = parseInt(battleStats.losses);
            const draws = parseInt(battleStats.draws);
            const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
            const creditStatsResult = await database_1.pool.query(`SELECT 
          COALESCE(SUM(CASE WHEN type = 'pk_reward' THEN amount ELSE 0 END), 0) as credits_earned,
          COALESCE(SUM(CASE WHEN type = 'pk_entry' THEN ABS(amount) ELSE 0 END), 0) as credits_spent
        FROM credit_transactions 
        WHERE user_id = $1`, [userId]);
            const creditStats = creditStatsResult.rows[0];
            const totalCreditsEarned = parseInt(creditStats.credits_earned);
            const totalCreditsSpent = parseInt(creditStats.credits_spent);
            const userMMR = await this.mmrService.getUserMMR(userId, language);
            const currentMMR = userMMR?.currentMMR || 1000;
            const peakMMR = userMMR?.peakMMR || 1000;
            const mmrHistoryResult = await database_1.pool.query(`SELECT AVG(ABS(change_amount)) as avg_change 
        FROM mmr_history 
        WHERE user_id = $1 AND language = $2`, [userId, language]);
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
        }
        catch (error) {
            console.error('Error getting PK stats:', error);
            throw error;
        }
    }
    async getPKLeaderboard(language, limit = 50) {
        try {
            const result = await database_1.pool.query(`WITH battle_stats AS (
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
        LIMIT $3`, [language, PKBattleService_1.BattleStatus.COMPLETED, limit]);
            return result.rows.map(row => ({
                userId: row.user_id,
                username: row.username,
                currentMMR: row.current_mmr,
                totalBattles: parseInt(row.total_battles),
                wins: parseInt(row.wins),
                winRate: parseFloat(row.win_rate),
                rank: parseInt(row.rank)
            }));
        }
        catch (error) {
            console.error('Error getting PK leaderboard:', error);
            throw error;
        }
    }
    async processUnprocessedBattles() {
        try {
            const unprocessedResult = await database_1.pool.query(`SELECT id FROM pk_battles 
        WHERE status = $1 AND player1_mmr_change = 0 AND player2_mmr_change = 0`, [PKBattleService_1.BattleStatus.COMPLETED]);
            for (const battle of unprocessedResult.rows) {
                try {
                    await this.processBattleRewards(battle.id);
                    console.log(`Processed rewards for battle ${battle.id}`);
                }
                catch (error) {
                    console.error(`Error processing rewards for battle ${battle.id}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error processing unprocessed battles:', error);
        }
    }
}
exports.PKRewardService = PKRewardService;
//# sourceMappingURL=PKRewardService.js.map