import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ChatService } from '../services/ChatService';
import { AIFunctionService } from '../services/AIFunctionService';
import { pool } from '../config/database';
import { 
  SendMessageRequest, 
  UploadMaterialRequest, 
  FunctionCallRequest, 
  ParseIntentRequest 
} from '../types/chat';

export class ChatController {
  private chatService: ChatService;
  private aiFunctionService: AIFunctionService;

  constructor() {
    this.chatService = new ChatService(pool);
    this.aiFunctionService = new AIFunctionService(pool, false);
  }

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const request: SendMessageRequest = req.body;

      // Validate request
      if (!request.content || typeof request.content !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
        return;
      }

      const result = await this.chatService.sendMessage(userId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async uploadMaterial(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const file = req.file;
      const request: UploadMaterialRequest = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'File is required'
        });
        return;
      }

      const result = await this.chatService.uploadMaterial(userId, file, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const language = req.query.language as string;

      const result = await this.chatService.getChatHistory(userId, limit, offset, language);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async sendMessageAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const request: SendMessageRequest = req.body;

      // Validate request
      if (!request.content || typeof request.content !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
        return;
      }

      const result = await this.chatService.sendMessageAsync(userId, request);
      
      if (result.success) {
        res.status(202).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async uploadMaterialAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const file = req.file;
      const request: UploadMaterialRequest = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'File is required'
        });
        return;
      }

      const result = await this.chatService.uploadMaterialAsync(userId, file, request);
      
      if (result.success) {
        res.status(202).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async executeFunction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const request: FunctionCallRequest = req.body;

      // Validate request
      if (!request.intent) {
        res.status(400).json({
          success: false,
          error: 'Intent is required'
        });
        return;
      }

      const result = await this.aiFunctionService.executeFunction(userId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async executeFunctionAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const request: FunctionCallRequest = req.body;

      // Validate request
      if (!request.intent) {
        res.status(400).json({
          success: false,
          error: 'Intent is required'
        });
        return;
      }

      const result = await this.aiFunctionService.executeFunctionAsync(userId, request);
      
      if (result.success) {
        res.status(202).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async parseIntent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const request: ParseIntentRequest = req.body;

      // Validate request
      if (!request.message || typeof request.message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Message is required'
        });
        return;
      }

      const result = await this.aiFunctionService.parseIntent(userId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getAvailableFunctions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.aiFunctionService.getAvailableFunctions();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  // Additional utility endpoints
  async clearChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await this.chatService.clearChatHistory(userId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

  async searchMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const searchTerm = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: 'Search term is required'
        });
        return;
      }

      const result = await this.chatService.searchMessages(userId, searchTerm, limit);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
}
