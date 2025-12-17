/// <reference types="node" />
import { Request, Response, NextFunction } from 'express';
interface PerformanceMetrics {
    endpoint: string;
    method: string;
    duration: number;
    statusCode: number;
    memoryUsage: NodeJS.MemoryUsage;
    timestamp: Date;
}
declare class PerformanceMonitor {
    private static metrics;
    private static readonly MAX_METRICS;
    static addMetric(metric: PerformanceMetrics): void;
    static getMetrics(limit?: number): PerformanceMetrics[];
    static getAverageResponseTime(endpoint?: string): number;
    static getSlowRequests(threshold?: number): PerformanceMetrics[];
    static clearMetrics(): void;
}
export declare const performanceMonitor: (req: Request, res: Response, next: NextFunction) => void;
export declare const memoryMonitor: () => void;
export declare const cpuMonitor: () => void;
export declare const getHealthMetrics: () => {
    uptime: number;
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    cpu: {
        user: number;
        system: number;
    };
    performance: {
        averageResponseTime: number;
        slowRequests: number;
        totalRequests: number;
    };
    timestamp: string;
};
export declare const startPerformanceMonitoring: () => void;
export { PerformanceMonitor };
//# sourceMappingURL=performance.d.ts.map