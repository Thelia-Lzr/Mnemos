import { Router } from 'express';
import { AssessmentController } from '../controllers/AssessmentController';
import { authenticate } from '../middleware/auth';
import { pool } from '../config/database';

const router = Router();

// Initialize controller
const assessmentController = new AssessmentController(pool);

// All assessment routes require authentication
router.use(authenticate);

// User capability management
router.get('/capabilities', assessmentController.getAllUserCapabilities.bind(assessmentController));
router.post('/capability', assessmentController.createUserCapability.bind(assessmentController));
router.get('/capability/:language', assessmentController.getUserCapability.bind(assessmentController));
router.put('/capability/:language', assessmentController.updateUserCapability.bind(assessmentController));

// Assessment operations
router.post('/comprehensive', assessmentController.performComprehensiveAssessment.bind(assessmentController));
router.get('/history/:language', assessmentController.getAssessmentHistory.bind(assessmentController));

// Reassessment operations
router.post('/reassessment', assessmentController.initiateReassessment.bind(assessmentController));
router.get('/reassessment/:reassessmentId', assessmentController.getReassessmentCase.bind(assessmentController));
router.post('/reassessment/:reassessmentId/response', assessmentController.submitReassessmentResponse.bind(assessmentController));
router.delete('/reassessment/:reassessmentId', assessmentController.cancelReassessment.bind(assessmentController));
router.get('/reassessment-history/:language', assessmentController.getReassessmentHistory.bind(assessmentController));

export default router;