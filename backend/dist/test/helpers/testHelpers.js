"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestHelpers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const setup_1 = require("../setup");
class TestHelpers {
    static generateAuthToken(user) {
        return jsonwebtoken_1.default.sign({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
    }
    static async insertUser(user) {
        const query = `
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
        await setup_1.testDb.query(query, [
            user.id,
            user.username,
            user.email,
            user.passwordHash,
            user.role,
            new Date()
        ]);
    }
    static async insertUserCredits(userId, balance = 100) {
        const query = `
      INSERT INTO user_credits (user_id, current_balance, created_at)
      VALUES ($1, $2, $3)
    `;
        await setup_1.testDb.query(query, [userId, balance, new Date()]);
    }
    static async getUser(userId) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await setup_1.testDb.query(query, [userId]);
        return result.rows[0];
    }
    static async getUserCredits(userId) {
        const query = 'SELECT * FROM user_credits WHERE user_id = $1';
        const result = await setup_1.testDb.query(query, [userId]);
        return result.rows[0];
    }
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static randomString(length = 10) {
        return Math.random().toString(36).substring(2, length + 2);
    }
    static randomEmail() {
        return `test_${this.randomString()}@example.com`;
    }
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static createMockRequest(overrides = {}) {
        return {
            body: {},
            params: {},
            query: {},
            headers: {},
            user: null,
            ...overrides
        };
    }
    static createMockResponse() {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis(),
        };
        return res;
    }
    static createMockNext() {
        return jest.fn();
    }
    static assertSuccessResponse(response, expectedData) {
        expect(response.success).toBe(true);
        if (expectedData) {
            expect(response.data).toEqual(expectedData);
        }
    }
    static assertErrorResponse(response, expectedMessage) {
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
        if (expectedMessage) {
            expect(response.error.message).toContain(expectedMessage);
        }
    }
    static async cleanupUser(userId) {
        try {
            await setup_1.testDb.query('DELETE FROM credit_transactions WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM user_credits WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM vocabulary_words WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM practice_results WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM practice_groups WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM mmr_history WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM match_requests WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM user_mmr WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM learning_progress WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM user_capabilities WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
            await setup_1.testDb.query('DELETE FROM users WHERE id = $1', [userId]);
        }
        catch (error) {
            console.warn('Error cleaning up test user:', error);
        }
    }
    static async cleanupAllTestData() {
        try {
            const result = await setup_1.testDb.query(`SELECT id FROM users WHERE username LIKE 'user_%' OR email LIKE '%@example.com'`);
            for (const row of result.rows) {
                await this.cleanupUser(row.id);
            }
        }
        catch (error) {
            console.warn('Error cleaning up all test data:', error);
        }
    }
}
exports.TestHelpers = TestHelpers;
//# sourceMappingURL=testHelpers.js.map