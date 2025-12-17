import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
export declare class SimpleUserController {
    private userService;
    constructor(db: Pool);
    getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getLearningStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateLearningGoals(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStudyTime(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserWithStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    suspendUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=SimpleUserController.d.ts.map