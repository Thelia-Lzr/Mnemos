"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.startPerformanceMonitoring = exports.getHealthMetrics = exports.cpuMonitor = exports.memoryMonitor = exports.performanceMonitor = void 0;
const logger_1 = require("../utils/logger");
class PerformanceMonitor {
    static addMetric(metric) {
        this.metrics.push(metric);
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }
    }
    static getMetrics(limit = 100) {
        return this.metrics.slice(-limit);
    }
    static getAverageResponseTime(endpoint) {
        let filteredMetrics = this.metrics;
        if (endpoint) {
            filteredMetrics = this.metrics.filter(m => m.endpoint === endpoint);
        }
        if (filteredMetrics.length === 0)
            return 0;
        const totalDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
        return totalDuration / filteredMetrics.length;
    }
    static getSlowRequests(threshold = 1000) {
        return this.metrics.filter(m => m.duration > threshold);
    }
    static clearMetrics() {
        this.metrics = [];
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
PerformanceMonitor.metrics = [];
PerformanceMonitor.MAX_METRICS = 1000;
const performanceMonitor = (req, res, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();
        const metric = {
            endpoint: req.route?.path || req.path,
            method: req.method,
            duration,
            statusCode: res.statusCode,
            memoryUsage: {
                rss: endMemory.rss - startMemory.rss,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                external: endMemory.external - startMemory.external,
                arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
            },
            timestamp: new Date()
        };
        PerformanceMonitor.addMetric(metric);
        if (duration > 1000) {
            logger_1.logger.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`, {
                duration,
                endpoint: req.path,
                method: req.method,
                statusCode: res.statusCode,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });
        }
        const userId = req.user?.id || 'anonymous';
        (0, logger_1.logAPIUsage)(req.path, userId, duration);
        return originalEnd(chunk, encoding);
    };
    next();
};
exports.performanceMonitor = performanceMonitor;
const memoryMonitor = () => {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };
    logger_1.logger.info('Memory Usage:', {
        rss: formatBytes(usage.rss),
        heapTotal: formatBytes(usage.heapTotal),
        heapUsed: formatBytes(usage.heapUsed),
        external: formatBytes(usage.external),
        arrayBuffers: formatBytes(usage.arrayBuffers)
    });
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) {
        logger_1.logger.warn(`High memory usage detected: ${formatBytes(usage.heapUsed)}`);
    }
};
exports.memoryMonitor = memoryMonitor;
const cpuMonitor = () => {
    const usage = process.cpuUsage();
    const formatMicroseconds = (microseconds) => {
        return (microseconds / 1000).toFixed(2) + ' ms';
    };
    logger_1.logger.info('CPU Usage:', {
        user: formatMicroseconds(usage.user),
        system: formatMicroseconds(usage.system)
    });
};
exports.cpuMonitor = cpuMonitor;
const getHealthMetrics = () => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    return {
        uptime: process.uptime(),
        memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: {
            user: Math.round(cpuUsage.user / 1000),
            system: Math.round(cpuUsage.system / 1000)
        },
        performance: {
            averageResponseTime: PerformanceMonitor.getAverageResponseTime(),
            slowRequests: PerformanceMonitor.getSlowRequests().length,
            totalRequests: PerformanceMonitor.getMetrics().length
        },
        timestamp: new Date().toISOString()
    };
};
exports.getHealthMetrics = getHealthMetrics;
const startPerformanceMonitoring = () => {
    setInterval(exports.memoryMonitor, 5 * 60 * 1000);
    setInterval(exports.cpuMonitor, 10 * 60 * 1000);
    setInterval(() => {
        PerformanceMonitor.clearMetrics();
    }, 60 * 60 * 1000);
    logger_1.logger.info('Performance monitoring started');
};
exports.startPerformanceMonitoring = startPerformanceMonitoring;
//# sourceMappingURL=performance.js.map