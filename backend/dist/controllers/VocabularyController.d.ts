import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class VocabularyController {
    private vocabularyService;
    private vocabularyPracticeService;
    constructor();
    getVocabularyWords(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addWords(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    removeWord(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateMastery(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMasteryStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateMasteryFromPractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getWordsNeedingReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    applyDailyDecay(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getScheduledReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getReviewReminders(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getForgettingCurveMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    optimizeReviewSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    generateVocabularyPractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    generateAdaptivePractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    submitPracticeResults(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getLearningEfficiencyMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=VocabularyController.d.ts.map