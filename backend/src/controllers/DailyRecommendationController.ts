import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
import { DailyRecommendationService, RecommendationFeedback } from '../services/DailyRecommendationService';
import { AIService } from '../services/AIService';
import { UserCapabilityService } from '../services/UserCapabilityService';
import { VocabularyService } from '../services/VocabularyService';
import { AsyncTaskManager } from '../services/AsyncTaskManager';
import { Language } from '../types/openrouter';

export class DailyRecommendationController {
  private dailyRecommendationService: DailyRecommendationService;

  constructor(database: Pool) {
    const aiService = new AIService(database);
    const userCapabilityService = new UserCapabilityService(database, aiService);
    const vocabularyService = new VocabularyService(database);
    const asyncTaskManager = AsyncTaskManager.getInstance();
    
    this.dailyRecommendationService = new DailyRecommendationService(
      database,
      aiService,
      userCapabilityService,
      vocabularyService,
      asyncTaskManager
    );
  }

  /**
   * Get today's daily learning recommendation
   */
  async getTodaysRecommendation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      const recommendation = await this.dailyRecommendationService.getTodaysRecommendation(
        userId, 
        language as Language
      );

      if (!recommendation) {
        res.status(404).json({ error: 'No recommendation found for today' });
        return;
      }

      // Mark as viewed if not already viewed
      if (!recommendation.isViewed) {
        await this.dailyRecommendationService.markRecommendationAsViewed(userId, language as Language);
        recommendation.isViewed = true;
        recommendation.viewedAt = new Date();
      }

      res.json({
        success: true,
        data: recommendation
      });
    } catch (error) {
      console.error('Error getting today\'s recommendation:', error);
      res.status(500).json({ 
        error: 'Failed to get daily recommendation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate new daily recommendation (synchronous)
   */
  async generateRecommendation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      const recommendation = await this.dailyRecommendationService.generateDailyRecommendation(
        userId,
        language as Language
      );

      res.json({
        success: true,
        data: recommendation
      });
    } catch (error) {
      console.error('Error generating recommendation:', error);
      res.status(500).json({ 
        error: 'Failed to generate daily recommendation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate new daily recommendation (asynchronous)
   */
  async generateRecommendationAsync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      const taskId = await this.dailyRecommendationService.generateDailyRecommendationAsync(
        userId,
        language as Language
      );

      res.json({
        success: true,
        data: {
          taskId,
          message: 'Daily recommendation generation started',
          status: 'processing'
        }
      });
    } catch (error) {
      console.error('Error starting async recommendation generation:', error);
      res.status(500).json({ 
        error: 'Failed to start recommendation generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate quick practice based on recommendation option
   */
  async generateQuickPractice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language, practiceOptionId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      if (!practiceOptionId) {
        res.status(400).json({ error: 'Practice option ID is required' });
        return;
      }

      const taskId = await this.dailyRecommendationService.generateQuickPracticeAsync(
        userId,
        language as Language,
        practiceOptionId
      );

      res.json({
        success: true,
        data: {
          taskId,
          message: 'Quick practice generation started',
          status: 'processing'
        }
      });
    } catch (error) {
      console.error('Error generating quick practice:', error);
      res.status(500).json({ 
        error: 'Failed to generate quick practice',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Submit feedback for daily recommendation
   */
  async submitFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language } = req.params;
      const { rating, isHelpful, followedRecommendations, comments } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      // Validate feedback data
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
        return;
      }

      if (typeof isHelpful !== 'boolean') {
        res.status(400).json({ error: 'isHelpful must be a boolean' });
        return;
      }

      if (!Array.isArray(followedRecommendations)) {
        res.status(400).json({ error: 'followedRecommendations must be an array' });
        return;
      }

      const feedback: Omit<RecommendationFeedback, 'submittedAt'> = {
        rating,
        isHelpful,
        followedRecommendations,
        comments: comments || undefined
      };

      const success = await this.dailyRecommendationService.submitRecommendationFeedback(
        userId,
        language as Language,
        feedback
      );

      if (!success) {
        res.status(404).json({ error: 'No recommendation found to update' });
        return;
      }

      res.json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ 
        error: 'Failed to submit feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recommendation history
   */
  async getRecommendationHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language } = req.params;
      const { limit } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 30;
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({ error: 'Limit must be a number between 1 and 100' });
        return;
      }

      const history = await this.dailyRecommendationService.getRecommendationHistory(
        userId,
        language as Language,
        limitNum
      );

      res.json({
        success: true,
        data: {
          history,
          count: history.length
        }
      });
    } catch (error) {
      console.error('Error getting recommendation history:', error);
      res.status(500).json({ 
        error: 'Failed to get recommendation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Mark recommendation as viewed (manual endpoint)
   */
  async markAsViewed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language } = req.params;
      const { date } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      const success = await this.dailyRecommendationService.markRecommendationAsViewed(
        userId,
        language as Language,
        date
      );

      if (!success) {
        res.status(404).json({ error: 'No recommendation found to update' });
        return;
      }

      res.json({
        success: true,
        message: 'Recommendation marked as viewed'
      });
    } catch (error) {
      console.error('Error marking recommendation as viewed:', error);
      res.status(500).json({ 
        error: 'Failed to mark recommendation as viewed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recommendation for specific date
   */
  async getRecommendationByDate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { language, date } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!this.isValidLanguage(language)) {
        res.status(400).json({ error: 'Invalid language parameter' });
        return;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        return;
      }

      const recommendation = await this.dailyRecommendationService.getTodaysRecommendation(
        userId,
        language as Language,
        date
      );

      if (!recommendation) {
        res.status(404).json({ error: 'No recommendation found for the specified date' });
        return;
      }

      res.json({
        success: true,
        data: recommendation
      });
    } catch (error) {
      console.error('Error getting recommendation by date:', error);
      res.status(500).json({ 
        error: 'Failed to get recommendation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Helper method to validate language parameter
   */
  private isValidLanguage(language: string): boolean {
    return Object.values(Language).includes(language as Language);
  }
}
