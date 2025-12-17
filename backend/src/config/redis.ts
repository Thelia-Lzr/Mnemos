import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
  }
};

// Create Redis client
export const redisClient: RedisClientType = createClient(redisConfig);

// Redis connection event handlers
redisClient.on('connect', () => {
  console.log('🔄 Connecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('�?Redis connected successfully');
});

redisClient.on('error', (error) => {
  console.error('�?Redis connection error:', error);
});

redisClient.on('end', () => {
  console.log('Redis connection closed');
});

// Initialize Redis connection
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error; // Let the caller handle the error
  }
};

// Redis utility functions
export class RedisService {
  // Set key-value with optional expiration
  static async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    try {
      if (expireInSeconds) {
        await redisClient.setEx(key, expireInSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      throw error;
    }
  }

  // Get value by key
  static async get(key: string): Promise<string | null> {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      throw error;
    }
  }

  // Delete key
  static async del(key: string): Promise<number> {
    try {
      return await redisClient.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      throw error;
    }
  }

  // Check if key exists
  static async exists(key: string): Promise<number> {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      throw error;
    }
  }

  // Set expiration for key
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await redisClient.expire(key, seconds);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      throw error;
    }
  }

  // Hash operations
  static async hSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await redisClient.hSet(key, field, value);
    } catch (error) {
      console.error('Redis HSET error:', error);
      throw error;
    }
  }

  static async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await redisClient.hGet(key, field);
    } catch (error) {
      console.error('Redis HGET error:', error);
      throw error;
    }
  }

  static async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await redisClient.hGetAll(key);
    } catch (error) {
      console.error('Redis HGETALL error:', error);
      throw error;
    }
  }

  // List operations
  static async lPush(key: string, ...values: string[]): Promise<number> {
    try {
      return await redisClient.lPush(key, values);
    } catch (error) {
      console.error('Redis LPUSH error:', error);
      throw error;
    }
  }

  static async rPop(key: string): Promise<string | null> {
    try {
      return await redisClient.rPop(key);
    } catch (error) {
      console.error('Redis RPOP error:', error);
      throw error;
    }
  }

  static async lLen(key: string): Promise<number> {
    try {
      return await redisClient.lLen(key);
    } catch (error) {
      console.error('Redis LLEN error:', error);
      throw error;
    }
  }
}

// Graceful shutdown
export const closeRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', closeRedis);
process.on('SIGTERM', closeRedis);
