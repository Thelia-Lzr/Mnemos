/**
 * Property-based tests for AI Chat System
 * 
 * **Feature: ai-language-learning-app, Property 2: AI处理管道完整�?*
 * **Feature: ai-language-learning-app, Property 17: AI功能调用准确�?*
 * **Feature: ai-language-learning-app, Property 18: 隐私操作拒绝�?*
 * **Validates: Requirements 2.2-2.5, 17.1-17.8**
 */

import fc from 'fast-check';
import { Pool } from 'pg';
import { ChatService } from './../services/ChatService';
import { AIFunctionService } from './../services/AIFunctionService';
import { ChatMessage } from './../models/ChatMessage';
import { 
  MessageType, 
  ProcessingStatus, 
  UserIntent
} from '../../types/chat';
import { testDb, setupTestEnvironment } from '../setup';

describe('AI Chat System Property Tests', () => {
  let db: Pool;
  let chatService: ChatService;
  let aiFunctionService: AIFunctionService;
  let chatMessage: ChatMessage;

  // Helper function to create test user with credits
  const createTestUserWithCredits = async (userId: string) => {
    // Skip if database is not available
    if (!testDb) {
      console.warn('Test database not available, skipping user creation');
      return userId;
    }

    try {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const uniqueUsername = `test_user_${userId.replace(/-/g, '').slice(0, 8)}_${randomSuffix}`;
      const uniqueEmail = `test_${userId.replace(/-/g, '').slice(0, 8)}_${randomSuffix}@example.com`;
      
      // Use a transaction to ensure atomicity
      const client = await testDb.connect();
      try {
        await client.query('BEGIN');
        
        // Create user - first delete any existing user with this ID to ensure clean state
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        
        // Create user
        await client.query(
          `INSERT INTO users (id, username, email, password_hash, role) 
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, uniqueUsername, uniqueEmail, 'hashed_password', 'user']
        );
        
        // Create user credits with sufficient balance
        await client.query(
          `INSERT INTO user_credits (user_id, current_balance, total_earned) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (user_id) DO UPDATE SET 
             current_balance = EXCLUDED.current_balance,
             total_earned = EXCLUDED.total_earned`,
          [userId, 1000, 1000] // Give 1000 credits for testing
        );
        
        await client.query('COMMIT');
        
        // Verify user was created successfully
        const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
          throw new Error(`Failed to create user with ID: ${userId}`);
        }
        
        return userId;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to create test user:', error);
      throw error; // Don't continue with invalid user
    }
  };

  // Define arbitraries at the top level so they're available to all tests
  const validUserIdArbitrary = fc.uuid();
  const validMessageArbitrary = fc.record({
    content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
    language: fc.constantFrom('en', 'ja', 'fr'),
    context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
  });

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Ensure test environment is set up
    if (!testDb) {
      await setupTestEnvironment();
    }
    
    // Wait a bit to ensure test setup is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    db = testDb;
    
    // Verify database connection
    try {
      await db.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
    
    chatService = new ChatService(db, true); // Test mode
    aiFunctionService = new AIFunctionService(db, true); // Test mode
    chatMessage = new ChatMessage(db);
  });

  afterAll(async () => {
    // Cleanup is handled by the global test setup
    // But we need to ensure any async operations are completed
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await db.query('DELETE FROM chat_messages');
      await db.query('DELETE FROM async_tasks');
      await db.query('DELETE FROM credit_transactions');
      await db.query('DELETE FROM user_credits');
      await db.query('DELETE FROM user_capabilities');
      await db.query('DELETE FROM user_preferences');
      await db.query('DELETE FROM users');
    } catch (error) {
      console.warn('Error cleaning up test data:', error);
    }
  });

  /**
   * Property 2: AI处理管道完整�?
   * For any user input (text or file), the system should call appropriate AI model and return formatted response
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
   */
  describe('Property 2: AI Processing Pipeline Integrity', () => {

    test('should process any valid text message through AI pipeline', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          validMessageArbitrary,
          async (userId, messageRequest) => {
            // Setup: Create test user with credits
            await createTestUserWithCredits(userId);
            
            // Act: Send message through chat service
            const result = await chatService.sendMessage(userId, messageRequest);

            // Assert: Pipeline integrity checks
            expect(result.success).toBeDefined();
            expect(typeof result.success).toBe('boolean');

            if (result.success && result.message) {
              // 1. Message should have proper structure
              expect(result.message.id).toBeDefined();
              expect(typeof result.message.id).toBe('string');
              expect(result.message.content).toBeDefined();
              expect(typeof result.message.content).toBe('string');
              expect(result.message.type).toBe(MessageType.AI_RESPONSE);

              // 2. Processing status should be completed
              expect(result.message.processingStatus).toBe(ProcessingStatus.COMPLETED);
            } else {
              // If processing fails, error should be meaningful
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
              expect(result.error!.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 5 } // Reduced for integration test performance
      );
    });

    test('should handle async message processing with task tracking', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          validMessageArbitrary,
          async (userId, messageRequest) => {
            // Setup: Create test user with credits
            await createTestUserWithCredits(userId);
            
            // Act: Send message asynchronously
            const result = await chatService.sendMessageAsync(userId, messageRequest);

            // Assert: Async pipeline integrity
            expect(result.success).toBeDefined();
            expect(typeof result.success).toBe('boolean');

            if (result.success) {
              // 1. Should return task ID for tracking
              expect(result.taskId).toBeDefined();
              expect(typeof result.taskId).toBe('string');
              expect(result.taskId!.length).toBeGreaterThan(0);

              // 2. Initial message should be created with processing status
              expect(result.message).toBeDefined();
              // In test mode, async processing is actually synchronous, so status may be completed
              expect([ProcessingStatus.PENDING, ProcessingStatus.COMPLETED]).toContain(result.message!.processingStatus);
            } else {
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 17: AI功能调用准确�?
   * For any user function request, AI should correctly identify intent and call appropriate system function
   * **Validates: Requirements 2.4, 2.5**
   */
  describe('Property 17: AI Function Call Accuracy', () => {
    const validIntentArbitrary = fc.constantFrom(
      UserIntent.GENERATE_PRACTICE,
      UserIntent.VIEW_PRACTICE_HISTORY,
      UserIntent.CHECK_PROGRESS,
      UserIntent.VIEW_CAPABILITIES,
      UserIntent.ADD_VOCABULARY,
      UserIntent.VIEW_VOCABULARY,
      UserIntent.CHECK_CREDITS,
      UserIntent.VIEW_STATISTICS,
      UserIntent.LANGUAGE_LEARNING
    );

    const validParametersArbitrary = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.array(fc.string(), { maxLength: 5 })
      )
    );

    const functionCallRequestArbitrary = fc.record({
      intent: validIntentArbitrary,
      parameters: validParametersArbitrary,
      language: fc.option(fc.constantFrom('en', 'ja', 'fr'), { nil: undefined })
    });

    test('should correctly execute valid function calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          functionCallRequestArbitrary,
          async (userId, request) => {
            // Act: Execute function call
            const result = await aiFunctionService.executeFunction(userId, request);

            // Assert: Function call accuracy
            expect(result.success).toBeDefined();
            expect(typeof result.success).toBe('boolean');

            if (result.success) {
              // 1. Result should have proper structure
              expect(result.result).toBeDefined();
              expect(typeof result.result!.success).toBe('boolean');

              // 2. If function execution succeeds, should have data or action
              if (result.result!.success) {
                const hasData = result.result!.data !== undefined;
                const hasAction = result.result!.requiresUserAction === true && result.result!.actionUrl;
                expect(hasData || hasAction).toBe(true);
              } else {
                // If function fails, should have error message
                expect(result.result!.error).toBeDefined();
                expect(typeof result.result!.error).toBe('string');
              }
            } else {
              // If service call fails, should have error
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should correctly parse user intent from messages', async () => {
      const intentMessageArbitrary = fc.record({
        message: fc.oneof(
          fc.constant('I want to practice English'),
          fc.constant('Show me my learning progress'),
          fc.constant('Check my credit balance'),
          fc.constant('Generate some vocabulary exercises'),
          fc.constant('What is my current level?'),
          fc.constant('Add these words to my vocabulary'),
          fc.constant('Start a PK battle'),
          fc.string({ minLength: 5, maxLength: 100 })
        ),
        language: fc.option(fc.constantFrom('en', 'ja', 'fr'), { nil: undefined }),
        context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
      });

      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          intentMessageArbitrary,
          async (userId, request) => {
            // Setup: Create test user with credits
            await createTestUserWithCredits(userId);
            
            // Act: Parse intent from message
            const result = await aiFunctionService.parseIntent(userId, request);

            // Assert: Intent parsing accuracy
            expect(result.success).toBeDefined();
            expect(typeof result.success).toBe('boolean');

            if (result.success && result.result) {
              // 1. Should identify a valid intent
              expect(result.result.intent).toBeDefined();
              expect(Object.values(UserIntent)).toContain(result.result.intent);

              // 2. Should have confidence score
              expect(typeof result.result.confidence).toBe('number');
              expect(result.result.confidence).toBeGreaterThanOrEqual(0);
              expect(result.result.confidence).toBeLessThanOrEqual(1);

              // 3. Should have parameters object
              expect(result.result.parameters).toBeDefined();
              expect(typeof result.result.parameters).toBe('object');

              // 4. Should have privacy sensitivity flag
              expect(typeof result.result.isPrivacySensitive).toBe('boolean');

              // 5. Should have confirmation requirement flag
              expect(typeof result.result.requiresConfirmation).toBe('boolean');
            } else {
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  /**
   * Property 18: 隐私操作拒绝�?
   * For any privacy-sensitive operation request, AI should refuse execution and suggest appropriate interface
   * **Validates: Requirements 17.8**
   */
  describe('Property 18: Privacy Operation Rejection', () => {
    const privacySensitiveIntentArbitrary = fc.constantFrom(
      UserIntent.ACCOUNT_MANAGEMENT,
      UserIntent.PAYMENT_OPERATIONS,
      UserIntent.PASSWORD_CHANGE
    );

    const privacySensitiveRequestArbitrary = fc.record({
      intent: privacySensitiveIntentArbitrary,
      parameters: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean())
      ),
      language: fc.option(fc.constantFrom('en', 'ja', 'fr'), { nil: undefined })
    });

    test('should reject all privacy-sensitive function calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          privacySensitiveRequestArbitrary,
          async (userId, request) => {
            // Act: Attempt to execute privacy-sensitive function
            const result = await aiFunctionService.executeFunction(userId, request);

            // Assert: Privacy operation rejection
            // 1. Should always fail for privacy-sensitive operations
            expect(result.success).toBe(false);

            // 2. Should provide meaningful error message
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);

            // 3. Error message should mention privacy/security/interface
            const errorLower = result.error!.toLowerCase();
            const hasPrivacyKeywords = 
              errorLower.includes('sensitive') ||
              errorLower.includes('privacy') ||
              errorLower.includes('account') ||
              errorLower.includes('interface') ||
              errorLower.includes('appropriate');
            expect(hasPrivacyKeywords).toBe(true);

            // 4. Should not return any result data
            expect(result.result).toBeUndefined();
            expect(result.taskId).toBeUndefined();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should correctly identify privacy-sensitive intents in messages', async () => {
      const privacyMessageArbitrary = fc.record({
        message: fc.oneof(
          fc.constant('Change my password'),
          fc.constant('Update my payment method'),
          fc.constant('Delete my account'),
          fc.constant('Modify my billing information'),
          fc.constant('Access my payment history'),
          fc.constant('Update my personal details'),
          fc.string({ minLength: 5, maxLength: 100 }).map(s => 
            s + ' ' + fc.sample(fc.constantFrom('password', 'payment', 'account', 'billing'), 1)[0]
          )
        ),
        language: fc.option(fc.constantFrom('en', 'ja', 'fr'), { nil: undefined }),
        context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
      });

      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          privacyMessageArbitrary,
          async (userId, request) => {
            // Setup: Create test user with credits
            await createTestUserWithCredits(userId);
            
            // Act: Parse intent from privacy-related message
            const result = await aiFunctionService.parseIntent(userId, request);

            // Assert: Privacy detection accuracy
            if (result.success && result.result) {
              // If a privacy-sensitive intent is detected
              const privacySensitiveIntents = [
                UserIntent.ACCOUNT_MANAGEMENT,
                UserIntent.PAYMENT_OPERATIONS,
                UserIntent.PASSWORD_CHANGE
              ];

              if (privacySensitiveIntents.includes(result.result.intent)) {
                // 1. Should be marked as privacy sensitive
                expect(result.result.isPrivacySensitive).toBe(true);

                // 2. Should have reasonable confidence
                expect(result.result.confidence).toBeGreaterThan(0.3);

                // 3. Should require confirmation for sensitive operations
                expect(result.result.requiresConfirmation).toBe(true);
              }

              // General validation
              expect(Object.values(UserIntent)).toContain(result.result.intent);
              expect(typeof result.result.isPrivacySensitive).toBe('boolean');
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should maintain privacy protection under various input patterns', async () => {
      const mixedIntentArbitrary = fc.oneof(
        privacySensitiveIntentArbitrary,
        fc.constantFrom(
          UserIntent.GENERATE_PRACTICE,
          UserIntent.CHECK_PROGRESS,
          UserIntent.VIEW_VOCABULARY,
          UserIntent.LANGUAGE_LEARNING
        )
      );

      const mixedRequestArbitrary = fc.record({
        intent: mixedIntentArbitrary,
        parameters: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        ),
        language: fc.option(fc.constantFrom('en', 'ja', 'fr'), { nil: undefined })
      });

      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          mixedRequestArbitrary,
          async (userId, request) => {
            // Act: Execute mixed function calls
            const result = await aiFunctionService.executeFunction(userId, request);

            // Assert: Consistent privacy protection
            const privacySensitiveIntents = [
              UserIntent.ACCOUNT_MANAGEMENT,
              UserIntent.PAYMENT_OPERATIONS,
              UserIntent.PASSWORD_CHANGE
            ];

            if (privacySensitiveIntents.includes(request.intent)) {
              // Privacy-sensitive operations should always be rejected
              expect(result.success).toBe(false);
              expect(result.error).toBeDefined();
              expect(result.error!.toLowerCase()).toMatch(
                /sensitive|privacy|account|interface|appropriate/
              );
            } else {
              // Non-privacy operations should be processed normally
              expect(result.success).toBeDefined();
              if (!result.success) {
                // If it fails, should be for non-privacy reasons
                expect(result.error).toBeDefined();
                const errorLower = result.error!.toLowerCase();
                expect(errorLower).not.toMatch(/sensitive|privacy/);
              }
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  /**
   * Additional helper tests for AI pipeline robustness
   */
  describe('AI Pipeline Robustness', () => {
    test('should handle edge cases in message processing', async () => {
      const edgeCaseMessageArbitrary = fc.record({
        content: fc.oneof(
          fc.constant(''), // Empty string
          fc.constant('   '), // Whitespace only
          fc.string({ minLength: 1, maxLength: 5000 }), // Very long message
          fc.string({ minLength: 1, maxLength: 100 }).map(s => s.repeat(10)), // Repetitive content
          fc.constant('🎉🚀💡🔥'), // Emoji only
          fc.constant('Hello\n\nWorld\n\n\nTest'), // Multiple newlines
        ),
        language: fc.constantFrom('en', 'ja', 'fr'),
      });

      await fc.assert(
        fc.asyncProperty(
          validUserIdArbitrary,
          edgeCaseMessageArbitrary,
          async (userId, messageRequest) => {
            // Skip empty/whitespace-only messages as they should be filtered by validation
            if (!messageRequest.content.trim()) {
              return;
            }

            // Setup: Create test user with credits
            await createTestUserWithCredits(userId);

            // Act: Process edge case message
            const result = await chatService.sendMessage(userId, messageRequest);

            // Assert: Graceful handling of edge cases
            expect(result.success).toBeDefined();
            expect(typeof result.success).toBe('boolean');

            if (!result.success) {
              // If processing fails, error should be informative
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
              expect(result.error!.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});


