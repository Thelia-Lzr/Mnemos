import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PKMatchingService } from '../services/PKMatchingService';
import { MMRService } from '../services/MMRService';
import { PKBattleService } from '../services/PKBattleService';
import { PKRewardService } from '../services/PKRewardService';
import { Language } from '../models/PracticeGroup';

export class PKController {
  private matchingService: PKMatchingService;
  private mmrService: MMRService;
  private battleService: PKBattleService;
  private rewardService: PKRewardService;

  constructor() {
    this.matchingService = new PKMatchingService();
    this.mmrService = new MMRService();
    this.battleService = new PKBattleService();
    this.rewardService = new PKRewardService();
  }

  async findMatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.body;

      if (!language || !['en', 'ja', 'fr'].includes(language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const matchRequest = await this.matchingService.requestMatch(userId, language as Language);
      
      res.status(200).json({ 
        success: true, 
        data: matchRequest,
        message: matchRequest.status === 'matched' ? 'Match found!' : 'Searching for opponent...'
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getMatchStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.query;

      if (!language || !['en', 'ja', 'fr'].includes(language as string)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const status = await this.matchingService.getMatchStatus(userId, language as Language);
      
      res.status(200).json({ 
        success: true, 
        data: status
      });
    } catch (error) { 
      next(error); 
    }
  }

  async cancelMatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.body;

      if (!language || !['en', 'ja', 'fr'].includes(language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const cancelled = await this.matchingService.cancelMatch(userId, language as Language);
      
      if (cancelled) {
        res.status(200).json({ 
          success: true, 
          message: 'Match request cancelled successfully'
        });
      } else {
        res.status(404).json({ 
          success: false, 
          error: 'No active match request found'
        });
      }
    } catch (error) { 
      next(error); 
    }
  }

  async getBattle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const battle = await this.battleService.getBattle(id);
      
      if (!battle) {
        res.status(404).json({ 
          success: false, 
          error: 'Battle not found' 
        });
        return;
      }

      // 验证用户是否参与此对�?
      if (battle.player1Id !== userId && battle.player2Id !== userId) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        data: battle
      });
    } catch (error) { 
      next(error); 
    }
  }

  async submitAnswer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { questionId, answer } = req.body;

      if (!questionId || !answer) {
        res.status(400).json({ 
          success: false, 
          error: 'Question ID and answer are required' 
        });
        return;
      }

      const battleAnswer = await this.battleService.submitAnswer(id, userId, questionId, answer);
      
      res.status(200).json({ 
        success: true, 
        data: battleAnswer
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getBattleHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit } = req.query;

      const limitNum = limit ? parseInt(limit as string) : 20;
      const history = await this.battleService.getBattleHistory(userId, limitNum);
      
      res.status(200).json({ 
        success: true, 
        data: history
      });
    } catch (error) { 
      next(error); 
    }
  }

  async startBattle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // 验证用户是否参与此对�?
      const battle = await this.battleService.getBattle(id);
      if (!battle) {
        res.status(404).json({ 
          success: false, 
          error: 'Battle not found' 
        });
        return;
      }

      if (battle.player1Id !== userId && battle.player2Id !== userId) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
        return;
      }

      const startedBattle = await this.battleService.startBattle(id);
      
      res.status(200).json({ 
        success: true, 
        data: startedBattle
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getMMRRanking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, limit } = req.query;

      if (!language || !['en', 'ja', 'fr'].includes(language as string)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const limitNum = limit ? parseInt(limit as string) : 50;
      const ranking = await this.mmrService.getMMRRanking(language as Language, limitNum);
      
      res.status(200).json({ 
        success: true, 
        data: ranking
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getUserMMR(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.query;

      if (!language || !['en', 'ja', 'fr'].includes(language as string)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      let userMMR = await this.mmrService.getUserMMR(userId, language as Language);
      if (!userMMR) {
        userMMR = await this.mmrService.initializeUserMMR(userId, language as Language);
      }
      
      res.status(200).json({ 
        success: true, 
        data: userMMR
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getMMRHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.query;

      if (!language || !['en', 'ja', 'fr'].includes(language as string)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const history = await this.mmrService.getMMRHistory(userId, language as Language);
      
      res.status(200).json({ 
        success: true, 
        data: history
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getMatchingStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language } = req.query;

      if (!language || !['en', 'ja', 'fr'].includes(language as string)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const stats = await this.matchingService.getMatchingStats(language as Language);
      
      res.status(200).json({ 
        success: true, 
        data: stats
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getPKStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.query;

      if (!language || !['en', 'ja', 'fr'].includes(language as string)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const stats = await this.rewardService.getPKStats(userId, language as Language);
      
      res.status(200).json({ 
        success: true, 
        data: stats
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getPKLeaderboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, limit } = req.query;

      if (!language || !['en', 'ja', 'fr'].includes(language as string)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language (en, ja, fr) is required' 
        });
        return;
      }

      const limitNum = limit ? parseInt(limit as string) : 50;
      const leaderboard = await this.rewardService.getPKLeaderboard(language as Language, limitNum);
      
      res.status(200).json({ 
        success: true, 
        data: leaderboard
      });
    } catch (error) { 
      next(error); 
    }
  }
}
