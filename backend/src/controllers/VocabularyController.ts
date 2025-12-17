import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { VocabularyService } from '../services/VocabularyService';
import { VocabularyPracticeService, VocabularyPracticeOptions, PracticeResult } from '../services/VocabularyPracticeService';
import { Language, MasteryLevel } from '../models/VocabularyWord';
import { pool } from '../config/database';

export class VocabularyController {
  private vocabularyService: VocabularyService;
  private vocabularyPracticeService: VocabularyPracticeService;

  constructor() {
    this.vocabularyService = new VocabularyService(pool);
    this.vocabularyPracticeService = new VocabularyPracticeService(pool);
  }

  async getVocabularyWords(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language, masteryLevel } = req.query;

      if (!language || !Object.values(Language).includes(language as Language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language parameter is required (en, ja, fr)' 
        });
        return;
      }

      const words = await this.vocabularyService.getUserVocabulary(
        userId, 
        language as Language, 
        masteryLevel as MasteryLevel
      );

      res.status(200).json({ 
        success: true, 
        data: { words } 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async addWords(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { text, language } = req.body;

      if (!text || !language) {
        res.status(400).json({ 
          success: false, 
          error: 'Text and language are required' 
        });
        return;
      }

      if (!Object.values(Language).includes(language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language is required (en, ja, fr)' 
        });
        return;
      }

      const result = await this.vocabularyService.extractAndAddWordsFromText(
        userId, 
        text, 
        language as Language
      );

      res.status(201).json({ 
        success: true, 
        data: result,
        message: `Added ${result.newWordsAdded.length} new words to vocabulary` 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async removeWord(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ 
          success: false, 
          error: 'Word ID is required' 
        });
        return;
      }

      const success = await this.vocabularyService.removeWord(userId, id);

      if (!success) {
        res.status(404).json({ 
          success: false, 
          error: 'Word not found or access denied' 
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        message: 'Word removed successfully' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async updateMastery(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { practiceScore, responseTime } = req.body;

      if (!id) {
        res.status(400).json({ 
          success: false, 
          error: 'Word ID is required' 
        });
        return;
      }

      if (practiceScore === undefined || responseTime === undefined) {
        res.status(400).json({ 
          success: false, 
          error: 'Practice score and response time are required' 
        });
        return;
      }

      const result = await this.vocabularyService.updateMasteryFromPractice(
        userId, 
        id, 
        practiceScore, 
        responseTime
      );

      res.status(200).json({ 
        success: true, 
        data: result,
        message: `Word mastery updated from ${result.previousLevel} to ${result.newLevel}` 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getMasteryStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.query;

      if (!language || !Object.values(Language).includes(language as Language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language parameter is required (en, ja, fr)' 
        });
        return;
      }

      const stats = await this.vocabularyService.getMasteryStats(userId, language as Language);

      res.status(200).json({ 
        success: true, 
        data: stats 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async updateMasteryFromPractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { wordId, practiceScore, responseTime } = req.body;

      if (!wordId || practiceScore === undefined || responseTime === undefined) {
        res.status(400).json({ 
          success: false, 
          error: 'Word ID, practice score, and response time are required' 
        });
        return;
      }

      const result = await this.vocabularyService.updateMasteryFromPractice(
        userId, 
        wordId, 
        practiceScore, 
        responseTime
      );

      res.status(200).json({ 
        success: true, 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getWordsNeedingReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language, limit } = req.query;

      if (!language || !Object.values(Language).includes(language as Language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language parameter is required (en, ja, fr)' 
        });
        return;
      }

      const words = await this.vocabularyService.getWordsNeedingReview(
        userId, 
        language as Language, 
        limit ? parseInt(limit as string) : 20
      );

      res.status(200).json({ 
        success: true, 
        data: { words } 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async applyDailyDecay(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.body;

      if (!language || !Object.values(Language).includes(language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language is required (en, ja, fr)' 
        });
        return;
      }

      await this.vocabularyService.applyDailyDecay(userId, language as Language);

      res.status(200).json({ 
        success: true, 
        message: 'Daily decay applied successfully' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getScheduledReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language, limit } = req.query;

      if (!language || !Object.values(Language).includes(language as Language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language parameter is required (en, ja, fr)' 
        });
        return;
      }

      const schedules = await this.vocabularyService.getScheduledReviews(
        userId, 
        language as Language, 
        limit ? parseInt(limit as string) : 50
      );

      res.status(200).json({ 
        success: true, 
        data: { schedules } 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getReviewReminders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const reminders = await this.vocabularyService.generateReviewReminders(userId);

      res.status(200).json({ 
        success: true, 
        data: { reminders } 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getForgettingCurveMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.query;

      if (!language || !Object.values(Language).includes(language as Language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language parameter is required (en, ja, fr)' 
        });
        return;
      }

      const metrics = await this.vocabularyService.getForgettingCurveMetrics(userId, language as Language);

      res.status(200).json({ 
        success: true, 
        data: metrics 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async optimizeReviewSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.body;

      if (!language || !Object.values(Language).includes(language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language is required (en, ja, fr)' 
        });
        return;
      }

      await this.vocabularyService.optimizeReviewSchedule(userId, language as Language);

      res.status(200).json({ 
        success: true, 
        message: 'Review schedule optimized successfully' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generateVocabularyPractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language, wordIds, masteryLevels, maxWords, focusOnWeakWords, includeReviewWords } = req.body;

      if (!language || !Object.values(Language).includes(language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language is required (en, ja, fr)' 
        });
        return;
      }

      const options: VocabularyPracticeOptions = {
        userId,
        language: language as Language,
        wordIds,
        masteryLevels,
        maxWords,
        focusOnWeakWords,
        includeReviewWords
      };

      const practiceGroup = await this.vocabularyPracticeService.generateVocabularyPracticeGroup(options);

      res.status(200).json({ 
        success: true, 
        data: practiceGroup 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generateAdaptivePractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language } = req.body;

      if (!language || !Object.values(Language).includes(language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language is required (en, ja, fr)' 
        });
        return;
      }

      const practiceGroup = await this.vocabularyPracticeService.generateAdaptivePractice(userId, language as Language);

      res.status(200).json({ 
        success: true, 
        data: practiceGroup 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async submitPracticeResults(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { results } = req.body;

      if (!results || !Array.isArray(results)) {
        res.status(400).json({ 
          success: false, 
          error: 'Practice results array is required' 
        });
        return;
      }

      await this.vocabularyPracticeService.processPracticeResults(userId, results as PracticeResult[]);

      res.status(200).json({ 
        success: true, 
        message: 'Practice results processed successfully' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getLearningEfficiencyMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { language, days } = req.query;

      if (!language || !Object.values(Language).includes(language as Language)) {
        res.status(400).json({ 
          success: false, 
          error: 'Valid language parameter is required (en, ja, fr)' 
        });
        return;
      }

      const metrics = await this.vocabularyPracticeService.getLearningEfficiencyMetrics(
        userId, 
        language as Language, 
        days ? parseInt(days as string) : 30
      );

      res.status(200).json({ 
        success: true, 
        data: metrics 
      });
    } catch (error) { 
      next(error); 
    }
  }
}
