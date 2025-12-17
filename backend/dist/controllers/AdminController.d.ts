import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class AdminController {
    private paymentService;
    private creditService;
    private openRouterService;
    constructor();
    getPackages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updatePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deletePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserCredits(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    adjustUserCredits(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getCreditStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getRevenueStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUsageStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getQueueMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getFailedTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    retryFailedTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    clearQueue(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getOpenRouterConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    testOpenRouterKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateOpenRouterConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getOpenRouterUsageStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getOpenRouterModels(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    private validateApiKeyFormat;
    private updateApiTestStatus;
}
//# sourceMappingURL=AdminController.d.ts.map