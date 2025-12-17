import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
export declare class AuthController {
    private userService;
    constructor(db: Pool);
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    logout(req: Request, res: Response, next: NextFunction): Promise<void>;
    refreshToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updatePreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map