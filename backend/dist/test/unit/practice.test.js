"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PracticeController_1 = require("./../controllers/PracticeController");
const userFactory_1 = require("../factories/userFactory");
const practiceFactory_1 = require("../factories/practiceFactory");
const testHelpers_1 = require("../helpers/testHelpers");
const mockPracticeGenerationService = {
    generatePracticeGroup: jest.fn(),
    generateComprehensivePractice: jest.fn(),
    generateVocabularyPractice: jest.fn(),
    generatePracticeGroupAsync: jest.fn()
};
const mockPracticeGroupModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    createResult: jest.fn()
};
const mockPracticeEvaluationService = {
    evaluatePracticeGroup: jest.fn(),
    updateUserCapabilities: jest.fn()
};
describe('PracticeController', () => {
    let practiceController;
    beforeEach(() => {
        jest.clearAllMocks();
        practiceController = new PracticeController_1.PracticeController(mockPracticeGenerationService, mockPracticeGroupModel, mockPracticeEvaluationService);
    });
    describe('generatePracticeGroup', () => {
        it('should generate practice group successfully', async () => {
            const user = await userFactory_1.UserFactory.create();
            const mockPracticeGroup = practiceFactory_1.PracticeFactory.create({ userId: user.id });
            mockPracticeGenerationService.generatePracticeGroup.mockResolvedValue(mockPracticeGroup);
            mockPracticeGroupModel.create.mockResolvedValue(mockPracticeGroup);
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                body: {
                    language: 'en',
                    difficulty: 'intermediate',
                    type: 'general'
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await practiceController.generatePracticeGroup(req, res, next);
            expect(mockPracticeGenerationService.generatePracticeGroup).toHaveBeenCalledWith({
                userId: user.id,
                language: 'en',
                difficulty: 'intermediate',
                type: 'general',
                focusAreas: undefined,
                vocabularyWords: undefined,
                grammarPoints: undefined,
                count: undefined
            });
            expect(mockPracticeGroupModel.create).toHaveBeenCalledWith(mockPracticeGroup);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockPracticeGroup
            });
        });
        it('should return 400 for missing required fields', async () => {
            const user = await userFactory_1.UserFactory.create();
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                body: {}
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await practiceController.generatePracticeGroup(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Language and type are required'
            });
        });
    });
    describe('getPracticeGroups', () => {
        it('should return user practice groups', async () => {
            const user = await userFactory_1.UserFactory.create();
            const mockPracticeGroups = [
                practiceFactory_1.PracticeFactory.create({ userId: user.id }),
                practiceFactory_1.PracticeFactory.create({ userId: user.id })
            ];
            mockPracticeGroupModel.findByUserId.mockResolvedValue(mockPracticeGroups);
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                query: {
                    limit: '20',
                    offset: '0'
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await practiceController.getPracticeGroups(req, res, next);
            expect(mockPracticeGroupModel.findByUserId).toHaveBeenCalledWith(user.id, 20, 0);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockPracticeGroups,
                pagination: {
                    limit: 20,
                    offset: 0,
                    total: mockPracticeGroups.length
                }
            });
        });
    });
    describe('submitPracticeGroup', () => {
        it('should submit practice group and return results', async () => {
            const user = await userFactory_1.UserFactory.create();
            const practiceGroup = practiceFactory_1.PracticeFactory.create({ userId: user.id });
            const mockResult = {
                id: 'result-id',
                userId: user.id,
                practiceGroupId: practiceGroup.id,
                totalQuestions: 10,
                correctAnswers: 8,
                accuracy: 80,
                totalTime: 600,
                averageTimePerQuestion: 60,
                weakAreas: [],
                improvedAreas: ['vocabulary'],
                recommendedFocus: []
            };
            mockPracticeGroupModel.findById.mockResolvedValue(practiceGroup);
            mockPracticeEvaluationService.evaluatePracticeGroup.mockResolvedValue(mockResult);
            mockPracticeGroupModel.createResult.mockResolvedValue(mockResult);
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                params: {
                    id: practiceGroup.id
                },
                body: {
                    answers: [
                        { questionId: practiceGroup.questions[0].id, answer: 'Option A' }
                    ],
                    totalTime: 600
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await practiceController.submitPracticeGroup(req, res, next);
            expect(mockPracticeGroupModel.findById).toHaveBeenCalledWith(practiceGroup.id);
            expect(mockPracticeEvaluationService.evaluatePracticeGroup).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockResult
            });
        });
        it('should return 404 for non-existent practice group', async () => {
            const user = await userFactory_1.UserFactory.create();
            mockPracticeGroupModel.findById.mockResolvedValue(null);
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                params: {
                    id: 'non-existent-id'
                },
                body: {
                    answers: []
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await practiceController.submitPracticeGroup(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Practice group not found'
            });
        });
    });
    describe('generatePracticeGroupAsync', () => {
        it('should return 202 status for async practice generation', async () => {
            const user = await userFactory_1.UserFactory.create();
            const mockTaskId = 'task-123';
            mockPracticeGenerationService.generatePracticeGroupAsync.mockResolvedValue(mockTaskId);
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                body: {
                    language: 'en',
                    difficulty: 'advanced',
                    type: 'vocabulary'
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await practiceController.generatePracticeGroupAsync(req, res, next);
            expect(mockPracticeGenerationService.generatePracticeGroupAsync).toHaveBeenCalledWith({
                userId: user.id,
                language: 'en',
                difficulty: 'advanced',
                type: 'vocabulary',
                focusAreas: undefined,
                vocabularyWords: undefined,
                grammarPoints: undefined,
                count: undefined
            });
            expect(res.status).toHaveBeenCalledWith(202);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                taskId: mockTaskId,
                message: 'Practice generation started. Check task status for completion.'
            });
        });
    });
});
//# sourceMappingURL=practice.test.js.map