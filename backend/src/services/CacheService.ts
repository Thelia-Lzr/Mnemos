import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly CACHE_PREFIX = 'ai_lang_app:';

  // Generate cache key with prefix
  private static generateKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  // Set cache with TTL
  static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);
      
      await redisClient.setEx(cacheKey, ttl, serializedValue);
      
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  }

  // Get cache value
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key);
      const value = await redisClient.get(cacheKey);
      
      if (value === null) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  // Delete cache
  static async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key);
      const result = await redisClient.del(cacheKey);
      
      logger.debug(`Cache delete: ${key} (deleted: ${result > 0})`);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  }

  // Check if key exists
  static async exists(key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key);
      const result = await redisClient.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  }

  // Get or set pattern (cache-aside)
  static async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch data
      const data = await fetchFunction();
      
      // Store in cache for next time
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      logger.error('Cache getOrSet error:', { key, error });
      // If cache fails, still return the fetched data
      return await fetchFunction();
    }
  }

  // Increment counter
  static async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const cacheKey = this.generateKey(key);
      const result = await redisClient.incrBy(cacheKey, amount);
      return result;
    } catch (error) {
      logger.error('Cache increment error:', { key, error });
      return 0;
    }
  }

  // Set with expiration
  static async setWithExpiration(key: string, value: any, seconds: number): Promise<boolean> {
    return this.set(key, value, seconds);
  }

  // Get multiple keys
  static async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key));
      const values = await redisClient.mGet(cacheKeys);
      
      return values.map((value: string | null, index: number) => {
        if (value === null) {
          logger.debug(`Cache miss: ${keys[index]}`);
          return null;
        }
        
        logger.debug(`Cache hit: ${keys[index]}`);
        return JSON.parse(value) as T;
      });
    } catch (error) {
      logger.error('Cache getMultiple error:', { keys, error });
      return keys.map(() => null);
    }
  }

  // Delete multiple keys
  static async deleteMultiple(keys: string[]): Promise<number> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key));
      const result = await redisClient.del(cacheKeys);
      
      logger.debug(`Cache deleteMultiple: ${keys.length} keys (deleted: ${result})`);
      return result;
    } catch (error) {
      logger.error('Cache deleteMultiple error:', { keys, error });
      return 0;
    }
  }

  // Clear all cache with pattern
  static async clearPattern(pattern: string): Promise<number> {
    try {
      const searchPattern = this.generateKey(pattern);
      const keys = await redisClient.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await redisClient.del(keys);
      logger.info(`Cache clearPattern: ${pattern} (cleared: ${result} keys)`);
      return result;
    } catch (error) {
      logger.error('Cache clearPattern error:', { pattern, error });
      return 0;
    }
  }

  // Get cache statistics
  static async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';
      
      // Count keys with our prefix
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
      const totalKeys = keys.length;

      return {
        totalKeys,
        memoryUsage
      };
    } catch (error) {
      logger.error('Cache getStats error:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown'
      };
    }
  }

  // Specific cache methods for common use cases
  
  // User session cache
  static async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<boolean> {
    return this.set(`user_session:${userId}`, sessionData, ttl);
  }

  static async getUserSession<T>(userId: string): Promise<T | null> {
    return this.get<T>(`user_session:${userId}`);
  }

  static async deleteUserSession(userId: string): Promise<boolean> {
    return this.delete(`user_session:${userId}`);
  }

  // API response cache
  static async cacheAPIResponse(endpoint: string, params: any, response: any, ttl: number = 300): Promise<boolean> {
    const key = `api_response:${endpoint}:${JSON.stringify(params)}`;
    return this.set(key, response, ttl);
  }

  static async getCachedAPIResponse<T>(endpoint: string, params: any): Promise<T | null> {
    const key = `api_response:${endpoint}:${JSON.stringify(params)}`;
    return this.get<T>(key);
  }

  // User data cache
  static async cacheUserData(userId: string, dataType: string, data: any, ttl: number = 1800): Promise<boolean> {
    const key = `user_data:${userId}:${dataType}`;
    return this.set(key, data, ttl);
  }

  static async getCachedUserData<T>(userId: string, dataType: string): Promise<T | null> {
    const key = `user_data:${userId}:${dataType}`;
    return this.get<T>(key);
  }

  static async invalidateUserData(userId: string): Promise<number> {
    return this.clearPattern(`user_data:${userId}:*`);
  }

  // Rate limiting cache
  static async incrementRateLimit(identifier: string, windowMs: number): Promise<number> {
    const key = `rate_limit:${identifier}`;
    const current = await this.increment(key);
    
    if (current === 1) {
      // Set expiration on first increment
      await redisClient.expire(this.generateKey(key), Math.ceil(windowMs / 1000));
    }
    
    return current;
  }

  static async getRateLimit(identifier: string): Promise<number> {
    const key = `rate_limit:${identifier}`;
    const value = await this.get<number>(key);
    return value || 0;
  }
}
