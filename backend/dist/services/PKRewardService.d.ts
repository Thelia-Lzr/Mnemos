import { Language } from '../models/PracticeGroup';
export interface PKRewardResult {
    winnerId?: string;
    winnerReward: number;
    loserPenalty: number;
    player1MMRChange: number;
    player2MMRChange: number;
    player1NewMMR: number;
    player2NewMMR: number;
}
export declare class PKRewardService {
    private mmrService;
    private creditService;
    private readonly PK_WINNER_REWARD;
    private readonly PK_LOSER_PENALTY;
    constructor();
    deductEntryFee(userId: string): Promise<boolean>;
    processBattleRewards(battleId: string): Promise<PKRewardResult>;
    private calculateMMRChanges;
    private calculateELOChange;
    getPKStats(userId: string, language: Language): Promise<{
        totalBattles: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
        totalCreditsEarned: number;
        totalCreditsSpent: number;
        currentMMR: number;
        peakMMR: number;
        averageMMRChange: number;
    }>;
    getPKLeaderboard(language: Language, limit?: number): Promise<Array<{
        userId: string;
        username: string;
        currentMMR: number;
        totalBattles: number;
        wins: number;
        winRate: number;
        rank: number;
    }>>;
    processUnprocessedBattles(): Promise<void>;
}
//# sourceMappingURL=PKRewardService.d.ts.map