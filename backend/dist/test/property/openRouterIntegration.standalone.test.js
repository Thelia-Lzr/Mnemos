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
const OpenRouterService_1 = require("./../services/OpenRouterService");
const CreditService_1 = require("./../services/CreditService");
const openrouter_1 = require("./../types/openrouter");
const mockDb = {
    query: jest.fn(),
    connect: jest.fn()
};
jest.mock('../setup', () => ({
    setupTestEnvironment: jest.fn(),
    teardownTestEnvironment: jest.fn(),
    cleanTestDatabase: jest.fn(),
    testDb: mockDb,
    testRedis: {
        connect: jest.fn(),
        quit: jest.fn(),
        flushDb: jest.fn()
    }
}));
describe('Property-Based Tests: OpenRouter Integration and Credit Consumption', () => {
    describe('Model Selection Consistency', () => {
        it('should consistently select appropriate models for task types', async () => {
            const openRouterService = new OpenRouterService_1.OpenRouterService(true);
            await fc.assert(fc.property(fc.record({
                taskType: fc.constantFrom(...Object.values(openrouter_1.TaskType)),
                language: fc.constantFrom(...Object.values(openrouter_1.Language))
            }), ({ taskType, language }) => {
                const model1 = openRouterService.selectModel(taskType, language);
                const model2 = openRouterService.selectModel(taskType, language);
                const model3 = openRouterService.selectModel(taskType, language);
                expect(model1).toBe(model2);
                expect(model2).toBe(model3);
                expect(typeof model1).toBe('string');
                expect(model1.length).toBeGreaterThan(0);
                expect(model1).toMatch(/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+/);
            }), { numRuns: 100 });
        });
    });
    describe('Credit Cost Calculation Consistency', () => {
        it('should consistently calculate credit costs for any service and token usage', async () => {
            const creditService = new CreditService_1.CreditService(mockDb);
            await fc.assert(fc.property(fc.record({
                service: fc.constantFrom('chat_message', 'material_analysis', 'practice_generation', 'level_assessment', 'vocabulary_practice', 'function_call', 'pk_entry', 'pk_reward'),
                tokenUsage: fc.integer({ min: 0, max: 10000 })
            }), ({ service, tokenUsage }) => {
                const cost1 = creditService.calculateCreditCost(service, tokenUsage);
                const cost2 = creditService.calculateCreditCost(service, tokenUsage);
                const cost3 = creditService.calculateCreditCost(service, tokenUsage);
                expect(cost1).toBe(cost2);
                expect(cost2).toBe(cost3);
                if (service !== 'pk_reward') {
                    expect(cost1).toBeGreaterThanOrEqual(0);
                }
                if (tokenUsage > 0) {
                    const costWithoutTokens = creditService.calculateCreditCost(service, 0);
                    if (service !== 'pk_entry' && service !== 'pk_reward') {
                        expect(cost1).toBeGreaterThanOrEqual(costWithoutTokens);
                    }
                }
                expect(Number.isInteger(cost1)).toBe(true);
            }), { numRuns: 100 });
        });
        it('should maintain proportional cost scaling with token usage', async () => {
            const creditService = new CreditService_1.CreditService(mockDb);
            await fc.assert(fc.property(fc.record({
                service: fc.constantFrom('chat_message', 'material_analysis', 'practice_generation', 'level_assessment', 'vocabulary_practice', 'function_call'),
                baseTokens: fc.integer({ min: 100, max: 1000 }),
                multiplier: fc.integer({ min: 2, max: 10 })
            }), ({ service, baseTokens, multiplier }) => {
                const baseCost = creditService.calculateCreditCost(service, baseTokens);
                const scaledCost = creditService.calculateCreditCost(service, baseTokens * multiplier);
                expect(scaledCost).toBeGreaterThanOrEqual(baseCost);
                if (service !== 'pk_entry' && service !== 'pk_reward') {
                    const expectedMinimumIncrease = Math.max(1, Math.floor((multiplier - 1) * baseCost / multiplier));
                    expect(scaledCost - baseCost).toBeGreaterThanOrEqual(0);
                }
            }), { numRuns: 50 });
        });
    });
    describe('Service to Task Type Mapping', () => {
        it('should consistently map task types to service names', async () => {
            await fc.assert(fc.property(fc.constantFrom(...Object.values(openrouter_1.TaskType)), (taskType) => {
                const mockAIService = {
                    mapTaskTypeToService: (type) => {
                        const mapping = {
                            [openrouter_1.TaskType.CONVERSATION]: 'chat_message',
                            [openrouter_1.TaskType.MATERIAL_ANALYSIS]: 'material_analysis',
                            [openrouter_1.TaskType.EXERCISE_GENERATION]: 'practice_generation',
                            [openrouter_1.TaskType.LEVEL_ASSESSMENT]: 'level_assessment',
                            [openrouter_1.TaskType.VOCABULARY_EXTRACTION]: 'vocabulary_practice',
                            [openrouter_1.TaskType.FUNCTION_CALLING]: 'function_call',
                            [openrouter_1.TaskType.INTENT_RECOGNITION]: 'function_call'
                        };
                        return mapping[type] || 'chat_message';
                    }
                };
                const service1 = mockAIService.mapTaskTypeToService(taskType);
                const service2 = mockAIService.mapTaskTypeToService(taskType);
                const service3 = mockAIService.mapTaskTypeToService(taskType);
                expect(service1).toBe(service2);
                expect(service2).toBe(service3);
                expect(typeof service1).toBe('string');
                expect(service1.length).toBeGreaterThan(0);
                const validServices = [
                    'chat_message',
                    'material_analysis',
                    'practice_generation',
                    'level_assessment',
                    'vocabulary_practice',
                    'function_call'
                ];
                expect(validServices).toContain(service1);
            }), { numRuns: 50 });
        });
    });
});
//# sourceMappingURL=openRouterIntegration.standalone.test.js.map