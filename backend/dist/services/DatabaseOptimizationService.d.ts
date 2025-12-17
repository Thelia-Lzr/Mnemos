import { Pool } from 'pg';
export declare class DatabaseOptimizationService {
    private static queryCache;
    private static readonly QUERY_CACHE_SIZE;
    static optimizePool(pool: Pool): void;
    static executeQuery<T>(pool: Pool, query: string, params?: any[], cacheKey?: string, cacheTTL?: number): Promise<T>;
    static executePreparedQuery<T>(pool: Pool, name: string, query: string, params?: any[]): Promise<T>;
    static executeBatch<T>(pool: Pool, queries: Array<{
        query: string;
        params: any[];
    }>): Promise<T[]>;
    static healthCheck(pool: Pool): Promise<{
        healthy: boolean;
        totalConnections: number;
        idleConnections: number;
        waitingClients: number;
    }>;
    static analyzeQuery(query: string): {
        suggestions: string[];
        score: number;
    };
    static analyzeIndexUsage(pool: Pool): Promise<{
        unusedIndexes: any[];
        missingIndexes: string[];
        indexEfficiency: number;
    }>;
    static getDatabaseStats(pool: Pool): Promise<{
        connectionStats: any;
        queryStats: any;
        tableStats: any;
        cacheHitRatio: number;
    }>;
    static cleanupOldData(pool: Pool): Promise<void>;
}
//# sourceMappingURL=DatabaseOptimizationService.d.ts.map