export declare class CacheService {
    private static readonly DEFAULT_TTL;
    private static readonly CACHE_PREFIX;
    private static generateKey;
    static set(key: string, value: any, ttl?: number): Promise<boolean>;
    static get<T>(key: string): Promise<T | null>;
    static delete(key: string): Promise<boolean>;
    static exists(key: string): Promise<boolean>;
    static getOrSet<T>(key: string, fetchFunction: () => Promise<T>, ttl?: number): Promise<T>;
    static increment(key: string, amount?: number): Promise<number>;
    static setWithExpiration(key: string, value: any, seconds: number): Promise<boolean>;
    static getMultiple<T>(keys: string[]): Promise<(T | null)[]>;
    static deleteMultiple(keys: string[]): Promise<number>;
    static clearPattern(pattern: string): Promise<number>;
    static getStats(): Promise<{
        totalKeys: number;
        memoryUsage: string;
        hitRate?: number;
    }>;
    static setUserSession(userId: string, sessionData: any, ttl?: number): Promise<boolean>;
    static getUserSession<T>(userId: string): Promise<T | null>;
    static deleteUserSession(userId: string): Promise<boolean>;
    static cacheAPIResponse(endpoint: string, params: any, response: any, ttl?: number): Promise<boolean>;
    static getCachedAPIResponse<T>(endpoint: string, params: any): Promise<T | null>;
    static cacheUserData(userId: string, dataType: string, data: any, ttl?: number): Promise<boolean>;
    static getCachedUserData<T>(userId: string, dataType: string): Promise<T | null>;
    static invalidateUserData(userId: string): Promise<number>;
    static incrementRateLimit(identifier: string, windowMs: number): Promise<number>;
    static getRateLimit(identifier: string): Promise<number>;
}
//# sourceMappingURL=CacheService.d.ts.map