import jwt from 'jsonwebtoken';
import { TestUser } from '../factories/userFactory';
import { testDb } from '../setup';

export class TestHelpers {
  // Generate JWT token for testing
  static generateAuthToken(user: TestUser): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }

  // Insert test user into database
  static async insertUser(user: TestUser): Promise<void> {
    const query = `
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await testDb.query(query, [
      user.id,
      user.username,
      user.email,
      user.passwordHash,
      user.role,
      new Date()
    ]);
  }

  // Insert test user credits
  static async insertUserCredits(userId: string, balance: number = 100): Promise<void> {
    const query = `
      INSERT INTO user_credits (user_id, current_balance, created_at)
      VALUES ($1, $2, $3)
    `;
    
    await testDb.query(query, [userId, balance, new Date()]);
  }

  // Get user from database
  static async getUser(userId: string): Promise<any> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await testDb.query(query, [userId]);
    return result.rows[0];
  }

  // Get user credits from database
  static async getUserCredits(userId: string): Promise<any> {
    const query = 'SELECT * FROM user_credits WHERE user_id = $1';
    const result = await testDb.query(query, [userId]);
    return result.rows[0];
  }

  // Wait for a specified amount of time (for async operations)
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate random string
  static randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, length + 2);
  }

  // Generate random email
  static randomEmail(): string {
    return `test_${this.randomString()}@example.com`;
  }

  // Generate random integer between min and max
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Create mock request object
  static createMockRequest(overrides: any = {}): any {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      ...overrides
    };
  }

  // Create mock response object
  static createMockResponse(): any {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
  }

  // Create mock next function
  static createMockNext(): jest.Mock {
    return jest.fn();
  }

  // Assert that response has correct structure
  static assertSuccessResponse(response: any, expectedData?: any): void {
    expect(response.success).toBe(true);
    if (expectedData) {
      expect(response.data).toEqual(expectedData);
    }
  }

  // Assert that response has error structure
  static assertErrorResponse(response: any, expectedMessage?: string): void {
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    if (expectedMessage) {
      expect(response.error.message).toContain(expectedMessage);
    }
  }

  // Clean up test data - delete user and all related data
  static async cleanupUser(userId: string): Promise<void> {
    try {
      // Delete in order to respect foreign key constraints
      await testDb.query('DELETE FROM credit_transactions WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM user_credits WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM vocabulary_words WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM practice_results WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM practice_groups WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM mmr_history WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM match_requests WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM user_mmr WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM learning_progress WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM user_capabilities WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
      await testDb.query('DELETE FROM users WHERE id = $1', [userId]);
    } catch (error) {
      console.warn('Error cleaning up test user:', error);
    }
  }

  // Clean up all test data
  static async cleanupAllTestData(): Promise<void> {
    try {
      // Get all test users (those with usernames starting with test patterns)
      const result = await testDb.query(
        `SELECT id FROM users WHERE username LIKE 'user_%' OR email LIKE '%@example.com'`
      );
      
      for (const row of result.rows) {
        await this.cleanupUser(row.id);
      }
    } catch (error) {
      console.warn('Error cleaning up all test data:', error);
    }
  }
}


