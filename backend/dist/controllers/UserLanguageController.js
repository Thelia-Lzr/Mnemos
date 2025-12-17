"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLanguageController = void 0;
const UserLanguageService_1 = require("../services/UserLanguageService");
class UserLanguageController {
    constructor(db) {
        this.userLanguageService = new UserLanguageService_1.UserLanguageService(db);
    }
    async getUserLanguages(req, res, next) {
        try {
            const activeOnly = req.query.active === 'true';
            const languages = activeOnly
                ? await this.userLanguageService.getActiveUserLanguages(req.user.id)
                : await this.userLanguageService.getUserLanguages(req.user.id);
            res.status(200).json({
                success: true,
                data: languages
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPrimaryLanguage(req, res, next) {
        try {
            const primaryLanguage = await this.userLanguageService.getPrimaryLanguage(req.user.id);
            if (!primaryLanguage) {
                res.status(404).json({
                    success: false,
                    error: 'No primary language found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: primaryLanguage
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addUserLanguage(req, res, next) {
        try {
            const { language, currentLevel, targetLevel, isPrimary } = req.body;
            if (!language || !currentLevel) {
                res.status(400).json({
                    success: false,
                    error: 'Language and current level are required'
                });
                return;
            }
            const userLanguage = await this.userLanguageService.addUserLanguage(req.user.id, {
                language,
                currentLevel,
                targetLevel,
                isPrimary
            });
            if (!userLanguage) {
                res.status(400).json({
                    success: false,
                    error: 'Failed to add language or language already exists'
                });
                return;
            }
            res.status(201).json({
                success: true,
                data: userLanguage,
                message: 'Language added successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateUserLanguage(req, res, next) {
        try {
            const { language } = req.params;
            const updates = req.body;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const success = await this.userLanguageService.updateUserLanguage(req.user.id, language, updates);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Language not found or no changes made'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Language updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async removeUserLanguage(req, res, next) {
        try {
            const { language } = req.params;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const success = await this.userLanguageService.removeUserLanguage(req.user.id, language);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Language not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Language removed successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async setPrimaryLanguage(req, res, next) {
        try {
            const { language } = req.params;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const success = await this.userLanguageService.setPrimaryLanguage(req.user.id, language);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Language not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Primary language set successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserLanguage(req, res, next) {
        try {
            const { language } = req.params;
            if (!language) {
                res.status(400).json({
                    success: false,
                    error: 'Language parameter is required'
                });
                return;
            }
            const userLanguage = await this.userLanguageService.getUserLanguage(req.user.id, language);
            if (!userLanguage) {
                res.status(404).json({
                    success: false,
                    error: 'Language not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: userLanguage
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserLanguageController = UserLanguageController;
//# sourceMappingURL=UserLanguageController.js.map