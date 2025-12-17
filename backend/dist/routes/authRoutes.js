"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const createAuthRoutes = (db) => {
    const router = (0, express_1.Router)();
    const authController = new AuthController_1.AuthController(db);
    router.post('/register', [
        (0, express_validator_1.body)('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
        (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        (0, express_validator_1.body)('language').optional().isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        (0, express_validator_1.body)('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid language level'),
        validate_1.validate
    ], authController.register.bind(authController));
    router.post('/login', [
        (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
        (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
        validate_1.validate
    ], authController.login.bind(authController));
    router.post('/refresh', [
        (0, express_validator_1.body)('refreshToken').notEmpty().withMessage('Refresh token is required'),
        validate_1.validate
    ], authController.refreshToken.bind(authController));
    router.post('/logout', authController.logout.bind(authController));
    router.get('/profile', auth_1.authenticate, authController.getProfile.bind(authController));
    router.put('/preferences', auth_1.authenticate, [
        (0, express_validator_1.body)('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
        (0, express_validator_1.body)('notificationsEmail').optional().isBoolean().withMessage('notificationsEmail must be boolean'),
        (0, express_validator_1.body)('notificationsPush').optional().isBoolean().withMessage('notificationsPush must be boolean'),
        (0, express_validator_1.body)('practiceReminders').optional().isBoolean().withMessage('practiceReminders must be boolean'),
        (0, express_validator_1.body)('dailyQuoteEnabled').optional().isBoolean().withMessage('dailyQuoteEnabled must be boolean'),
        (0, express_validator_1.body)('reviewReminders').optional().isBoolean().withMessage('reviewReminders must be boolean'),
        (0, express_validator_1.body)('milestoneUpdates').optional().isBoolean().withMessage('milestoneUpdates must be boolean'),
        (0, express_validator_1.body)('pkInvitations').optional().isBoolean().withMessage('pkInvitations must be boolean'),
        validate_1.validate
    ], authController.updatePreferences.bind(authController));
    return router;
};
exports.createAuthRoutes = createAuthRoutes;
//# sourceMappingURL=authRoutes.js.map