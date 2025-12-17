import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
export declare class DailyRecommendationController {
    private dailyRecommendationService;
    constructor(database: Pool);
    getTodaysRecommendation(req: AuthRequest, res: Response): Promise<void>;
    generateRecommendation(req: AuthRequest, res: Response): Promise<void>;
    generateRecommendationAsync(req: AuthRequest, res: Response): Promise<void>;
    generateQuickPractice(req: AuthRequest, res: Response): Promise<void>;
    submitFeedback(req: AuthRequest, res: Response): Promise<void>;
    getRecommendationHistory(req: AuthRequest, res: Response): Promise<void>;
    markAsViewed(req: AuthRequest, res: Response): Promise<void>;
    getRecommendationByDate(req: AuthRequest, res: Response): Promise<void>;
    private isValidLanguage;
}
//# sourceMappingURL=DailyRecommendationController.d.ts.map