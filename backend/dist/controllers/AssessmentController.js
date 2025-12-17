"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentController = void 0;
const UserCapabilityService_1 = require("../services/UserCapabilityService");
const ReassessmentService_1 = require("../services/ReassessmentService");
const AIService_1 = require("../services/AIService");
class AssessmentController {
    constructor(db) {
        this.db = db;
        const aiService = new AIService_1.AIService(db);
        this.userCapabilityService = new UserCapabilityService_1.UserCapabilityService(db, aiService);
        this.reassessmentService = new ReassessmentService_1.ReassessmentService(db, aiService, this.userCapabilityService);
    }
    async getUserCapability(req, res, next) {
        try {
            const { language } = req.params;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const capability = await this.userCapabilityService.getUserCapability(req.user.id, language);
            if (!capability) {
                res.status(404).json({
                    success: false,
                    error: 'User capability not found for this language'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: capability
            });
        }
        catch (error) {
            next(error);
        }
    }
    async performComprehensiveAssessment(req, res, next) {
        try {
            const { language, assessmentType, dataSource, includeRecommendations } = req.body;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language is required'
                });
                return;
            }
            const assessmentRequest = {
                userId: req.user.id,
                language: language,
                assessmentType: assessmentType || 'user_requested',
                dataSource: dataSource || 'comprehensive_test',
                includeRecommendations: includeRecommendations !== false
            };
            const assessment = await this.userCapabilityService.performComprehensiveAssessment(assessmentRequest);
            if (!assessment) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to perform assessment'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: assessment,
                message: 'Comprehensive assessment completed successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAssessmentHistory(req, res, next) {
        try {
            const { language } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const history = await this.userCapabilityService.getAssessmentHistory(req.user.id, language, limit);
            res.status(200).json({
                success: true,
                data: history
            });
        }
        catch (error) {
            next(error);
        }
    }
    async initiateReassessment(req, res, next) {
        try {
            const { language, reason, focusAreas } = req.body;
            if (!language || !reason) {
                res.status(400).json({
                    success: false,
                    error: 'Language and reason are required'
                });
                return;
            }
            const reassessmentRequest = {
                userId: req.user.id,
                language: language,
                reason,
                focusAreas: focusAreas
            };
            const reassessmentCase = await this.reassessmentService.initiateReassessment(reassessmentRequest);
            if (!reassessmentCase) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to initiate reassessment'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: reassessmentCase,
                message: 'Reassessment initiated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async submitReassessmentResponse(req, res, next) {
        try {
            const { reassessmentId } = req.params;
            const { questionId, userAnswer } = req.body;
            if (!questionId || !userAnswer) {
                res.status(400).json({
                    success: false,
                    error: 'Question ID and user answer are required'
                });
                return;
            }
            const response = await this.reassessmentService.submitReassessmentResponse(reassessmentId, questionId, userAnswer);
            if (!response) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit reassessment response'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: response,
                message: 'Response submitted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getReassessmentCase(req, res, next) {
        try {
            const { reassessmentId } = req.params;
            const reassessmentCase = await this.reassessmentService.getReassessmentCase(reassessmentId);
            if (!reassessmentCase) {
                res.status(404).json({
                    success: false,
                    error: 'Reassessment case not found'
                });
                return;
            }
            if (reassessmentCase.userId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: reassessmentCase
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getReassessmentHistory(req, res, next) {
        try {
            const { language } = req.params;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const history = await this.reassessmentService.getUserReassessmentHistory(req.user.id, language);
            res.status(200).json({
                success: true,
                data: history
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelReassessment(req, res, next) {
        try {
            const { reassessmentId } = req.params;
            const { reason } = req.body;
            const reassessmentCase = await this.reassessmentService.getReassessmentCase(reassessmentId);
            if (!reassessmentCase || reassessmentCase.userId !== req.user.id) {
                res.status(404).json({
                    success: false,
                    error: 'Reassessment case not found'
                });
                return;
            }
            const success = await this.reassessmentService.cancelReassessment(reassessmentId, reason || 'Cancelled by user');
            if (!success) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to cancel reassessment'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Reassessment cancelled successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateUserCapability(req, res, next) {
        try {
            const { language } = req.params;
            const updateData = req.body;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const updatedCapability = await this.userCapabilityService.updateUserCapability(req.user.id, language, updateData);
            if (!updatedCapability) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to update user capability'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updatedCapability,
                message: 'User capability updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createUserCapability(req, res, next) {
        try {
            const { language, currentLevel, learningGoal } = req.body;
            if (!language || !currentLevel || !learningGoal) {
                res.status(400).json({
                    success: false,
                    error: 'Language, current level, and learning goal are required'
                });
                return;
            }
            const capability = await this.userCapabilityService.createUserCapability(req.user.id, {
                language: language,
                currentLevel,
                learningGoal
            });
            if (!capability) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to create user capability'
                });
                return;
            }
            res.status(201).json({
                success: true,
                data: capability,
                message: 'User capability created successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAllUserCapabilities(req, res, next) {
        try {
            const capabilities = await this.userCapabilityService.getAllUserCapabilities(req.user.id);
            res.status(200).json({
                success: true,
                data: capabilities
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AssessmentController = AssessmentController;
//# sourceMappingURL=AssessmentController.js.map