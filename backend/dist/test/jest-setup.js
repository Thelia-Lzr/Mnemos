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
const setup_1 = require("../setup");
beforeAll(async () => {
    try {
        await (0, setup_1.setupTestEnvironment)();
        console.log('Test environment setup completed');
    }
    catch (error) {
        console.warn('Test environment setup failed, tests may be skipped:', error);
    }
});
afterAll(async () => {
    try {
        try {
            const { TaskResultManager } = await Promise.resolve().then(() => __importStar(require('../services/TaskResultManager')));
            const taskResultManager = TaskResultManager.getInstance();
            taskResultManager.stopCleanupTimer();
            console.log('TaskResultManager cleanup timer stopped');
        }
        catch (error) {
        }
        await (0, setup_1.teardownTestEnvironment)();
        console.log('Test environment cleanup completed');
    }
    catch (error) {
        console.warn('Test environment cleanup failed:', error);
    }
}, 60000);
jest.mock('./helpers/testHelpers', () => ({
    TestHelpers: {
        generateAuthToken: jest.fn(),
        insertUser: jest.fn(),
        insertUserCredits: jest.fn(),
        getUser: jest.fn().mockImplementation((userId) => ({
            id: userId,
            username: 'test_user',
            email: 'test@example.com',
            password_hash: '$2a$10$hashedpassword',
            role: 'user',
            created_at: new Date()
        })),
        getUserCredits: jest.fn().mockImplementation((userId) => ({
            id: 'credit-id',
            user_id: userId,
            current_balance: 100,
            created_at: new Date()
        })),
        wait: jest.fn(),
        randomString: jest.fn(),
        randomEmail: jest.fn(),
        randomInt: jest.fn(),
        createMockRequest: jest.fn(),
        createMockResponse: jest.fn(),
        createMockNext: jest.fn(),
        assertSuccessResponse: jest.fn(),
        assertErrorResponse: jest.fn()
    }
}));
//# sourceMappingURL=jest-setup.js.map