import * as fc from 'fast-check';
import { Pool } from 'pg';
import { DailyRecommendationService } from './../services/DailyRecommendationService';
import { AIService } from './../services/AIService';
import { UserCapabilityService } from './../services/UserCapabilityService';
import { VocabularyService } from './../services/VocabularyService';
import { AsyncTaskManager } from './../services/AsyncTaskManager';

/**
 * **Feature: ai-language-learning-app, Property 14: 每日建议生成一致�?*
 * **Validates: Requirements 6.1, 6.2**
 * 
 * Property: For any user's daily first login, the system should generate personalized learning 
 * recommendations based on current capability data consistently and reliably.
 */
describe('Property-Based Tests: Daily Recommendation Generation Consistency', () => {

  let mockDb: Pool;
  let mockAIService: AIService;
  let mockUserCapabilityService: UserCapabilityService;
  let mockVocabularyService: VocabularyService;
  let mockAsyncTaskManager: AsyncTaskManager;
  let dailyRecommendationService: DailyRecommendationService;

  beforeEach(() => {
    // Create mock database with proper query response structure
    mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      connect: jest.fn()
    } as any;

    // Create mock services
    mockAIService = {
      callAIWithCredits: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          recommendations: [
            {
              type: 'vocabulary_focus',
              title: 'Test Recommendation',
              description: 'Test Description',
              priority: 1,
              focusAreas: ['vocabulary'],
              suggestedActivities: ['Test Activity'],
              estimatedTime: 15
            }
          ]
        }),
        model: 'test-model',
        tokensUsed: 100
      })
    } as any;

    mockUserCapabilityService = {
      getUserCapability: jest.fn(),
      getUserMilestones: jest.fn()
    } as any;

    mockVocabularyService = {
      getUserVocabulary: jest.fn()
    } as any;

    mockAsyncTaskManager = {
      createTask: jest.fn()
    } as any;

    // Create service instance
    dailyRecommendationService = new DailyRecommendationService(
      mockDb,
      mockAIService,
      mockUserCapabilityService,
      mockVocabularyService,
      mockAsyncTaskManager
    );
  });

  describe('Daily Recommendation Generation Consistency (Requirement 6.1)', () => {
    it('should generate consistent recommendation structure for any valid user capability data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            language: fc.constantFrom('en', 'ja', 'fr'),
            currentLevel: fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
            confidenceScore: fc.integer({ min: 0, max: 100 })
          }),
          async (testData) => {
            // Mock the service dependencies
            (mockUserCapabilityService.getUserCapability as jest.Mock).mockResolvedValue({
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              language: testData.language,
              currentLevel: testData.currentLevel,
              confidenceScore: testData.confidenceScore,
              listeningLevel: 50,
              speakingLevel: 50,
              readingLevel: 50,
              writingLevel: 50
            });

            (mockUserCapabilityService.getUserMilestones as jest.Mock).mockResolvedValue([]);
            (mockVocabularyService.getUserVocabulary as jest.Mock).mockResolvedValue([]);
            
            // Mock database query to return empty result (no existing recommendation)
            (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
            
            // Mock database query for saving recommendation
            (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            // Test the service
            const result = await dailyRecommendationService.generateDailyRecommendation(
              testData.userId,
              testData.language as any
            );

            // Verify consistent structure - the service returns DailyLearningRecommendation directly
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('string');
            expect(result.userId).toBe(testData.userId);
            expect(result.language).toBe(testData.language);
            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
            expect(result.quickPracticeOptions).toBeDefined();
            expect(Array.isArray(result.quickPracticeOptions)).toBe(true);
            expect(typeof result.isViewed).toBe('boolean');
            expect(result.createdAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});


