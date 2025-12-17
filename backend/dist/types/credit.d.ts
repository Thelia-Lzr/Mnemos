export declare enum TransactionType {
    PURCHASE = "purchase",
    CHAT = "chat",
    PRACTICE = "practice",
    PK_ENTRY = "pk_entry",
    PK_REWARD = "pk_reward",
    REFUND = "refund",
    ADMIN_ADJUST = "admin_adjust"
}
export interface UserCredit {
    id: string;
    userId: string;
    currentBalance: number;
    totalEarned: number;
    totalSpent: number;
    lastPurchaseAt?: Date;
    averageMonthlySpending: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreditTransaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    description: string;
    relatedService?: string;
    relatedId?: string;
    tokenUsage?: number;
    aiModel?: string;
    createdAt: Date;
}
export interface CreditConsumptionRule {
    service: string;
    baseRate: number;
    tokenMultiplier?: number;
    description: string;
}
export interface CreditBalance {
    currentBalance: number;
    isInsufficient: boolean;
    requiredAmount?: number;
}
export interface CreditUsageStats {
    totalSpent: number;
    spentToday: number;
    spentThisWeek: number;
    spentThisMonth: number;
    usageByService: Record<string, number>;
    recentTransactions: CreditTransaction[];
}
//# sourceMappingURL=credit.d.ts.map