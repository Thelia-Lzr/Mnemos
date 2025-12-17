"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const ChatService_1 = require("./../services/ChatService");
const AIFunctionService_1 = require("./../services/AIFunctionService");
const ChatMessage_1 = require("./../models/ChatMessage");
const chat_1 = require("../../types/chat");
const setup_1 = require("../setup");
describe('AI Chat System Property Tests', () => {
    let db;
    let chatService;
    let aiFunctionService;
    let chatMessage;
    const createTestUserWithCredits = async (userId) => {
        if (!setup_1.testDb) {
            console.warn('Test database not available, skipping user creation');
            return userId;
        }
        try {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(7);
            const uniqueUsername = `test_user_${userId.replace(/-/g, '').slice(0, 8)}_${randomSuffix}`;
            const uniqueEmail = `test_${userId.replace(/-/g, '').slice(0, 8)}_${randomSuffix}@example.com`;
            const client = await setup_1.testDb.connect();
            try {
                await client.query('BEGIN');
                await client.query('DELETE FROM users WHERE id = $1', [userId]);
                await client.query(`INSERT INTO users (id, username, email, password_hash, role) 
           VALUES ($1, $2, $3, $4, $5)`, [userId, uniqueUsername, uniqueEmail, 'hashed_password', 'user']);
                await client.query(`INSERT INTO user_credits (user_id, current_balance, total_earned) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (user_id) DO UPDATE SET 
             current_balance = EXCLUDED.current_balance,
             total_earned = EXCLUDED.total_earned`, [userId, 1000, 1000]);
                await client.query('COMMIT');
                const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
                if (userCheck.rows.length === 0) {
                    throw new Error(`Failed to create user with ID: ${userId}`);
                }
                return userId;
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('Failed to create test user:', error);
            throw error;
        }
    };
    const validUserIdArbitrary = fast_check_1.default.uuid();
    const validMessageArbitrary = fast_check_1.default.record({
        content: fast_check_1.default.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        language: fast_check_1.default.constantFrom('en', 'ja', 'fr'),
        context: fast_check_1.default.option(fast_check_1.default.dictionary(fast_check_1.default.string(), fast_check_1.default.anything()), { nil: undefined })
    });
    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        if (!setup_1.testDb) {
            await (0, setup_1.setupTestEnvironment)();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        db = setup_1.testDb;
        try {
            await db.query('SELECT 1');
        }
        catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
        chatService = new ChatService_1.ChatService(db, true);
        aiFunctionService = new AIFunctionService_1.AIFunctionService(db, true);
        chatMessage = new ChatMessage_1.ChatMessage(db);
    });
    afterAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
    });
    beforeEach(async () => {
        try {
            await db.query('DELETE FROM chat_messages');
            await db.query('DELETE FROM async_tasks');
            await db.query('DELETE FROM credit_transactions');
            await db.query('DELETE FROM user_credits');
            await db.query('DELETE FROM user_capabilities');
            await db.query('DELETE FROM user_preferences');
            await db.query('DELETE FROM users');
        }
        catch (error) {
            console.warn('Error cleaning up test data:', error);
        }
    });
    describe('Property 2: AI Processing Pipeline Integrity', () => {
        test('should process any valid text message through AI pipeline', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, validMessageArbitrary, async (userId, messageRequest) => {
                await createTestUserWithCredits(userId);
                const result = await chatService.sendMessage(userId, messageRequest);
                expect(result.success).toBeDefined();
                expect(typeof result.success).toBe('boolean');
                if (result.success && result.message) {
                    expect(result.message.id).toBeDefined();
                    expect(typeof result.message.id).toBe('string');
                    expect(result.message.content).toBeDefined();
                    expect(typeof result.message.content).toBe('string');
                    expect(result.message.type).toBe(chat_1.MessageType.AI_RESPONSE);
                    expect(result.message.processingStatus).toBe(chat_1.ProcessingStatus.COMPLETED);
                }
                else {
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');
                    expect(result.error.length).toBeGreaterThan(0);
                }
            }), { numRuns: 5 });
        });
        test('should handle async message processing with task tracking', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, validMessageArbitrary, async (userId, messageRequest) => {
                await createTestUserWithCredits(userId);
                const result = await chatService.sendMessageAsync(userId, messageRequest);
                expect(result.success).toBeDefined();
                expect(typeof result.success).toBe('boolean');
                if (result.success) {
                    expect(result.taskId).toBeDefined();
                    expect(typeof result.taskId).toBe('string');
                    expect(result.taskId.length).toBeGreaterThan(0);
                    expect(result.message).toBeDefined();
                    expect([chat_1.ProcessingStatus.PENDING, chat_1.ProcessingStatus.COMPLETED]).toContain(result.message.processingStatus);
                }
                else {
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');
                }
            }), { numRuns: 5 });
        });
    });
    describe('Property 17: AI Function Call Accuracy', () => {
        const validIntentArbitrary = fast_check_1.default.constantFrom(chat_1.UserIntent.GENERATE_PRACTICE, chat_1.UserIntent.VIEW_PRACTICE_HISTORY, chat_1.UserIntent.CHECK_PROGRESS, chat_1.UserIntent.VIEW_CAPABILITIES, chat_1.UserIntent.ADD_VOCABULARY, chat_1.UserIntent.VIEW_VOCABULARY, chat_1.UserIntent.CHECK_CREDITS, chat_1.UserIntent.VIEW_STATISTICS, chat_1.UserIntent.LANGUAGE_LEARNING);
        const validParametersArbitrary = fast_check_1.default.dictionary(fast_check_1.default.string({ minLength: 1, maxLength: 20 }), fast_check_1.default.oneof(fast_check_1.default.string(), fast_check_1.default.integer(), fast_check_1.default.boolean(), fast_check_1.default.array(fast_check_1.default.string(), { maxLength: 5 })));
        const functionCallRequestArbitrary = fast_check_1.default.record({
            intent: validIntentArbitrary,
            parameters: validParametersArbitrary,
            language: fast_check_1.default.option(fast_check_1.default.constantFrom('en', 'ja', 'fr'), { nil: undefined })
        });
        test('should correctly execute valid function calls', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, functionCallRequestArbitrary, async (userId, request) => {
                const result = await aiFunctionService.executeFunction(userId, request);
                expect(result.success).toBeDefined();
                expect(typeof result.success).toBe('boolean');
                if (result.success) {
                    expect(result.result).toBeDefined();
                    expect(typeof result.result.success).toBe('boolean');
                    if (result.result.success) {
                        const hasData = result.result.data !== undefined;
                        const hasAction = result.result.requiresUserAction === true && result.result.actionUrl;
                        expect(hasData || hasAction).toBe(true);
                    }
                    else {
                        expect(result.result.error).toBeDefined();
                        expect(typeof result.result.error).toBe('string');
                    }
                }
                else {
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');
                }
            }), { numRuns: 20 });
        });
        test('should correctly parse user intent from messages', async () => {
            const intentMessageArbitrary = fast_check_1.default.record({
                message: fast_check_1.default.oneof(fast_check_1.default.constant('I want to practice English'), fast_check_1.default.constant('Show me my learning progress'), fast_check_1.default.constant('Check my credit balance'), fast_check_1.default.constant('Generate some vocabulary exercises'), fast_check_1.default.constant('What is my current level?'), fast_check_1.default.constant('Add these words to my vocabulary'), fast_check_1.default.constant('Start a PK battle'), fast_check_1.default.string({ minLength: 5, maxLength: 100 })),
                language: fast_check_1.default.option(fast_check_1.default.constantFrom('en', 'ja', 'fr'), { nil: undefined }),
                context: fast_check_1.default.option(fast_check_1.default.dictionary(fast_check_1.default.string(), fast_check_1.default.anything()), { nil: undefined })
            });
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, intentMessageArbitrary, async (userId, request) => {
                await createTestUserWithCredits(userId);
                const result = await aiFunctionService.parseIntent(userId, request);
                expect(result.success).toBeDefined();
                expect(typeof result.success).toBe('boolean');
                if (result.success && result.result) {
                    expect(result.result.intent).toBeDefined();
                    expect(Object.values(chat_1.UserIntent)).toContain(result.result.intent);
                    expect(typeof result.result.confidence).toBe('number');
                    expect(result.result.confidence).toBeGreaterThanOrEqual(0);
                    expect(result.result.confidence).toBeLessThanOrEqual(1);
                    expect(result.result.parameters).toBeDefined();
                    expect(typeof result.result.parameters).toBe('object');
                    expect(typeof result.result.isPrivacySensitive).toBe('boolean');
                    expect(typeof result.result.requiresConfirmation).toBe('boolean');
                }
                else {
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');
                }
            }), { numRuns: 15 });
        });
    });
    describe('Property 18: Privacy Operation Rejection', () => {
        const privacySensitiveIntentArbitrary = fast_check_1.default.constantFrom(chat_1.UserIntent.ACCOUNT_MANAGEMENT, chat_1.UserIntent.PAYMENT_OPERATIONS, chat_1.UserIntent.PASSWORD_CHANGE);
        const privacySensitiveRequestArbitrary = fast_check_1.default.record({
            intent: privacySensitiveIntentArbitrary,
            parameters: fast_check_1.default.dictionary(fast_check_1.default.string({ minLength: 1, maxLength: 20 }), fast_check_1.default.oneof(fast_check_1.default.string(), fast_check_1.default.integer(), fast_check_1.default.boolean())),
            language: fast_check_1.default.option(fast_check_1.default.constantFrom('en', 'ja', 'fr'), { nil: undefined })
        });
        test('should reject all privacy-sensitive function calls', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, privacySensitiveRequestArbitrary, async (userId, request) => {
                const result = await aiFunctionService.executeFunction(userId, request);
                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
                expect(typeof result.error).toBe('string');
                expect(result.error.length).toBeGreaterThan(0);
                const errorLower = result.error.toLowerCase();
                const hasPrivacyKeywords = errorLower.includes('sensitive') ||
                    errorLower.includes('privacy') ||
                    errorLower.includes('account') ||
                    errorLower.includes('interface') ||
                    errorLower.includes('appropriate');
                expect(hasPrivacyKeywords).toBe(true);
                expect(result.result).toBeUndefined();
                expect(result.taskId).toBeUndefined();
            }), { numRuns: 20 });
        });
        test('should correctly identify privacy-sensitive intents in messages', async () => {
            const privacyMessageArbitrary = fast_check_1.default.record({
                message: fast_check_1.default.oneof(fast_check_1.default.constant('Change my password'), fast_check_1.default.constant('Update my payment method'), fast_check_1.default.constant('Delete my account'), fast_check_1.default.constant('Modify my billing information'), fast_check_1.default.constant('Access my payment history'), fast_check_1.default.constant('Update my personal details'), fast_check_1.default.string({ minLength: 5, maxLength: 100 }).map(s => s + ' ' + fast_check_1.default.sample(fast_check_1.default.constantFrom('password', 'payment', 'account', 'billing'), 1)[0])),
                language: fast_check_1.default.option(fast_check_1.default.constantFrom('en', 'ja', 'fr'), { nil: undefined }),
                context: fast_check_1.default.option(fast_check_1.default.dictionary(fast_check_1.default.string(), fast_check_1.default.anything()), { nil: undefined })
            });
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, privacyMessageArbitrary, async (userId, request) => {
                await createTestUserWithCredits(userId);
                const result = await aiFunctionService.parseIntent(userId, request);
                if (result.success && result.result) {
                    const privacySensitiveIntents = [
                        chat_1.UserIntent.ACCOUNT_MANAGEMENT,
                        chat_1.UserIntent.PAYMENT_OPERATIONS,
                        chat_1.UserIntent.PASSWORD_CHANGE
                    ];
                    if (privacySensitiveIntents.includes(result.result.intent)) {
                        expect(result.result.isPrivacySensitive).toBe(true);
                        expect(result.result.confidence).toBeGreaterThan(0.3);
                        expect(result.result.requiresConfirmation).toBe(true);
                    }
                    expect(Object.values(chat_1.UserIntent)).toContain(result.result.intent);
                    expect(typeof result.result.isPrivacySensitive).toBe('boolean');
                }
            }), { numRuns: 15 });
        });
        test('should maintain privacy protection under various input patterns', async () => {
            const mixedIntentArbitrary = fast_check_1.default.oneof(privacySensitiveIntentArbitrary, fast_check_1.default.constantFrom(chat_1.UserIntent.GENERATE_PRACTICE, chat_1.UserIntent.CHECK_PROGRESS, chat_1.UserIntent.VIEW_VOCABULARY, chat_1.UserIntent.LANGUAGE_LEARNING));
            const mixedRequestArbitrary = fast_check_1.default.record({
                intent: mixedIntentArbitrary,
                parameters: fast_check_1.default.dictionary(fast_check_1.default.string({ minLength: 1, maxLength: 20 }), fast_check_1.default.oneof(fast_check_1.default.string(), fast_check_1.default.integer(), fast_check_1.default.boolean())),
                language: fast_check_1.default.option(fast_check_1.default.constantFrom('en', 'ja', 'fr'), { nil: undefined })
            });
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, mixedRequestArbitrary, async (userId, request) => {
                const result = await aiFunctionService.executeFunction(userId, request);
                const privacySensitiveIntents = [
                    chat_1.UserIntent.ACCOUNT_MANAGEMENT,
                    chat_1.UserIntent.PAYMENT_OPERATIONS,
                    chat_1.UserIntent.PASSWORD_CHANGE
                ];
                if (privacySensitiveIntents.includes(request.intent)) {
                    expect(result.success).toBe(false);
                    expect(result.error).toBeDefined();
                    expect(result.error.toLowerCase()).toMatch(/sensitive|privacy|account|interface|appropriate/);
                }
                else {
                    expect(result.success).toBeDefined();
                    if (!result.success) {
                        expect(result.error).toBeDefined();
                        const errorLower = result.error.toLowerCase();
                        expect(errorLower).not.toMatch(/sensitive|privacy/);
                    }
                }
            }), { numRuns: 25 });
        });
    });
    describe('AI Pipeline Robustness', () => {
        test('should handle edge cases in message processing', async () => {
            const edgeCaseMessageArbitrary = fast_check_1.default.record({
                content: fast_check_1.default.oneof(fast_check_1.default.constant(''), fast_check_1.default.constant('   '), fast_check_1.default.string({ minLength: 1, maxLength: 5000 }), fast_check_1.default.string({ minLength: 1, maxLength: 100 }).map(s => s.repeat(10)), fast_check_1.default.constant('🎉🚀💡🔥'), fast_check_1.default.constant('Hello\n\nWorld\n\n\nTest')),
                language: fast_check_1.default.constantFrom('en', 'ja', 'fr'),
            });
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(validUserIdArbitrary, edgeCaseMessageArbitrary, async (userId, messageRequest) => {
                if (!messageRequest.content.trim()) {
                    return;
                }
                await createTestUserWithCredits(userId);
                const result = await chatService.sendMessage(userId, messageRequest);
                expect(result.success).toBeDefined();
                expect(typeof result.success).toBe('boolean');
                if (!result.success) {
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');
                    expect(result.error.length).toBeGreaterThan(0);
                }
            }), { numRuns: 10 });
        });
    });
});
//# sourceMappingURL=aiChatSystem.test.js.map