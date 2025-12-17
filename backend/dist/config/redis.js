"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedis = exports.RedisService = exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
};
exports.redisClient = (0, redis_1.createClient)(redisConfig);
exports.redisClient.on('connect', () => {
    console.log('🔄 Connecting to Redis...');
});
exports.redisClient.on('ready', () => {
    console.log('�?Redis connected successfully');
});
exports.redisClient.on('error', (error) => {
    console.error('�?Redis connection error:', error);
});
exports.redisClient.on('end', () => {
    console.log('Redis connection closed');
});
const connectRedis = async () => {
    try {
        await exports.redisClient.connect();
    }
    catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
    }
};
exports.connectRedis = connectRedis;
class RedisService {
    static async set(key, value, expireInSeconds) {
        try {
            if (expireInSeconds) {
                await exports.redisClient.setEx(key, expireInSeconds, value);
            }
            else {
                await exports.redisClient.set(key, value);
            }
        }
        catch (error) {
            console.error('Redis SET error:', error);
            throw error;
        }
    }
    static async get(key) {
        try {
            return await exports.redisClient.get(key);
        }
        catch (error) {
            console.error('Redis GET error:', error);
            throw error;
        }
    }
    static async del(key) {
        try {
            return await exports.redisClient.del(key);
        }
        catch (error) {
            console.error('Redis DEL error:', error);
            throw error;
        }
    }
    static async exists(key) {
        try {
            return await exports.redisClient.exists(key);
        }
        catch (error) {
            console.error('Redis EXISTS error:', error);
            throw error;
        }
    }
    static async expire(key, seconds) {
        try {
            return await exports.redisClient.expire(key, seconds);
        }
        catch (error) {
            console.error('Redis EXPIRE error:', error);
            throw error;
        }
    }
    static async hSet(key, field, value) {
        try {
            return await exports.redisClient.hSet(key, field, value);
        }
        catch (error) {
            console.error('Redis HSET error:', error);
            throw error;
        }
    }
    static async hGet(key, field) {
        try {
            return await exports.redisClient.hGet(key, field);
        }
        catch (error) {
            console.error('Redis HGET error:', error);
            throw error;
        }
    }
    static async hGetAll(key) {
        try {
            return await exports.redisClient.hGetAll(key);
        }
        catch (error) {
            console.error('Redis HGETALL error:', error);
            throw error;
        }
    }
    static async lPush(key, ...values) {
        try {
            return await exports.redisClient.lPush(key, values);
        }
        catch (error) {
            console.error('Redis LPUSH error:', error);
            throw error;
        }
    }
    static async rPop(key) {
        try {
            return await exports.redisClient.rPop(key);
        }
        catch (error) {
            console.error('Redis RPOP error:', error);
            throw error;
        }
    }
    static async lLen(key) {
        try {
            return await exports.redisClient.lLen(key);
        }
        catch (error) {
            console.error('Redis LLEN error:', error);
            throw error;
        }
    }
}
exports.RedisService = RedisService;
const closeRedis = async () => {
    try {
        await exports.redisClient.quit();
        console.log('Redis connection closed');
    }
    catch (error) {
        console.error('Error closing Redis connection:', error);
    }
};
exports.closeRedis = closeRedis;
process.on('SIGINT', exports.closeRedis);
process.on('SIGTERM', exports.closeRedis);
//# sourceMappingURL=redis.js.map