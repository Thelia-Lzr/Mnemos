import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Package management
router.get('/packages', adminController.getPackages.bind(adminController));
router.post('/packages', adminController.createPackage.bind(adminController));
router.put('/packages/:id', adminController.updatePackage.bind(adminController));
router.delete('/packages/:id', adminController.deletePackage.bind(adminController));

// User management
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:userId', adminController.getUserDetails.bind(adminController));

// User credit management
router.get('/users/:userId/credits', adminController.getUserCredits.bind(adminController));
router.post('/users/:userId/credits/adjust', adminController.adjustUserCredits.bind(adminController));
router.get('/credit-statistics', adminController.getCreditStatistics.bind(adminController));

// System statistics
router.get('/statistics', adminController.getStatistics.bind(adminController));
router.get('/revenue-stats', adminController.getRevenueStats.bind(adminController));
router.get('/usage-stats', adminController.getUsageStats.bind(adminController));
router.get('/user-stats', adminController.getUserStats.bind(adminController));

// Task queue management
router.get('/queue-metrics', adminController.getQueueMetrics.bind(adminController));
router.get('/tasks', adminController.getAllTasks.bind(adminController));
router.get('/failed-tasks', adminController.getFailedTasks.bind(adminController));
router.post('/retry-failed-tasks', adminController.retryFailedTasks.bind(adminController));
router.post('/clear-queue', adminController.clearQueue.bind(adminController));

// OpenRouter API key management
router.get('/openrouter/config', adminController.getOpenRouterConfig.bind(adminController));
router.post('/openrouter/test-key', adminController.testOpenRouterKey.bind(adminController));
router.put('/openrouter/config', adminController.updateOpenRouterConfig.bind(adminController));
router.get('/openrouter/usage-stats', adminController.getOpenRouterUsageStats.bind(adminController));
router.get('/openrouter/models', adminController.getOpenRouterModels.bind(adminController));

export default router;
