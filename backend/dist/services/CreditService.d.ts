import { Pool } from 'pg';
import { TransactionType, UserCredit, CreditTransaction, CreditConsumptionRule, CreditBalance, CreditUsageStats } from '../types/credit';
export declare class CreditService {
    private db;
    private consumptionRules;
    constructor(database: Pool);
    private initializeConsumptionRules;
    getUserCredits(userId: string): Promise<UserCredit | null>;
    checkSufficientCredits(userId: string, service: string, tokenUsage?: number): Promise<CreditBalance>;
    calculateCreditCost(service: string, tokenUsage?: number): number;
    consumeCredits(userId: string, service: string, tokenUsage?: number, description?: string, relatedId?: string, aiModel?: string): Promise<CreditTransaction>;
    addCredits(userId: string, amount: number, type: TransactionType, description: string, relatedId?: string): Promise<CreditTransaction>;
    getCreditUsageStats(userId: string, days?: number): Promise<CreditUsageStats>;
    getConsumptionRules(): CreditConsumptionRule[];
    updateConsumptionRule(service: string, rule: Partial<CreditConsumptionRule>): void;
    adjustUserCredits(userId: string, amount: number, description: string, adminId: string): Promise<CreditTransaction>;
    processPKEntry(userId: string, battleId: string): Promise<CreditTransaction>;
    processPKReward(userId: string, battleId: string): Promise<CreditTransaction>;
    private ensureUserCreditsRecord;
    initializeUserCredits(userId: string, initialBalance?: number): Promise<UserCredit>;
}
//# sourceMappingURL=CreditService.d.ts.map