import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MonitoringService } from '../services/MonitoringService';
import { DatabaseOptimizationService } from '../services/DatabaseOptimizationService';
import { CacheService } from '../services/CacheService';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const createMonitoringRoutes = (pool: Pool): Router => {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authenticate);

  // Get system health
  router.get('/health', asyncHandler(async (req: Request, res: Response) => {
    const health = await MonitoringService.performHealthCheck();
    res.json({
      success: true,
      data: health
    });
  }));

  // Get system metrics
  router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
    const metrics = await MonitoringService.getSystemMetrics();
    res.json({
      success: true,
      data: metrics
    });
  }));

  // Get alerts
  router.get('/alerts', asyncHandler(async (req: Request, res: Response) => {
    const { limit = 50, type } = req.query;
    const alerts = MonitoringService.getAlerts(
      parseInt(limit as string), 
      type as 'error' | 'warning' | 'info'
    );
    
    res.json({
      success: true,
      data: alerts
    });
  }));

  // Get unresolved alerts
  router.get('/alerts/unresolved', asyncHandler(async (req: Request, res: Response) => {
    const alerts = MonitoringService.getUnresolvedAlerts();
    res.json({
      success: true,
      data: alerts
    });
  }));

  // Resolve alert
  router.patch('/alerts/:alertId/resolve', asyncHandler(async (req: Request, res: Response) => {
    const { alertId } = req.params;
    const resolved = await MonitoringService.resolveAlert(alertId);
    
    if (resolved) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
  }));

  // Get database statistics
  router.get('/database/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await DatabaseOptimizationService.getDatabaseStats(pool);
    res.json({
      success: true,
      data: stats
    });
  }));

  // Get database index analysis
  router.get('/database/indexes', asyncHandler(async (req: Request, res: Response) => {
    const analysis = await DatabaseOptimizationService.analyzeIndexUsage(pool);
    res.json({
      success: true,
      data: analysis
    });
  }));

  // Get cache statistics
  router.get('/cache/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await CacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  }));

  // Clear cache pattern
  router.delete('/cache/pattern/:pattern', asyncHandler(async (req: Request, res: Response) => {
    const { pattern } = req.params;
    const cleared = await CacheService.clearPattern(pattern);
    
    logger.info(`Cache pattern cleared by admin: ${pattern} (${cleared} keys)`);
    
    res.json({
      success: true,
      message: `Cleared ${cleared} cache entries`,
      data: { cleared }
    });
  }));

  // Update alert thresholds
  router.patch('/alerts/thresholds', asyncHandler(async (req: Request, res: Response) => {
    const thresholds = req.body;
    MonitoringService.updateAlertThresholds(thresholds);
    
    logger.info('Alert thresholds updated by admin', thresholds);
    
    res.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      data: MonitoringService.getAlertThresholds()
    });
  }));

  // Get alert thresholds
  router.get('/alerts/thresholds', asyncHandler(async (req: Request, res: Response) => {
    const thresholds = MonitoringService.getAlertThresholds();
    res.json({
      success: true,
      data: thresholds
    });
  }));

  // Clear old alerts
  router.delete('/alerts/old', asyncHandler(async (req: Request, res: Response) => {
    const { hours = 24 } = req.query;
    const cleared = MonitoringService.clearOldAlerts(parseInt(hours as string));
    
    logger.info(`Old alerts cleared by admin: ${cleared} alerts`);
    
    res.json({
      success: true,
      message: `Cleared ${cleared} old alerts`,
      data: { cleared }
    });
  }));

  // Cleanup old database data
  router.post('/database/cleanup', asyncHandler(async (req: Request, res: Response) => {
    await DatabaseOptimizationService.cleanupOldData(pool);
    
    logger.info('Database cleanup performed by admin');
    
    res.json({
      success: true,
      message: 'Database cleanup completed successfully'
    });
  }));

  // Get performance report
  router.get('/performance/report', asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    // This would typically generate a comprehensive performance report
    // For now, return current metrics
    const metrics = await MonitoringService.getSystemMetrics();
    
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

  // Test alert system
  router.post('/alerts/test', asyncHandler(async (req: Request, res: Response) => {
    const { type = 'info', service = 'test', message = 'Test alert' } = req.body;
    
    await MonitoringService.createAlert(type, service, message, { test: true });
    
    logger.info('Test alert created by admin', { type, service, message });
    
    res.json({
      success: true,
      message: 'Test alert created successfully'
    });
  }));

  return router;
};
