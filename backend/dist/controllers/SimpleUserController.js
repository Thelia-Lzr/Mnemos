"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleUserController = void 0;
const UserService_1 = require("../services/UserService");
class SimpleUserController {
    constructor(db) {
        this.userService = new UserService_1.UserService(db);
    }
    async getProfile(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const profile = await this.userService.getUserProfile(req.user.id);
            if (profile) {
                res.status(200).json({
                    success: true,
                    profile
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    message: 'User profile not found'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const { username, email } = req.body;
            const success = await this.userService.updateUser(req.user.id, { username, email });
            if (success) {
                const updatedProfile = await this.userService.getUserProfile(req.user.id);
                res.status(200).json({
                    success: true,
                    profile: updatedProfile
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update profile'
                });
            }
        }
        catch (error) {
            if (error instanceof Error && (error.message.includes('Email already exists') || error.message.includes('Username already exists'))) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            else {
                next(error);
            }
        }
    }
    async changePassword(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const { currentPassword, newPassword } = req.body;
            const success = await this.userService.changePassword(req.user.id, currentPassword, newPassword);
            if (success) {
                res.status(200).json({
                    success: true,
                    message: 'Password changed successfully'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to change password'
                });
            }
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Current password is incorrect') {
                res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            else {
                next(error);
            }
        }
    }
    async getLearningStatus(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                learningStatus: {
                    message: '学习能力功能正在开发中',
                    capabilities: [],
                    progress: []
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateLearningGoals(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                message: '学习目标功能正在开发中'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createCapability(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                message: '能力创建功能正在开发中'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCapability(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                capability: null,
                message: '能力查询功能正在开发中'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateCapability(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                message: '能力更新功能正在开发中'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStudyTime(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                message: '学习时间记录功能正在开发中'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAllUsers(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
                return;
            }
            const result = await this.userService.getAllUsers(1, 50);
            res.status(200).json({
                success: true,
                ...result
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserWithStats(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
                return;
            }
            const { userId } = req.params;
            const userStats = await this.userService.getUserWithStats(userId);
            if (userStats) {
                res.status(200).json({
                    success: true,
                    user: userStats
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async updateUserRole(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
                return;
            }
            const { userId } = req.params;
            const { role } = req.body;
            const success = await this.userService.updateUserRole(userId, role);
            if (success) {
                res.status(200).json({
                    success: true,
                    message: 'User role updated successfully'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update user role'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async suspendUser(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
                return;
            }
            const { userId } = req.params;
            const { reason } = req.body;
            const success = await this.userService.suspendUser(userId, reason);
            if (success) {
                res.status(200).json({
                    success: true,
                    message: 'User suspended successfully'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to suspend user'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getUserStatistics(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
                return;
            }
            const statistics = await this.userService.getUserStatistics();
            res.status(200).json({
                success: true,
                statistics
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SimpleUserController = SimpleUserController;
//# sourceMappingURL=SimpleUserController.js.map