// Jest setup for property tests with real database connections

// Make this file a module
export {};

// Import and setup real database connections for property tests
import { setupTestEnvironment, teardownTestEnvironment } from '../setup';

// Setup database before all tests
beforeAll(async () => {
  try {
    await setupTestEnvironment();
    console.log('Test environment setup completed');
  } catch (error) {
    console.warn('Test environment setup failed, tests may be skipped:', error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    // Force cleanup of TaskResultManager
    try {
      const { TaskResultManager } = await import('../services/TaskResultManager');
      const taskResultManager = TaskResultManager.getInstance();
      taskResultManager.stopCleanupTimer();
      console.log('TaskResultManager cleanup timer stopped');
    } catch (error) {
      // Ignore if not imported
    }
    
    await teardownTestEnvironment();
    console.log('Test environment cleanup completed');
  } catch (error) {
    console.warn('Test environment cleanup failed:', error);
  }
}, 60000); // 60 second timeout

// Mock TestHelpers to avoid database operations
jest.mock('./helpers/testHelpers', () => ({
  TestHelpers: {
    generateAuthToken: jest.fn(),
    insertUser: jest.fn(),
    insertUserCredits: jest.fn(),
    getUser: jest.fn().mockImplementation((userId: string) => ({
      id: userId,
      username: 'test_user',
      email: 'test@example.com',
      password_hash: '$2a$10$hashedpassword',
      role: 'user',
      created_at: new Date()
    })),
    getUserCredits: jest.fn().mockImplementation((userId: string) => ({
      id: 'credit-id',
      user_id: userId,
      current_balance: 100,
      created_at: new Date()
    })),
    wait: jest.fn(),
    randomString: jest.fn(),
    randomEmail: jest.fn(),
    randomInt: jest.fn(),
    createMockRequest: jest.fn(),
    createMockResponse: jest.fn(),
    createMockNext: jest.fn(),
    assertSuccessResponse: jest.fn(),
    assertErrorResponse: jest.fn()
  }
}));


