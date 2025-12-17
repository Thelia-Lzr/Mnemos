import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticate } from '../middleware/auth';

const router = Router();
const taskController = new TaskController();

// All task routes require authentication
router.use(authenticate);

// Task queries
router.get('/user', TaskController.validatePagination, taskController.getUserTasks);
router.get('/status/:taskId', TaskController.validateTaskId, taskController.getTaskStatus);
router.get('/result/:taskId', TaskController.validateTaskId, taskController.getTaskResult);

// Task management
router.post('/cancel/:taskId', TaskController.validateTaskId, taskController.cancelTask);
router.post('/retry/:taskId', TaskController.validateTaskId, taskController.retryTask);
router.get('/queue-status', taskController.getQueueStatus);

// Batch operations
router.post('/batch-status', TaskController.validateBatchRequest, taskController.getBatchStatus);
router.post('/batch-cancel', TaskController.validateBatchRequest, taskController.cancelBatchTasks);

// Task statistics and results
router.get('/stats', taskController.getTaskStats);
router.get('/results', TaskController.validatePagination, taskController.getUserTaskResults);

export default router;
