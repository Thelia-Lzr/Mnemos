import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserCapabilityService } from '../services/UserCapabilityService';
import { ReassessmentService } from '../services/ReassessmentService';
import { AIService } from '../services/AIService';
import { Pool } from 'pg';
import { 
  AssessmentRequest, 
  ReassessmentRequest, 
  Language, 
  AssessmentType, 
  AssessmentDataSource,
  SkillArea 
} from '../models/UserCapability';

export class AssessmentController {
  private userCapabilityService: UserCapabilityService;
  private reassessmentService: ReassessmentService;

  constructor(private db: Pool) {
    const aiService = new AIService(db);
    this.userCapabilityService = new UserCapabilityService(db, aiService);
    this.reassessmentService = new ReassessmentService(db, aiService, this.userCapabilityService);
  }

  async getUserCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language } = req.params;
      
      if (!language) {
        res.status(400).json({
          success: false,
          error: 'Language parameter is required'
        });
        return;
      }

      const capability = await this.userCapabilityService.getUserCapability(
        req.user!.id, 
        language as Language
      );

      if (!capability) {
        res.status(404).json({
          success: false,
          error: 'User capability not found for this language'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: capability
      });
    } catch (error) {
      next(error);
    }
  }

  async performComprehensiveAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, assessmentType, dataSource, includeRecommendations } = req.body;

      if (!language) {
        res.status(400).json({
          success: false,
          error: 'Language is required'
        });
        return;
      }

      const assessmentRequest: AssessmentRequest = {
        userId: req.user!.id,
        language: language as Language,
        assessmentType: (assessmentType as AssessmentType) || 'user_requested',
        dataSource: (dataSource as AssessmentDataSource) || 'comprehensive_test',
        includeRecommendations: includeRecommendations !== false
      };

      const assessment = await this.userCapabilityService.performComprehensiveAssessment(assessmentRequest);

      if (!assessment) {
        res.status(500).json({
          success: false,
          error: 'Failed to perform assessment'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: assessment,
        message: 'Comprehensive assessment completed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAssessmentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!language) {
        res.status(400).json({
          success: false,
          error: 'Language parameter is required'
        });
        return;
      }

      const history = await this.userCapabilityService.getAssessmentHistory(
        req.user!.id,
        language as Language,
        limit
      );

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  async initiateReassessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, reason, focusAreas } = req.body;

      if (!language || !reason) {
        res.status(400).json({
          success: false,
          error: 'Language and reason are required'
        });
        return;
      }

      const reassessmentRequest: ReassessmentRequest = {
        userId: req.user!.id,
        language: language as Language,
        reason,
        focusAreas: focusAreas as SkillArea[]
      };

      const reassessmentCase = await this.reassessmentService.initiateReassessment(reassessmentRequest);

      if (!reassessmentCase) {
        res.status(500).json({
          success: false,
          error: 'Failed to initiate reassessment'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: reassessmentCase,
        message: 'Reassessment initiated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async submitReassessmentResponse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reassessmentId } = req.params;
      const { questionId, userAnswer } = req.body;

      if (!questionId || !userAnswer) {
        res.status(400).json({
          success: false,
          error: 'Question ID and user answer are required'
        });
        return;
      }

      const response = await this.reassessmentService.submitReassessmentResponse(
        reassessmentId,
        questionId,
        userAnswer
      );

      if (!response) {
        res.status(500).json({
          success: false,
          error: 'Failed to submit reassessment response'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: response,
        message: 'Response submitted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getReassessmentCase(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reassessmentId } = req.params;

      const reassessmentCase = await this.reassessmentService.getReassessmentCase(reassessmentId);

      if (!reassessmentCase) {
        res.status(404).json({
          success: false,
          error: 'Reassessment case not found'
        });
        return;
      }

      // Verify ownership
      if (reassessmentCase.userId !== req.user!.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: reassessmentCase
      });
    } catch (error) {
      next(error);
    }
  }

  async getReassessmentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language } = req.params;

      if (!language) {
        res.status(400).json({
          success: false,
          error: 'Language parameter is required'
        });
        return;
      }

      const history = await this.reassessmentService.getUserReassessmentHistory(
        req.user!.id,
        language as Language
      );

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelReassessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reassessmentId } = req.params;
      const { reason } = req.body;

      // Verify ownership first
      const reassessmentCase = await this.reassessmentService.getReassessmentCase(reassessmentId);
      if (!reassessmentCase || reassessmentCase.userId !== req.user!.id) {
        res.status(404).json({
          success: false,
          error: 'Reassessment case not found'
        });
        return;
      }

      const success = await this.reassessmentService.cancelReassessment(
        reassessmentId,
        reason || 'Cancelled by user'
      );

      if (!success) {
        res.status(500).json({
          success: false,
          error: 'Failed to cancel reassessment'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Reassessment cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language } = req.params;
      const updateData = req.body;

      if (!language) {
        res.status(400).json({
          success: false,
          error: 'Language parameter is required'
        });
        return;
      }

      const updatedCapability = await this.userCapabilityService.updateUserCapability(
        req.user!.id,
        language as Language,
        updateData
      );

      if (!updatedCapability) {
        res.status(500).json({
          success: false,
          error: 'Failed to update user capability'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedCapability,
        message: 'User capability updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async createUserCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, currentLevel, learningGoal } = req.body;

      if (!language || !currentLevel || !learningGoal) {
        res.status(400).json({
          success: false,
          error: 'Language, current level, and learning goal are required'
        });
        return;
      }

      const capability = await this.userCapabilityService.createUserCapability(req.user!.id, {
        language: language as Language,
        currentLevel,
        learningGoal
      });

      if (!capability) {
        res.status(500).json({
          success: false,
          error: 'Failed to create user capability'
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: capability,
        message: 'User capability created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUserCapabilities(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const capabilities = await this.userCapabilityService.getAllUserCapabilities(req.user!.id);

      res.status(200).json({
        success: true,
        data: capabilities
      });
    } catch (error) {
      next(error);
    }
  }
}