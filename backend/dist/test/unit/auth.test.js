"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AuthController_1 = require("./../controllers/AuthController");
const userFactory_1 = require("../factories/userFactory");
const testHelpers_1 = require("../helpers/testHelpers");
const mockDb = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
};
describe('AuthController', () => {
    let authController;
    beforeEach(() => {
        jest.clearAllMocks();
        authController = new AuthController_1.AuthController(mockDb);
    });
    describe('register', () => {
        it('should register user successfully', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockDb.connect.mockResolvedValue(mockClient);
            mockClient.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'user-id' }] })
                .mockResolvedValueOnce({});
            const req = testHelpers_1.TestHelpers.createMockRequest({
                body: {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'Password123!',
                    language: 'en',
                    currentLevel: 'B1'
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await authController.register(req, res, next);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
        it('should handle registration errors', async () => {
            mockDb.connect.mockRejectedValue(new Error('Database error'));
            const req = testHelpers_1.TestHelpers.createMockRequest({
                body: {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await authController.register(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
        });
    });
    describe('login', () => {
        it('should login user successfully', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                        id: 'user-id',
                        username: 'testuser',
                        email: 'test@example.com',
                        password_hash: '$2b$10$hashedpassword',
                        role: 'user'
                    }]
            });
            const req = testHelpers_1.TestHelpers.createMockRequest({
                body: {
                    email: 'test@example.com',
                    password: 'password123'
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await authController.login(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
        });
        it('should handle login with invalid credentials', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [] });
            const req = testHelpers_1.TestHelpers.createMockRequest({
                body: {
                    email: 'nonexistent@example.com',
                    password: 'password123'
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await authController.login(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
        });
    });
    describe('logout', () => {
        it('should logout user successfully', async () => {
            const req = testHelpers_1.TestHelpers.createMockRequest();
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await authController.logout(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logged out successfully'
            });
        });
    });
    describe('getProfile', () => {
        it('should return user profile when user exists', async () => {
            const user = await userFactory_1.UserFactory.create();
            mockDb.query
                .mockResolvedValueOnce({
                rows: [{
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        created_at: new Date(),
                        last_login_at: new Date()
                    }]
            })
                .mockResolvedValueOnce({
                rows: [{
                        theme: 'light',
                        notifications_email: true,
                        notifications_push: true
                    }]
            });
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await authController.getProfile(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                user: expect.any(Object),
                preferences: expect.any(Object)
            }));
        });
        it('should return 404 when user not found', async () => {
            const user = await userFactory_1.UserFactory.create();
            mockDb.query.mockResolvedValueOnce({ rows: [] });
            const req = testHelpers_1.TestHelpers.createMockRequest({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
            const res = testHelpers_1.TestHelpers.createMockResponse();
            const next = testHelpers_1.TestHelpers.createMockNext();
            await authController.getProfile(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
        });
    });
});
//# sourceMappingURL=auth.test.js.map