import { Router } from 'express';
import { PKController } from '../controllers/PKController';
import { authenticate } from '../middleware/auth';

const router = Router();
const pkController = new PKController();

// All PK routes require authentication
router.use(authenticate);

// Matching system
router.post('/find-match', pkController.findMatch);
router.get('/match-status', pkController.getMatchStatus);
router.post('/cancel-match', pkController.cancelMatch);

// Battle management
router.get('/battle/:id', pkController.getBattle);
router.post('/battle/:id/start', pkController.startBattle);
router.post('/battle/:id/answer', pkController.submitAnswer);
router.get('/history', pkController.getBattleHistory);

// MMR system
router.get('/mmr-ranking', pkController.getMMRRanking);
router.get('/mmr', pkController.getUserMMR);
router.get('/mmr-history', pkController.getMMRHistory);

// Statistics and leaderboards
router.get('/matching-stats', pkController.getMatchingStats);
router.get('/stats', pkController.getPKStats);
router.get('/leaderboard', pkController.getPKLeaderboard);

export default router;
