import { Router } from 'express';
import { VocabularyController } from '../controllers/VocabularyController';
import { authenticate } from '../middleware/auth';

const router = Router();
const vocabularyController = new VocabularyController();

// All vocabulary routes require authentication
router.use(authenticate);

// Vocabulary management
router.get('/words', vocabularyController.getVocabularyWords);
router.post('/add-words', vocabularyController.addWords);
router.delete('/word/:id', vocabularyController.removeWord);
router.put('/word/:id/mastery', vocabularyController.updateMastery);

// Mastery tracking
router.get('/mastery-stats', vocabularyController.getMasteryStats);
router.post('/update-mastery', vocabularyController.updateMasteryFromPractice);

// Review system
router.get('/words-needing-review', vocabularyController.getWordsNeedingReview);
router.post('/apply-daily-decay', vocabularyController.applyDailyDecay);

// Forgetting curve system
router.get('/scheduled-reviews', vocabularyController.getScheduledReviews);
router.get('/review-reminders', vocabularyController.getReviewReminders);
router.get('/forgetting-curve-metrics', vocabularyController.getForgettingCurveMetrics);
router.post('/optimize-review-schedule', vocabularyController.optimizeReviewSchedule);

// Vocabulary practice system
router.post('/generate-practice', vocabularyController.generateVocabularyPractice);
router.post('/generate-adaptive-practice', vocabularyController.generateAdaptivePractice);
router.post('/submit-practice-results', vocabularyController.submitPracticeResults);
router.get('/learning-efficiency-metrics', vocabularyController.getLearningEfficiencyMetrics);

export default router;
