import { Language } from '../models/PracticeGroup';
export interface UserMMR {
    id: string;
    userId: string;
    language: Language;
    currentMMR: number;
    peakMMR: number;
    totalBattles: number;
    wins: number;
    losses: number;
    winRate: number;
    vocabularyRating: number;
    grammarRating: number;
    speedRating: number;
    accuracyRating: number;
    lastUpdated: Date;
}
export interface MMRRecord {
    mmr: number;
    change: number;
    reason: string;
    timestamp: Date;
}
export declare class MMRService {
    getUserMMR(userId: string, language: Language): Promise<UserMMR | null>;
    initializeUserMMR(userId: string, language: Language): Promise<UserMMR>;
    private calculateInitialMMR;
    updateMMR(userId: string, language: Language, mmrChange: number, battleResult: 'win' | 'loss', reason: string): Promise<UserMMR>;
    private recordMMRChange;
    calculateMMRChange(playerMMR: number, opponentMMR: number, result: 'win' | 'loss', kFactor?: number): number;
    getMMRRanking(language: Language, limit?: number): Promise<UserMMR[]>;
    getMMRHistory(userId: string, language: Language): Promise<MMRRecord[]>;
}
//# sourceMappingURL=MMRService.d.ts.map