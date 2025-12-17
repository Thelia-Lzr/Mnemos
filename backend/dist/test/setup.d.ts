import { Pool } from 'pg';
import { createClient } from 'redis';
export declare let testDb: Pool;
export declare let testRedis: ReturnType<typeof createClient>;
export declare const setupTestEnvironment: () => Promise<void>;
export declare const teardownTestEnvironment: () => Promise<void>;
export declare const cleanTestDatabase: () => Promise<void>;
//# sourceMappingURL=setup.d.ts.map