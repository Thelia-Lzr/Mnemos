import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
export declare class UserLanguageController {
    private userLanguageService;
    constructor(db: Pool);
    getUserLanguages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPrimaryLanguage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addUserLanguage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateUserLanguage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    removeUserLanguage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    setPrimaryLanguage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserLanguage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=UserLanguageController.d.ts.map