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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const uuid_1 = require("uuid");
const UserCapabilityService_1 = require("./../services/UserCapabilityService");
const AIService_1 = require("./../services/AIService");
const userFactory_1 = require("../factories/userFactory");
const setup_1 = require("../setup");
describe('Capability Assessment Property Tests', () => {
    let db;
    let userCapabilityService;
    let aiService;
    beforeAll(async () => {
        if (!setup_1.testDb) {
            const { setupTestEnvironment } = await Promise.resolve().then(() => __importStar(require('../setup')));
            await setupTestEnvironment();
        }
        db = setup_1.testDb;
        try {
            await db.query('SELECT 1');
        }
        catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
        aiService = new AIService_1.AIService(db, true);
        userCapabilityService = new UserCapabilityService_1.UserCapabilityService(db, aiService);
    });
    beforeEach(async () => {
        if (db && db.query) {
            try {
                await db.query('DELETE FROM capability_assessments');
                await db.query('DELETE FROM user_capabilities');
                await db.query('DELETE FROM learning_progress');
                await db.query('DELETE FROM user_mmr');
                await db.query('DELETE FROM credit_transactions');
                await db.query('DELETE FROM user_credits');
                await db.query('DELETE FROM user_preferences');
                await db.query("DELETE FROM users WHERE email LIKE '%test%'");
            }
            catch (error) {
                console.warn('Cleanup failed, database may not be available:', error);
            }
        }
    });
    afterEach(async () => {
        if (db && db.query) {
            try {
                await db.query('DELETE FROM capability_assessments');
                await db.query('DELETE FROM user_capabilities');
                await db.query('DELETE FROM learning_progress');
                await db.query('DELETE FROM user_mmr');
                await db.query('DELETE FROM credit_transactions');
                await db.query('DELETE FROM user_credits');
                await db.query('DELETE FROM user_preferences');
                await db.query("DELETE FROM users WHERE email LIKE '%test%'");
            }
            catch (error) {
                console.warn('Post-test cleanup failed:', error);
            }
        }
    });
    test('Property 4: Assessment data completeness for all skill areas', async () => {
        if (!db || !db.query) {
            console.warn('Database not available, skipping test');
            return;
        }
        try {
            const connectionTest = await db.query('SELECT 1 as test');
            expect(connectionTest.rows[0].test).toBe(1);
        }
        catch (error) {
            console.warn('Database connection failed, skipping test:', error);
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            language: fast_check_1.default.constantFrom('en', 'ja', 'fr'),
            currentLevel: fast_check_1.default.constantFrom('A1', 'A2', 'B1', 'B2'),
            learningGoal: fast_check_1.default.constantFrom('A1', 'A2', 'B1', 'B2')
        }), async (testData) => {
            try {
                const user = await (0, userFactory_1.createTestUser)(db);
                const capabilityId = (0, uuid_1.v4)();
                const insertResult = await db.query(`INSERT INTO user_capabilities (
                id, user_id, language, current_level, learning_goal, overall_level,
                confidence_score, listening_level, speaking_level, reading_level, writing_level,
                estimated_vocabulary_size, mastered_words_count, learning_words_count,
                last_assessed_at, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 1000, 0, 0, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING *`, [capabilityId, user.id, testData.language, testData.currentLevel, testData.learningGoal]);
                if (!insertResult || !insertResult.rows || insertResult.rows.length === 0) {
                    throw new Error('Failed to insert user capability');
                }
                const insertedRow = insertResult.rows[0];
                expect(insertedRow.user_id).toBe(user.id);
                expect(insertedRow.language).toBe(testData.language);
                expect(insertedRow.current_level).toBe(testData.currentLevel);
                expect(insertedRow.learning_goal).toBe(testData.learningGoal);
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
                expect(insertedRow.overall_level).toBeDefined();
                expect(insertedRow.confidence_score).toBeGreaterThanOrEqual(0);
                expect(insertedRow.confidence_score).toBeLessThanOrEqual(100);
                expect(typeof insertedRow.estimated_vocabulary_size).toBe('number');
                expect(typeof insertedRow.mastered_words_count).toBe('number');
                expect(typeof insertedRow.learning_words_count).toBe('number');
                expect(insertedRow.created_at).toBeDefined();
                expect(insertedRow.updated_at).toBeDefined();
                expect(insertedRow.last_assessed_at).toBeDefined();
            }
            catch (error) {
                console.error('Test error:', error);
                throw error;
            }
        }), {
            numRuns: 5,
            timeout: 15000,
            verbose: true
        });
    }, 30000);
    test('Property: Capability data consistency across updates', async () => {
        if (!db || !db.query || !userCapabilityService) {
            console.warn('Database or service not available, skipping test');
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            language: fast_check_1.default.constantFrom('en', 'ja', 'fr'),
            currentLevel: fast_check_1.default.constantFrom('A1', 'A2', 'B1', 'B2'),
            newListeningLevel: fast_check_1.default.integer({ min: 0, max: 100 }),
            newSpeakingLevel: fast_check_1.default.integer({ min: 0, max: 100 })
        }), async (testData) => {
            try {
                const user = await (0, userFactory_1.createTestUser)(db);
                const capabilityId = (0, uuid_1.v4)();
                await db.query(`INSERT INTO user_capabilities (
                id, user_id, language, current_level, learning_goal, overall_level,
                confidence_score, listening_level, speaking_level, reading_level, writing_level,
                estimated_vocabulary_size, mastered_words_count, learning_words_count,
                last_assessed_at, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 1000, 0, 0, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [capabilityId, user.id, testData.language, testData.currentLevel, testData.currentLevel]);
                const initialCapability = await userCapabilityService.getUserCapability(user.id, testData.language);
                expect(initialCapability).toBeTruthy();
                const updateSuccess = await userCapabilityService.updateUserCapability(user.id, testData.language, {
                    listeningLevel: testData.newListeningLevel,
                    speakingLevel: testData.newSpeakingLevel
                });
                expect(updateSuccess).toBe(true);
                const updatedCapability = await userCapabilityService.getUserCapability(user.id, testData.language);
                expect(updatedCapability).toBeTruthy();
                expect(updatedCapability.userId).toBe(user.id);
                expect(updatedCapability.language).toBe(testData.language);
                expect(updatedCapability.listeningLevel).toBe(testData.newListeningLevel);
                expect(updatedCapability.speakingLevel).toBe(testData.newSpeakingLevel);
                expect(updatedCapability.currentLevel).toBe(initialCapability.currentLevel);
                expect(updatedCapability.readingLevel).toBe(initialCapability.readingLevel);
                expect(updatedCapability.writingLevel).toBe(initialCapability.writingLevel);
                expect(updatedCapability.listeningLevel).toBeGreaterThanOrEqual(0);
                expect(updatedCapability.listeningLevel).toBeLessThanOrEqual(100);
                expect(updatedCapability.speakingLevel).toBeGreaterThanOrEqual(0);
                expect(updatedCapability.speakingLevel).toBeLessThanOrEqual(100);
                expect(updatedCapability.readingLevel).toBeGreaterThanOrEqual(0);
                expect(updatedCapability.readingLevel).toBeLessThanOrEqual(100);
                expect(updatedCapability.writingLevel).toBeGreaterThanOrEqual(0);
                expect(updatedCapability.writingLevel).toBeLessThanOrEqual(100);
            }
            catch (error) {
                console.error('Test error:', error);
                throw error;
            }
        }), {
            numRuns: 5,
            timeout: 15000,
            verbose: true
        });
    }, 30000);
    test('Property: Multiple language capabilities data integrity', async () => {
        if (!db || !db.query || !userCapabilityService) {
            console.warn('Database or service not available, skipping test');
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            languages: fast_check_1.default.shuffledSubarray(['en', 'ja', 'fr'], { minLength: 2, maxLength: 3 }),
            currentLevel: fast_check_1.default.constantFrom('A1', 'A2', 'B1', 'B2')
        }), async (testData) => {
            try {
                const user = await (0, userFactory_1.createTestUser)(db);
                const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [user.id]);
                if (userCheck.rows.length === 0) {
                    throw new Error(`User ${user.id} was not created successfully`);
                }
                const capabilities = [];
                for (const language of testData.languages) {
                    const createResult = await userCapabilityService.createUserCapability(user.id, {
                        language,
                        currentLevel: testData.currentLevel,
                        learningGoal: testData.currentLevel
                    });
                    expect(createResult).toBeTruthy();
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const capability = await userCapabilityService.getUserCapability(user.id, language);
                    expect(capability).toBeTruthy();
                    capabilities.push(capability);
                }
                expect(capabilities.length).toBe(testData.languages.length);
                const allCapabilities = await userCapabilityService.getAllUserCapabilities(user.id);
                expect(allCapabilities.length).toBe(testData.languages.length);
                for (let i = 0; i < capabilities.length; i++) {
                    const capability = capabilities[i];
                    const language = testData.languages[i];
                    expect(capability.userId).toBe(user.id);
                    expect(capability.language).toBe(language);
                    expect(capability.currentLevel).toBe(testData.currentLevel);
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
                const uniqueLanguages = new Set(allCapabilities.map((c) => c.language));
                expect(uniqueLanguages.size).toBe(testData.languages.length);
            }
            catch (error) {
                console.error('Test error:', error);
                throw error;
            }
        }), {
            numRuns: 3,
            timeout: 15000,
            verbose: true
        });
    }, 30000);
});
//# sourceMappingURL=capabilityAssessment.test.js.map