import { Pool } from 'pg';
export declare class MigrationManager {
    private pool;
    constructor(dbPool: Pool);
    createMigrationsTable(): Promise<void>;
    getExecutedMigrations(): Promise<string[]>;
    executeMigration(filename: string, sql: string): Promise<void>;
    runMigrations(): Promise<void>;
    rollbackLastMigration(): Promise<void>;
}
export declare const migrationManager: MigrationManager;
//# sourceMappingURL=migration.d.ts.map