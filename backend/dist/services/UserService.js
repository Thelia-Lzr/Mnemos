"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const userValidation_1 = require("../utils/userValidation");
class UserService {
    constructor(db) {
        this.db = db;
    }
    async createUser(userData) {
        let client;
        try {
            client = await this.db.connect();
            await client.query('BEGIN');
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [userData.email, userData.username]);
            if (existingUser.rows.length > 0) {
                return {
                    success: false,
                    message: 'User with this email or username already exists'
                };
            }
            const saltRounds = 12;
            const passwordHash = await bcryptjs_1.default.hash(userData.password, saltRounds);
            const userId = (0, uuid_1.v4)();
            const userResult = await client.query(`INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, username, email, role, created_at`, [userId, userData.username, userData.email, passwordHash, 'user']);
            const user = userResult.rows[0];
            await client.query(`INSERT INTO user_preferences (id, user_id, theme, notifications_email, notifications_push, 
         practice_reminders, daily_quote_enabled, review_reminders, milestone_updates, pk_invitations,
         created_at, updated_at)
         VALUES ($1, $2, 'light', true, true, true, true, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [(0, uuid_1.v4)(), userId]);
            if (userData.language && userData.currentLevel) {
                await client.query(`INSERT INTO user_capabilities (id, user_id, language, current_level, learning_goal, 
           overall_level, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [(0, uuid_1.v4)(), userId, userData.language, userData.currentLevel, 'C2']);
                await client.query(`INSERT INTO learning_progress (id, user_id, language, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [(0, uuid_1.v4)(), userId, userData.language]);
                await client.query(`INSERT INTO user_credits (id, user_id, current_balance, created_at, updated_at)
           VALUES ($1, $2, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [(0, uuid_1.v4)(), userId]);
            }
            await client.query('COMMIT');
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
        }
        catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError);
                }
            }
            console.error('Error creating user:', error);
            return {
                success: false,
                message: 'Failed to create user account'
            };
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    async loginUser(loginData) {
        try {
            const result = await this.db.query('SELECT id, username, email, password_hash, role FROM users WHERE email = $1', [loginData.email]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }
            const user = result.rows[0];
            const isValidPassword = await bcryptjs_1.default.compare(loginData.password, user.password_hash);
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }
            await this.db.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
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
        }
        catch (error) {
            console.error('Error logging in user:', error);
            return {
                success: false,
                message: 'Login failed'
            };
        }
    }
    async getUserById(userId) {
        try {
            const result = await this.db.query('SELECT id, username, email, role, created_at, last_login_at, updated_at FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }
    async getUserPreferences(userId) {
        try {
            const result = await this.db.query(`SELECT id, user_id, theme, notifications_email, notifications_push, 
         practice_reminders, daily_quote_enabled, review_reminders, 
         milestone_updates, pk_invitations, created_at, updated_at 
         FROM user_preferences WHERE user_id = $1`, [userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Error getting user preferences:', error);
            return null;
        }
    }
    async updateUserPreferences(userId, preferences) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            Object.entries(preferences).forEach(([key, value]) => {
                if (key !== 'id' && key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') {
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
        }
        catch (error) {
            console.error('Error updating user preferences:', error);
            return false;
        }
    }
    async refreshToken(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const user = await this.getUserById(decoded.id);
            if (!user) {
                return {
                    success: false,
                    message: 'Invalid refresh token'
                };
            }
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
        }
        catch (error) {
            console.error('Error refreshing token:', error);
            return {
                success: false,
                message: 'Invalid refresh token'
            };
        }
    }
    generateAccessToken(user) {
        return jsonwebtoken_1.default.sign({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '15m' });
    }
    generateRefreshToken(user) {
        return jsonwebtoken_1.default.sign({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    }
    async updateUser(userId, updates) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (updates.email) {
                const existingUser = await this.db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [updates.email, userId]);
                if (existingUser.rows.length > 0) {
                    throw new Error('Email already exists');
                }
            }
            if (updates.username) {
                const existingUser = await this.db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [updates.username, userId]);
                if (existingUser.rows.length > 0) {
                    throw new Error('Username already exists');
                }
            }
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
        }
        catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
    async changePassword(userId, currentPassword, newPassword) {
        let client;
        try {
            client = await this.db.connect();
            await client.query('BEGIN');
            const result = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                return false;
            }
            const user = result.rows[0];
            const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }
            const saltRounds = 12;
            const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
            await client.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPasswordHash, userId]);
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError);
                }
            }
            console.error('Error changing password:', error);
            throw error;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    async getUserProfile(userId) {
        try {
            const userResult = await this.db.query('SELECT id, username, email, role, created_at, last_login_at FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                return null;
            }
            const user = userResult.rows[0];
            const preferences = await this.getUserPreferences(userId);
            const studyTimeResult = await this.db.query('SELECT COALESCE(SUM(total_study_time), 0) as total_study_time FROM learning_progress WHERE user_id = $1', [userId]);
            const languagesResult = await this.db.query('SELECT language FROM user_capabilities WHERE user_id = $1 AND is_active_learning = true', [userId]);
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
        }
        catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }
    async deleteUser(userId) {
        let client;
        try {
            client = await this.db.connect();
            await client.query('BEGIN');
            const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
            await client.query('COMMIT');
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError);
                }
            }
            console.error('Error deleting user:', error);
            return false;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    async validateUserData(userData) {
        const validation = userValidation_1.userValidator.validateUserData(userData);
        return {
            isValid: validation.isValid,
            errors: validation.errors
        };
    }
    async validateUserPreferences(preferences) {
        const validation = userValidation_1.userValidator.validateUserPreferences(preferences);
        return {
            isValid: validation.isValid,
            errors: validation.errors
        };
    }
    async validatePasswordStrength(password) {
        return userValidation_1.userValidator.validatePasswordStrength(password);
    }
    async getAllUsers(page = 1, limit = 50, searchTerm) {
        try {
            const offset = (page - 1) * limit;
            let whereClause = '';
            let queryParams = [limit, offset];
            let countParams = [];
            if (searchTerm) {
                whereClause = 'WHERE username ILIKE $3 OR email ILIKE $3';
                queryParams.push(`%${searchTerm}%`);
                countParams.push(`%${searchTerm}%`);
            }
            const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
            const countResult = await this.db.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].count);
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
        }
        catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }
    async getUserWithStats(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user)
                return null;
            const preferences = await this.getUserPreferences(userId);
            const capabilitiesResult = await this.db.query('SELECT * FROM user_capabilities WHERE user_id = $1', [userId]);
            const progressResult = await this.db.query('SELECT * FROM learning_progress WHERE user_id = $1', [userId]);
            const creditsResult = await this.db.query('SELECT * FROM user_credits WHERE user_id = $1', [userId]);
            const activityResult = await this.db.query(`SELECT pr.*, pg.title as practice_title 
         FROM practice_results pr 
         JOIN practice_groups pg ON pr.practice_group_id = pg.id 
         WHERE pr.user_id = $1 
         ORDER BY pr.completed_at DESC 
         LIMIT 10`, [userId]);
            return {
                ...user,
                preferences: preferences || {},
                capabilities: capabilitiesResult.rows,
                learningProgress: progressResult.rows,
                credits: creditsResult.rows[0] || null,
                recentActivity: activityResult.rows
            };
        }
        catch (error) {
            console.error('Error getting user with stats:', error);
            return null;
        }
    }
    async updateUserRole(userId, role) {
        try {
            const result = await this.db.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [role, userId]);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error updating user role:', error);
            return false;
        }
    }
    async suspendUser(userId, reason) {
        let client;
        try {
            client = await this.db.connect();
            await client.query('BEGIN');
            await client.query(`UPDATE user_preferences 
         SET notifications_email = false, 
             notifications_push = false,
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1`, [userId]);
            await client.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError);
                }
            }
            console.error('Error suspending user:', error);
            return false;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    async getUserStatistics() {
        try {
            const totalResult = await this.db.query('SELECT COUNT(*) FROM users');
            const totalUsers = parseInt(totalResult.rows[0].count);
            const activeResult = await this.db.query('SELECT COUNT(*) FROM users WHERE last_login_at > CURRENT_TIMESTAMP - INTERVAL \'30 days\'');
            const activeUsers = parseInt(activeResult.rows[0].count);
            const todayResult = await this.db.query('SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE');
            const newUsersToday = parseInt(todayResult.rows[0].count);
            const weekResult = await this.db.query('SELECT COUNT(*) FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL \'7 days\'');
            const newUsersThisWeek = parseInt(weekResult.rows[0].count);
            const monthResult = await this.db.query('SELECT COUNT(*) FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL \'30 days\'');
            const newUsersThisMonth = parseInt(monthResult.rows[0].count);
            const roleResult = await this.db.query('SELECT role, COUNT(*) FROM users GROUP BY role');
            const usersByRole = { user: 0, admin: 0 };
            roleResult.rows.forEach(row => {
                usersByRole[row.role] = parseInt(row.count);
            });
            return {
                totalUsers,
                activeUsers,
                newUsersToday,
                newUsersThisWeek,
                newUsersThisMonth,
                usersByRole
            };
        }
        catch (error) {
            console.error('Error getting user statistics:', error);
            throw error;
        }
    }
    async batchUpdateUsers(userIds, updates) {
        let client;
        try {
            client = await this.db.connect();
            await client.query('BEGIN');
            let updatedCount = 0;
            for (const userId of userIds) {
                const success = await this.updateUser(userId, updates);
                if (success)
                    updatedCount++;
            }
            await client.query('COMMIT');
            return updatedCount;
        }
        catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError);
                }
            }
            console.error('Error batch updating users:', error);
            throw error;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    async batchDeleteUsers(userIds) {
        let client;
        try {
            client = await this.db.connect();
            await client.query('BEGIN');
            const result = await client.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
            await client.query('COMMIT');
            return result.rowCount ?? 0;
        }
        catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError);
                }
            }
            console.error('Error batch deleting users:', error);
            throw error;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map