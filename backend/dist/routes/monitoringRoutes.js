"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMonitoringRoutes = void 0;
const express_1 = require("express");
const MonitoringService_1 = require("../services/MonitoringService");
const DatabaseOptimizationService_1 = require("../services/DatabaseOptimizationService");
const CacheService_1 = require("../services/CacheService");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const createMonitoringRoutes = (pool) => {
    const router = (0, express_1.Router)();
    router.use(auth_1.authenticate);
    router.get('/health', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const health = await MonitoringService_1.MonitoringService.performHealthCheck();
        res.json({
            success: true,
            data: health
        });
    }));
    router.get('/metrics', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const metrics = await MonitoringService_1.MonitoringService.getSystemMetrics();
        res.json({
            success: true,
            data: metrics
        });
    }));
    router.get('/alerts', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { limit = 50, type } = req.query;
        const alerts = MonitoringService_1.MonitoringService.getAlerts(parseInt(limit), type);
        res.json({
            success: true,
            data: alerts
        });
    }));
    router.get('/alerts/unresolved', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const alerts = MonitoringService_1.MonitoringService.getUnresolvedAlerts();
        res.json({
            success: true,
            data: alerts
        });
    }));
    router.patch('/alerts/:alertId/resolve', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { alertId } = req.params;
        const resolved = await MonitoringService_1.MonitoringService.resolveAlert(alertId);
        if (resolved) {
            res.json({
                success: true,
                message: 'Alert resolved successfully'
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
    }));
    router.get('/database/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const stats = await DatabaseOptimizationService_1.DatabaseOptimizationService.getDatabaseStats(pool);
        res.json({
            success: true,
            data: stats
        });
    }));
    router.get('/database/indexes', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const analysis = await DatabaseOptimizationService_1.DatabaseOptimizationService.analyzeIndexUsage(pool);
        res.json({
            success: true,
            data: analysis
        });
    }));
    router.get('/cache/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const stats = await CacheService_1.CacheService.getStats();
        res.json({
            success: true,
            data: stats
        });
    }));
    router.delete('/cache/pattern/:pattern', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { pattern } = req.params;
        const cleared = await CacheService_1.CacheService.clearPattern(pattern);
        logger_1.logger.info(`Cache pattern cleared by admin: ${pattern} (${cleared} keys)`);
        res.json({
            success: true,
            message: `Cleared ${cleared} cache entries`,
            data: { cleared }
        });
    }));
    router.patch('/alerts/thresholds', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const thresholds = req.body;
        MonitoringService_1.MonitoringService.updateAlertThresholds(thresholds);
        logger_1.logger.info('Alert thresholds updated by admin', thresholds);
        res.json({
            success: true,
            message: 'Alert thresholds updated successfully',
            data: MonitoringService_1.MonitoringService.getAlertThresholds()
        });
    }));
    router.get('/alerts/thresholds', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const thresholds = MonitoringService_1.MonitoringService.getAlertThresholds();
        res.json({
            success: true,
            data: thresholds
        });
    }));
    router.delete('/alerts/old', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { hours = 24 } = req.query;
        const cleared = MonitoringService_1.MonitoringService.clearOldAlerts(parseInt(hours));
        logger_1.logger.info(`Old alerts cleared by admin: ${cleared} alerts`);
        res.json({
            success: true,
            message: `Cleared ${cleared} old alerts`,
            data: { cleared }
        });
    }));
    router.post('/database/cleanup', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        await DatabaseOptimizationService_1.DatabaseOptimizationService.cleanupOldData(pool);
        logger_1.logger.info('Database cleanup performed by admin');
        res.json({
            success: true,
            message: 'Database cleanup completed successfully'
        });
    }));
    router.get('/performance/report', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const metrics = await MonitoringService_1.MonitoringService.getSystemMetrics();
        res.json({
            success: true,
            data: {
                period: {
                    start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    end: endDate || new Date().toISOString()
                },
                metrics
            }
        });
    }));
    router.post('/alerts/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { type = 'info', service = 'test', message = 'Test alert' } = req.body;
        await MonitoringService_1.MonitoringService.createAlert(type, service, message, { test: true });
        logger_1.logger.info('Test alert created by admin', { type, service, message });
        res.json({
            success: true,
            message: 'Test alert created successfully'
        });
    }));
    return router;
};
exports.createMonitoringRoutes = createMonitoringRoutes;
//# sourceMappingURL=monitoringRoutes.js.map