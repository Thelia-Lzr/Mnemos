"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserConfigurationRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const UserConfigurationController_1 = require("../controllers/UserConfigurationController");
function createUserConfigurationRoutes(db) {
    const router = (0, express_1.Router)();
    const controller = new UserConfigurationController_1.UserConfigurationController(db);
    router.get('/language-config', auth_1.authenticate, controller.getLanguageConfigurations.bind(controller));
    router.get('/language-config/:language', auth_1.authenticate, controller.getLanguageConfiguration.bind(controller));
    router.post('/language-config', auth_1.authenticate, controller.createLanguageConfiguration.bind(controller));
    router.put('/language-config/:language', auth_1.authenticate, controller.updateLanguageConfiguration.bind(controller));
    router.delete('/language-config/:language', auth_1.authenticate, controller.removeLanguageConfiguration.bind(controller));
    router.get('/global-preferences', auth_1.authenticate, controller.getGlobalPreferences.bind(controller));
    router.put('/global-preferences', auth_1.authenticate, controller.updateGlobalPreferences.bind(controller));
    router.get('/config-history', auth_1.authenticate, controller.getConfigurationHistory.bind(controller));
    router.get('/config-summary', auth_1.authenticate, controller.getConfigurationSummary.bind(controller));
    router.get('/config-health', auth_1.authenticate, controller.getConfigurationHealth.bind(controller));
    router.post('/language-config/:language/validate', auth_1.authenticate, controller.validateLanguageConfiguration.bind(controller));
    router.put('/language-config/bulk', auth_1.authenticate, controller.bulkUpdateLanguageConfigurations.bind(controller));
    router.get('/export', auth_1.authenticate, controller.exportConfiguration.bind(controller));
    router.post('/import', auth_1.authenticate, controller.importConfiguration.bind(controller));
    return router;
}
exports.createUserConfigurationRoutes = createUserConfigurationRoutes;
//# sourceMappingURL=userConfigurationRoutes.js.map