"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MMRService = void 0;
const database_1 = require("../config/database");
class MMRService {
    async getUserMMR(userId, language) {
        try {
            const result = await database_1.pool.query(`SELECT * FROM user_mmr WHERE user_id = $1 AND language = $2`, [userId, language]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                userId: row.user_id,
                language: row.language,
                currentMMR: row.current_mmr,
                peakMMR: row.peak_mmr,
                totalBattles: row.total_battles,
                wins: row.wins,
                losses: row.losses,
                winRate: row.total_battles > 0 ? (row.wins / row.total_battles) * 100 : 0,
                vocabularyRating: row.vocabulary_rating || 1000,
                grammarRating: row.grammar_rating || 1000,
                speedRating: row.speed_rating || 1000,
                accuracyRating: row.accuracy_rating || 1000,
                lastUpdated: row.updated_at
            };
        }
        catch (error) {
            console.error('Error getting user MMR:', error);
            throw error;
        }
    }
    async initializeUserMMR(userId, language) {
        try {
            const existing = await this.getUserMMR(userId, language);
            if (existing) {
                return existing;
            }
            const initialMMR = await this.calculateInitialMMR(userId, language);
            const result = await database_1.pool.query(`INSERT INTO user_mmr (
          user_id, language, current_mmr, peak_mmr, 
          vocabulary_rating, grammar_rating, speed_rating, accuracy_rating
        ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7) 
        RETURNING *`, [userId, language, initialMMR, initialMMR, initialMMR, initialMMR, initialMMR]);
            const row = result.rows[0];
            return {
                id: row.id,
                userId: row.user_id,
                language: row.language,
                currentMMR: row.current_mmr,
                peakMMR: row.peak_mmr,
                totalBattles: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                vocabularyRating: row.vocabulary_rating,
                grammarRating: row.grammar_rating,
                speedRating: row.speed_rating,
                accuracyRating: row.accuracy_rating,
                lastUpdated: row.updated_at
            };
        }
        catch (error) {
            console.error('Error initializing user MMR:', error);
            throw error;
        }
    }
    async calculateInitialMMR(userId, language) {
        try {
            const capabilityResult = await database_1.pool.query(`SELECT * FROM user_capabilities WHERE user_id = $1 AND language = $2`, [userId, language]);
            if (capabilityResult.rows.length === 0) {
                return 1000;
            }
            const capability = capabilityResult.rows[0];
            const listeningScore = capability.listening_level || 50;
            const speakingScore = capability.speaking_level || 50;
            const readingScore = capability.reading_level || 50;
            const writingScore = capability.writing_level || 50;
            const vocabularySize = capability.estimated_vocabulary_size || 0;
            const masteredWords = capability.mastered_words_count || 0;
            const skillAverage = (listeningScore + speakingScore + readingScore + writingScore) / 4;
            const vocabularyBonus = Math.min(vocabularySize / 10, 200);
            const masteryBonus = Math.min(masteredWords / 5, 100);
            const initialMMR = Math.round(800 + (skillAverage * 4) + vocabularyBonus + masteryBonus);
            return Math.max(500, Math.min(2000, initialMMR));
        }
        catch (error) {
            console.error('Error calculating initial MMR:', error);
            return 1000;
        }
    }
    async updateMMR(userId, language, mmrChange, battleResult, reason) {
        try {
            const currentMMR = await this.getUserMMR(userId, language);
            if (!currentMMR) {
                throw new Error('User MMR not found');
            }
            const newMMR = Math.max(0, currentMMR.currentMMR + mmrChange);
            const newPeakMMR = Math.max(currentMMR.peakMMR, newMMR);
            const newWins = battleResult === 'win' ? currentMMR.wins + 1 : currentMMR.wins;
            const newLosses = battleResult === 'loss' ? currentMMR.losses + 1 : currentMMR.losses;
            const newTotalBattles = currentMMR.totalBattles + 1;
            await database_1.pool.query(`UPDATE user_mmr SET 
          current_mmr = $1, 
          peak_mmr = $2, 
          total_battles = $3, 
          wins = $4, 
          losses = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6 AND language = $7`, [newMMR, newPeakMMR, newTotalBattles, newWins, newLosses, userId, language]);
            await this.recordMMRChange(userId, language, newMMR, mmrChange, reason);
            return {
                ...currentMMR,
                currentMMR: newMMR,
                peakMMR: newPeakMMR,
                totalBattles: newTotalBattles,
                wins: newWins,
                losses: newLosses,
                winRate: (newWins / newTotalBattles) * 100,
                lastUpdated: new Date()
            };
        }
        catch (error) {
            console.error('Error updating MMR:', error);
            throw error;
        }
    }
    async recordMMRChange(userId, language, newMMR, change, reason) {
        try {
            await database_1.pool.query(`INSERT INTO mmr_history (user_id, language, mmr, change_amount, reason) 
         VALUES ($1, $2, $3, $4, $5)`, [userId, language, newMMR, change, reason]);
        }
        catch (error) {
            console.error('Error recording MMR change:', error);
        }
    }
    calculateMMRChange(playerMMR, opponentMMR, result, kFactor = 32) {
        const expectedScore = 1 / (1 + Math.pow(10, (opponentMMR - playerMMR) / 400));
        const actualScore = result === 'win' ? 1 : 0;
        const mmrChange = Math.round(kFactor * (actualScore - expectedScore));
        return mmrChange;
    }
    async getMMRRanking(language, limit = 50) {
        try {
            const result = await database_1.pool.query(`SELECT umr.*, u.username 
         FROM user_mmr umr
         JOIN users u ON umr.user_id = u.id
         WHERE umr.language = $1 
         ORDER BY umr.current_mmr DESC 
         LIMIT $2`, [language, limit]);
            return result.rows.map((row) => ({
                id: row.id,
                userId: row.user_id,
                language: row.language,
                currentMMR: row.current_mmr,
                peakMMR: row.peak_mmr,
                totalBattles: row.total_battles,
                wins: row.wins,
                losses: row.losses,
                winRate: row.total_battles > 0 ? (row.wins / row.total_battles) * 100 : 0,
                vocabularyRating: row.vocabulary_rating || 1000,
                grammarRating: row.grammar_rating || 1000,
                speedRating: row.speed_rating || 1000,
                accuracyRating: row.accuracy_rating || 1000,
                lastUpdated: row.updated_at
            }));
        }
        catch (error) {
            console.error('Error getting MMR ranking:', error);
            throw error;
        }
    }
    async getMMRHistory(userId, language) {
        try {
            const result = await database_1.pool.query(`SELECT mmr, change_amount as change, reason, created_at as timestamp
         FROM mmr_history 
         WHERE user_id = $1 AND language = $2 
         ORDER BY created_at DESC 
         LIMIT 50`, [userId, language]);
            return result.rows.map((row) => ({
                mmr: row.mmr,
                change: row.change,
                reason: row.reason,
                timestamp: row.timestamp
            }));
        }
        catch (error) {
            console.error('Error getting MMR history:', error);
            throw error;
        }
    }
}
exports.MMRService = MMRService;
//# sourceMappingURL=MMRService.js.map