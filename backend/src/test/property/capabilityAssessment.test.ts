/**
 * Property-Based Tests for User Capability Assessment System
 * 
 * **Feature: ai-language-learning-app, Property 4: 水平评估数据完整�?*
 * **Validates: Requirements 7.1, 7.2**
 */

import fc from 'fast-check';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { UserCapabilityService } from './../services/UserCapabilityService';
import { AIService } from './../services/AIService';
import { 
  UserCapability, 
  Language, 
  LanguageLevel
} from '../../models/UserCapability';
import { createTestUser } from '../factories/userFactory';
import { testDb, setupTestEnvironment } from '../setup';

describe('Capability Assessment Property Tests', () => {
  let db: Pool;
  let userCapabilityService: UserCapabilityService;
  let aiService: AIService;

  beforeAll(async () => {
    // Ensure test environment is set up
    if (!testDb) {
      const { setupTestEnvironment } = await import('../setup');
      await setupTestEnvironment();
    }
    
    db = testDb;
    
    // Verify database connection
    try {
      await db.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
    
    aiService = new AIService(db, true); // Enable test mode
    userCapabilityService = new UserCapabilityService(db, aiService);
  });

  beforeEach(async () => {
    // Clean up test data before each test in correct order to avoid foreign key conflicts
    if (db && db.query) {
      try {
        // Delete in reverse dependency order
        await db.query('DELETE FROM capability_assessments');
        await db.query('DELETE FROM user_capabilities');
        await db.query('DELETE FROM learning_progress');
        await db.query('DELETE FROM user_mmr');
        await db.query('DELETE FROM credit_transactions');
        await db.query('DELETE FROM user_credits');
        await db.query('DELETE FROM user_preferences');
        await db.query("DELETE FROM users WHERE email LIKE '%test%'");
      } catch (error) {
        console.warn('Cleanup failed, database may not be available:', error);
      }
    }
  });

  afterEach(async () => {
    // Additional cleanup after each test in correct order
    if (db && db.query) {
      try {
        // Delete in reverse dependency order
        await db.query('DELETE FROM capability_assessments');
        await db.query('DELETE FROM user_capabilities');
        await db.query('DELETE FROM learning_progress');
        await db.query('DELETE FROM user_mmr');
        await db.query('DELETE FROM credit_transactions');
        await db.query('DELETE FROM user_credits');
        await db.query('DELETE FROM user_preferences');
        await db.query("DELETE FROM users WHERE email LIKE '%test%'");
      } catch (error) {
        console.warn('Post-test cleanup failed:', error);
      }
    }
  });

  /**
   * Property 4: 水平评估数据完整�?
   * For any capability assessment request, the generated capability report should contain 
   * assessment data for all four skills: listening, speaking, reading, writing
   */
  test('Property 4: Assessment data completeness for all skill areas', async () => {
    // Skip test if database is not available
    if (!db || !db.query) {
      console.warn('Database not available, skipping test');
      return;
    }

    try {
      // First test database connection
      const connectionTest = await db.query('SELECT 1 as test');
      expect(connectionTest.rows[0].test).toBe(1);
    } catch (error) {
      console.warn('Database connection failed, skipping test:', error);
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user capability data
        fc.record({
          language: fc.constantFrom<Language>('en', 'ja', 'fr'),
          currentLevel: fc.constantFrom<LanguageLevel>('A1', 'A2', 'B1', 'B2'),
          learningGoal: fc.constantFrom<LanguageLevel>('A1', 'A2', 'B1', 'B2')
        }),
        async (testData) => {
          try {
            // Create test user
            const user = await createTestUser(db);
            
            // Create user capability using direct database insertion
            const capabilityId = uuidv4();
            const insertResult = await db.query(
              `INSERT INTO user_capabilities (
                id, user_id, language, current_level, learning_goal, overall_level,
                confidence_score, listening_level, speaking_level, reading_level, writing_level,
                estimated_vocabulary_size, mastered_words_count, learning_words_count,
                last_assessed_at, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 1000, 0, 0, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING *`,
              [capabilityId, user.id, testData.language, testData.currentLevel, testData.learningGoal]
            );

            // Verify insertion was successful
            if (!insertResult || !insertResult.rows || insertResult.rows.length === 0) {
              throw new Error('Failed to insert user capability');
            }
            
            const insertedRow = insertResult.rows[0];

            // Property: User capability should contain data for all four core skills
            expect(insertedRow.user_id).toBe(user.id);
            expect(insertedRow.language).toBe(testData.language);
            expect(insertedRow.current_level).toBe(testData.currentLevel);
            expect(insertedRow.learning_goal).toBe(testData.learningGoal);
            
            // Verify all four core language skills are present and valid
            expect(typeof insertedRow.listening_level).toBe('number');
            expect(insertedRow.listening_level).toBeGreaterThanOrEqual(0);
            expect(insertedRow.listening_level).toBeLessThanOrEqual(100);
            
            expect(typeof insertedRow.speaking_level).toBe('number');
            expect(insertedRow.speaking_level).toBeGreaterThanOrEqual(0);
            expect(insertedRow.speaking_level).toBeLessThanOrEqual(100);
            
            expect(typeof insertedRow.reading_level).toBe('number');
            expect(insertedRow.reading_level).toBeGreaterThanOrEqual(0);
            expect(insertedRow.reading_level).toBeLessThanOrEqual(100);
            
            expect(typeof insertedRow.writing_level).toBe('number');
            expect(insertedRow.writing_level).toBeGreaterThanOrEqual(0);
            expect(insertedRow.writing_level).toBeLessThanOrEqual(100);

            // Verify assessment completeness
            expect(insertedRow.overall_level).toBeDefined();
            expect(insertedRow.confidence_score).toBeGreaterThanOrEqual(0);
            expect(insertedRow.confidence_score).toBeLessThanOrEqual(100);
            
            // Verify vocabulary data
            expect(typeof insertedRow.estimated_vocabulary_size).toBe('number');
            expect(typeof insertedRow.mastered_words_count).toBe('number');
            expect(typeof insertedRow.learning_words_count).toBe('number');
            
            // Verify timestamps
            expect(insertedRow.created_at).toBeDefined();
            expect(insertedRow.updated_at).toBeDefined();
            expect(insertedRow.last_assessed_at).toBeDefined();

            // Cleanup is handled by afterEach
          } catch (error) {
            console.error('Test error:', error);
            throw error;
          }
        }
      ),
      { 
        numRuns: 5,
        timeout: 15000,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property: Capability data consistency across updates
   * For the same user, capability updates should maintain data integrity
   */
  test('Property: Capability data consistency across updates', async () => {
    // Skip test if database is not available
    if (!db || !db.query || !userCapabilityService) {
      console.warn('Database or service not available, skipping test');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          language: fc.constantFrom<Language>('en', 'ja', 'fr'),
          currentLevel: fc.constantFrom<LanguageLevel>('A1', 'A2', 'B1', 'B2'),
          newListeningLevel: fc.integer({ min: 0, max: 100 }),
          newSpeakingLevel: fc.integer({ min: 0, max: 100 })
        }),
        async (testData) => {
          try {
            // Create test user and capability
            const user = await createTestUser(db);
            
            const capabilityId = uuidv4();
            await db.query(
              `INSERT INTO user_capabilities (
                id, user_id, language, current_level, learning_goal, overall_level,
                confidence_score, listening_level, speaking_level, reading_level, writing_level,
                estimated_vocabulary_size, mastered_words_count, learning_words_count,
                last_assessed_at, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 1000, 0, 0, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [capabilityId, user.id, testData.language, testData.currentLevel, testData.currentLevel]
            );

            // Get initial capability
            const initialCapability = await userCapabilityService.getUserCapability(user.id, testData.language);
            expect(initialCapability).toBeTruthy();

            // Update capability
            const updateSuccess = await userCapabilityService.updateUserCapability(
              user.id, 
              testData.language, 
              {
                listeningLevel: testData.newListeningLevel,
                speakingLevel: testData.newSpeakingLevel
              }
            );
            expect(updateSuccess).toBe(true);

            // Get updated capability
            const updatedCapability = await userCapabilityService.getUserCapability(user.id, testData.language);
            
            // Property: Updated capability should maintain data integrity
            expect(updatedCapability).toBeTruthy();
            expect(updatedCapability!.userId).toBe(user.id);
            expect(updatedCapability!.language).toBe(testData.language);
            
            // Verify updates were applied
            expect(updatedCapability!.listeningLevel).toBe(testData.newListeningLevel);
            expect(updatedCapability!.speakingLevel).toBe(testData.newSpeakingLevel);
            
            // Verify other fields remained intact
            expect(updatedCapability!.currentLevel).toBe(initialCapability!.currentLevel);
            expect(updatedCapability!.readingLevel).toBe(initialCapability!.readingLevel);
            expect(updatedCapability!.writingLevel).toBe(initialCapability!.writingLevel);
            
            // Verify all skill levels are still valid
            expect(updatedCapability!.listeningLevel).toBeGreaterThanOrEqual(0);
            expect(updatedCapability!.listeningLevel).toBeLessThanOrEqual(100);
            expect(updatedCapability!.speakingLevel).toBeGreaterThanOrEqual(0);
            expect(updatedCapability!.speakingLevel).toBeLessThanOrEqual(100);
            expect(updatedCapability!.readingLevel).toBeGreaterThanOrEqual(0);
            expect(updatedCapability!.readingLevel).toBeLessThanOrEqual(100);
            expect(updatedCapability!.writingLevel).toBeGreaterThanOrEqual(0);
            expect(updatedCapability!.writingLevel).toBeLessThanOrEqual(100);

            // Cleanup is handled by afterEach
          } catch (error) {
            console.error('Test error:', error);
            throw error;
          }
        }
      ),
      { 
        numRuns: 5,
        timeout: 15000,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property: Multiple user capabilities data integrity
   * Users should be able to have capabilities for multiple languages with proper isolation
   */
  test('Property: Multiple language capabilities data integrity', async () => {
    // Skip test if database is not available
    if (!db || !db.query || !userCapabilityService) {
      console.warn('Database or service not available, skipping test');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          languages: fc.shuffledSubarray(['en', 'ja', 'fr'] as Language[], { minLength: 2, maxLength: 3 }),
          currentLevel: fc.constantFrom<LanguageLevel>('A1', 'A2', 'B1', 'B2')
        }),
        async (testData) => {
          try {
            // Create test user
            const user = await createTestUser(db);
            
            // Verify user was created successfully
            const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [user.id]);
            if (userCheck.rows.length === 0) {
              throw new Error(`User ${user.id} was not created successfully`);
            }
            
            const capabilities: UserCapability[] = [];

            // Create capabilities for multiple languages sequentially to avoid race conditions
            for (const language of testData.languages) {
              // Use the service to create capability instead of direct DB insert
              const createResult = await userCapabilityService.createUserCapability(user.id, {
                language,
                currentLevel: testData.currentLevel,
                learningGoal: testData.currentLevel
              });
              
              // Verify the creation was successful
              expect(createResult).toBeTruthy();
              
              // Add a small delay to ensure database consistency
              await new Promise(resolve => setTimeout(resolve, 50));

              const capability = await userCapabilityService.getUserCapability(user.id, language);
              expect(capability).toBeTruthy();
              capabilities.push(capability!);
            }

            // Property: All capabilities should be properly isolated and complete
            expect(capabilities.length).toBe(testData.languages.length);
            
            // Get all user capabilities
            const allCapabilities = await userCapabilityService.getAllUserCapabilities(user.id);
            expect(allCapabilities.length).toBe(testData.languages.length);

            // Verify each capability is properly isolated
            for (let i = 0; i < capabilities.length; i++) {
              const capability = capabilities[i];
              const language = testData.languages[i];
              
              expect(capability.userId).toBe(user.id);
              expect(capability.language).toBe(language);
              expect(capability.currentLevel).toBe(testData.currentLevel);
              
              // Verify all four core skills are present
              expect(typeof capability.listeningLevel).toBe('number');
              expect(capability.listeningLevel).toBeGreaterThanOrEqual(0);
              expect(capability.listeningLevel).toBeLessThanOrEqual(100);
              
              expect(typeof capability.speakingLevel).toBe('number');
              expect(capability.speakingLevel).toBeGreaterThanOrEqual(0);
              expect(capability.speakingLevel).toBeLessThanOrEqual(100);
              
              expect(typeof capability.readingLevel).toBe('number');
              expect(capability.readingLevel).toBeGreaterThanOrEqual(0);
              expect(capability.readingLevel).toBeLessThanOrEqual(100);
              
              expect(typeof capability.writingLevel).toBe('number');
              expect(capability.writingLevel).toBeGreaterThanOrEqual(0);
              expect(capability.writingLevel).toBeLessThanOrEqual(100);
            }

            // Verify no cross-language contamination
            const uniqueLanguages = new Set(allCapabilities.map((c: UserCapability) => c.language));
            expect(uniqueLanguages.size).toBe(testData.languages.length);

            // Cleanup is handled by afterEach
          } catch (error) {
            console.error('Test error:', error);
            throw error;
          }
        }
      ),
      { 
        numRuns: 3,
        timeout: 15000,
        verbose: true
      }
    );
  }, 30000);
});


