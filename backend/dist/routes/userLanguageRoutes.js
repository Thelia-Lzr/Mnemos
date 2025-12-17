"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserLanguageRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const UserLanguageController_1 = require("../controllers/UserLanguageController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const createUserLanguageRoutes = (db) => {
    const router = (0, express_1.Router)();
    const userLanguageController = new UserLanguageController_1.UserLanguageController(db);
    router.use(auth_1.authenticate);
    router.get('/', userLanguageController.getUserLanguages.bind(userLanguageController));
    router.get('/primary', userLanguageController.getPrimaryLanguage.bind(userLanguageController));
    router.get('/:language', [
        (0, express_validator_1.param)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        validate_1.validate
    ], userLanguageController.getUserLanguage.bind(userLanguageController));
    router.post('/', [
        (0, express_validator_1.body)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        (0, express_validator_1.body)('currentLevel').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Current level must be A1-C2'),
        (0, express_validator_1.body)('targetLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Target level must be A1-C2'),
        (0, express_validator_1.body)('isPrimary').optional().isBoolean().withMessage('isPrimary must be boolean'),
        validate_1.validate
    ], userLanguageController.addUserLanguage.bind(userLanguageController));
    router.put('/:language', [
        (0, express_validator_1.param)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        (0, express_validator_1.body)('currentLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Current level must be A1-C2'),
        (0, express_validator_1.body)('targetLevel').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Target level must be A1-C2'),
        (0, express_validator_1.body)('isPrimary').optional().isBoolean().withMessage('isPrimary must be boolean'),
        (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
        validate_1.validate
    ], userLanguageController.updateUserLanguage.bind(userLanguageController));
    router.delete('/:language', [
        (0, express_validator_1.param)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        validate_1.validate
    ], userLanguageController.removeUserLanguage.bind(userLanguageController));
    router.post('/:language/primary', [
        (0, express_validator_1.param)('language').isIn(['en', 'ja', 'fr']).withMessage('Language must be en, ja, or fr'),
        validate_1.validate
    ], userLanguageController.setPrimaryLanguage.bind(userLanguageController));
    return router;
};
exports.createUserLanguageRoutes = createUserLanguageRoutes;
exports.default = exports.createUserLanguageRoutes;
//# sourceMappingURL=userLanguageRoutes.js.map