import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { pool } from './database';

export class MigrationManager {
  private pool: Pool;

  constructor(dbPool: Pool) {
    this.pool = dbPool;
  }

  // Create migrations table if it doesn't exist
  async createMigrationsTable(): Promise<void> {
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
    } catch (error) {
      console.error('Error creating migrations table:', error);
      throw error;
    }
  }

  // Get list of executed migrations
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query('SELECT filename FROM migrations ORDER BY id');
      return result.rows.map(row => row.filename);
    } catch (error) {
      console.error('Error getting executed migrations:', error);
      throw error;
    }
  }

  // Execute a single migration file
  async executeMigration(filename: string, sql: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await client.query('COMMIT');
      console.log(`‚ú?Migration ${filename} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`‚ù?Error executing migration ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Run all pending migrations
  async runMigrations(): Promise<void> {
    try {
      await this.createMigrationsTable();
      
      const migrationsDir = path.join(__dirname, '../../database/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      const executedMigrations = await this.getExecutedMigrations();
      
      for (const filename of migrationFiles) {
        if (!executedMigrations.includes(filename)) {
          const filePath = path.join(migrationsDir, filename);
          const sql = fs.readFileSync(filePath, 'utf8');
          
          console.log(`üîÑ Executing migration: ${filename}`);
          await this.executeMigration(filename, sql);
        } else {
          console.log(`‚è≠Ô∏è  Skipping already executed migration: ${filename}`);
        }
      }
      
      console.log('‚ú?All migrations completed successfully');
    } catch (error) {
      console.error('‚ù?Migration process failed:', error);
      throw error;
    }
  }

  // Rollback last migration (for development use)
  async rollbackLastMigration(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      const lastMigration = result.rows[0].filename;
      
      // Remove from migrations table
      await this.pool.query(
        'DELETE FROM migrations WHERE filename = $1',
        [lastMigration]
      );
      
      console.log(`‚ö†Ô∏è  Rolled back migration: ${lastMigration}`);
      console.log('Note: This only removes the migration record. Manual schema changes may be required.');
    } catch (error) {
      console.error('Error rolling back migration:', error);
      throw error;
    }
  }
}

// Create migration manager instance
export const migrationManager = new MigrationManager(pool);

// CLI interface for running migrations
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      migrationManager.runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'rollback':
      migrationManager.rollbackLastMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    default:
      console.log('Usage: npm run migrate [up|rollback]');
      process.exit(1);
  }
}
