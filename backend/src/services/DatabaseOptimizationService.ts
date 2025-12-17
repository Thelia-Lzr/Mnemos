import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';

export class DatabaseOptimizationService {
  private static queryCache = new Map<string, any>();
  private static readonly QUERY_CACHE_SIZE = 100;

  // Connection pooling optimization
  static optimizePool(pool: Pool): void {
    // Monitor pool events
    pool.on('connect', (client: PoolClient) => {
      logger.debug('New database connection established');
    });

    pool.on('acquire', (client: PoolClient) => {
      logger.debug('Database connection acquired from pool');
    });

    pool.on('error', (err: Error) => {
      logger.error('Database pool error:', err);
    });

    pool.on('remove', (client: PoolClient) => {
      logger.debug('Database connection removed from pool');
    });
  }

  // Query performance monitoring
  static async executeQuery<T>(
    pool: Pool, 
    query: string, 
    params: any[] = [],
    cacheKey?: string,
    cacheTTL: number = 300
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Check cache first if cache key provided
      if (cacheKey) {
        const cached = await CacheService.get<T>(cacheKey);
        if (cached !== null) {
          logger.debug(`Query cache hit: ${cacheKey}`);
          return cached;
        }
      }

      // Execute query
      const result = await pool.query(query, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > 1000) {
        logger.warn(`Slow query detected: ${duration}ms`, {
          query: query.substring(0, 100) + '...',
          duration,
          params: params.length
        });
      }

      // Cache result if cache key provided
      if (cacheKey && result.rows) {
        await CacheService.set(cacheKey, result.rows, cacheTTL);
        logger.debug(`Query result cached: ${cacheKey}`);
      }

      logger.debug(`Query executed: ${duration}ms`);
      return result.rows as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query failed after ${duration}ms:`, {
        error,
        query: query.substring(0, 100) + '...',
        params: params.length
      });
      throw error;
    }
  }

  // Prepared statement cache
  static async executePreparedQuery<T>(
    pool: Pool,
    name: string,
    query: string,
    params: any[] = []
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Check if prepared statement exists in cache
      if (!this.queryCache.has(name)) {
        // Prepare the statement
        await pool.query(`PREPARE ${name} AS ${query}`);
        this.queryCache.set(name, query);
        
        // Limit cache size
        if (this.queryCache.size > this.QUERY_CACHE_SIZE) {
          const firstKey = this.queryCache.keys().next().value;
          if (firstKey) {
            this.queryCache.delete(firstKey);
          }
        }
        
        logger.debug(`Prepared statement cached: ${name}`);
      }

      // Execute prepared statement
      const paramPlaceholders = params.length > 0 ? params.map((_, i) => `$${i + 1}`).join(',') : '';
      const result = await pool.query(`EXECUTE ${name}(${paramPlaceholders})`, params);
      const duration = Date.now() - startTime;

      logger.debug(`Prepared query executed: ${duration}ms`);
      return result.rows as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Prepared query failed after ${duration}ms:`, {
        error,
        name,
        params: params.length
      });
      throw error;
    }
  }

  // Batch operations
  static async executeBatch<T>(
    pool: Pool,
    queries: Array<{ query: string; params: any[] }>
  ): Promise<T[]> {
    const startTime = Date.now();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results: T[] = [];
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result.rows as T);
      }
      
      await client.query('COMMIT');
      
      const duration = Date.now() - startTime;
      logger.debug(`Batch operation completed: ${duration}ms (${queries.length} queries)`);
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      logger.error(`Batch operation failed after ${duration}ms:`, {
        error,
        queryCount: queries.length
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // Connection health check
  static async healthCheck(pool: Pool): Promise<{
    healthy: boolean;
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  }> {
    try {
      const startTime = Date.now();
      await pool.query('SELECT 1');
      const duration = Date.now() - startTime;

      const healthy = duration < 1000; // Consider healthy if response < 1s

      return {
        healthy,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        healthy: false,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      };
    }
  }

  // Query optimization suggestions
  static analyzeQuery(query: string): {
    suggestions: string[];
    score: number;
  } {
    const suggestions: string[] = [];
    let score = 100;

    // Check for SELECT *
    if (query.includes('SELECT *')) {
      suggestions.push('Avoid SELECT *, specify only needed columns');
      score -= 20;
    }

    // Check for missing WHERE clause in UPDATE/DELETE
    if ((query.includes('UPDATE') || query.includes('DELETE')) && !query.includes('WHERE')) {
      suggestions.push('Add WHERE clause to UPDATE/DELETE statements');
      score -= 30;
    }

    // Check for LIKE with leading wildcard
    if (query.includes("LIKE '%")) {
      suggestions.push('Avoid LIKE with leading wildcard, consider full-text search');
      score -= 15;
    }

    // Check for ORDER BY without LIMIT
    if (query.includes('ORDER BY') && !query.includes('LIMIT')) {
      suggestions.push('Consider adding LIMIT to ORDER BY queries');
      score -= 10;
    }

    // Check for subqueries that could be JOINs
    if (query.includes('IN (SELECT')) {
      suggestions.push('Consider using JOIN instead of IN (SELECT)');
      score -= 10;
    }

    // Check for functions in WHERE clause
    if (/WHERE.*\w+\(/.test(query)) {
      suggestions.push('Avoid functions in WHERE clause, consider functional indexes');
      score -= 15;
    }

    return { suggestions, score };
  }

  // Index usage analysis
  static async analyzeIndexUsage(pool: Pool): Promise<{
    unusedIndexes: any[];
    missingIndexes: string[];
    indexEfficiency: number;
  }> {
    try {
      // Get unused indexes
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

      // Get table scans that might benefit from indexes
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
      
      const missingIndexes = tableScans.rows.map(row => 
        `Consider adding index to ${row.schemaname}.${row.tablename} (${row.seq_scan} seq scans)`
      );

      // Calculate index efficiency
      const totalScans = tableScans.rows.reduce((sum, row) => sum + row.seq_scan + row.idx_scan, 0);
      const indexScans = tableScans.rows.reduce((sum, row) => sum + row.idx_scan, 0);
      const indexEfficiency = totalScans > 0 ? (indexScans / totalScans) * 100 : 100;

      return {
        unusedIndexes: unusedIndexes.rows,
        missingIndexes,
        indexEfficiency
      };
    } catch (error) {
      logger.error('Index analysis failed:', error);
      return {
        unusedIndexes: [],
        missingIndexes: [],
        indexEfficiency: 0
      };
    }
  }

  // Database statistics
  static async getDatabaseStats(pool: Pool): Promise<{
    connectionStats: any;
    queryStats: any;
    tableStats: any;
    cacheHitRatio: number;
  }> {
    try {
      // Connection stats
      const connectionStats = await pool.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
      `);

      // Query stats
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

      // Table stats
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

      // Cache hit ratio
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
    } catch (error) {
      logger.error('Database stats collection failed:', error);
      return {
        connectionStats: {},
        queryStats: [],
        tableStats: [],
        cacheHitRatio: 0
      };
    }
  }

  // Cleanup old data
  static async cleanupOldData(pool: Pool): Promise<void> {
    try {
      const cleanupQueries = [
        // Clean up old chat messages (older than 30 days)
        {
          query: 'DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL \'30 days\'',
          params: []
        },
        // Clean up old practice sessions (older than 90 days)
        {
          query: 'DELETE FROM practice_sessions WHERE created_at < NOW() - INTERVAL \'90 days\'',
          params: []
        },
        // Clean up old task results (older than 7 days)
        {
          query: 'DELETE FROM task_results WHERE created_at < NOW() - INTERVAL \'7 days\'',
          params: []
        }
      ];

      for (const { query, params } of cleanupQueries) {
        const result = await pool.query(query, params);
        logger.info(`Cleanup completed: ${result.rowCount} rows deleted`, { query: query.substring(0, 50) });
      }
    } catch (error) {
      logger.error('Data cleanup failed:', error);
    }
  }
}
