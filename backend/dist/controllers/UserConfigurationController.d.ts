import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Pool } from 'pg';
export declare class UserConfigurationController {
    private userConfigurationService;
    constructor(db: Pool);
    getLanguageConfigurations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getLanguageConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createLanguageConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateLanguageConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    removeLanguageConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getGlobalPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateGlobalPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConfigurationHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConfigurationSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConfigurationHealth(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    validateLanguageConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    bulkUpdateLanguageConfigurations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    exportConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    importConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=UserConfigurationController.d.ts.map