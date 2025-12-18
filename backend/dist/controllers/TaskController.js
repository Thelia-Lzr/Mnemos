"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const AsyncTaskManager_1 = require("../services/AsyncTaskManager");
const TaskResultManager_1 = require("../services/TaskResultManager");
const TaskQueueManager_1 = require("../services/TaskQueueManager");
const express_validator_1 = require("express-validator");
class TaskController {
    constructor() {
        this.asyncTaskManager = AsyncTaskManager_1.AsyncTaskManager.getInstance();
        this.taskResultManager = TaskResultManager_1.TaskResultManager.getInstance();
        this.taskQueueManager = TaskQueueManager_1.TaskQueueManager.getInstance();
        this.getUserTasks = this.getUserTasks.bind(this);
        this.getTaskStatus = this.getTaskStatus.bind(this);
        this.getTaskResult = this.getTaskResult.bind(this);
        this.cancelTask = this.cancelTask.bind(this);
        this.retryTask = this.retryTask.bind(this);
        this.getQueueStatus = this.getQueueStatus.bind(this);
        this.getBatchStatus = this.getBatchStatus.bind(this);
        this.cancelBatchTasks = this.cancelBatchTasks.bind(this);
        this.getTaskStats = this.getTaskStats.bind(this);
        this.getUserTaskResults = this.getUserTaskResults.bind(this);
    }
    async getUserTasks(req, res, next) {
        try {
            const userId = req.user.id;
            const { status, limit = 50, offset = 0 } = req.query;
            let tasks;
            if (status === 'active') {
                tasks = await this.asyncTaskManager.getUserActiveTasks(userId);
            }
            else if (status === 'completed') {
                tasks = await this.asyncTaskManager.getUserCompletedTasks(userId);
            }
            else {
                tasks = await this.asyncTaskManager.getUserTasks(userId);
            }
            const paginatedTasks = tasks.slice(Number(offset), Number(offset) + Number(limit));
            res.status(200).json({
                success: true,
                data: {
                    tasks: paginatedTasks,
                    total: tasks.length,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTaskStatus(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { taskId } = req.params;
            const userId = req.user.id;
            const taskStatus = await this.asyncTaskManager.getTaskStatus(taskId);
            if (!taskStatus) {
                res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
                return;
            }
            let result = null;
            if (taskStatus.status === 'completed') {
                const taskResult = await this.asyncTaskManager.getTaskResult(taskId);
                result = taskResult?.result;
            }
            res.status(200).json({
                success: true,
                data: {
                    ...taskStatus,
                    result
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTaskResult(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { taskId } = req.params;
            const userId = req.user.id;
            const taskResult = await this.asyncTaskManager.getTaskResult(taskId);
            if (!taskResult) {
                res.status(404).json({
                    success: false,
                    message: 'Task result not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: taskResult
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelTask(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { taskId } = req.params;
            const userId = req.user.id;
            const taskStatus = await this.asyncTaskManager.getTaskStatus(taskId);
            if (!taskStatus) {
                res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
                return;
            }
            const cancelled = await this.asyncTaskManager.cancelTask(taskId);
            if (cancelled) {
                res.status(200).json({
                    success: true,
                    message: 'Task cancelled successfully'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Task could not be cancelled'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async retryTask(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { taskId } = req.params;
            const userId = req.user.id;
            const taskStatus = await this.asyncTaskManager.getTaskStatus(taskId);
            if (!taskStatus) {
                res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
                return;
            }
            const retried = await this.asyncTaskManager.retryTask(taskId);
            if (retried) {
                res.status(200).json({
                    success: true,
                    message: 'Task retried successfully'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Task could not be retried'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getQueueStatus(req, res, next) {
        try {
            const queueMetrics = await this.asyncTaskManager.getQueueMetrics();
            res.status(200).json({
                success: true,
                data: queueMetrics
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getBatchStatus(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { taskIds } = req.body;
            const userId = req.user.id;
            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'taskIds must be a non-empty array'
                });
                return;
            }
            const statuses = await this.asyncTaskManager.getBatchTaskStatus(taskIds);
            res.status(200).json({
                success: true,
                data: statuses
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelBatchTasks(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { taskIds } = req.body;
            const userId = req.user.id;
            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'taskIds must be a non-empty array'
                });
                return;
            }
            const results = await this.asyncTaskManager.cancelBatchTasks(taskIds);
            res.status(200).json({
                success: true,
                data: {
                    results,
                    cancelled: results.filter((r) => r).length,
                    total: taskIds.length
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTaskStats(req, res, next) {
        try {
            const userId = req.user.id;
            const stats = await this.taskResultManager.getTaskResultStats(userId);
            res.status(200).json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserTaskResults(req, res, next) {
        try {
            const userId = req.user.id;
            const { limit = 20, offset = 0, success } = req.query;
            let results;
            if (success === 'true') {
                results = await this.taskResultManager.getUserSuccessfulResults(userId, Number(limit));
            }
            else if (success === 'false') {
                results = await this.taskResultManager.getUserFailedResults(userId, Number(limit));
            }
            else {
                results = await this.taskResultManager.getUserTaskResults(userId, Number(limit), Number(offset));
            }
            res.status(200).json({
                success: true,
                data: {
                    results,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TaskController = TaskController;
TaskController.validateTaskId = [
    (0, express_validator_1.param)('taskId').isUUID().withMessage('Task ID must be a valid UUID')
];
TaskController.validateBatchRequest = [
    (0, express_validator_1.body)('taskIds').isArray({ min: 1, max: 50 }).withMessage('taskIds must be an array with 1-50 items'),
    (0, express_validator_1.body)('taskIds.*').isUUID().withMessage('Each task ID must be a valid UUID')
];
TaskController.validatePagination = [
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];
//# sourceMappingURL=TaskController.js.map