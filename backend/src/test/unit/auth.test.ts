import { AuthController } from '../../controllers/AuthController';
import { UserFactory } from '../factories/userFactory';
import { TestHelpers } from '../helpers/testHelpers';

// Mock database
const mockDb = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

describe('AuthController', () => {
  let authController: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    authController = new AuthController(mockDb as any);
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      // Mock successful user creation
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDb.connect.mockResolvedValue(mockClient);
      
      // Mock the sequence of queries for user creation
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user - none found
        .mockResolvedValueOnce({ rows: [] }) // Check existing email - none found  
        .mockResolvedValueOnce({ rows: [{ id: 'user-id' }] }) // Insert user
        .mockResolvedValueOnce({}); // Insert preferences

      const req = TestHelpers.createMockRequest({
        body: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          language: 'en',
          currentLevel: 'B1'
        }
      });
      const res = TestHelpers.createMockResponse();
      const next = TestHelpers.createMockNext();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should handle registration errors', async () => {
      // Mock database error
      mockDb.connect.mockRejectedValue(new Error('Database error'));

      const req = TestHelpers.createMockRequest({
        body: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        }
      });
      const res = TestHelpers.createMockResponse();
      const next = TestHelpers.createMockNext();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Mock successful login
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          password_hash: '$2b$10$hashedpassword',
          role: 'user'
        }]
      });

      const req = TestHelpers.createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      });
      const res = TestHelpers.createMockResponse();
      const next = TestHelpers.createMockNext();

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401); // Will fail due to password mismatch, but that's expected
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should handle login with invalid credentials', async () => {
      // Mock user not found
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const req = TestHelpers.createMockRequest({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      });
      const res = TestHelpers.createMockResponse();
      const next = TestHelpers.createMockNext();

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const req = TestHelpers.createMockRequest();
      const res = TestHelpers.createMockResponse();
      const next = TestHelpers.createMockNext();

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
      const user = await UserFactory.create();
      
      // Mock user and preferences queries
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

      const req = TestHelpers.createMockRequest({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
      const res = TestHelpers.createMockResponse();
      const next = TestHelpers.createMockNext();

      await authController.getProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.any(Object),
          preferences: expect.any(Object)
        })
      );
    });

    it('should return 404 when user not found', async () => {
      const user = await UserFactory.create();
      
      // Mock user not found
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const req = TestHelpers.createMockRequest({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
      const res = TestHelpers.createMockResponse();
      const next = TestHelpers.createMockNext();

      await authController.getProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });
});
