export enum TransactionType {
  PURCHASE = "purchase",          // 购买
  CHAT = "chat",                 // 聊天消费
  PRACTICE = "practice",         // 练习消费
  PK_ENTRY = "pk_entry",         // PK参与�?
  PK_REWARD = "pk_reward",       // PK奖励
  REFUND = "refund",             // 退�?
  ADMIN_ADJUST = "admin_adjust"   // 管理员调�?
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
  baseRate: number;           // Base credit cost
  tokenMultiplier?: number;   // Additional cost per token
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
