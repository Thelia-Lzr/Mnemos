import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
export declare class AssessmentController {
    private db;
    private userCapabilityService;
    private reassessmentService;
    constructor(db: Pool);
    getUserCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    performComprehensiveAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAssessmentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    initiateReassessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    submitReassessmentResponse(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getReassessmentCase(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getReassessmentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    cancelReassessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateUserCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createUserCapability(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAllUserCapabilities(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=AssessmentController.d.ts.map