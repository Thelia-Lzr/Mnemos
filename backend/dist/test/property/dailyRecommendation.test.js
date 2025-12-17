"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const DailyRecommendationService_1 = require("./../services/DailyRecommendationService");
describe('Property-Based Tests: Daily Recommendation Generation Consistency', () => {
    let mockDb;
    let mockAIService;
    let mockUserCapabilityService;
    let mockVocabularyService;
    let mockAsyncTaskManager;
    let dailyRecommendationService;
    beforeEach(() => {
        mockDb = {
            query: jest.fn().mockResolvedValue({ rows: [] }),
            connect: jest.fn()
        };
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
        };
        mockUserCapabilityService = {
            getUserCapability: jest.fn(),
            getUserMilestones: jest.fn()
        };
        mockVocabularyService = {
            getUserVocabulary: jest.fn()
        };
        mockAsyncTaskManager = {
            createTask: jest.fn()
        };
        dailyRecommendationService = new DailyRecommendationService_1.DailyRecommendationService(mockDb, mockAIService, mockUserCapabilityService, mockVocabularyService, mockAsyncTaskManager);
    });
    describe('Daily Recommendation Generation Consistency (Requirement 6.1)', () => {
        it('should generate consistent recommendation structure for any valid user capability data', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                userId: fc.uuid(),
                language: fc.constantFrom('en', 'ja', 'fr'),
                currentLevel: fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
                confidenceScore: fc.integer({ min: 0, max: 100 })
            }), async (testData) => {
                mockUserCapabilityService.getUserCapability.mockResolvedValue({
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
                mockUserCapabilityService.getUserMilestones.mockResolvedValue([]);
                mockVocabularyService.getUserVocabulary.mockResolvedValue([]);
                mockDb.query.mockResolvedValueOnce({ rows: [] });
                mockDb.query.mockResolvedValueOnce({ rows: [] });
                const result = await dailyRecommendationService.generateDailyRecommendation(testData.userId, testData.language);
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
            }), { numRuns: 10 });
        });
    });
});
//# sourceMappingURL=dailyRecommendation.test.js.map