"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const createUserRoutes = (db) => {
    const router = (0, express_1.Router)();
    const userController = new UserController_1.UserController(db);
    router.use(auth_1.authenticate);
    router.put('/preferences', [
        (0, express_validator_1.body)('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
        (0, express_validator_1.body)('notificationsEmail').optional().isBoolean().withMessage('notificationsEmail must be boolean'),
        (0, express_validator_1.body)('notificationsPush').optional().isBoolean().withMessage('notificationsPush must be boolean'),
        (0, express_validator_1.body)('practiceReminders').optional().isBoolean().withMessage('practiceReminders must be boolean'),
        (0, express_validator_1.body)('dailyQuoteEnabled').optional().isBoolean().withMessage('dailyQuoteEnabled must be boolean'),
        (0, express_validator_1.body)('reviewReminders').optional().isBoolean().withMessage('reviewReminders must be boolean'),
        (0, express_validator_1.body)('milestoneUpdates').optional().isBoolean().withMessage('milestoneUpdates must be boolean'),
        (0, express_validator_1.body)('pkInvitations').optional().isBoolean().withMessage('pkInvitations must be boolean'),
        validate_1.validate
    ], userController.updatePreferences.bind(userController));
    router.get('/learning-status', userController.getLearningStatus.bind(userController));
    router.put('/learning-goals', [
        (0, express_validator_1.body)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        (0, express_validator_1.body)('learningGoal').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid learning goal level'),
        (0, express_validator_1.body)('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid current level'),
        validate_1.validate
    ], userController.updateLearningGoals.bind(userController));
    router.post('/capabilities', [
        (0, express_validator_1.body)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        (0, express_validator_1.body)('currentLevel').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid current level'),
        (0, express_validator_1.body)('learningGoal').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid learning goal'),
        validate_1.validate
    ], userController.createCapability.bind(userController));
    router.get('/capabilities/:language', [
        (0, express_validator_1.param)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        validate_1.validate
    ], userController.getCapability.bind(userController));
    router.put('/capabilities/:language', [
        (0, express_validator_1.param)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        (0, express_validator_1.body)('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid current level'),
        (0, express_validator_1.body)('learningGoal').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid learning goal'),
        (0, express_validator_1.body)('isActiveLearning').optional().isBoolean().withMessage('isActiveLearning must be boolean'),
        (0, express_validator_1.body)('overallLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid overall level'),
        (0, express_validator_1.body)('confidenceScore').optional().isInt({ min: 0, max: 100 }).withMessage('Confidence score must be 0-100'),
        (0, express_validator_1.body)('listeningLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Listening level must be 0-100'),
        (0, express_validator_1.body)('speakingLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Speaking level must be 0-100'),
        (0, express_validator_1.body)('readingLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Reading level must be 0-100'),
        (0, express_validator_1.body)('writingLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Writing level must be 0-100'),
        validate_1.validate
    ], userController.updateCapability.bind(userController));
    router.post('/study-time', [
        (0, express_validator_1.body)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        (0, express_validator_1.body)('studyTimeMinutes').isInt({ min: 1 }).withMessage('Study time must be a positive integer'),
        validate_1.validate
    ], userController.updateStudyTime.bind(userController));
    router.get('/profile', userController.getProfile.bind(userController));
    router.get('/credits', userController.getCredits.bind(userController));
    router.put('/profile', [
        (0, express_validator_1.body)('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
        (0, express_validator_1.body)('username').optional().matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
        (0, express_validator_1.body)('email').optional().isEmail().withMessage('Please provide a valid email'),
        validate_1.validate
    ], userController.updateProfile.bind(userController));
    router.post('/change-password', [
        (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
        (0, express_validator_1.body)('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
        (0, express_validator_1.body)('newPassword').matches(/(?=.*[a-z])/).withMessage('Password must contain at least one lowercase letter'),
        (0, express_validator_1.body)('newPassword').matches(/(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter'),
        (0, express_validator_1.body)('newPassword').matches(/(?=.*\d)/).withMessage('Password must contain at least one number'),
        (0, express_validator_1.body)('newPassword').matches(/(?=.*[@$!%*?&])/).withMessage('Password must contain at least one special character'),
        validate_1.validate
    ], userController.changePassword.bind(userController));
    router.delete('/account', [
        (0, express_validator_1.body)('password').notEmpty().withMessage('Password confirmation is required'),
        validate_1.validate
    ], userController.deleteAccount.bind(userController));
    router.get('/admin/all', userController.getAllUsers.bind(userController));
    router.get('/admin/:userId/stats', [
        (0, express_validator_1.param)('userId').isUUID().withMessage('Valid user ID is required'),
        validate_1.validate
    ], userController.getUserWithStats.bind(userController));
    router.put('/admin/:userId/role', [
        (0, express_validator_1.param)('userId').isUUID().withMessage('Valid user ID is required'),
        (0, express_validator_1.body)('role').isIn(['user', 'admin']).withMessage('Role must be user or admin'),
        validate_1.validate
    ], userController.updateUserRole.bind(userController));
    router.post('/admin/:userId/suspend', [
        (0, express_validator_1.param)('userId').isUUID().withMessage('Valid user ID is required'),
        (0, express_validator_1.body)('reason').optional().isString().withMessage('Reason must be a string'),
        validate_1.validate
    ], userController.suspendUser.bind(userController));
    router.get('/admin/statistics', userController.getUserStatistics.bind(userController));
    router.post('/admin/batch-update', [
        (0, express_validator_1.body)('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
        (0, express_validator_1.body)('userIds.*').isUUID().withMessage('All user IDs must be valid UUIDs'),
        (0, express_validator_1.body)('updates').isObject().withMessage('Updates object is required'),
        validate_1.validate
    ], userController.batchUpdateUsers.bind(userController));
    router.post('/admin/batch-delete', [
        (0, express_validator_1.body)('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
        (0, express_validator_1.body)('userIds.*').isUUID().withMessage('All user IDs must be valid UUIDs'),
        validate_1.validate
    ], userController.batchDeleteUsers.bind(userController));
    return router;
};
exports.createUserRoutes = createUserRoutes;
//# sourceMappingURL=userRoutes.js.map