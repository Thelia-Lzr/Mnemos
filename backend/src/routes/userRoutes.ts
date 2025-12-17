import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Pool } from 'pg';

export const createUserRoutes = (db: Pool): Router => {
  const router = Router();
  const userController = new UserController(db);

  // All user routes require authentication
  router.use(authenticate);

  // User preferences
  router.put('/preferences', [
    body('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
    body('notificationsEmail').optional().isBoolean().withMessage('notificationsEmail must be boolean'),
    body('notificationsPush').optional().isBoolean().withMessage('notificationsPush must be boolean'),
    body('practiceReminders').optional().isBoolean().withMessage('practiceReminders must be boolean'),
    body('dailyQuoteEnabled').optional().isBoolean().withMessage('dailyQuoteEnabled must be boolean'),
    body('reviewReminders').optional().isBoolean().withMessage('reviewReminders must be boolean'),
    body('milestoneUpdates').optional().isBoolean().withMessage('milestoneUpdates must be boolean'),
    body('pkInvitations').optional().isBoolean().withMessage('pkInvitations must be boolean'),
    validate
  ], userController.updatePreferences.bind(userController));

  // Learning status and goals
  router.get('/learning-status', userController.getLearningStatus.bind(userController));
  
  router.put('/learning-goals', [
    body('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    body('learningGoal').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid learning goal level'),
    body('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid current level'),
    validate
  ], userController.updateLearningGoals.bind(userController));

  // User capabilities
  router.post('/capabilities', [
    body('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    body('currentLevel').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid current level'),
    body('learningGoal').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid learning goal'),
    validate
  ], userController.createCapability.bind(userController));

  router.get('/capabilities/:language', [
    param('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    validate
  ], userController.getCapability.bind(userController));

  router.put('/capabilities/:language', [
    param('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    body('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid current level'),
    body('learningGoal').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid learning goal'),
    body('isActiveLearning').optional().isBoolean().withMessage('isActiveLearning must be boolean'),
    body('overallLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid overall level'),
    body('confidenceScore').optional().isInt({ min: 0, max: 100 }).withMessage('Confidence score must be 0-100'),
    body('listeningLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Listening level must be 0-100'),
    body('speakingLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Speaking level must be 0-100'),
    body('readingLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Reading level must be 0-100'),
    body('writingLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Writing level must be 0-100'),
    validate
  ], userController.updateCapability.bind(userController));

  // Study time tracking
  router.post('/study-time', [
    body('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    body('studyTimeMinutes').isInt({ min: 1 }).withMessage('Study time must be a positive integer'),
    validate
  ], userController.updateStudyTime.bind(userController));

  // User profile management
  router.get('/profile', userController.getProfile.bind(userController));

  // User credits
  router.get('/credits', userController.getCredits.bind(userController));

  router.put('/profile', [
    body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('username').optional().matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    validate
  ], userController.updateProfile.bind(userController));

  router.post('/change-password', [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    body('newPassword').matches(/(?=.*[a-z])/).withMessage('Password must contain at least one lowercase letter'),
    body('newPassword').matches(/(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter'),
    body('newPassword').matches(/(?=.*\d)/).withMessage('Password must contain at least one number'),
    body('newPassword').matches(/(?=.*[@$!%*?&])/).withMessage('Password must contain at least one special character'),
    validate
  ], userController.changePassword.bind(userController));

  router.delete('/account', [
    body('password').notEmpty().withMessage('Password confirmation is required'),
    validate
  ], userController.deleteAccount.bind(userController));

  // Admin-only routes
  router.get('/admin/all', userController.getAllUsers.bind(userController));
  
  router.get('/admin/:userId/stats', [
    param('userId').isUUID().withMessage('Valid user ID is required'),
    validate
  ], userController.getUserWithStats.bind(userController));

  router.put('/admin/:userId/role', [
    param('userId').isUUID().withMessage('Valid user ID is required'),
    body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin'),
    validate
  ], userController.updateUserRole.bind(userController));

  router.post('/admin/:userId/suspend', [
    param('userId').isUUID().withMessage('Valid user ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    validate
  ], userController.suspendUser.bind(userController));

  router.get('/admin/statistics', userController.getUserStatistics.bind(userController));

  router.post('/admin/batch-update', [
    body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
    body('userIds.*').isUUID().withMessage('All user IDs must be valid UUIDs'),
    body('updates').isObject().withMessage('Updates object is required'),
    validate
  ], userController.batchUpdateUsers.bind(userController));

  router.post('/admin/batch-delete', [
    body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
    body('userIds.*').isUUID().withMessage('All user IDs must be valid UUIDs'),
    validate
  ], userController.batchDeleteUsers.bind(userController));

  return router;
};
