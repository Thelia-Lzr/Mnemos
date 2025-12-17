import { Language } from '../models/PracticeGroup';
export interface MatchRequest {
    id: string;
    userId: string;
    language: Language;
    mmr: number;
    requestedAt: Date;
    expiresAt: Date;
    status: 'waiting' | 'matched' | 'cancelled' | 'expired';
}
export interface MatchResult {
    matchId: string;
    player1Id: string;
    player2Id: string;
    language: Language;
    practiceGroupId?: string;
    createdAt: Date;
}
export declare class PKMatchingService {
    private mmrService;
    private creditService;
    private rewardService;
    private readonly MATCH_TIMEOUT_MINUTES;
    private readonly MMR_TOLERANCE_BASE;
    private readonly MMR_TOLERANCE_GROWTH;
    private readonly PK_ENTRY_FEE;
    constructor();
    requestMatch(userId: string, language: Language): Promise<MatchRequest>;
    private findMatch;
    private createMatch;
    cancelMatch(userId: string, language: Language): Promise<boolean>;
    getActiveMatchRequest(userId: string, language: Language): Promise<MatchRequest | null>;
    getMatchStatus(userId: string, language: Language): Promise<{
        isMatching: boolean;
        matchRequest?: MatchRequest;
        battle?: any;
        estimatedWaitTime?: number;
    }>;
    private calculateEstimatedWaitTime;
    cleanupExpiredRequests(): Promise<void>;
    getMatchingStats(language: Language): Promise<{
        totalWaiting: number;
        averageWaitTime: number;
        matchesCreatedToday: number;
    }>;
}
//# sourceMappingURL=PKMatchingService.d.ts.map