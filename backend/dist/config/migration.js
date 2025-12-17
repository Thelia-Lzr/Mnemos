"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationManager = exports.MigrationManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
class MigrationManager {
    constructor(dbPool) {
        this.pool = dbPool;
    }
    async createMigrationsTable() {
        const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
        try {
            await this.pool.query(query);
            console.log('Migrations table created or already exists');
        }
        catch (error) {
            console.error('Error creating migrations table:', error);
            throw error;
        }
    }
    async getExecutedMigrations() {
        try {
            const result = await this.pool.query('SELECT filename FROM migrations ORDER BY id');
            return result.rows.map(row => row.filename);
        }
        catch (error) {
            console.error('Error getting executed migrations:', error);
            throw error;
        }
    }
    async executeMigration(filename, sql) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
            await client.query('COMMIT');
            console.log(`�?Migration ${filename} executed successfully`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error(`�?Error executing migration ${filename}:`, error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async runMigrations() {
        try {
            await this.createMigrationsTable();
            const migrationsDir = path_1.default.join(__dirname, '../../database/migrations');
            const migrationFiles = fs_1.default.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();
            const executedMigrations = await this.getExecutedMigrations();
            for (const filename of migrationFiles) {
                if (!executedMigrations.includes(filename)) {
                    const filePath = path_1.default.join(migrationsDir, filename);
                    const sql = fs_1.default.readFileSync(filePath, 'utf8');
                    console.log(`🔄 Executing migration: ${filename}`);
                    await this.executeMigration(filename, sql);
                }
                else {
                    console.log(`⏭️  Skipping already executed migration: ${filename}`);
                }
            }
            console.log('�?All migrations completed successfully');
        }
        catch (error) {
            console.error('�?Migration process failed:', error);
            throw error;
        }
    }
    async rollbackLastMigration() {
        try {
            const result = await this.pool.query('SELECT filename FROM migrations ORDER BY id DESC LIMIT 1');
            if (result.rows.length === 0) {
                console.log('No migrations to rollback');
                return;
            }
            const lastMigration = result.rows[0].filename;
            await this.pool.query('DELETE FROM migrations WHERE filename = $1', [lastMigration]);
            console.log(`⚠️  Rolled back migration: ${lastMigration}`);
            console.log('Note: This only removes the migration record. Manual schema changes may be required.');
        }
        catch (error) {
            console.error('Error rolling back migration:', error);
            throw error;
        }
    }
}
exports.MigrationManager = MigrationManager;
exports.migrationManager = new MigrationManager(database_1.pool);
if (require.main === module) {
    const command = process.argv[2];
    switch (command) {
        case 'up':
            exports.migrationManager.runMigrations()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
        case 'rollback':
            exports.migrationManager.rollbackLastMigration()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
        default:
            console.log('Usage: npm run migrate [up|rollback]');
            process.exit(1);
    }
}
//# sourceMappingURL=migration.js.map