"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
class CacheService {
    static generateKey(key) {
        return `${this.CACHE_PREFIX}${key}`;
    }
    static async set(key, value, ttl = this.DEFAULT_TTL) {
        try {
            const cacheKey = this.generateKey(key);
            const serializedValue = JSON.stringify(value);
            await redis_1.redisClient.setEx(cacheKey, ttl, serializedValue);
            logger_1.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Cache set error:', { key, error });
            return false;
        }
    }
    static async get(key) {
        try {
            const cacheKey = this.generateKey(key);
            const value = await redis_1.redisClient.get(cacheKey);
            if (value === null) {
                logger_1.logger.debug(`Cache miss: ${key}`);
                return null;
            }
            logger_1.logger.debug(`Cache hit: ${key}`);
            return JSON.parse(value);
        }
        catch (error) {
            logger_1.logger.error('Cache get error:', { key, error });
            return null;
        }
    }
    static async delete(key) {
        try {
            const cacheKey = this.generateKey(key);
            const result = await redis_1.redisClient.del(cacheKey);
            logger_1.logger.debug(`Cache delete: ${key} (deleted: ${result > 0})`);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error('Cache delete error:', { key, error });
            return false;
        }
    }
    static async exists(key) {
        try {
            const cacheKey = this.generateKey(key);
            const result = await redis_1.redisClient.exists(cacheKey);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error('Cache exists error:', { key, error });
            return false;
        }
    }
    static async getOrSet(key, fetchFunction, ttl = this.DEFAULT_TTL) {
        try {
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }
            const data = await fetchFunction();
            await this.set(key, data, ttl);
            return data;
        }
        catch (error) {
            logger_1.logger.error('Cache getOrSet error:', { key, error });
            return await fetchFunction();
        }
    }
    static async increment(key, amount = 1) {
        try {
            const cacheKey = this.generateKey(key);
            const result = await redis_1.redisClient.incrBy(cacheKey, amount);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cache increment error:', { key, error });
            return 0;
        }
    }
    static async setWithExpiration(key, value, seconds) {
        return this.set(key, value, seconds);
    }
    static async getMultiple(keys) {
        try {
            const cacheKeys = keys.map(key => this.generateKey(key));
            const values = await redis_1.redisClient.mGet(cacheKeys);
            return values.map((value, index) => {
                if (value === null) {
                    logger_1.logger.debug(`Cache miss: ${keys[index]}`);
                    return null;
                }
                logger_1.logger.debug(`Cache hit: ${keys[index]}`);
                return JSON.parse(value);
            });
        }
        catch (error) {
            logger_1.logger.error('Cache getMultiple error:', { keys, error });
            return keys.map(() => null);
        }
    }
    static async deleteMultiple(keys) {
        try {
            const cacheKeys = keys.map(key => this.generateKey(key));
            const result = await redis_1.redisClient.del(cacheKeys);
            logger_1.logger.debug(`Cache deleteMultiple: ${keys.length} keys (deleted: ${result})`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cache deleteMultiple error:', { keys, error });
            return 0;
        }
    }
    static async clearPattern(pattern) {
        try {
            const searchPattern = this.generateKey(pattern);
            const keys = await redis_1.redisClient.keys(searchPattern);
            if (keys.length === 0) {
                return 0;
            }
            const result = await redis_1.redisClient.del(keys);
            logger_1.logger.info(`Cache clearPattern: ${pattern} (cleared: ${result} keys)`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cache clearPattern error:', { pattern, error });
            return 0;
        }
    }
    static async getStats() {
        try {
            const info = await redis_1.redisClient.info('memory');
            const keyspace = await redis_1.redisClient.info('keyspace');
            const memoryMatch = info.match(/used_memory_human:(.+)/);
            const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';
            const keys = await redis_1.redisClient.keys(`${this.CACHE_PREFIX}*`);
            const totalKeys = keys.length;
            return {
                totalKeys,
                memoryUsage
            };
        }
        catch (error) {
            logger_1.logger.error('Cache getStats error:', error);
            return {
                totalKeys: 0,
                memoryUsage: 'Unknown'
            };
        }
    }
    static async setUserSession(userId, sessionData, ttl = 86400) {
        return this.set(`user_session:${userId}`, sessionData, ttl);
    }
    static async getUserSession(userId) {
        return this.get(`user_session:${userId}`);
    }
    static async deleteUserSession(userId) {
        return this.delete(`user_session:${userId}`);
    }
    static async cacheAPIResponse(endpoint, params, response, ttl = 300) {
        const key = `api_response:${endpoint}:${JSON.stringify(params)}`;
        return this.set(key, response, ttl);
    }
    static async getCachedAPIResponse(endpoint, params) {
        const key = `api_response:${endpoint}:${JSON.stringify(params)}`;
        return this.get(key);
    }
    static async cacheUserData(userId, dataType, data, ttl = 1800) {
        const key = `user_data:${userId}:${dataType}`;
        return this.set(key, data, ttl);
    }
    static async getCachedUserData(userId, dataType) {
        const key = `user_data:${userId}:${dataType}`;
        return this.get(key);
    }
    static async invalidateUserData(userId) {
        return this.clearPattern(`user_data:${userId}:*`);
    }
    static async incrementRateLimit(identifier, windowMs) {
        const key = `rate_limit:${identifier}`;
        const current = await this.increment(key);
        if (current === 1) {
            await redis_1.redisClient.expire(this.generateKey(key), Math.ceil(windowMs / 1000));
        }
        return current;
    }
    static async getRateLimit(identifier) {
        const key = `rate_limit:${identifier}`;
        const value = await this.get(key);
        return value || 0;
    }
}
exports.CacheService = CacheService;
CacheService.DEFAULT_TTL = 3600;
CacheService.CACHE_PREFIX = 'ai_lang_app:';
//# sourceMappingURL=CacheService.js.map