"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKController = void 0;
const PKMatchingService_1 = require("../services/PKMatchingService");
const MMRService_1 = require("../services/MMRService");
const PKBattleService_1 = require("../services/PKBattleService");
const PKRewardService_1 = require("../services/PKRewardService");
class PKController {
    constructor() {
        this.matchingService = new PKMatchingService_1.PKMatchingService();
        this.mmrService = new MMRService_1.MMRService();
        this.battleService = new PKBattleService_1.PKBattleService();
        this.rewardService = new PKRewardService_1.PKRewardService();
    }
    async findMatch(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.body;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const matchRequest = await this.matchingService.requestMatch(userId, language);
            res.status(200).json({
                success: true,
                data: matchRequest,
                message: matchRequest.status === 'matched' ? 'Match found!' : 'Searching for opponent...'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMatchStatus(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.query;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const status = await this.matchingService.getMatchStatus(userId, language);
            res.status(200).json({
                success: true,
                data: status
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelMatch(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.body;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const cancelled = await this.matchingService.cancelMatch(userId, language);
            if (cancelled) {
                res.status(200).json({
                    success: true,
                    message: 'Match request cancelled successfully'
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    error: 'No active match request found'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getBattle(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const battle = await this.battleService.getBattle(id);
            if (!battle) {
                res.status(404).json({
                    success: false,
                    error: 'Battle not found'
                });
                return;
            }
            if (battle.player1Id !== userId && battle.player2Id !== userId) {
                res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: battle
            });
        }
        catch (error) {
            next(error);
        }
    }
    async submitAnswer(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { questionId, answer } = req.body;
            if (!questionId || !answer) {
                res.status(400).json({
                    success: false,
                    error: 'Question ID and answer are required'
                });
                return;
            }
            const battleAnswer = await this.battleService.submitAnswer(id, userId, questionId, answer);
            res.status(200).json({
                success: true,
                data: battleAnswer
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getBattleHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 20;
            const history = await this.battleService.getBattleHistory(userId, limitNum);
            res.status(200).json({
                success: true,
                data: history
            });
        }
        catch (error) {
            next(error);
        }
    }
    async startBattle(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const battle = await this.battleService.getBattle(id);
            if (!battle) {
                res.status(404).json({
                    success: false,
                    error: 'Battle not found'
                });
                return;
            }
            if (battle.player1Id !== userId && battle.player2Id !== userId) {
                res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
                return;
            }
            const startedBattle = await this.battleService.startBattle(id);
            res.status(200).json({
                success: true,
                data: startedBattle
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMMRRanking(req, res, next) {
        try {
            const { language, limit } = req.query;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const limitNum = limit ? parseInt(limit) : 50;
            const ranking = await this.mmrService.getMMRRanking(language, limitNum);
            res.status(200).json({
                success: true,
                data: ranking
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserMMR(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.query;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            let userMMR = await this.mmrService.getUserMMR(userId, language);
            if (!userMMR) {
                userMMR = await this.mmrService.initializeUserMMR(userId, language);
            }
            res.status(200).json({
                success: true,
                data: userMMR
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMMRHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.query;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const history = await this.mmrService.getMMRHistory(userId, language);
            res.status(200).json({
                success: true,
                data: history
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMatchingStats(req, res, next) {
        try {
            const { language } = req.query;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const stats = await this.matchingService.getMatchingStats(language);
            res.status(200).json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPKStats(req, res, next) {
        try {
            const userId = req.user.id;
            const { language } = req.query;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const stats = await this.rewardService.getPKStats(userId, language);
            res.status(200).json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPKLeaderboard(req, res, next) {
        try {
            const { language, limit } = req.query;
            if (!language || !['en', 'ja', 'fr'].includes(language)) {
                res.status(400).json({
                    success: false,
                    error: 'Valid language (en, ja, fr) is required'
                });
                return;
            }
            const limitNum = limit ? parseInt(limit) : 50;
            const leaderboard = await this.rewardService.getPKLeaderboard(language, limitNum);
            res.status(200).json({
                success: true,
                data: leaderboard
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PKController = PKController;
//# sourceMappingURL=PKController.js.map