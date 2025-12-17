import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, UserPreferences, CreateUserRequest, LoginRequest, AuthResponse, UpdateUserRequest, ChangePasswordRequest, UserProfile } from '../models/User';
import { userValidator } from '../utils/userValidation';

export class UserService {
  constructor(private db: Pool) {}

  async createUser(userData: CreateUserRequest): Promise<AuthResponse> {
    let client;
    
    try {
      client = await this.db.connect();
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      );

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          message: 'User with this email or username already exists'
        };
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const userId = uuidv4();
      const userResult = await client.query(
        `INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, username, email, role, created_at`,
        [userId, userData.username, userData.email, passwordHash, 'user']
      );

      const user = userResult.rows[0];

      // Create default user preferences
      await client.query(
        `INSERT INTO user_preferences (id, user_id, theme, notifications_email, notifications_push, 
         practice_reminders, daily_quote_enabled, review_reminders, milestone_updates, pk_invitations,
         created_at, updated_at)
         VALUES ($1, $2, 'light', true, true, true, true, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [uuidv4(), userId]
      );

      // Create default user capabilities if language is provided
      if (userData.language && userData.currentLevel) {
        await client.query(
          `INSERT INTO user_capabilities (id, user_id, language, current_level, learning_goal, 
           overall_level, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [uuidv4(), userId, userData.language, userData.currentLevel, 'C2']
        );

        // Create learning progress record
        await client.query(
          `INSERT INTO learning_progress (id, user_id, language, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [uuidv4(), userId, userData.language]
        );

        // Create user credits record
        await client.query(
          `INSERT INTO user_credits (id, user_id, current_balance, created_at, updated_at)
           VALUES ($1, $2, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [uuidv4(), userId] // Give new users 10 free credits
        );
      }

      await client.query('COMMIT');

      // Generate JWT tokens
      const token = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('Error creating user:', error);
      return {
        success: false,
        message: 'Failed to create user account'
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async loginUser(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const result = await this.db.query(
        'SELECT id, username, email, password_hash, role FROM users WHERE email = $1',
        [loginData.email]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(loginData.password, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Update last login time
      await this.db.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate JWT tokens
      const token = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      console.error('Error logging in user:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.db.query(
        'SELECT id, username, email, role, created_at, last_login_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const result = await this.db.query(
        `SELECT id, user_id, theme, notifications_email, notifications_push, 
         practice_reminders, daily_quote_enabled, review_reminders, 
         milestone_updates, pk_invitations, created_at, updated_at 
         FROM user_preferences WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(preferences).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') {
          // Convert camelCase to snake_case for database
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return false;
      }

      values.push(userId);
      const query = `
        UPDATE user_preferences 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $${paramIndex}
      `;

      const result = await this.db.query(query, values);
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Get user from database
      const user = await this.getUserById(decoded.id);
      if (!user) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Generate new access token
      const newToken = this.generateAccessToken(user);

      return {
        success: true,
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      console.error('Error refreshing token:', error);
      return {
        success: false,
        message: 'Invalid refresh token'
      };
    }
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
  }

  private generateRefreshToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
  }

  async updateUser(userId: string, updates: { username?: string; email?: string }): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Check if email is being updated and if it already exists
      if (updates.email) {
        const existingUser = await this.db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [updates.email, userId]
        );

        if (existingUser.rows.length > 0) {
          throw new Error('Email already exists');
        }
      }

      // Check if username is being updated and if it already exists
      if (updates.username) {
        const existingUser = await this.db.query(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [updates.username, userId]
        );

        if (existingUser.rows.length > 0) {
          throw new Error('Username already exists');
        }
      }

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'username' ? 'username' : key === 'email' ? 'email' : key;
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return false;
      }

      values.push(userId);
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${paramIndex}
      `;

      const result = await this.db.query(query, values);
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    let client;
    
    try {
      client = await this.db.connect();
      await client.query('BEGIN');

      // Get current password hash
      const result = await client.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const user = result.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      await client.query('COMMIT');
      return true;

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('Error changing password:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    try {
      // Get user basic info
      const userResult = await this.db.query(
        'SELECT id, username, email, role, created_at, last_login_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);

      // Get total study time across all languages
      const studyTimeResult = await this.db.query(
        'SELECT COALESCE(SUM(total_study_time), 0) as total_study_time FROM learning_progress WHERE user_id = $1',
        [userId]
      );

      // Get active languages
      const languagesResult = await this.db.query(
        'SELECT language FROM user_capabilities WHERE user_id = $1 AND is_active_learning = true',
        [userId]
      );

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        preferences: preferences || {},
        totalStudyTime: studyTimeResult.rows[0].total_study_time,
        activeLanguages: languagesResult.rows.map(row => row.language)
      };

    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    let client;
    
    try {
      client = await this.db.connect();
      await client.query('BEGIN');

      // Delete user (cascade will handle related records)
      const result = await client.query(
        'DELETE FROM users WHERE id = $1',
        [userId]
      );

      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('Error deleting user:', error);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async validateUserData(userData: any): Promise<{ isValid: boolean; errors: string[] }> {
    const validation = userValidator.validateUserData(userData);
    return {
      isValid: validation.isValid,
      errors: validation.errors
    };
  }

  async validateUserPreferences(preferences: any): Promise<{ isValid: boolean; errors: string[] }> {
    const validation = userValidator.validateUserPreferences(preferences);
    return {
      isValid: validation.isValid,
      errors: validation.errors
    };
  }

  async validatePasswordStrength(password: string): Promise<{ 
    score: number; 
    feedback: string[]; 
    isStrong: boolean 
  }> {
    return userValidator.validatePasswordStrength(password);
  }

  // Admin-specific user management operations
  async getAllUsers(page: number = 1, limit: number = 50, searchTerm?: string): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      let queryParams: any[] = [limit, offset];
      let countParams: any[] = [];

      if (searchTerm) {
        whereClause = 'WHERE username ILIKE $3 OR email ILIKE $3';
        queryParams.push(`%${searchTerm}%`);
        countParams.push(`%${searchTerm}%`);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await this.db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      // Get users
      const query = `
        SELECT id, username, email, role, created_at, last_login_at, updated_at 
        FROM users 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const result = await this.db.query(query, queryParams);
      const totalPages = Math.ceil(total / limit);

      return {
        users: result.rows,
        total,
        page,
        totalPages
      };

    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async getUserWithStats(userId: string): Promise<any | null> {
    try {
      // Get user basic info
      const user = await this.getUserById(userId);
      if (!user) return null;

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);

      // Get user capabilities
      const capabilitiesResult = await this.db.query(
        'SELECT * FROM user_capabilities WHERE user_id = $1',
        [userId]
      );

      // Get learning progress
      const progressResult = await this.db.query(
        'SELECT * FROM learning_progress WHERE user_id = $1',
        [userId]
      );

      // Get credit information
      const creditsResult = await this.db.query(
        'SELECT * FROM user_credits WHERE user_id = $1',
        [userId]
      );

      // Get recent activity (practice results)
      const activityResult = await this.db.query(
        `SELECT pr.*, pg.title as practice_title 
         FROM practice_results pr 
         JOIN practice_groups pg ON pr.practice_group_id = pg.id 
         WHERE pr.user_id = $1 
         ORDER BY pr.completed_at DESC 
         LIMIT 10`,
        [userId]
      );

      return {
        ...user,
        preferences: preferences || {},
        capabilities: capabilitiesResult.rows,
        learningProgress: progressResult.rows,
        credits: creditsResult.rows[0] || null,
        recentActivity: activityResult.rows
      };

    } catch (error) {
      console.error('Error getting user with stats:', error);
      return null;
    }
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<boolean> {
    try {
      const result = await this.db.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [role, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  async suspendUser(userId: string, reason?: string): Promise<boolean> {
    let client;
    
    try {
      client = await this.db.connect();
      await client.query('BEGIN');

      // For now, we'll implement suspension by setting a flag in user preferences
      // In a real system, you might want a separate user_suspensions table
      await client.query(
        `UPDATE user_preferences 
         SET notifications_email = false, 
             notifications_push = false,
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
        [userId]
      );

      // Log the suspension (you might want to create a user_actions table for this)
      // For now, we'll just update the user record
      await client.query(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      await client.query('COMMIT');
      return true;

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('Error suspending user:', error);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    usersByRole: { user: number; admin: number };
  }> {
    try {
      // Total users
      const totalResult = await this.db.query('SELECT COUNT(*) FROM users');
      const totalUsers = parseInt(totalResult.rows[0].count);

      // Active users (logged in within last 30 days)
      const activeResult = await this.db.query(
        'SELECT COUNT(*) FROM users WHERE last_login_at > CURRENT_TIMESTAMP - INTERVAL \'30 days\''
      );
      const activeUsers = parseInt(activeResult.rows[0].count);

      // New users today
      const todayResult = await this.db.query(
        'SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE'
      );
      const newUsersToday = parseInt(todayResult.rows[0].count);

      // New users this week
      const weekResult = await this.db.query(
        'SELECT COUNT(*) FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL \'7 days\''
      );
      const newUsersThisWeek = parseInt(weekResult.rows[0].count);

      // New users this month
      const monthResult = await this.db.query(
        'SELECT COUNT(*) FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL \'30 days\''
      );
      const newUsersThisMonth = parseInt(monthResult.rows[0].count);

      // Users by role
      const roleResult = await this.db.query(
        'SELECT role, COUNT(*) FROM users GROUP BY role'
      );
      
      const usersByRole = { user: 0, admin: 0 };
      roleResult.rows.forEach(row => {
        usersByRole[row.role as 'user' | 'admin'] = parseInt(row.count);
      });

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersByRole
      };

    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }

  // Batch operations for admin
  async batchUpdateUsers(userIds: string[], updates: Partial<User>): Promise<number> {
    let client;
    
    try {
      client = await this.db.connect();
      await client.query('BEGIN');

      let updatedCount = 0;
      
      for (const userId of userIds) {
        const success = await this.updateUser(userId, updates);
        if (success) updatedCount++;
      }

      await client.query('COMMIT');
      return updatedCount;

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('Error batch updating users:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async batchDeleteUsers(userIds: string[]): Promise<number> {
    let client;
    
    try {
      client = await this.db.connect();
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM users WHERE id = ANY($1)',
        [userIds]
      );

      await client.query('COMMIT');
      return result.rowCount ?? 0;

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('Error batch deleting users:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
