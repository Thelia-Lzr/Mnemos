import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserService } from '../services/UserService';
import { CreateUserRequest, LoginRequest, RefreshTokenRequest } from '../models/User';
import { Pool } from 'pg';

export class AuthController {
  private userService: UserService;

  constructor(db: Pool) {
    this.userService = new UserService(db);
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;
      const result = await this.userService.createUser(userData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      const result = await this.userService.loginUser(loginData);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For JWT-based auth, logout is handled client-side by removing the token
      // In a production system, you might want to maintain a blacklist of tokens
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      const result = await this.userService.refreshToken(refreshToken);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const user = await this.userService.getUserById(req.user.id);
      const preferences = await this.userService.getUserPreferences(req.user.id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        preferences
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const success = await this.userService.updateUserPreferences(req.user.id, req.body);

      if (success) {
        const updatedPreferences = await this.userService.getUserPreferences(req.user.id);
        res.status(200).json({
          success: true,
          preferences: updatedPreferences
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update preferences'
        });
      }
    } catch (error) {
      next(error);
    }
  }
}
