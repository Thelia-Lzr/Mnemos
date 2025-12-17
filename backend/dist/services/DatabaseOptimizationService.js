"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseOptimizationService = void 0;
const logger_1 = require("../utils/logger");
const CacheService_1 = require("./CacheService");
class DatabaseOptimizationService {
    static optimizePool(pool) {
        pool.on('connect', (client) => {
            logger_1.logger.debug('New database connection established');
        });
        pool.on('acquire', (client) => {
            logger_1.logger.debug('Database connection acquired from pool');
        });
        pool.on('error', (err) => {
            logger_1.logger.error('Database pool error:', err);
        });
        pool.on('remove', (client) => {
            logger_1.logger.debug('Database connection removed from pool');
        });
    }
    static async executeQuery(pool, query, params = [], cacheKey, cacheTTL = 300) {
        const startTime = Date.now();
        try {
            if (cacheKey) {
                const cached = await CacheService_1.CacheService.get(cacheKey);
                if (cached !== null) {
                    logger_1.logger.debug(`Query cache hit: ${cacheKey}`);
                    return cached;
                }
            }
            const result = await pool.query(query, params);
            const duration = Date.now() - startTime;
            if (duration > 1000) {
                logger_1.logger.warn(`Slow query detected: ${duration}ms`, {
                    query: query.substring(0, 100) + '...',
                    duration,
                    params: params.length
                });
            }
            if (cacheKey && result.rows) {
                await CacheService_1.CacheService.set(cacheKey, result.rows, cacheTTL);
                logger_1.logger.debug(`Query result cached: ${cacheKey}`);
            }
            logger_1.logger.debug(`Query executed: ${duration}ms`);
            return result.rows;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error(`Query failed after ${duration}ms:`, {
                error,
                query: query.substring(0, 100) + '...',
                params: params.length
            });
            throw error;
        }
    }
    static async executePreparedQuery(pool, name, query, params = []) {
        const startTime = Date.now();
        try {
            if (!this.queryCache.has(name)) {
                await pool.query(`PREPARE ${name} AS ${query}`);
                this.queryCache.set(name, query);
                if (this.queryCache.size > this.QUERY_CACHE_SIZE) {
                    const firstKey = this.queryCache.keys().next().value;
                    if (firstKey) {
                        this.queryCache.delete(firstKey);
                    }
                }
                logger_1.logger.debug(`Prepared statement cached: ${name}`);
            }
            const paramPlaceholders = params.length > 0 ? params.map((_, i) => `$${i + 1}`).join(',') : '';
            const result = await pool.query(`EXECUTE ${name}(${paramPlaceholders})`, params);
            const duration = Date.now() - startTime;
            logger_1.logger.debug(`Prepared query executed: ${duration}ms`);
            return result.rows;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error(`Prepared query failed after ${duration}ms:`, {
                error,
                name,
                params: params.length
            });
            throw error;
        }
    }
    static async executeBatch(pool, queries) {
        const startTime = Date.now();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const results = [];
            for (const { query, params } of queries) {
                const result = await client.query(query, params);
                results.push(result.rows);
            }
            await client.query('COMMIT');
            const duration = Date.now() - startTime;
            logger_1.logger.debug(`Batch operation completed: ${duration}ms (${queries.length} queries)`);
            return results;
        }
        catch (error) {
            await client.query('ROLLBACK');
            const duration = Date.now() - startTime;
            logger_1.logger.error(`Batch operation failed after ${duration}ms:`, {
                error,
                queryCount: queries.length
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async healthCheck(pool) {
        try {
            const startTime = Date.now();
            await pool.query('SELECT 1');
            const duration = Date.now() - startTime;
            const healthy = duration < 1000;
            return {
                healthy,
                totalConnections: pool.totalCount,
                idleConnections: pool.idleCount,
                waitingClients: pool.waitingCount
            };
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return {
                healthy: false,
                totalConnections: pool.totalCount,
                idleConnections: pool.idleCount,
                waitingClients: pool.waitingCount
            };
        }
    }
    static analyzeQuery(query) {
        const suggestions = [];
        let score = 100;
        if (query.includes('SELECT *')) {
            suggestions.push('Avoid SELECT *, specify only needed columns');
            score -= 20;
        }
        if ((query.includes('UPDATE') || query.includes('DELETE')) && !query.includes('WHERE')) {
            suggestions.push('Add WHERE clause to UPDATE/DELETE statements');
            score -= 30;
        }
        if (query.includes("LIKE '%")) {
            suggestions.push('Avoid LIKE with leading wildcard, consider full-text search');
            score -= 15;
        }
        if (query.includes('ORDER BY') && !query.includes('LIMIT')) {
            suggestions.push('Consider adding LIMIT to ORDER BY queries');
            score -= 10;
        }
        if (query.includes('IN (SELECT')) {
            suggestions.push('Consider using JOIN instead of IN (SELECT)');
            score -= 10;
        }
        if (/WHERE.*\w+\(/.test(query)) {
            suggestions.push('Avoid functions in WHERE clause, consider functional indexes');
            score -= 15;
        }
        return { suggestions, score };
    }
    static async analyzeIndexUsage(pool) {
        try {
            const unusedIndexesQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
      `;
            const unusedIndexes = await pool.query(unusedIndexesQuery);
            const tableScansQuery = `
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch
        FROM pg_stat_user_tables 
        WHERE seq_scan > idx_scan AND seq_tup_read > 1000
      `;
            const tableScans = await pool.query(tableScansQuery);
            const missingIndexes = tableScans.rows.map(row => `Consider adding index to ${row.schemaname}.${row.tablename} (${row.seq_scan} seq scans)`);
            const totalScans = tableScans.rows.reduce((sum, row) => sum + row.seq_scan + row.idx_scan, 0);
            const indexScans = tableScans.rows.reduce((sum, row) => sum + row.idx_scan, 0);
            const indexEfficiency = totalScans > 0 ? (indexScans / totalScans) * 100 : 100;
            return {
                unusedIndexes: unusedIndexes.rows,
                missingIndexes,
                indexEfficiency
            };
        }
        catch (error) {
            logger_1.logger.error('Index analysis failed:', error);
            return {
                unusedIndexes: [],
                missingIndexes: [],
                indexEfficiency: 0
            };
        }
    }
    static async getDatabaseStats(pool) {
        try {
            const connectionStats = await pool.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
      `);
            const queryStats = await pool.query(`
        SELECT 
          calls,
          total_time,
          mean_time,
          query
        FROM pg_stat_statements 
        ORDER BY total_time DESC 
        LIMIT 10
      `);
            const tableStats = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          seq_scan,
          idx_scan
        FROM pg_stat_user_tables
        ORDER BY seq_scan + idx_scan DESC
        LIMIT 10
      `);
            const cacheHitQuery = await pool.query(`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables
      `);
            const cacheHitRatio = cacheHitQuery.rows[0]?.cache_hit_ratio || 0;
            return {
                connectionStats: connectionStats.rows[0],
                queryStats: queryStats.rows,
                tableStats: tableStats.rows,
                cacheHitRatio: parseFloat(cacheHitRatio)
            };
        }
        catch (error) {
            logger_1.logger.error('Database stats collection failed:', error);
            return {
                connectionStats: {},
                queryStats: [],
                tableStats: [],
                cacheHitRatio: 0
            };
        }
    }
    static async cleanupOldData(pool) {
        try {
            const cleanupQueries = [
                {
                    query: 'DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL \'30 days\'',
                    params: []
                },
                {
                    query: 'DELETE FROM practice_sessions WHERE created_at < NOW() - INTERVAL \'90 days\'',
                    params: []
                },
                {
                    query: 'DELETE FROM task_results WHERE created_at < NOW() - INTERVAL \'7 days\'',
                    params: []
                }
            ];
            for (const { query, params } of cleanupQueries) {
                const result = await pool.query(query, params);
                logger_1.logger.info(`Cleanup completed: ${result.rowCount} rows deleted`, { query: query.substring(0, 50) });
            }
        }
        catch (error) {
            logger_1.logger.error('Data cleanup failed:', error);
        }
    }
}
exports.DatabaseOptimizationService = DatabaseOptimizationService;
DatabaseOptimizationService.queryCache = new Map();
DatabaseOptimizationService.QUERY_CACHE_SIZE = 100;
//# sourceMappingURL=DatabaseOptimizationService.js.map