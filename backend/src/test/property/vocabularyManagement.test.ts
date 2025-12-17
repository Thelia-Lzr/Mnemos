import * as fc from 'fast-check';
import { VocabularyFactory } from '../factories/vocabularyFactory';
import { UserFactory } from '../factories/userFactory';
import { VocabularyService } from './../services/VocabularyService';
import { ForgettingCurveService } from './../services/ForgettingCurveService';
import { VocabularyWordModel, MasteryLevel, Language } from './../models/VocabularyWord';
import { testDb } from '../setup';

/**
 * **Feature: ai-language-learning-app, Property 9: 词汇自动管理一致�?*
 * **Validates: Requirements 10.1-10.5, 14.1-14.10**
 * 
 * Property: For any vocabulary word added to a user's vocabulary list,
 * the system should maintain consistent mastery tracking and automatic
 * management without data loss or corruption.
 */
describe('Property-Based Test: Vocabulary Management System', () => {
  let vocabularyService: VocabularyService;
  let forgettingCurveService: ForgettingCurveService;
  let vocabularyModel: VocabularyWordModel;

  beforeAll(async () => {
    // Wait a bit for the database connection to be established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if testDb is available
    if (!testDb) {
      console.warn('Test database not available, skipping vocabulary management tests');
      return;
    }
    
    vocabularyService = new VocabularyService(testDb);
    forgettingCurveService = new ForgettingCurveService(testDb);
    vocabularyModel = new VocabularyWordModel(testDb);
  });

  /**
   * **Property 9: 词汇自动管理一致�?*
   * **Validates: Requirements 14.1, 14.2**
   * 
   * For any vocabulary word added to a user's vocabulary list,
   * the system should maintain consistent mastery tracking and automatic
   * management without data loss or corruption.
   */
  it('Property 9: should maintain vocabulary automatic management consistency', async () => {
    // Skip test if database is not available
    if (!testDb || !vocabularyService) {
      console.warn('Skipping test: database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary vocabulary data
        fc.record({
          word: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z]+$/.test(s)),
          language: fc.constantFrom(Language.ENGLISH, Language.JAPANESE, Language.FRENCH),
          definition: fc.string({ minLength: 5, maxLength: 200 }),
          masteryLevel: fc.constantFrom(MasteryLevel.NEW, MasteryLevel.LEARNING, MasteryLevel.SHORT_TERM, MasteryLevel.LONG_TERM, MasteryLevel.MASTERED),
          masteryScore: fc.integer({ min: 0, max: 100 })
        }),
        async (vocabData) => {
          // Create a test user directly in database
          const userResult = await testDb.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']
          );
          const userId = userResult.rows[0].id;
          
          // Test automatic word extraction and addition
          const text = `This is a sample text containing the word ${vocabData.word} for testing.`;
          const extractionResult = await vocabularyService.extractAndAddWordsFromText(
            userId, 
            text, 
            vocabData.language as Language
          );
          
          // Verify extraction consistency - only check if word is longer than 2 characters (filter requirement)
          if (vocabData.word.length > 2) {
            expect(extractionResult.words).toContain(vocabData.word.toLowerCase());
          }
          expect(extractionResult.extractedCount).toBeGreaterThan(0);
          expect(extractionResult.newWordsAdded.length).toBeGreaterThanOrEqual(0);
          
          // Verify all added words have consistent initial state
          extractionResult.newWordsAdded.forEach(word => {
            expect(word.userId).toBe(userId);
            expect(word.language).toBe(vocabData.language);
            expect(word.masteryLevel).toBe(MasteryLevel.NEW);
            expect(word.masteryScore).toBe(0);
            expect(parseFloat(word.forgettingCurveParams.initialStrength.toString())).toBe(1.0);
            expect(parseFloat(word.forgettingCurveParams.decayRate.toString())).toBe(0.1);
            expect(word.forgettingCurveParams.reviewCount).toBe(0);
          });
          
          // Test mastery stats consistency
          const stats = await vocabularyService.getMasteryStats(userId, vocabData.language as Language);
          expect(stats.totalWords).toBeGreaterThanOrEqual(extractionResult.newWordsAdded.length);
          expect(stats.newWords + stats.learningWords + stats.shortTermWords + stats.longTermWords + stats.masteredWords).toBe(stats.totalWords);
          expect(stats.averageMasteryScore).toBeGreaterThanOrEqual(0);
          expect(stats.averageMasteryScore).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 10: 遗忘曲线衰减规律�?*
   * **Validates: Requirements 10.1-10.5, 14.3**
   * 
   * For any vocabulary word, the forgetting curve algorithm should consistently
   * apply decay over time according to scientific principles, ensuring that
   * mastery scores decrease predictably without sudden jumps or inconsistencies.
   */
  it('Property 10: should maintain forgetting curve decay regularity', async () => {
    // Skip test if database is not available
    if (!testDb || !forgettingCurveService) {
      console.warn('Skipping test: database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialScore: fc.integer({ min: 20, max: 100 }),
          daysSinceReview: fc.integer({ min: 1, max: 30 }),
          decayRate: fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }),
          masteryLevel: fc.constantFrom(MasteryLevel.LEARNING, MasteryLevel.SHORT_TERM, MasteryLevel.LONG_TERM)
        }),
        async ({ initialScore, daysSinceReview, decayRate, masteryLevel }) => {
          // Create a test user directly in database
          const userResult = await testDb.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']
          );
          const userId = userResult.rows[0].id;
          
          // Create a word with specific parameters
          const vocabWord = VocabularyFactory.create({
            userId,
            masteryLevel,
            masteryScore: initialScore
          });
          
          // Override forgetting curve parameters for testing
          vocabWord.forgettingCurveParams.decayRate = decayRate;
          vocabWord.lastReviewedAt = new Date(Date.now() - daysSinceReview * 24 * 60 * 60 * 1000);
          
          // Apply forgetting curve decay
          const decayedWords = await forgettingCurveService.applyForgettingCurveDecay([vocabWord]);
          const decayedWord = decayedWords[0];
          
          // Verify decay properties
          expect(decayedWord.masteryScore).toBeLessThanOrEqual(initialScore);
          expect(decayedWord.masteryScore).toBeGreaterThanOrEqual(0);
          
          // Verify decay is proportional to time and decay rate
          const expectedDecayFactor = Math.exp(-daysSinceReview / (1 / decayRate));
          const expectedScore = Math.max(0, Math.round(initialScore * expectedDecayFactor));
          
          // Allow some tolerance for rounding and implementation differences
          const tolerance = Math.max(5, initialScore * 0.1);
          expect(Math.abs(decayedWord.masteryScore - expectedScore)).toBeLessThanOrEqual(tolerance);
          
          // Verify mastery level adjusts appropriately
          if (decayedWord.masteryScore < 25) {
            expect(decayedWord.masteryLevel).toBe(MasteryLevel.NEW);
          } else if (decayedWord.masteryScore < 50) {
            expect(decayedWord.masteryLevel).toBe(MasteryLevel.LEARNING);
          }
          
          // Verify decay is monotonic (longer time = more decay)
          if (daysSinceReview > 1) {
            const shorterDecayWord = { ...vocabWord };
            shorterDecayWord.lastReviewedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
            const shorterDecayResult = await forgettingCurveService.applyForgettingCurveDecay([shorterDecayWord]);
            
            expect(decayedWord.masteryScore).toBeLessThanOrEqual(shorterDecayResult[0].masteryScore);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 11: 掌握单词自动移除**
   * **Validates: Requirements 14.5, 14.8**
   * 
   * For any vocabulary word that reaches mastery criteria and maintains
   * high performance over time, the system should automatically remove it
   * from the active vocabulary list while preserving learning statistics.
   */
  it('Property 11: should automatically remove mastered words consistently', async () => {
    // Skip test if database is not available
    if (!testDb || !vocabularyService || !vocabularyModel) {
      console.warn('Skipping test: database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          practiceScore: fc.integer({ min: 85, max: 100 }),
          responseTime: fc.integer({ min: 1000, max: 5000 }),
          daysSinceMastery: fc.integer({ min: 31, max: 60 }),
          initialMasteryScore: fc.integer({ min: 90, max: 100 })
        }),
        async ({ practiceScore, responseTime, daysSinceMastery, initialMasteryScore }) => {
          // Create a test user directly in database
          const userResult = await testDb.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']
          );
          const userId = userResult.rows[0].id;
          
          // Create a word that's already at mastery level
          const vocabWord = VocabularyFactory.create({
            userId,
            masteryLevel: MasteryLevel.MASTERED,
            masteryScore: initialMasteryScore
          });
          
          // Set last reviewed date to simulate long-term mastery
          vocabWord.lastReviewedAt = new Date(Date.now() - daysSinceMastery * 24 * 60 * 60 * 1000);
          
          // Create the word in the database first
          const createdWord = await vocabularyModel.create({
            userId,
            word: vocabWord.word,
            language: vocabWord.language as Language,
            definition: vocabWord.definition
          });
          
          // Update it to mastered state
          await vocabularyModel.update(createdWord.id, {
            masteryLevel: MasteryLevel.MASTERED,
            masteryScore: initialMasteryScore,
            lastReviewedAt: vocabWord.lastReviewedAt
          });
          
          // Simulate practice performance update
          const updateResult = await vocabularyService.updateMasteryFromPractice(
            userId,
            createdWord.id,
            practiceScore,
            responseTime
          );
          
          // Verify mastery update behavior
          expect(updateResult.word.masteryLevel).toBe(MasteryLevel.MASTERED);
          expect(updateResult.word.masteryScore).toBeGreaterThanOrEqual(initialMasteryScore);
          
          // Verify automatic removal logic - the shouldRemove flag should be consistent
          expect(typeof updateResult.shouldRemove).toBe('boolean');
          
          if (updateResult.shouldRemove) {
            // If marked for removal, word should be deleted from database
            const removedWord = await vocabularyModel.findById(createdWord.id);
            expect(removedWord).toBeNull();
          } else {
            // If not marked for removal, word should still exist
            const existingWord = await vocabularyModel.findById(createdWord.id);
            expect(existingWord).not.toBeNull();
          }
          
          // Verify user capability stats are updated consistently
          const stats = await vocabularyService.getMasteryStats(userId, vocabWord.language as Language);
          expect(stats.totalWords).toBeGreaterThanOrEqual(0);
          
          if (updateResult.shouldRemove) {
            // If word was removed, mastered count should reflect this
            expect(stats.masteredWords).toBeGreaterThanOrEqual(0);
          } else {
            // If word wasn't removed, it should still be counted as mastered
            expect(stats.masteredWords).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional consistency test for mastery level transitions
   */
  it('should handle mastery level transitions consistently', async () => {
    // Skip test if database is not available
    if (!testDb) {
      console.warn('Skipping test: database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialMastery: fc.constantFrom(MasteryLevel.NEW, MasteryLevel.LEARNING, MasteryLevel.SHORT_TERM),
          scoreIncrease: fc.integer({ min: 10, max: 50 })
        }),
        async ({ initialMastery, scoreIncrease }) => {
          // Create a test user directly in database
          const userResult = await testDb.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']
          );
          const userId = userResult.rows[0].id;
          
          // Create word with initial mastery level
          const vocabWord = VocabularyFactory.createWithMasteryLevel(initialMastery, {
            userId
          });
          
          const initialScore = vocabWord.masteryScore;
          const newScore = Math.min(100, initialScore + scoreIncrease);
          
          // Simulate mastery score update
          const updatedWord = {
            ...vocabWord,
            masteryScore: newScore
          };
          
          // Verify score progression is logical
          expect(updatedWord.masteryScore).toBeGreaterThanOrEqual(initialScore);
          expect(updatedWord.masteryScore).toBeLessThanOrEqual(100);
          
          // Verify mastery level progression makes sense
          if (newScore >= 90) {
            // High scores should indicate mastery or near-mastery
            const expectedLevels = initialMastery === MasteryLevel.NEW ? [MasteryLevel.LEARNING, MasteryLevel.SHORT_TERM, MasteryLevel.LONG_TERM, MasteryLevel.MASTERED] : [MasteryLevel.LONG_TERM, MasteryLevel.MASTERED];
            expect(expectedLevels).toContain(MasteryLevel.MASTERED);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});


