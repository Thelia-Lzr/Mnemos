import { Router } from 'express';
import { Pool } from 'pg';
import { DailyRecommendationController } from '../controllers/DailyRecommendationController';
import { authenticate } from '../middleware/auth';

export function createDailyRecommendationRoutes(database: Pool): Router {
  const router = Router();
  const controller = new DailyRecommendationController(database);

  // Apply authentication middleware to all routes
  router.use(authenticate);

  // Get today's daily recommendation
  router.get('/:language/today', (req, res) => controller.getTodaysRecommendation(req, res));

  // Generate new daily recommendation (synchronous)
  router.post('/:language/generate', (req, res) => controller.generateRecommendation(req, res));

  // Generate new daily recommendation (asynchronous)
  router.post('/:language/generate-async', (req, res) => controller.generateRecommendationAsync(req, res));

  // Generate quick practice based on recommendation option
  router.post('/:language/quick-practice/:practiceOptionId', (req, res) => controller.generateQuickPractice(req, res));

  // Submit feedback for daily recommendation
  router.post('/:language/feedback', (req, res) => controller.submitFeedback(req, res));

  // Get recommendation history
  router.get('/:language/history', (req, res) => controller.getRecommendationHistory(req, res));

  // Mark recommendation as viewed
  router.post('/:language/mark-viewed', (req, res) => controller.markAsViewed(req, res));

  // Get recommendation for specific date
  router.get('/:language/date/:date', (req, res) => controller.getRecommendationByDate(req, res));

  return router;
}
