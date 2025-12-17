"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const UserService_1 = require("../services/UserService");
class AuthController {
    constructor(db) {
        this.userService = new UserService_1.UserService(db);
    }
    async register(req, res, next) {
        try {
            const userData = req.body;
            const result = await this.userService.createUser(userData);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const loginData = req.body;
            const result = await this.userService.loginUser(loginData);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(401).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await this.userService.refreshToken(refreshToken);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(401).json(result);
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
            const user = await this.userService.getUserById(req.user.id);
            const preferences = await this.userService.getUserPreferences(req.user.id);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt
                },
                preferences
            });
        }
        catch (error) {
            next(error);
        }
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
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map