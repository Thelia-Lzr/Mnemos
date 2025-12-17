import fc from 'fast-check';
import { PracticeGenerationService } from '../../services/PracticeGenerationService';
import { PracticeEvaluationService } from '../../services/PracticeEvaluationService';
import { CapabilityUpdateService } from '../../services/CapabilityUpdateService';
import { PracticeGroupModel } from '../../models/PracticeGroup';
import { 
  Language, 
  DifficultyLevel, 
  PracticeType, 
  SkillArea,
  QuestionType,
  MasteryLevel
} from '../../models/PracticeGroup';
import { LanguageLevel } from '../../models/UserCapability';
import { UserFactory } from '../factories/userFactory';
import { TestHelpers } from '../helpers/testHelpers';

// Mock dependencies
const mockOpenRouterService = {
  callAI: jest.fn(),
  callAIAsync: jest.fn(),
  trackTokenUsage: jest.fn(),
  calculateCreditCost: jest.fn()
};

const mockUserCapabilityService = {
  getUserCapability: jest.fn(),
  updateUserCapability: jest.fn()
};

const mockAsyncTaskManager = {
  createTask: jest.fn()
};

const mockCreditService = {
  consumeCredits: jest.fn(),
  checkSufficientCredits: jest.fn()
};

const mockDb = {
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn()
  }),
  query: jest.fn()
};

describe('Practice System Property Tests', () => {
  let practiceGenerationService: PracticeGenerationService;
  let practiceEvaluationService: PracticeEvaluationService;
  let capabilityUpdateService: CapabilityUpdateService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    practiceGenerationService = new PracticeGenerationService(
      mockDb as any,
      mockUserCapabilityService as any,
      mockCreditService as any,
      mockAsyncTaskManager as any,
      mockOpenRouterService as any
    );
    
    practiceEvaluationService = new PracticeEvaluationService(
      mockUserCapabilityService as any
    );
    
    capabilityUpdateService = new CapabilityUpdateService(
      mockUserCapabilityService as any
    );
  });

  /**
   * **Feature: ai-language-learning-app, Property 5: 练习组结构一致�?*
   * **Validates: Requirements 11.1**
   */
  describe('Property 5: Practice Group Structure Consistency', () => {
    it('should always generate practice groups with exactly 10 questions', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          language: fc.constantFrom(...Object.values(Language)),
          difficulty: fc.constantFrom(...Object.values(DifficultyLevel)),
          type: fc.constantFrom(...Object.values(PracticeType)),
          focusAreas: fc.array(fc.constantFrom(...Object.values(SkillArea)), { maxLength: 3 })
        }),
        async (request) => {
          // Mock AI response with valid practice content
          const mockAIResponse = {
            content: JSON.stringify({
              title: 'Test Practice Group',
              description: 'Test description',
              questions: Array.from({ length: 10 }, (_, i) => ({
                type: 'multiple_choice',
                content: `Question ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A',
                explanation: `Explanation ${i + 1}`,
                vocabularyWords: [`word${i + 1}`],
                grammarPoints: [`grammar${i + 1}`],
                difficulty: 3
              }))
            }),
            model: 'test-model',
            tokensUsed: 100,
            processingTime: 1000
          };

          mockOpenRouterService.callAI.mockResolvedValue(mockAIResponse);
          mockCreditService.consumeCredits.mockResolvedValue(undefined);
          mockUserCapabilityService.getUserCapability.mockResolvedValue(null);

          const practiceGroup = await practiceGenerationService.generatePracticeGroup(request);

          // Property: Every generated practice group must have exactly 10 questions
          expect(practiceGroup.questions).toHaveLength(10);
          
          // Additional consistency checks
          expect(practiceGroup.userId).toBe(request.userId);
          expect(practiceGroup.language).toBe(request.language);
          expect(practiceGroup.type).toBe(request.type);
          expect(practiceGroup.questions.every(q => q.options.length === 4)).toBe(true);
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-language-learning-app, Property 6: 练习题格式规范�?*
   * **Validates: Requirements 9.2**
   */
  describe('Property 6: Question Format Compliance', () => {
    it('should always generate questions in multiple choice format with proper structure', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          language: fc.constantFrom(...Object.values(Language)),
          type: fc.constantFrom(...Object.values(PracticeType))
        }),
        async (request) => {
          // Mock AI response
          const mockAIResponse = {
            content: JSON.stringify({
              title: 'Test Practice',
              description: 'Test description',
              questions: Array.from({ length: 10 }, (_, i) => ({
                type: 'multiple_choice',
                content: `Question ${i + 1} content`,
                options: [`Option A${i}`, `Option B${i}`, `Option C${i}`, `Option D${i}`],
                correctAnswer: `Option A${i}`,
                explanation: `Explanation for question ${i + 1}`,
                vocabularyWords: [`vocab${i}`],
                grammarPoints: [`grammar${i}`],
                difficulty: Math.floor(Math.random() * 5) + 1
              }))
            }),
            model: 'test-model',
            tokensUsed: 100,
            processingTime: 1000
          };

          mockOpenRouterService.callAI.mockResolvedValue(mockAIResponse);
          mockCreditService.consumeCredits.mockResolvedValue(undefined);
          mockUserCapabilityService.getUserCapability.mockResolvedValue(null);

          const practiceGroup = await practiceGenerationService.generatePracticeGroup(request);

          // Property: All questions must be in multiple choice format with proper structure
          practiceGroup.questions.forEach(question => {
            expect(question.type).toBe(QuestionType.MULTIPLE_CHOICE);
            expect(question.content).toBeTruthy();
            expect(question.options).toHaveLength(4);
            expect(question.options).toContain(question.correctAnswer);
            expect(question.explanation).toBeTruthy();
            expect(Array.isArray(question.vocabularyWords)).toBe(true);
            expect(Array.isArray(question.grammarPoints)).toBe(true);
            expect(typeof question.difficulty).toBe('number');
            expect(question.difficulty).toBeGreaterThanOrEqual(1);
            expect(question.difficulty).toBeLessThanOrEqual(5);
          });
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-language-learning-app, Property 15: 练习能力更新完整�?*
   * **Validates: Requirements 9.6, 9.7**
   */
  describe('Property 15: Practice Capability Update Completeness', () => {
    it('should always update user capabilities based on practice performance', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          practiceGroupId: fc.uuid(),
          answers: fc.array(
            fc.record({
              questionId: fc.uuid(),
              userAnswer: fc.string({ minLength: 1 }),
              isCorrect: fc.boolean(),
              timeSpent: fc.integer({ min: 1000, max: 300000 }),
              attempts: fc.integer({ min: 1, max: 3 })
            }),
            { minLength: 10, maxLength: 10 }
          ),
          accuracy: fc.float({ min: 0, max: 100 }),
          totalTime: fc.integer({ min: 60000, max: 1800000 })
        }),
        async (testData) => {
          // Create mock practice group
          const mockPracticeGroup = {
            id: testData.practiceGroupId,
            userId: testData.userId,
            title: 'Test Practice',
            description: 'Test description',
            language: Language.ENGLISH,
            difficulty: DifficultyLevel.INTERMEDIATE,
            type: PracticeType.GENERAL,
            questions: testData.answers.map((answer, index) => ({
              id: answer.questionId,
              practiceGroupId: testData.practiceGroupId,
              type: QuestionType.MULTIPLE_CHOICE,
              content: `Question ${index + 1}`,
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'A',
              explanation: 'Test explanation',
              vocabularyWords: [`word${index}`],
              grammarPoints: [`grammar${index}`],
              difficulty: 3,
              orderIndex: index
            })),
            createdAt: new Date(),
            estimatedDuration: 20,
            focusAreas: ['vocabulary', 'grammar']
          };

          // Mock current user capability
          const mockCapability = {
            userId: testData.userId,
            language: Language.ENGLISH,
            currentLevel: 'B1',
            overallLevel: 'B1',
            confidenceScore: 75,
            listeningLevel: 70,
            speakingLevel: 65,
            readingLevel: 75,
            writingLevel: 60,
            vocabularyCapability: {
              estimatedVocabularySize: 2000,
              basicVocabularyMastery: 80
            },
            grammarCapability: {
              overallGrammarScore: 70
            },
            strengths: [SkillArea.READING],
            weaknesses: [SkillArea.SPEAKING],
            updatedAt: new Date()
          };

          mockUserCapabilityService.getUserCapability.mockResolvedValue(mockCapability);

          const result = await practiceEvaluationService.evaluatePracticeGroup(
            testData.userId,
            mockPracticeGroup as any,
            testData.answers.map(a => ({
              questionId: a.questionId,
              userAnswer: a.userAnswer,
              timeSpent: a.timeSpent,
              attempts: a.attempts
            })),
            testData.totalTime
          );

          // Property: Practice results must always include capability updates
          expect(result.capabilityUpdates).toBeDefined();
          expect(Array.isArray(result.capabilityUpdates)).toBe(true);
          
          // Property: Vocabulary updates must be generated for vocabulary-related questions
          expect(result.vocabularyUpdates).toBeDefined();
          expect(Array.isArray(result.vocabularyUpdates)).toBe(true);
          
          // Property: Performance analysis must identify areas for improvement
          expect(result.weakAreas).toBeDefined();
          expect(Array.isArray(result.weakAreas)).toBe(true);
          expect(result.improvedAreas).toBeDefined();
          expect(Array.isArray(result.improvedAreas)).toBe(true);
          expect(result.recommendedFocus).toBeDefined();
          expect(Array.isArray(result.recommendedFocus)).toBe(true);

          // Property: Results must be mathematically consistent
          expect(result.totalQuestions).toBe(testData.answers.length);
          expect(result.correctAnswers).toBeLessThanOrEqual(result.totalQuestions);
          expect(result.accuracy).toBeGreaterThanOrEqual(0);
          expect(result.accuracy).toBeLessThanOrEqual(100);
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-language-learning-app, Property 16: 综合评估数据完整�?*
   * **Validates: Requirements 9.2**
   */
  describe('Property 16: Comprehensive Assessment Data Completeness', () => {
    it('should always generate comprehensive practice based on all available user data', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          language: fc.constantFrom(...Object.values(Language)),
          includeCapabilityData: fc.boolean(),
          includeMilestones: fc.boolean(),
          includeVocabulary: fc.boolean()
        }),
        async (request) => {
          // Mock comprehensive user data
          const mockUserCapability = {
            userId: request.userId,
            language: request.language,
            overallLevel: fc.sample(fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'), 1)[0] as LanguageLevel,
            listeningLevel: fc.sample(fc.integer({ min: 40, max: 90 }), 1)[0],
            speakingLevel: fc.sample(fc.integer({ min: 40, max: 90 }), 1)[0],
            readingLevel: fc.sample(fc.integer({ min: 40, max: 90 }), 1)[0],
            writingLevel: fc.sample(fc.integer({ min: 40, max: 90 }), 1)[0],
            vocabularyCapability: {
              estimatedVocabularySize: fc.sample(fc.integer({ min: 1000, max: 5000 }), 1)[0],
              basicVocabularyMastery: fc.sample(fc.integer({ min: 50, max: 95 }), 1)[0]
            },
            grammarCapability: {
              overallGrammarScore: fc.sample(fc.integer({ min: 50, max: 95 }), 1)[0]
            },
            strengths: fc.sample(fc.array(fc.constantFrom(...Object.values(SkillArea)), { maxLength: 3 }), 1)[0],
            weaknesses: fc.sample(fc.array(fc.constantFrom(...Object.values(SkillArea)), { maxLength: 3 }), 1)[0]
          };

          // Mock AI response for comprehensive practice
          const mockAIResponse = {
            content: JSON.stringify({
              title: 'Comprehensive Language Assessment',
              description: 'Multi-skill evaluation based on your learning profile',
              questions: Array.from({ length: 10 }, (_, i) => ({
                type: 'multiple_choice',
                content: `Comprehensive question ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A',
                explanation: `Comprehensive explanation ${i + 1}`,
                vocabularyWords: [`comprehensive_word${i}`],
                grammarPoints: [`comprehensive_grammar${i}`],
                difficulty: Math.floor(Math.random() * 5) + 1
              }))
            }),
            model: 'comprehensive-model',
            tokensUsed: 150,
            processingTime: 2000
          };

          mockOpenRouterService.callAI.mockResolvedValue(mockAIResponse);
          mockCreditService.consumeCredits.mockResolvedValue(undefined);
          mockUserCapabilityService.getUserCapability.mockResolvedValue(
            request.includeCapabilityData ? mockUserCapability : null
          );

          const practiceGroup = await practiceGenerationService.generateComprehensivePractice(request);

          // Property: Comprehensive practice must always be generated with complete structure
          expect(practiceGroup.type).toBe(PracticeType.COMPREHENSIVE);
          expect(practiceGroup.questions).toHaveLength(10);
          expect(practiceGroup.title).toBeTruthy();
          expect(practiceGroup.description).toBeTruthy();
          
          // Property: Questions should reflect comprehensive assessment nature
          practiceGroup.questions.forEach(question => {
            expect(question.content).toBeTruthy();
            expect(question.options).toHaveLength(4);
            expect(question.explanation).toBeTruthy();
            expect(question.difficulty).toBeGreaterThanOrEqual(1);
            expect(question.difficulty).toBeLessThanOrEqual(5);
          });

          // Property: Practice should be appropriately challenging based on user level
          if (request.includeCapabilityData && mockUserCapability) {
            expect(practiceGroup.difficulty).toBeDefined();
            expect(Object.values(DifficultyLevel)).toContain(practiceGroup.difficulty);
          }
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-language-learning-app, Property 9: 词汇自动管理一致�?*
   * **Validates: Requirements 14.1**
   */
  describe('Property 9: Vocabulary Auto-Management Consistency', () => {
    it('should always generate vocabulary practice based on provided words', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          language: fc.constantFrom(...Object.values(Language)),
          vocabularyWords: fc.array(fc.string({ minLength: 2, maxLength: 15 }), { minLength: 5, maxLength: 20 })
        }),
        async (testData) => {
          // Mock AI response for vocabulary practice
          const mockAIResponse = {
            content: JSON.stringify({
              title: 'Vocabulary Practice',
              description: 'Practice with your vocabulary words',
              questions: Array.from({ length: 10 }, (_, i) => ({
                type: 'multiple_choice',
                content: `What does "${testData.vocabularyWords[i % testData.vocabularyWords.length]}" mean?`,
                options: ['Definition A', 'Definition B', 'Definition C', 'Definition D'],
                correctAnswer: 'Definition A',
                explanation: `Explanation for ${testData.vocabularyWords[i % testData.vocabularyWords.length]}`,
                vocabularyWords: [testData.vocabularyWords[i % testData.vocabularyWords.length]],
                grammarPoints: [],
                difficulty: 3
              }))
            }),
            model: 'vocabulary-model',
            tokensUsed: 120,
            processingTime: 1500
          };

          mockOpenRouterService.callAI.mockResolvedValue(mockAIResponse);
          mockCreditService.consumeCredits.mockResolvedValue(undefined);
          mockUserCapabilityService.getUserCapability.mockResolvedValue(null);

          const practiceGroup = await practiceGenerationService.generateVocabularyPractice(
            testData.userId,
            testData.language,
            testData.vocabularyWords
          );

          // Property: Vocabulary practice must focus on provided words
          expect(practiceGroup.type).toBe(PracticeType.VOCABULARY);
          expect(practiceGroup.questions).toHaveLength(10);
          expect(practiceGroup.focusAreas).toContain(SkillArea.VOCABULARY);

          // Property: Questions should incorporate the provided vocabulary words
          const allVocabInQuestions = practiceGroup.questions.flatMap(q => q.vocabularyWords);
          const providedWordsInQuestions = testData.vocabularyWords.filter(word => 
            allVocabInQuestions.includes(word)
          );
          
          // At least some of the provided words should appear in the questions
          expect(providedWordsInQuestions.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });
  });
});


