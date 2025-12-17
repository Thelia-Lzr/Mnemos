"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const PracticeGenerationService_1 = require("../../services/PracticeGenerationService");
const PracticeEvaluationService_1 = require("../../services/PracticeEvaluationService");
const CapabilityUpdateService_1 = require("../../services/CapabilityUpdateService");
const PracticeGroup_1 = require("../../models/PracticeGroup");
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
    let practiceGenerationService;
    let practiceEvaluationService;
    let capabilityUpdateService;
    beforeEach(() => {
        jest.clearAllMocks();
        practiceGenerationService = new PracticeGenerationService_1.PracticeGenerationService(mockDb, mockUserCapabilityService, mockCreditService, mockAsyncTaskManager, mockOpenRouterService);
        practiceEvaluationService = new PracticeEvaluationService_1.PracticeEvaluationService(mockUserCapabilityService);
        capabilityUpdateService = new CapabilityUpdateService_1.CapabilityUpdateService(mockUserCapabilityService);
    });
    describe('Property 5: Practice Group Structure Consistency', () => {
        it('should always generate practice groups with exactly 10 questions', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                userId: fast_check_1.default.uuid(),
                language: fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.Language)),
                difficulty: fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.DifficultyLevel)),
                type: fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.PracticeType)),
                focusAreas: fast_check_1.default.array(fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.SkillArea)), { maxLength: 3 })
            }), async (request) => {
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
                expect(practiceGroup.questions).toHaveLength(10);
                expect(practiceGroup.userId).toBe(request.userId);
                expect(practiceGroup.language).toBe(request.language);
                expect(practiceGroup.type).toBe(request.type);
                expect(practiceGroup.questions.every(q => q.options.length === 4)).toBe(true);
            }), { numRuns: 100 });
        });
    });
    describe('Property 6: Question Format Compliance', () => {
        it('should always generate questions in multiple choice format with proper structure', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                userId: fast_check_1.default.uuid(),
                language: fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.Language)),
                type: fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.PracticeType))
            }), async (request) => {
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
                practiceGroup.questions.forEach(question => {
                    expect(question.type).toBe(PracticeGroup_1.QuestionType.MULTIPLE_CHOICE);
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
            }), { numRuns: 100 });
        });
    });
    describe('Property 15: Practice Capability Update Completeness', () => {
        it('should always update user capabilities based on practice performance', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                userId: fast_check_1.default.uuid(),
                practiceGroupId: fast_check_1.default.uuid(),
                answers: fast_check_1.default.array(fast_check_1.default.record({
                    questionId: fast_check_1.default.uuid(),
                    userAnswer: fast_check_1.default.string({ minLength: 1 }),
                    isCorrect: fast_check_1.default.boolean(),
                    timeSpent: fast_check_1.default.integer({ min: 1000, max: 300000 }),
                    attempts: fast_check_1.default.integer({ min: 1, max: 3 })
                }), { minLength: 10, maxLength: 10 }),
                accuracy: fast_check_1.default.float({ min: 0, max: 100 }),
                totalTime: fast_check_1.default.integer({ min: 60000, max: 1800000 })
            }), async (testData) => {
                const mockPracticeGroup = {
                    id: testData.practiceGroupId,
                    userId: testData.userId,
                    title: 'Test Practice',
                    description: 'Test description',
                    language: PracticeGroup_1.Language.ENGLISH,
                    difficulty: PracticeGroup_1.DifficultyLevel.INTERMEDIATE,
                    type: PracticeGroup_1.PracticeType.GENERAL,
                    questions: testData.answers.map((answer, index) => ({
                        id: answer.questionId,
                        practiceGroupId: testData.practiceGroupId,
                        type: PracticeGroup_1.QuestionType.MULTIPLE_CHOICE,
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
                const mockCapability = {
                    userId: testData.userId,
                    language: PracticeGroup_1.Language.ENGLISH,
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
                    strengths: [PracticeGroup_1.SkillArea.READING],
                    weaknesses: [PracticeGroup_1.SkillArea.SPEAKING],
                    updatedAt: new Date()
                };
                mockUserCapabilityService.getUserCapability.mockResolvedValue(mockCapability);
                const result = await practiceEvaluationService.evaluatePracticeGroup(testData.userId, mockPracticeGroup, testData.answers.map(a => ({
                    questionId: a.questionId,
                    userAnswer: a.userAnswer,
                    timeSpent: a.timeSpent,
                    attempts: a.attempts
                })), testData.totalTime);
                expect(result.capabilityUpdates).toBeDefined();
                expect(Array.isArray(result.capabilityUpdates)).toBe(true);
                expect(result.vocabularyUpdates).toBeDefined();
                expect(Array.isArray(result.vocabularyUpdates)).toBe(true);
                expect(result.weakAreas).toBeDefined();
                expect(Array.isArray(result.weakAreas)).toBe(true);
                expect(result.improvedAreas).toBeDefined();
                expect(Array.isArray(result.improvedAreas)).toBe(true);
                expect(result.recommendedFocus).toBeDefined();
                expect(Array.isArray(result.recommendedFocus)).toBe(true);
                expect(result.totalQuestions).toBe(testData.answers.length);
                expect(result.correctAnswers).toBeLessThanOrEqual(result.totalQuestions);
                expect(result.accuracy).toBeGreaterThanOrEqual(0);
                expect(result.accuracy).toBeLessThanOrEqual(100);
            }), { numRuns: 100 });
        });
    });
    describe('Property 16: Comprehensive Assessment Data Completeness', () => {
        it('should always generate comprehensive practice based on all available user data', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                userId: fast_check_1.default.uuid(),
                language: fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.Language)),
                includeCapabilityData: fast_check_1.default.boolean(),
                includeMilestones: fast_check_1.default.boolean(),
                includeVocabulary: fast_check_1.default.boolean()
            }), async (request) => {
                const mockUserCapability = {
                    userId: request.userId,
                    language: request.language,
                    overallLevel: fast_check_1.default.sample(fast_check_1.default.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'), 1)[0],
                    listeningLevel: fast_check_1.default.sample(fast_check_1.default.integer({ min: 40, max: 90 }), 1)[0],
                    speakingLevel: fast_check_1.default.sample(fast_check_1.default.integer({ min: 40, max: 90 }), 1)[0],
                    readingLevel: fast_check_1.default.sample(fast_check_1.default.integer({ min: 40, max: 90 }), 1)[0],
                    writingLevel: fast_check_1.default.sample(fast_check_1.default.integer({ min: 40, max: 90 }), 1)[0],
                    vocabularyCapability: {
                        estimatedVocabularySize: fast_check_1.default.sample(fast_check_1.default.integer({ min: 1000, max: 5000 }), 1)[0],
                        basicVocabularyMastery: fast_check_1.default.sample(fast_check_1.default.integer({ min: 50, max: 95 }), 1)[0]
                    },
                    grammarCapability: {
                        overallGrammarScore: fast_check_1.default.sample(fast_check_1.default.integer({ min: 50, max: 95 }), 1)[0]
                    },
                    strengths: fast_check_1.default.sample(fast_check_1.default.array(fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.SkillArea)), { maxLength: 3 }), 1)[0],
                    weaknesses: fast_check_1.default.sample(fast_check_1.default.array(fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.SkillArea)), { maxLength: 3 }), 1)[0]
                };
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
                mockUserCapabilityService.getUserCapability.mockResolvedValue(request.includeCapabilityData ? mockUserCapability : null);
                const practiceGroup = await practiceGenerationService.generateComprehensivePractice(request);
                expect(practiceGroup.type).toBe(PracticeGroup_1.PracticeType.COMPREHENSIVE);
                expect(practiceGroup.questions).toHaveLength(10);
                expect(practiceGroup.title).toBeTruthy();
                expect(practiceGroup.description).toBeTruthy();
                practiceGroup.questions.forEach(question => {
                    expect(question.content).toBeTruthy();
                    expect(question.options).toHaveLength(4);
                    expect(question.explanation).toBeTruthy();
                    expect(question.difficulty).toBeGreaterThanOrEqual(1);
                    expect(question.difficulty).toBeLessThanOrEqual(5);
                });
                if (request.includeCapabilityData && mockUserCapability) {
                    expect(practiceGroup.difficulty).toBeDefined();
                    expect(Object.values(PracticeGroup_1.DifficultyLevel)).toContain(practiceGroup.difficulty);
                }
            }), { numRuns: 100 });
        });
    });
    describe('Property 9: Vocabulary Auto-Management Consistency', () => {
        it('should always generate vocabulary practice based on provided words', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                userId: fast_check_1.default.uuid(),
                language: fast_check_1.default.constantFrom(...Object.values(PracticeGroup_1.Language)),
                vocabularyWords: fast_check_1.default.array(fast_check_1.default.string({ minLength: 2, maxLength: 15 }), { minLength: 5, maxLength: 20 })
            }), async (testData) => {
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
                const practiceGroup = await practiceGenerationService.generateVocabularyPractice(testData.userId, testData.language, testData.vocabularyWords);
                expect(practiceGroup.type).toBe(PracticeGroup_1.PracticeType.VOCABULARY);
                expect(practiceGroup.questions).toHaveLength(10);
                expect(practiceGroup.focusAreas).toContain(PracticeGroup_1.SkillArea.VOCABULARY);
                const allVocabInQuestions = practiceGroup.questions.flatMap(q => q.vocabularyWords);
                const providedWordsInQuestions = testData.vocabularyWords.filter(word => allVocabInQuestions.includes(word));
                expect(providedWordsInQuestions.length).toBeGreaterThan(0);
            }), { numRuns: 100 });
        });
    });
});
//# sourceMappingURL=practiceSystem.test.js.map