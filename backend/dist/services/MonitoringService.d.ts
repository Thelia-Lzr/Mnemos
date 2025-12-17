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
export declare class MonitoringService {
    private static alerts;
    private static readonly MAX_ALERTS;
    private static healthCheckInterval;
    private static alertThresholds;
    static startMonitoring(): void;
    static stopMonitoring(): void;
    static performHealthCheck(): Promise<SystemHealth>;
    private static checkDatabaseHealth;
    private static checkRedisHealth;
    private static checkMemoryHealth;
    private static checkCPUHealth;
    private static determineOverallStatus;
    private static getMemoryUsagePercentage;
    private static getCPUUsagePercentage;
    private static calculateErrorRate;
    private static checkAlerts;
    static createAlert(type: 'error' | 'warning' | 'info', service: string, message: string, metadata?: any): Promise<void>;
    static resolveAlert(alertId: string): Promise<boolean>;
    static getAlerts(limit?: number, type?: 'error' | 'warning' | 'info'): Alert[];
    static getUnresolvedAlerts(): Alert[];
    static getSystemMetrics(): Promise<{
        health: SystemHealth | null;
        alerts: Alert[];
        performance: any;
        database: any;
        cache: any;
    }>;
    static updateAlertThresholds(thresholds: Partial<typeof MonitoringService.alertThresholds>): void;
    static getAlertThresholds(): typeof MonitoringService.alertThresholds;
    static clearOldAlerts(olderThanHours?: number): number;
}
export {};
//# sourceMappingURL=MonitoringService.d.ts.map