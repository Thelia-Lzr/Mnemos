"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const logger_1 = require("../utils/logger");
const CacheService_1 = require("./CacheService");
const DatabaseOptimizationService_1 = require("./DatabaseOptimizationService");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
class MonitoringService {
    static startMonitoring() {
        logger_1.logger.info('Starting system monitoring...');
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 30000);
        this.performHealthCheck();
    }
    static stopMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        logger_1.logger.info('System monitoring stopped');
    }
    static async performHealthCheck() {
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
            const health = {
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
                    activeConnections: database_1.pool.totalCount,
                    memoryUsage: this.getMemoryUsagePercentage(),
                    cpuUsage: this.getCPUUsagePercentage(),
                    responseTime: Date.now() - startTime,
                    errorRate: await this.calculateErrorRate()
                }
            };
            await this.checkAlerts(health);
            await CacheService_1.CacheService.set('system_health', health, 60);
            return health;
        }
        catch (error) {
            logger_1.logger.error('Health check failed:', error);
            const criticalHealth = {
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
    static async checkDatabaseHealth() {
        try {
            const startTime = Date.now();
            const dbHealth = await DatabaseOptimizationService_1.DatabaseOptimizationService.healthCheck(database_1.pool);
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
        }
        catch (error) {
            return {
                status: 'critical',
                message: `Database error: ${error instanceof Error ? error.message : String(error)}`,
                lastCheck: new Date().toISOString()
            };
        }
    }
    static async checkRedisHealth() {
        try {
            const startTime = Date.now();
            await redis_1.redisClient.ping();
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
        }
        catch (error) {
            return {
                status: 'critical',
                message: `Redis error: ${error instanceof Error ? error.message : String(error)}`,
                lastCheck: new Date().toISOString()
            };
        }
    }
    static checkMemoryHealth() {
        const memUsage = process.memoryUsage();
        const usedMB = memUsage.heapUsed / 1024 / 1024;
        const totalMB = memUsage.heapTotal / 1024 / 1024;
        const percentage = (usedMB / totalMB) * 100;
        if (percentage > 90) {
            return {
                status: 'critical',
                message: `Critical memory usage: ${percentage.toFixed(1)}%`,
                lastCheck: new Date().toISOString()
            };
        }
        if (percentage > this.alertThresholds.memoryUsage) {
            return {
                status: 'degraded',
                message: `High memory usage: ${percentage.toFixed(1)}%`,
                lastCheck: new Date().toISOString()
            };
        }
        return {
            status: 'healthy',
            message: `Memory usage: ${percentage.toFixed(1)}%`,
            lastCheck: new Date().toISOString()
        };
    }
    static checkCPUHealth() {
        const cpuUsage = process.cpuUsage();
        const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000;
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
    static determineOverallStatus(statuses) {
        if (statuses.includes('critical')) {
            return 'critical';
        }
        if (statuses.includes('degraded')) {
            return 'degraded';
        }
        return 'healthy';
    }
    static getMemoryUsagePercentage() {
        const memUsage = process.memoryUsage();
        return (memUsage.heapUsed / memUsage.heapTotal) * 100;
    }
    static getCPUUsagePercentage() {
        const cpuUsage = process.cpuUsage();
        const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000;
        return Math.min((totalUsage / process.uptime()) * 100, 100);
    }
    static async calculateErrorRate() {
        try {
            return 0.5;
        }
        catch (error) {
            return 0;
        }
    }
    static async checkAlerts(health) {
        if (health.metrics.memoryUsage > this.alertThresholds.memoryUsage) {
            await this.createAlert(health.metrics.memoryUsage > 90 ? 'error' : 'warning', 'memory', `High memory usage: ${health.metrics.memoryUsage.toFixed(1)}%`, { usage: health.metrics.memoryUsage });
        }
        if (health.metrics.cpuUsage > this.alertThresholds.cpuUsage) {
            await this.createAlert(health.metrics.cpuUsage > 90 ? 'error' : 'warning', 'cpu', `High CPU usage: ${health.metrics.cpuUsage.toFixed(1)}%`, { usage: health.metrics.cpuUsage });
        }
        if (health.metrics.responseTime > this.alertThresholds.responseTime) {
            await this.createAlert('warning', 'performance', `Slow response time: ${health.metrics.responseTime}ms`, { responseTime: health.metrics.responseTime });
        }
        if (health.metrics.errorRate > this.alertThresholds.errorRate) {
            await this.createAlert('error', 'errors', `High error rate: ${health.metrics.errorRate.toFixed(1)}%`, { errorRate: health.metrics.errorRate });
        }
    }
    static async createAlert(type, service, message, metadata) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            service,
            message,
            timestamp: new Date().toISOString(),
            resolved: false,
            metadata
        };
        this.alerts.push(alert);
        if (this.alerts.length > this.MAX_ALERTS) {
            this.alerts = this.alerts.slice(-this.MAX_ALERTS);
        }
        const logLevel = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
        logger_1.logger[logLevel](`ALERT [${service}]: ${message}`, metadata);
        const recentAlerts = this.alerts.slice(-50);
        await CacheService_1.CacheService.set('recent_alerts', recentAlerts, 3600);
    }
    static async resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            logger_1.logger.info(`Alert resolved: ${alert.message}`, { alertId });
            return true;
        }
        return false;
    }
    static getAlerts(limit = 50, type) {
        let filteredAlerts = this.alerts;
        if (type) {
            filteredAlerts = this.alerts.filter(alert => alert.type === type);
        }
        return filteredAlerts
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }
    static getUnresolvedAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }
    static async getSystemMetrics() {
        try {
            const [health, dbStats, cacheStats] = await Promise.all([
                CacheService_1.CacheService.get('system_health'),
                DatabaseOptimizationService_1.DatabaseOptimizationService.getDatabaseStats(database_1.pool),
                CacheService_1.CacheService.getStats()
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get system metrics:', error);
            return {
                health: null,
                alerts: [],
                performance: null,
                database: null,
                cache: null
            };
        }
    }
    static updateAlertThresholds(thresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...thresholds };
        logger_1.logger.info('Alert thresholds updated', this.alertThresholds);
    }
    static getAlertThresholds() {
        return { ...this.alertThresholds };
    }
    static clearOldAlerts(olderThanHours = 24) {
        const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
        const initialCount = this.alerts.length;
        this.alerts = this.alerts.filter(alert => new Date(alert.timestamp) > cutoffTime || !alert.resolved);
        const clearedCount = initialCount - this.alerts.length;
        if (clearedCount > 0) {
            logger_1.logger.info(`Cleared ${clearedCount} old alerts`);
        }
        return clearedCount;
    }
}
exports.MonitoringService = MonitoringService;
MonitoringService.alerts = [];
MonitoringService.MAX_ALERTS = 1000;
MonitoringService.healthCheckInterval = null;
MonitoringService.alertThresholds = {
    memoryUsage: 80,
    cpuUsage: 80,
    responseTime: 2000,
    errorRate: 5,
    diskSpace: 90
};
//# sourceMappingURL=MonitoringService.js.map