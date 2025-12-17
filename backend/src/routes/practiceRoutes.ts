import { Router } from 'express';
import { PracticeController } from '../controllers/PracticeController';
import { authenticate } from '../middleware/auth';
import { PracticeGenerationService } from '../services/PracticeGenerationService';
import { PracticeGroupModel } from '../models/PracticeGroup';
import { PracticeEvaluationService } from '../services/PracticeEvaluationService';
import { pool } from '../config/database';
import { UserCapabilityService } from '../services/UserCapabilityService';
import { AIService } from '../services/AIService';
import { CreditService } from '../services/CreditService';
import { AsyncTaskManager } from '../services/AsyncTaskManager';
import { OpenRouterService } from '../services/OpenRouterService';

const router = Router();

// Initialize dependencies
const aiService = new AIService(pool);
const creditService = new CreditService(pool);
const asyncTaskManager = AsyncTaskManager.getInstance();
const userCapabilityService = new UserCapabilityService(pool, aiService);
const openRouterService = new OpenRouterService();
const practiceGenerationService = new PracticeGenerationService(
  pool,
  userCapabilityService,
  creditService,
  asyncTaskManager,
  openRouterService
);
const practiceGroupModel = new PracticeGroupModel(pool);
const practiceEvaluationService = new PracticeEvaluationService(userCapabilityService);

const practiceController = new PracticeController(
  practiceGenerationService,
  practiceGroupModel,
  practiceEvaluationService,
  pool
);

// All practice routes require authentication
router.use(authenticate);

// Synchronous practice endpoints
router.post('/generate-group', practiceController.generatePracticeGroup.bind(practiceController));
router.post('/generate-comprehensive', practiceController.generateComprehensivePractice.bind(practiceController));
router.get('/groups', practiceController.getPracticeGroups.bind(practiceController));
router.get('/group/:id', practiceController.getPracticeGroup.bind(practiceController));
router.post('/group/:id/submit', practiceController.submitPracticeGroup.bind(practiceController));

// Asynchronous practice endpoints
router.post('/generate-group-async', practiceController.generatePracticeGroupAsync.bind(practiceController));
router.post('/generate-comprehensive-async', practiceController.generateComprehensivePracticeAsync.bind(practiceController));
router.post('/vocabulary-group-async', practiceController.generateVocabularyPracticeAsync.bind(practiceController));

// Vocabulary-based practice
router.post('/vocabulary-group', practiceController.generateVocabularyPractice.bind(practiceController));
router.get('/history', practiceController.getPracticeHistory.bind(practiceController));

// Capability updates
router.post('/update-capabilities', practiceController.updateCapabilities.bind(practiceController));

// AI-powered practice generation
router.post('/generate-ai-practice', practiceController.generateAIPractice.bind(practiceController));

// Enhanced practice generation with optional additional prompt
router.post('/generate-enhanced-practice', practiceController.generateEnhancedPractice.bind(practiceController));

// Enhanced practice generation (async) with optional additional prompt
router.post('/generate-enhanced-practice-async', practiceController.generateEnhancedPracticeAsync.bind(practiceController));

// Delete practice group
router.delete('/group/:id', practiceController.deletePracticeGroup.bind(practiceController));

// Batch delete practice groups
router.delete('/groups/batch', practiceController.batchDeletePracticeGroups.bind(practiceController));

// Batch delete practice history (results only, keep practice groups)
router.delete('/history/batch', practiceController.batchDeletePracticeHistory.bind(practiceController));

// AI Analysis routes
router.post('/result/:practiceResultId/analyze', practiceController.generatePracticeAnalysis.bind(practiceController));
router.get('/result/:practiceResultId/analysis', practiceController.getPracticeAnalysis.bind(practiceController));

// Practice result detail route
router.get('/result/:practiceResultId/detail', practiceController.getPracticeResultDetail.bind(practiceController));

// Follow-up question routes
router.post('/question/followup', practiceController.askQuestionFollowUp.bind(practiceController));
router.post('/group/followup', practiceController.askPracticeGroupFollowUp.bind(practiceController));

// Streaming follow-up question routes
router.post('/question/followup/stream', practiceController.askQuestionFollowUpStream.bind(practiceController));
router.post('/group/followup/stream', practiceController.askPracticeGroupFollowUpStream.bind(practiceController));

// AI Analysis management routes
router.delete('/result/:practiceResultId/analysis', practiceController.deletePracticeAnalysis.bind(practiceController));
router.delete('/analyses/batch', practiceController.batchDeletePracticeAnalyses.bind(practiceController));

export default router;
