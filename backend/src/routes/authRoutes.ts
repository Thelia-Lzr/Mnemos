import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Pool } from 'pg';

export const createAuthRoutes = (db: Pool): Router => {
  const router = Router();
  const authController = new AuthController(db);

  // Register
  router.post('/register', [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('language').optional().isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    body('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid language level'),
    validate
  ], authController.register.bind(authController));

  // Login
  router.post('/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ], authController.login.bind(authController));

  // Refresh token
  router.post('/refresh', [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validate
  ], authController.refreshToken.bind(authController));

  // Logout
  router.post('/logout', authController.logout.bind(authController));

  // Get current user profile (protected)
  router.get('/profile', authenticate, authController.getProfile.bind(authController));

  // Update user preferences (protected)
  router.put('/preferences', authenticate, [
    body('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
    body('notificationsEmail').optional().isBoolean().withMessage('notificationsEmail must be boolean'),
    body('notificationsPush').optional().isBoolean().withMessage('notificationsPush must be boolean'),
    body('practiceReminders').optional().isBoolean().withMessage('practiceReminders must be boolean'),
    body('dailyQuoteEnabled').optional().isBoolean().withMessage('dailyQuoteEnabled must be boolean'),
    body('reviewReminders').optional().isBoolean().withMessage('reviewReminders must be boolean'),
    body('milestoneUpdates').optional().isBoolean().withMessage('milestoneUpdates must be boolean'),
    body('pkInvitations').optional().isBoolean().withMessage('pkInvitations must be boolean'),
    validate
  ], authController.updatePreferences.bind(authController));

  return router;
};
