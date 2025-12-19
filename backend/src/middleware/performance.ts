import { Request, Response, NextFunction } from 'express';
import { logger, logAPIUsage } from '../utils/logger';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
}

class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000;

  static addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only the latest metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  static getMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  static getAverageResponseTime(endpoint?: string): number {
    let filteredMetrics = this.metrics;
    
    if (endpoint) {
      filteredMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    }

    if (filteredMetrics.length === 0) return 0;

    const totalDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / filteredMetrics.length;
  }

  static getSlowRequests(threshold: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  static clearMetrics() {
    this.metrics = [];
  }
}

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any): Response {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage();

    // Log performance metrics
    const metric: PerformanceMetrics = {
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

    // Log slow requests
    if (duration > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`, {
        duration,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }

    // Log API usage
    const userId = (req as any).user?.id || 'anonymous';
    logAPIUsage(req.path, userId, duration);

    // Call original end method
    return originalEnd(chunk, encoding);
  };

  next();
};

// Memory usage monitoring
export const memoryMonitor = () => {
  const usage = process.memoryUsage();
  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  logger.info('Memory Usage:', {
    rss: formatBytes(usage.rss),
    external: formatBytes(usage.external),
    arrayBuffers: formatBytes(usage.arrayBuffers)
  });

  // Alert if RSS is high (overall process memory)
  const rssMB = usage.rss / 1024 / 1024;
  if (rssMB > 800) { // Alert if RSS > ~800MB
    logger.warn(`High memory usage detected (RSS): ${formatBytes(usage.rss)}`);
  }
};

// CPU usage monitoring
export const cpuMonitor = () => {
  const usage = process.cpuUsage();
  const formatMicroseconds = (microseconds: number) => {
    return (microseconds / 1000).toFixed(2) + ' ms';
  };

  logger.info('CPU Usage:', {
    user: formatMicroseconds(usage.user),
    system: formatMicroseconds(usage.system)
  });
};

// Health check endpoint data
export const getHealthMetrics = () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
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

// Start monitoring intervals
export const startPerformanceMonitoring = () => {
  // Monitor memory every 5 minutes
  setInterval(memoryMonitor, 5 * 60 * 1000);
  
  // Monitor CPU every 10 minutes
  setInterval(cpuMonitor, 10 * 60 * 1000);
  
  // Clear old metrics every hour
  setInterval(() => {
    PerformanceMonitor.clearMetrics();
  }, 60 * 60 * 1000);

  logger.info('Performance monitoring started');
};

export { PerformanceMonitor };
