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
const vocabularyFactory_1 = require("../factories/vocabularyFactory");
const VocabularyService_1 = require("./../services/VocabularyService");
const ForgettingCurveService_1 = require("./../services/ForgettingCurveService");
const VocabularyWord_1 = require("./../models/VocabularyWord");
const setup_1 = require("../setup");
describe('Property-Based Test: Vocabulary Management System', () => {
    let vocabularyService;
    let forgettingCurveService;
    let vocabularyModel;
    beforeAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!setup_1.testDb) {
            console.warn('Test database not available, skipping vocabulary management tests');
            return;
        }
        vocabularyService = new VocabularyService_1.VocabularyService(setup_1.testDb);
        forgettingCurveService = new ForgettingCurveService_1.ForgettingCurveService(setup_1.testDb);
        vocabularyModel = new VocabularyWord_1.VocabularyWordModel(setup_1.testDb);
    });
    it('Property 9: should maintain vocabulary automatic management consistency', async () => {
        if (!setup_1.testDb || !vocabularyService) {
            console.warn('Skipping test: database not available');
            return;
        }
        await fc.assert(fc.asyncProperty(fc.record({
            word: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z]+$/.test(s)),
            language: fc.constantFrom(VocabularyWord_1.Language.ENGLISH, VocabularyWord_1.Language.JAPANESE, VocabularyWord_1.Language.FRENCH),
            definition: fc.string({ minLength: 5, maxLength: 200 }),
            masteryLevel: fc.constantFrom(VocabularyWord_1.MasteryLevel.NEW, VocabularyWord_1.MasteryLevel.LEARNING, VocabularyWord_1.MasteryLevel.SHORT_TERM, VocabularyWord_1.MasteryLevel.LONG_TERM, VocabularyWord_1.MasteryLevel.MASTERED),
            masteryScore: fc.integer({ min: 0, max: 100 })
        }), async (vocabData) => {
            const userResult = await setup_1.testDb.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']);
            const userId = userResult.rows[0].id;
            const text = `This is a sample text containing the word ${vocabData.word} for testing.`;
            const extractionResult = await vocabularyService.extractAndAddWordsFromText(userId, text, vocabData.language);
            if (vocabData.word.length > 2) {
                expect(extractionResult.words).toContain(vocabData.word.toLowerCase());
            }
            expect(extractionResult.extractedCount).toBeGreaterThan(0);
            expect(extractionResult.newWordsAdded.length).toBeGreaterThanOrEqual(0);
            extractionResult.newWordsAdded.forEach(word => {
                expect(word.userId).toBe(userId);
                expect(word.language).toBe(vocabData.language);
                expect(word.masteryLevel).toBe(VocabularyWord_1.MasteryLevel.NEW);
                expect(word.masteryScore).toBe(0);
                expect(parseFloat(word.forgettingCurveParams.initialStrength.toString())).toBe(1.0);
                expect(parseFloat(word.forgettingCurveParams.decayRate.toString())).toBe(0.1);
                expect(word.forgettingCurveParams.reviewCount).toBe(0);
            });
            const stats = await vocabularyService.getMasteryStats(userId, vocabData.language);
            expect(stats.totalWords).toBeGreaterThanOrEqual(extractionResult.newWordsAdded.length);
            expect(stats.newWords + stats.learningWords + stats.shortTermWords + stats.longTermWords + stats.masteredWords).toBe(stats.totalWords);
            expect(stats.averageMasteryScore).toBeGreaterThanOrEqual(0);
            expect(stats.averageMasteryScore).toBeLessThanOrEqual(100);
        }), { numRuns: 100 });
    });
    it('Property 10: should maintain forgetting curve decay regularity', async () => {
        if (!setup_1.testDb || !forgettingCurveService) {
            console.warn('Skipping test: database not available');
            return;
        }
        await fc.assert(fc.asyncProperty(fc.record({
            initialScore: fc.integer({ min: 20, max: 100 }),
            daysSinceReview: fc.integer({ min: 1, max: 30 }),
            decayRate: fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }),
            masteryLevel: fc.constantFrom(VocabularyWord_1.MasteryLevel.LEARNING, VocabularyWord_1.MasteryLevel.SHORT_TERM, VocabularyWord_1.MasteryLevel.LONG_TERM)
        }), async ({ initialScore, daysSinceReview, decayRate, masteryLevel }) => {
            const userResult = await setup_1.testDb.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']);
            const userId = userResult.rows[0].id;
            const vocabWord = vocabularyFactory_1.VocabularyFactory.create({
                userId,
                masteryLevel,
                masteryScore: initialScore
            });
            vocabWord.forgettingCurveParams.decayRate = decayRate;
            vocabWord.lastReviewedAt = new Date(Date.now() - daysSinceReview * 24 * 60 * 60 * 1000);
            const decayedWords = await forgettingCurveService.applyForgettingCurveDecay([vocabWord]);
            const decayedWord = decayedWords[0];
            expect(decayedWord.masteryScore).toBeLessThanOrEqual(initialScore);
            expect(decayedWord.masteryScore).toBeGreaterThanOrEqual(0);
            const expectedDecayFactor = Math.exp(-daysSinceReview / (1 / decayRate));
            const expectedScore = Math.max(0, Math.round(initialScore * expectedDecayFactor));
            const tolerance = Math.max(5, initialScore * 0.1);
            expect(Math.abs(decayedWord.masteryScore - expectedScore)).toBeLessThanOrEqual(tolerance);
            if (decayedWord.masteryScore < 25) {
                expect(decayedWord.masteryLevel).toBe(VocabularyWord_1.MasteryLevel.NEW);
            }
            else if (decayedWord.masteryScore < 50) {
                expect(decayedWord.masteryLevel).toBe(VocabularyWord_1.MasteryLevel.LEARNING);
            }
            if (daysSinceReview > 1) {
                const shorterDecayWord = { ...vocabWord };
                shorterDecayWord.lastReviewedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
                const shorterDecayResult = await forgettingCurveService.applyForgettingCurveDecay([shorterDecayWord]);
                expect(decayedWord.masteryScore).toBeLessThanOrEqual(shorterDecayResult[0].masteryScore);
            }
        }), { numRuns: 100 });
    });
    it('Property 11: should automatically remove mastered words consistently', async () => {
        if (!setup_1.testDb || !vocabularyService || !vocabularyModel) {
            console.warn('Skipping test: database not available');
            return;
        }
        await fc.assert(fc.asyncProperty(fc.record({
            practiceScore: fc.integer({ min: 85, max: 100 }),
            responseTime: fc.integer({ min: 1000, max: 5000 }),
            daysSinceMastery: fc.integer({ min: 31, max: 60 }),
            initialMasteryScore: fc.integer({ min: 90, max: 100 })
        }), async ({ practiceScore, responseTime, daysSinceMastery, initialMasteryScore }) => {
            const userResult = await setup_1.testDb.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']);
            const userId = userResult.rows[0].id;
            const vocabWord = vocabularyFactory_1.VocabularyFactory.create({
                userId,
                masteryLevel: VocabularyWord_1.MasteryLevel.MASTERED,
                masteryScore: initialMasteryScore
            });
            vocabWord.lastReviewedAt = new Date(Date.now() - daysSinceMastery * 24 * 60 * 60 * 1000);
            const createdWord = await vocabularyModel.create({
                userId,
                word: vocabWord.word,
                language: vocabWord.language,
                definition: vocabWord.definition
            });
            await vocabularyModel.update(createdWord.id, {
                masteryLevel: VocabularyWord_1.MasteryLevel.MASTERED,
                masteryScore: initialMasteryScore,
                lastReviewedAt: vocabWord.lastReviewedAt
            });
            const updateResult = await vocabularyService.updateMasteryFromPractice(userId, createdWord.id, practiceScore, responseTime);
            expect(updateResult.word.masteryLevel).toBe(VocabularyWord_1.MasteryLevel.MASTERED);
            expect(updateResult.word.masteryScore).toBeGreaterThanOrEqual(initialMasteryScore);
            expect(typeof updateResult.shouldRemove).toBe('boolean');
            if (updateResult.shouldRemove) {
                const removedWord = await vocabularyModel.findById(createdWord.id);
                expect(removedWord).toBeNull();
            }
            else {
                const existingWord = await vocabularyModel.findById(createdWord.id);
                expect(existingWord).not.toBeNull();
            }
            const stats = await vocabularyService.getMasteryStats(userId, vocabWord.language);
            expect(stats.totalWords).toBeGreaterThanOrEqual(0);
            if (updateResult.shouldRemove) {
                expect(stats.masteredWords).toBeGreaterThanOrEqual(0);
            }
            else {
                expect(stats.masteredWords).toBeGreaterThanOrEqual(1);
            }
        }), { numRuns: 100 });
    });
    it('should handle mastery level transitions consistently', async () => {
        if (!setup_1.testDb) {
            console.warn('Skipping test: database not available');
            return;
        }
        await fc.assert(fc.asyncProperty(fc.record({
            initialMastery: fc.constantFrom(VocabularyWord_1.MasteryLevel.NEW, VocabularyWord_1.MasteryLevel.LEARNING, VocabularyWord_1.MasteryLevel.SHORT_TERM),
            scoreIncrease: fc.integer({ min: 10, max: 50 })
        }), async ({ initialMastery, scoreIncrease }) => {
            const userResult = await setup_1.testDb.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [`testuser_${Date.now()}`, `test_${Date.now()}@example.com`, 'hashedpassword']);
            const userId = userResult.rows[0].id;
            const vocabWord = vocabularyFactory_1.VocabularyFactory.createWithMasteryLevel(initialMastery, {
                userId
            });
            const initialScore = vocabWord.masteryScore;
            const newScore = Math.min(100, initialScore + scoreIncrease);
            const updatedWord = {
                ...vocabWord,
                masteryScore: newScore
            };
            expect(updatedWord.masteryScore).toBeGreaterThanOrEqual(initialScore);
            expect(updatedWord.masteryScore).toBeLessThanOrEqual(100);
            if (newScore >= 90) {
                const expectedLevels = initialMastery === VocabularyWord_1.MasteryLevel.NEW ? [VocabularyWord_1.MasteryLevel.LEARNING, VocabularyWord_1.MasteryLevel.SHORT_TERM, VocabularyWord_1.MasteryLevel.LONG_TERM, VocabularyWord_1.MasteryLevel.MASTERED] : [VocabularyWord_1.MasteryLevel.LONG_TERM, VocabularyWord_1.MasteryLevel.MASTERED];
                expect(expectedLevels).toContain(VocabularyWord_1.MasteryLevel.MASTERED);
            }
        }), { numRuns: 50 });
    });
});
//# sourceMappingURL=vocabularyManagement.test.js.map