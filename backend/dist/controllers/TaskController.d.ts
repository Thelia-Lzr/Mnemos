import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class TaskController {
    private asyncTaskManager;
    private taskResultManager;
    private taskQueueManager;
    constructor();
    getUserTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getTaskStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getTaskResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    cancelTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    retryTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getQueueStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getBatchStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    cancelBatchTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getTaskStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserTaskResults(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    static validateTaskId: import("express-validator").ValidationChain[];
    static validateBatchRequest: import("express-validator").ValidationChain[];
    static validatePagination: import("express-validator").ValidationChain[];
}
//# sourceMappingURL=TaskController.d.ts.map