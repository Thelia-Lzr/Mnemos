import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
export declare class UserController {
    private userCapabilityService;
    private userService;
    private creditService;
    constructor(db: Pool);
    updatePreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getLearningStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateLearningGoals(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStudyTime(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getCredits(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserWithStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    suspendUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    batchUpdateUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    batchDeleteUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map