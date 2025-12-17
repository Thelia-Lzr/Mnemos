"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKMatchingService = void 0;
const database_1 = require("../config/database");
const MMRService_1 = require("./MMRService");
const CreditService_1 = require("./CreditService");
const PKRewardService_1 = require("./PKRewardService");
class PKMatchingService {
    constructor() {
        this.MATCH_TIMEOUT_MINUTES = 5;
        this.MMR_TOLERANCE_BASE = 100;
        this.MMR_TOLERANCE_GROWTH = 20;
        this.PK_ENTRY_FEE = 1;
        this.mmrService = new MMRService_1.MMRService();
        this.creditService = new CreditService_1.CreditService(database_1.pool);
        this.rewardService = new PKRewardService_1.PKRewardService();
    }
    async requestMatch(userId, language) {
        try {
            const userCredits = await this.creditService.getUserCredits(userId);
            if (!userCredits || userCredits.currentBalance < this.PK_ENTRY_FEE) {
                throw new Error('Insufficient credits for PK battle');
            }
            const existingRequest = await this.getActiveMatchRequest(userId, language);
            if (existingRequest) {
                return existingRequest;
            }
            let userMMR = await this.mmrService.getUserMMR(userId, language);
            if (!userMMR) {
                userMMR = await this.mmrService.initializeUserMMR(userId, language);
            }
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + this.MATCH_TIMEOUT_MINUTES);
            const result = await database_1.pool.query(`INSERT INTO match_requests (user_id, language, mmr, expires_at) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`, [userId, language, userMMR.currentMMR, expiresAt]);
            const matchRequest = {
                id: result.rows[0].id,
                userId: result.rows[0].user_id,
                language: result.rows[0].language,
                mmr: result.rows[0].mmr,
                requestedAt: result.rows[0].created_at,
                expiresAt: result.rows[0].expires_at,
                status: result.rows[0].status
            };
            const match = await this.findMatch(matchRequest);
            if (match) {
                return {
                    ...matchRequest,
                    status: 'matched'
                };
            }
            return matchRequest;
        }
        catch (error) {
            console.error('Error requesting match:', error);
            throw error;
        }
    }
    async findMatch(matchRequest) {
        try {
            const waitingTime = Date.now() - matchRequest.requestedAt.getTime();
            const waitingMinutes = Math.floor(waitingTime / (1000 * 60));
            const currentTolerance = this.MMR_TOLERANCE_BASE + (waitingMinutes * this.MMR_TOLERANCE_GROWTH);
            const minMMR = matchRequest.mmr - currentTolerance;
            const maxMMR = matchRequest.mmr + currentTolerance;
            const result = await database_1.pool.query(`SELECT * FROM match_requests 
         WHERE user_id != $1 
         AND language = $2 
         AND status = 'waiting'
         AND mmr BETWEEN $3 AND $4
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY ABS(mmr - $5), created_at ASC
         LIMIT 1`, [matchRequest.userId, matchRequest.language, minMMR, maxMMR, matchRequest.mmr]);
            if (result.rows.length === 0) {
                return null;
            }
            const opponent = result.rows[0];
            const match = await this.createMatch(matchRequest, opponent);
            return match;
        }
        catch (error) {
            console.error('Error finding match:', error);
            throw error;
        }
    }
    async createMatch(player1Request, player2Request) {
        try {
            await database_1.pool.query('BEGIN');
            try {
                await database_1.pool.query(`UPDATE match_requests SET status = 'matched' 
           WHERE id IN ($1, $2)`, [player1Request.id, player2Request.id]);
                await this.rewardService.deductEntryFee(player1Request.userId);
                await this.rewardService.deductEntryFee(player2Request.user_id);
                const battleResult = await database_1.pool.query(`INSERT INTO pk_battles (
            player1_id, player2_id, language, status
          ) VALUES ($1, $2, $3, 'waiting') 
          RETURNING *`, [player1Request.userId, player2Request.user_id, player1Request.language]);
                await database_1.pool.query('COMMIT');
                const match = {
                    matchId: battleResult.rows[0].id,
                    player1Id: player1Request.userId,
                    player2Id: player2Request.user_id,
                    language: player1Request.language,
                    createdAt: battleResult.rows[0].created_at
                };
                return match;
            }
            catch (error) {
                await database_1.pool.query('ROLLBACK');
                throw error;
            }
        }
        catch (error) {
            console.error('Error creating match:', error);
            throw error;
        }
    }
    async cancelMatch(userId, language) {
        try {
            const result = await database_1.pool.query(`UPDATE match_requests 
         SET status = 'cancelled' 
         WHERE user_id = $1 AND language = $2 AND status = 'waiting'`, [userId, language]);
            return (result.rowCount || 0) > 0;
        }
        catch (error) {
            console.error('Error cancelling match:', error);
            throw error;
        }
    }
    async getActiveMatchRequest(userId, language) {
        try {
            const result = await database_1.pool.query(`SELECT * FROM match_requests 
         WHERE user_id = $1 AND language = $2 AND status IN ('waiting', 'matched')
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC 
         LIMIT 1`, [userId, language]);
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
        }
        catch (error) {
            console.error('Error getting active match request:', error);
            throw error;
        }
    }
    async getMatchStatus(userId, language) {
        try {
            const matchRequest = await this.getActiveMatchRequest(userId, language);
            if (!matchRequest) {
                return { isMatching: false };
            }
            if (matchRequest.status === 'matched') {
                const battleResult = await database_1.pool.query(`SELECT * FROM pk_battles 
           WHERE (player1_id = $1 OR player2_id = $1) 
           AND language = $2 
           AND status IN ('waiting', 'in_progress')
           ORDER BY created_at DESC 
           LIMIT 1`, [userId, language]);
                if (battleResult.rows.length > 0) {
                    return {
                        isMatching: false,
                        battle: battleResult.rows[0]
                    };
                }
            }
            const estimatedWaitTime = await this.calculateEstimatedWaitTime(matchRequest);
            return {
                isMatching: true,
                matchRequest,
                estimatedWaitTime
            };
        }
        catch (error) {
            console.error('Error getting match status:', error);
            throw error;
        }
    }
    async calculateEstimatedWaitTime(matchRequest) {
        try {
            const tolerance = this.MMR_TOLERANCE_BASE;
            const result = await database_1.pool.query(`SELECT COUNT(*) as count FROM match_requests 
         WHERE language = $1 
         AND status = 'waiting'
         AND mmr BETWEEN $2 AND $3
         AND expires_at > CURRENT_TIMESTAMP`, [
                matchRequest.language,
                matchRequest.mmr - tolerance,
                matchRequest.mmr + tolerance
            ]);
            const waitingPlayers = parseInt(result.rows[0].count);
            if (waitingPlayers >= 2)
                return 30;
            if (waitingPlayers >= 1)
                return 120;
            return 300;
        }
        catch (error) {
            console.error('Error calculating estimated wait time:', error);
            return 300;
        }
    }
    async cleanupExpiredRequests() {
        try {
            await database_1.pool.query(`UPDATE match_requests 
         SET status = 'expired' 
         WHERE status = 'waiting' AND expires_at <= CURRENT_TIMESTAMP`);
        }
        catch (error) {
            console.error('Error cleaning up expired requests:', error);
        }
    }
    async getMatchingStats(language) {
        try {
            const [waitingResult, avgWaitResult, todayMatchesResult] = await Promise.all([
                database_1.pool.query(`SELECT COUNT(*) as count FROM match_requests 
           WHERE language = $1 AND status = 'waiting' AND expires_at > CURRENT_TIMESTAMP`, [language]),
                database_1.pool.query(`SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_wait 
           FROM match_requests 
           WHERE language = $1 AND status = 'matched' 
           AND created_at >= CURRENT_DATE - INTERVAL '7 days'`, [language]),
                database_1.pool.query(`SELECT COUNT(*) as count FROM pk_battles 
           WHERE language = $1 AND created_at >= CURRENT_DATE`, [language])
            ]);
            return {
                totalWaiting: parseInt(waitingResult.rows[0].count),
                averageWaitTime: parseFloat(avgWaitResult.rows[0].avg_wait) || 0,
                matchesCreatedToday: parseInt(todayMatchesResult.rows[0].count)
            };
        }
        catch (error) {
            console.error('Error getting matching stats:', error);
            throw error;
        }
    }
}
exports.PKMatchingService = PKMatchingService;
//# sourceMappingURL=PKMatchingService.js.map