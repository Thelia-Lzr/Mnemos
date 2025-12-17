import { RedisClientType } from 'redis';
export declare const redisClient: RedisClientType;
export declare const connectRedis: () => Promise<void>;
export declare class RedisService {
    static set(key: string, value: string, expireInSeconds?: number): Promise<void>;
    static get(key: string): Promise<string | null>;
    static del(key: string): Promise<number>;
    static exists(key: string): Promise<number>;
    static expire(key: string, seconds: number): Promise<boolean>;
    static hSet(key: string, field: string, value: string): Promise<number>;
    static hGet(key: string, field: string): Promise<string | undefined>;
    static hGetAll(key: string): Promise<Record<string, string>>;
    static lPush(key: string, ...values: string[]): Promise<number>;
    static rPop(key: string): Promise<string | null>;
    static lLen(key: string): Promise<number>;
}
export declare const closeRedis: () => Promise<void>;
//# sourceMappingURL=redis.d.ts.map