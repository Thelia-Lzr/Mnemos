import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserLanguageController } from '../controllers/UserLanguageController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Pool } from 'pg';

export const createUserLanguageRoutes = (db: Pool): Router => {
  const router = Router();
  const userLanguageController = new UserLanguageController(db);

  // All user language routes require authentication
  router.use(authenticate);

  // Get all user languages
  router.get('/', userLanguageController.getUserLanguages.bind(userLanguageController));

  // Get primary language
  router.get('/primary', userLanguageController.getPrimaryLanguage.bind(userLanguageController));

  // Get specific language
  router.get('/:language', [
    param('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    validate
  ], userLanguageController.getUserLanguage.bind(userLanguageController));

  // Add new language
  router.post('/', [
    body('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    body('currentLevel').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Current level must be A1-C2'),
    body('targetLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Target level must be A1-C2'),
    body('isPrimary').optional().isBoolean().withMessage('isPrimary must be boolean'),
    validate
  ], userLanguageController.addUserLanguage.bind(userLanguageController));

  // Update existing language
  router.put('/:language', [
    param('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    body('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Current level must be A1-C2'),
    body('targetLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Target level must be A1-C2'),
    body('isPrimary').optional().isBoolean().withMessage('isPrimary must be boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    validate
  ], userLanguageController.updateUserLanguage.bind(userLanguageController));

  // Remove language
  router.delete('/:language', [
    param('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    validate
  ], userLanguageController.removeUserLanguage.bind(userLanguageController));

  // Set primary language
  router.post('/:language/primary', [
    param('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
    validate
  ], userLanguageController.setPrimaryLanguage.bind(userLanguageController));

  return router;
};

export default createUserLanguageRoutes;