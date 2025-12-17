import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Language } from '../models/PracticeGroup';

export interface UserLearningLanguage {
  id: string;
  userId: string;
  language: Language;
  currentLevel: LanguageLevel;
  targetLevel?: LanguageLevel;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface CreateUserLanguageRequest {
  language: Language;
  currentLevel: LanguageLevel;
  targetLevel?: LanguageLevel;
  isPrimary?: boolean;
}

export interface UpdateUserLanguageRequest {
  currentLevel?: LanguageLevel;
  targetLevel?: LanguageLevel;
  isPrimary?: boolean;
  isActive?: boolean;
}

export class UserLanguageService {
  constructor(private db: Pool) {}

  async getUserLanguages(userId: string): Promise<UserLearningLanguage[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_learning_languages WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
        [userId]
      );

      return result.rows.map(row => this.mapRowToUserLanguage(row));
    } catch (error) {
      console.error('Error getting user languages:', error);
      return [];
    }
  }

  async getActiveUserLanguages(userId: string): Promise<UserLearningLanguage[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_learning_languages WHERE user_id = $1 AND is_active = true ORDER BY is_primary DESC, created_at ASC',
        [userId]
      );

      return result.rows.map(row => this.mapRowToUserLanguage(row));
    } catch (error) {
      console.error('Error getting active user languages:', error);
      return [];
    }
  }

  async getPrimaryLanguage(userId: string): Promise<UserLearningLanguage | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_learning_languages WHERE user_id = $1 AND is_primary = true AND is_active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUserLanguage(result.rows[0]);
    } catch (error) {
      console.error('Error getting primary language:', error);
      return null;
    }
  }

  async addUserLanguage(userId: string, request: CreateUserLanguageRequest): Promise<UserLearningLanguage | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if language already exists for user
      const existingResult = await client.query(
        'SELECT id FROM user_learning_languages WHERE user_id = $1 AND language = $2',
        [userId, request.language]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Language already exists for this user');
      }

      // If this is set as primary, unset other primary languages
      if (request.isPrimary) {
        await client.query(
          'UPDATE user_learning_languages SET is_primary = false WHERE user_id = $1',
          [userId]
        );
      }

      // If no primary language exists and this is the first language, make it primary
      const primaryCheck = await client.query(
        'SELECT COUNT(*) as count FROM user_learning_languages WHERE user_id = $1 AND is_primary = true',
        [userId]
      );

      const shouldBePrimary = request.isPrimary || parseInt(primaryCheck.rows[0].count) === 0;

      // Insert new language
      const id = uuidv4();
      const result = await client.query(`
        INSERT INTO user_learning_languages (
          id, user_id, language, current_level, target_level, is_primary, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        id, userId, request.language, request.currentLevel, 
        request.targetLevel, shouldBePrimary
      ]);

      // Create corresponding user capability if it doesn't exist
      const capabilityCheck = await client.query(
        'SELECT id FROM user_capabilities WHERE user_id = $1 AND language = $2',
        [userId, request.language]
      );

      if (capabilityCheck.rows.length === 0) {
        const capabilityId = uuidv4();
        await client.query(`
          INSERT INTO user_capabilities (
            id, user_id, language, current_level, learning_goal, overall_level,
            confidence_score, listening_level, speaking_level, reading_level, writing_level,
            estimated_vocabulary_size, mastered_words_count, learning_words_count,
            last_assessed_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          capabilityId, userId, request.language, request.currentLevel, request.targetLevel || 'C2'
        ]);

        // Create learning progress record
        const progressId = uuidv4();
        await client.query(`
          INSERT INTO learning_progress (id, user_id, language, total_study_time, streak_days, created_at, updated_at)
          VALUES ($1, $2, $3, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [progressId, userId, request.language]);
      }

      await client.query('COMMIT');
      return this.mapRowToUserLanguage(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding user language:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async updateUserLanguage(userId: string, language: Language, updates: UpdateUserLanguageRequest): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // If setting as primary, unset other primary languages
      if (updates.isPrimary) {
        await client.query(
          'UPDATE user_learning_languages SET is_primary = false WHERE user_id = $1 AND language != $2',
          [userId, language]
        );
      }

      // Build update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      values.push(userId, language);
      const query = `
        UPDATE user_learning_languages 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $${paramIndex} AND language = $${paramIndex + 1}
      `;

      const result = await client.query(query, values);

      // Update corresponding user capability if level changed
      if (updates.currentLevel) {
        await client.query(
          'UPDATE user_capabilities SET current_level = $1, overall_level = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND language = $3',
          [updates.currentLevel, userId, language]
        );
      }

      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating user language:', error);
      return false;
    } finally {
      client.release();
    }
  }

  async removeUserLanguage(userId: string, language: Language): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if this is the primary language
      const languageResult = await client.query(
        'SELECT is_primary FROM user_learning_languages WHERE user_id = $1 AND language = $2',
        [userId, language]
      );

      if (languageResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const wasPrimary = languageResult.rows[0].is_primary;

      // Delete the language
      await client.query(
        'DELETE FROM user_learning_languages WHERE user_id = $1 AND language = $2',
        [userId, language]
      );

      // If this was the primary language, set another active language as primary
      if (wasPrimary) {
        await client.query(
          `UPDATE user_learning_languages 
           SET is_primary = true 
           WHERE user_id = $1 AND is_active = true 
           ORDER BY created_at ASC 
           LIMIT 1`,
          [userId]
        );
      }

      await client.query('COMMIT');
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error removing user language:', error);
      return false;
    } finally {
      client.release();
    }
  }

  async setPrimaryLanguage(userId: string, language: Language): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Unset all primary languages for this user
      await client.query(
        'UPDATE user_learning_languages SET is_primary = false WHERE user_id = $1',
        [userId]
      );

      // Set the specified language as primary
      const result = await client.query(
        'UPDATE user_learning_languages SET is_primary = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND language = $2',
        [userId, language]
      );

      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error setting primary language:', error);
      return false;
    } finally {
      client.release();
    }
  }

  async getUserLanguage(userId: string, language: Language): Promise<UserLearningLanguage | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_learning_languages WHERE user_id = $1 AND language = $2',
        [userId, language]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUserLanguage(result.rows[0]);
    } catch (error) {
      console.error('Error getting user language:', error);
      return null;
    }
  }

  private mapRowToUserLanguage(row: any): UserLearningLanguage {
    return {
      id: row.id,
      userId: row.user_id,
      language: row.language as Language,
      currentLevel: row.current_level as LanguageLevel,
      targetLevel: row.target_level as LanguageLevel,
      isPrimary: row.is_primary,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}