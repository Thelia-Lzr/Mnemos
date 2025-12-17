"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserCapabilityService_1 = require("../services/UserCapabilityService");
const UserService_1 = require("../services/UserService");
const AIService_1 = require("../services/AIService");
const CreditService_1 = require("../services/CreditService");
class UserController {
    constructor(db) {
        const aiService = new AIService_1.AIService(db);
        this.userCapabilityService = new UserCapabilityService_1.UserCapabilityService(db, aiService);
        this.userService = new UserService_1.UserService(db);
        this.creditService = new CreditService_1.CreditService(db);
    }
    async updatePreferences(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const success = await this.userService.updateUserPreferences(req.user.id, req.body);
            if (success) {
                const updatedPreferences = await this.userService.getUserPreferences(req.user.id);
                res.status(200).json({
                    success: true,
                    preferences: updatedPreferences
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update preferences'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getLearningStatus(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const capabilities = await this.userCapabilityService.getAllUserCapabilities(req.user.id);
            const learningProgress = await Promise.all(capabilities.map(async (cap) => {
                const progress = await this.userCapabilityService.getLearningProgress(req.user.id, cap.language);
                const milestones = await this.userCapabilityService.getUserMilestones(req.user.id, cap.language);
                return {
                    language: cap.language,
                    capability: cap,
                    progress,
                    milestones
                };
            }));
            res.status(200).json({
                success: true,
                learningStatus: learningProgress
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateLearningGoals(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const { language, learningGoal, currentLevel } = req.body;
            if (!language || !learningGoal) {
                res.status(400).json({
                    success: false,
                    message: 'Language and learning goal are required'
                });
                return;
            }
            const updates = {
                learningGoal
            };
            if (currentLevel) {
                updates.currentLevel = currentLevel;
            }
            const success = await this.userCapabilityService.updateUserCapability(req.user.id, language, updates);
            if (success) {
                const updatedCapability = await this.userCapabilityService.getUserCapability(req.user.id, language);
                res.status(200).json({
                    success: true,
                    capability: updatedCapability
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update learning goals'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async createCapability(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const capabilityData = req.body;
            const existing = await this.userCapabilityService.getUserCapability(req.user.id, capabilityData.language);
            if (existing) {
                res.status(400).json({
                    success: false,
                    message: 'Capability for this language already exists'
                });
                return;
            }
            const capability = await this.userCapabilityService.createUserCapability(req.user.id, capabilityData);
            if (capability) {
                res.status(201).json({
                    success: true,
                    capability
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create capability'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getCapability(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const { language } = req.params;
            const capability = await this.userCapabilityService.getUserCapability(req.user.id, language);
            if (capability) {
                res.status(200).json({
                    success: true,
                    capability
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    message: 'Capability not found for this language'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async updateCapability(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const { language } = req.params;
            const updates = req.body;
            const success = await this.userCapabilityService.updateUserCapability(req.user.id, language, updates);
            if (success) {
                const updatedCapability = await this.userCapabilityService.getUserCapability(req.user.id, language);
                res.status(200).json({
                    success: true,
                    capability: updatedCapability
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update capability'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async updateStudyTime(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const { language, studyTimeMinutes } = req.body;
            if (!language || !studyTimeMinutes || studyTimeMinutes <= 0) {
                res.status(400).json({
                    success: false,
                    message: 'Language and valid study time are required'
                });
                return;
            }
            const success = await this.userCapabilityService.updateLearningProgress(req.user.id, language, studyTimeMinutes);
            if (success) {
                const updatedProgress = await this.userCapabilityService.getLearningProgress(req.user.id, language);
                res.status(200).json({
                    success: true,
                    progress: updatedProgress
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update study time'
                });
            }
        }
        catch (error) {
            next(error);
        }
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
    async getCredits(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const credits = await this.creditService.getUserCredits(req.user.id);
            const usageStats = await this.creditService.getCreditUsageStats(req.user.id, 30);
            if (!credits) {
                const initializedCredits = await this.creditService.initializeUserCredits(req.user.id, 10);
                res.status(200).json({
                    success: true,
                    data: {
                        credits: initializedCredits,
                        usageStats: {
                            totalSpent: 0,
                            spentToday: 0,
                            spentThisWeek: 0,
                            spentThisMonth: 0,
                            usageByService: {},
                            recentTransactions: []
                        }
                    }
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: {
                    credits,
                    usageStats
                }
            });
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
            const validation = await this.userService.validateUserData({ username, email });
            if (!validation.isValid) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
                return;
            }
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
            if (!currentPassword || !newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
                return;
            }
            const validation = await this.userService.validateUserData({ password: newPassword });
            if (!validation.isValid) {
                res.status(400).json({
                    success: false,
                    message: 'Password validation failed',
                    errors: validation.errors
                });
                return;
            }
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
    async deleteAccount(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }
            const { password } = req.body;
            if (!password) {
                res.status(400).json({
                    success: false,
                    message: 'Password confirmation is required'
                });
                return;
            }
            const loginResult = await this.userService.loginUser({
                email: req.user.email,
                password
            });
            if (!loginResult.success) {
                res.status(400).json({
                    success: false,
                    message: 'Password verification failed'
                });
                return;
            }
            const success = await this.userService.deleteUser(req.user.id);
            if (success) {
                res.status(200).json({
                    success: true,
                    message: 'Account deleted successfully'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to delete account'
                });
            }
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
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const searchTerm = req.query.search;
            const result = await this.userService.getAllUsers(page, limit, searchTerm);
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
            if (!role || !['user', 'admin'].includes(role)) {
                res.status(400).json({
                    success: false,
                    message: 'Valid role (user or admin) is required'
                });
                return;
            }
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
    async batchUpdateUsers(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
                return;
            }
            const { userIds, updates } = req.body;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'User IDs array is required'
                });
                return;
            }
            if (!updates || typeof updates !== 'object') {
                res.status(400).json({
                    success: false,
                    message: 'Updates object is required'
                });
                return;
            }
            const updatedCount = await this.userService.batchUpdateUsers(userIds, updates);
            res.status(200).json({
                success: true,
                message: `Successfully updated ${updatedCount} users`,
                updatedCount
            });
        }
        catch (error) {
            next(error);
        }
    }
    async batchDeleteUsers(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
                return;
            }
            const { userIds } = req.body;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'User IDs array is required'
                });
                return;
            }
            const deletedCount = await this.userService.batchDeleteUsers(userIds);
            res.status(200).json({
                success: true,
                message: `Successfully deleted ${deletedCount} users`,
                deletedCount
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map