import { logger } from '../utils/logger';
import { CacheService } from './CacheService';
import { DatabaseOptimizationService } from './DatabaseOptimizationService';
import { pool } from '../config/database';
import { redisClient } from '../config/redis';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    memory: ServiceStatus;
    cpu: ServiceStatus;
  };
  metrics: {
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    errorRate: number;
  };
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  lastCheck: string;
  responseTime?: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: any;
}

export class MonitoringService {
  private static alerts: Alert[] = [];
  private static readonly MAX_ALERTS = 1000;
  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static alertThresholds = {
    memoryUsage: 80, // percentage
    cpuUsage: 80, // percentage
    responseTime: 2000, // milliseconds
    errorRate: 5, // percentage
    diskSpace: 90 // percentage
  };

  // Start monitoring
  static startMonitoring(): void {
    logger.info('Starting system monitoring...');
    
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);

    // Initial health check
    this.performHealthCheck();
  }

  // Stop monitoring
  static stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('System monitoring stopped');
  }

  // Perform comprehensive health check
  static async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      const [dbHealth, redisHealth, memoryHealth, cpuHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkMemoryHealth(),
        this.checkCPUHealth()
      ]);

      const overallStatus = this.determineOverallStatus([
        dbHealth.status,
        redisHealth.status,
        memoryHealth.status,
        cpuHealth.status
      ]);

      const health: SystemHealth = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: dbHealth,
          redis: redisHealth,
          memory: memoryHealth,
          cpu: cpuHealth
        },
        metrics: {
          activeConnections: pool.totalCount,
          memoryUsage: this.getMemoryUsagePercentage(),
          cpuUsage: this.getCPUUsagePercentage(),
          responseTime: Date.now() - startTime,
          errorRate: await this.calculateErrorRate()
        }
      };

      // Check for alerts
      await this.checkAlerts(health);

      // Cache health status
      await CacheService.set('system_health', health, 60);

      return health;
    } catch (error) {
      logger.error('Health check failed:', error);
      
      const criticalHealth: SystemHealth = {
        status: 'critical',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: { status: 'critical', message: 'Health check failed', lastCheck: new Date().toISOString() },
          redis: { status: 'critical', message: 'Health check failed', lastCheck: new Date().toISOString() },
          memory: { status: 'critical', message: 'Health check failed', lastCheck: new Date().toISOString() },
          cpu: { status: 'critical', message: 'Health check failed', lastCheck: new Date().toISOString() }
        },
        metrics: {
          activeConnections: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          responseTime: Date.now() - startTime,
          errorRate: 100
        }
      };

      await this.createAlert('error', 'system', 'System health check failed', { error: error instanceof Error ? error.message : String(error) });
      return criticalHealth;
    }
  }

  // Check database health
  private static async checkDatabaseHealth(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      const dbHealth = await DatabaseOptimizationService.healthCheck(pool);
      const responseTime = Date.now() - startTime;

      if (!dbHealth.healthy) {
        return {
          status: 'critical',
          message: 'Database connection failed',
          lastCheck: new Date().toISOString(),
          responseTime
        };
      }

      if (responseTime > this.alertThresholds.responseTime) {
        return {
          status: 'degraded',
          message: `Slow database response: ${responseTime}ms`,
          lastCheck: new Date().toISOString(),
          responseTime
        };
      }

      return {
        status: 'healthy',
        message: 'Database is healthy',
        lastCheck: new Date().toISOString(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Database error: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  // Check Redis health
  private static async checkRedisHealth(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      await redisClient.ping();
      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return {
          status: 'degraded',
          message: `Slow Redis response: ${responseTime}ms`,
          lastCheck: new Date().toISOString(),
          responseTime
        };
      }

      return {
        status: 'healthy',
        message: 'Redis is healthy',
        lastCheck: new Date().toISOString(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Redis error: ${error instanceof Error ? error.message : String(error)}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  // Check memory health
  private static checkMemoryHealth(): ServiceStatus {
    const memUsage = process.memoryUsage();
    const rssMB = memUsage.rss / 1024 / 1024; // process resident set

    if (rssMB > 1200) {
      return {
        status: 'critical',
        message: `Critical memory usage (RSS): ${rssMB.toFixed(1)} MB`,
        lastCheck: new Date().toISOString()
      };
    }

    if (rssMB > 900) {
      return {
        status: 'degraded',
        message: `High memory usage (RSS): ${rssMB.toFixed(1)} MB`,
        lastCheck: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: `Memory usage (RSS): ${rssMB.toFixed(1)} MB`,
      lastCheck: new Date().toISOString()
    };
  }

  // Check CPU health
  private static checkCPUHealth(): ServiceStatus {
    const cpuUsage = process.cpuUsage();
    const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    const percentage = Math.min((totalUsage / process.uptime()) * 100, 100);

    if (percentage > 90) {
      return {
        status: 'critical',
        message: `Critical CPU usage: ${percentage.toFixed(1)}%`,
        lastCheck: new Date().toISOString()
      };
    }

    if (percentage > this.alertThresholds.cpuUsage) {
      return {
        status: 'degraded',
        message: `High CPU usage: ${percentage.toFixed(1)}%`,
        lastCheck: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: `CPU usage: ${percentage.toFixed(1)}%`,
      lastCheck: new Date().toISOString()
    };
  }

  // Determine overall system status
  private static determineOverallStatus(statuses: string[]): 'healthy' | 'degraded' | 'critical' {
    if (statuses.includes('critical')) {
      return 'critical';
    }
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  // Get memory usage percentage
  private static getMemoryUsagePercentage(): number {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  // Get CPU usage percentage
  private static getCPUUsagePercentage(): number {
    const cpuUsage = process.cpuUsage();
    const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000;
    return Math.min((totalUsage / process.uptime()) * 100, 100);
  }

  // Calculate error rate
  private static async calculateErrorRate(): Promise<number> {
    try {
      // This would typically come from your metrics collection
      // For now, return a mock value
      return 0.5; // 0.5% error rate
    } catch (error) {
      return 0;
    }
  }

  // Check for alerts based on health status
  private static async checkAlerts(health: SystemHealth): Promise<void> {
    // Memory alerts (using RSS MB)
    if (health.metrics.memoryUsage > this.alertThresholds.memoryUsage) {
      await this.createAlert(
        health.metrics.memoryUsage > 1200 ? 'error' : 'warning',
        'memory',
        `High memory usage (RSS): ${health.metrics.memoryUsage.toFixed(1)} MB`,
        { usageMB: health.metrics.memoryUsage }
      );
    }

    // CPU alerts
    if (health.metrics.cpuUsage > this.alertThresholds.cpuUsage) {
      await this.createAlert(
        health.metrics.cpuUsage > 90 ? 'error' : 'warning',
        'cpu',
        `High CPU usage: ${health.metrics.cpuUsage.toFixed(1)}%`,
        { usage: health.metrics.cpuUsage }
      );
    }

    // Response time alerts
    if (health.metrics.responseTime > this.alertThresholds.responseTime) {
      await this.createAlert(
        'warning',
        'performance',
        `Slow response time: ${health.metrics.responseTime}ms`,
        { responseTime: health.metrics.responseTime }
      );
    }

    // Error rate alerts
    if (health.metrics.errorRate > this.alertThresholds.errorRate) {
      await this.createAlert(
        'error',
        'errors',
        `High error rate: ${health.metrics.errorRate.toFixed(1)}%`,
        { errorRate: health.metrics.errorRate }
      );
    }
  }

  // Create alert
  static async createAlert(
    type: 'error' | 'warning' | 'info',
    service: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      service,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);

    // Limit alerts array size
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    // Log alert
    const logLevel = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
    logger[logLevel](`ALERT [${service}]: ${message}`, metadata);

    // Cache recent alerts
    const recentAlerts = this.alerts.slice(-50);
    await CacheService.set('recent_alerts', recentAlerts, 3600);

    // In a real application, you might want to send notifications here
    // await this.sendNotification(alert);
  }

  // Resolve alert
  static async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info(`Alert resolved: ${alert.message}`, { alertId });
      return true;
    }
    return false;
  }

  // Get alerts
  static getAlerts(limit: number = 50, type?: 'error' | 'warning' | 'info'): Alert[] {
    let filteredAlerts = this.alerts;
    
    if (type) {
      filteredAlerts = this.alerts.filter(alert => alert.type === type);
    }

    return filteredAlerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Get unresolved alerts
  static getUnresolvedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Get system metrics
  static async getSystemMetrics(): Promise<{
    health: SystemHealth | null;
    alerts: Alert[];
    performance: any;
    database: any;
    cache: any;
  }> {
    try {
      const [health, dbStats, cacheStats] = await Promise.all([
        CacheService.get<SystemHealth>('system_health'),
        DatabaseOptimizationService.getDatabaseStats(pool),
        CacheService.getStats()
      ]);

      return {
        health,
        alerts: this.getAlerts(20),
        performance: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        database: dbStats,
        cache: cacheStats
      };
    } catch (error) {
      logger.error('Failed to get system metrics:', error);
      return {
        health: null,
        alerts: [],
        performance: null,
        database: null,
        cache: null
      };
    }
  }

  // Update alert thresholds
  static updateAlertThresholds(thresholds: Partial<typeof MonitoringService.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    logger.info('Alert thresholds updated', this.alertThresholds);
  }

  // Get alert thresholds
  static getAlertThresholds(): typeof MonitoringService.alertThresholds {
    return { ...this.alertThresholds };
  }

  // Clear old alerts
  static clearOldAlerts(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > cutoffTime || !alert.resolved
    );

    const clearedCount = initialCount - this.alerts.length;
    if (clearedCount > 0) {
      logger.info(`Cleared ${clearedCount} old alerts`);
    }

    return clearedCount;
  }
}
