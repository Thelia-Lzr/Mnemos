import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class PKController {
    private matchingService;
    private mmrService;
    private battleService;
    private rewardService;
    constructor();
    findMatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMatchStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    cancelMatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getBattle(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    submitAnswer(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getBattleHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    startBattle(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMMRRanking(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserMMR(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMMRHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMatchingStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPKStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPKLeaderboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=PKController.d.ts.map