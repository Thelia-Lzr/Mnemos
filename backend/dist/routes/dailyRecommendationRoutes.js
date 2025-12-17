"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDailyRecommendationRoutes = void 0;
const express_1 = require("express");
const DailyRecommendationController_1 = require("../controllers/DailyRecommendationController");
const auth_1 = require("../middleware/auth");
function createDailyRecommendationRoutes(database) {
    const router = (0, express_1.Router)();
    const controller = new DailyRecommendationController_1.DailyRecommendationController(database);
    router.use(auth_1.authenticate);
    router.get('/:language/today', (req, res) => controller.getTodaysRecommendation(req, res));
    router.post('/:language/generate', (req, res) => controller.generateRecommendation(req, res));
    router.post('/:language/generate-async', (req, res) => controller.generateRecommendationAsync(req, res));
    router.post('/:language/quick-practice/:practiceOptionId', (req, res) => controller.generateQuickPractice(req, res));
    router.post('/:language/feedback', (req, res) => controller.submitFeedback(req, res));
    router.get('/:language/history', (req, res) => controller.getRecommendationHistory(req, res));
    router.post('/:language/mark-viewed', (req, res) => controller.markAsViewed(req, res));
    router.get('/:language/date/:date', (req, res) => controller.getRecommendationByDate(req, res));
    return router;
}
exports.createDailyRecommendationRoutes = createDailyRecommendationRoutes;
//# sourceMappingURL=dailyRecommendationRoutes.js.map