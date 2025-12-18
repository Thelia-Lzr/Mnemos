import api from './api';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  dailyTokenLimit?: number;
  monthlyTokenLimit?: number;
  costThreshold?: number;
  isActive: boolean;
  lastTestedAt?: string;
  testStatus: 'untested' | 'testing' | 'success' | 'failed' | 'expired';
  updatedAt?: string;
  updatedBy?: string;
}

export interface TestResult {
  success: boolean;
  responseTime: number;
  availableModels: string[];
  errorMessage?: string;
  connectionTest: {
    success: boolean;
    latency: number;
    error?: string;
  };
  modelTests: Array<{
    model: string;
    success: boolean;
    responseTime: number;
    tokensUsed: number;
    error?: string;
    sampleResponse?: string;
  }>;
  testedAt: string;
}

export interface UsageStats {
  daily: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
  };
  weekly: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
  };
  monthly: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
  };
  modelUsage: Record<string, {
    requestCount: number;
    tokenCount: number;
    averageTokensPerRequest: number;
    averageResponseTime: number;
    errorCount: number;
    totalCost: number;
  }>;
  costAnalysis: {
    totalCost: number;
    costByModel: Record<string, number>;
    costByTaskType: Record<string, number>;
    projectedMonthlyCost: number;
    costTrend: Array<{
      date: string;
      cost: number;
      tokens: number;
      requests: number;
    }>;
  };
  performanceMetrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    uptime: number;
    errorRate: number;
    throughput: number;
  };
  generatedAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  capabilities: string[];
  isAvailable: boolean;
}

export interface RechargePackage {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  creditAmount: number;
  bonusCredits: number;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  originalPrice?: number;
  discountPercentage?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UserCredit {
  userId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  lastPurchaseAt?: string;
  averageMonthlySpending: number;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'chat' | 'practice' | 'pk_entry' | 'pk_reward' | 'refund' | 'admin_adjust';
  amount: number;
  description: string;
  relatedService?: string;
  relatedId?: string;
  tokenUsage?: number;
  aiModel?: string;
  createdAt: string;
}

export interface SystemStatistics {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
  };
  credits: {
    totalRemaining: number;
    totalIssued: number;
    totalConsumed: number;
  };
  api: {
    totalCalls: number;
    callsToday: number;
  };
}

export interface QueueMetrics {
  totalTasks: number;
  queuedTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
  resourceUtilization: number;
  errorRate: number;
  statusBreakdown: Record<string, number>;
}

export interface AsyncTask {
  id: string;
  userId: string;
  type: string;
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount: number;
  context: any;
}

export const adminApi = {
  // ============ OpenRouter API Management ============
  
  /**
   * Get current OpenRouter API configuration
   */
  getOpenRouterConfig: async (): Promise<{ success: boolean; data: OpenRouterConfig }> => {
    const response = await api.get('/admin/openrouter/config');
    return response.data;
  },

  /**
   * Test OpenRouter API key
   */
  testOpenRouterKey: async (data: { apiKey: string }): Promise<{ success: boolean; data: TestResult }> => {
    const response = await api.post('/admin/openrouter/test-key', data);
    return response.data;
  },

  /**
   * Update OpenRouter API configuration
   */
  updateOpenRouterConfig: async (config: Partial<OpenRouterConfig>): Promise<{ success: boolean; data: OpenRouterConfig; message: string }> => {
    const response = await api.put('/admin/openrouter/config', config);
    return response.data;
  },

  /**
   * Get OpenRouter API usage statistics
   */
  getOpenRouterUsageStats: async (timeRange?: 'daily' | 'weekly' | 'monthly'): Promise<{ success: boolean; data: UsageStats }> => {
    const params = timeRange ? { timeRange } : {};
    const response = await api.get('/admin/openrouter/usage-stats', { params });
    return response.data;
  },

  /**
   * Get available OpenRouter models
   */
  getOpenRouterModels: async (): Promise<{ success: boolean; data: ModelInfo[] }> => {
    const response = await api.get('/admin/openrouter/models');
    return response.data;
  },

  // ============ Package Management ============
  
  /**
   * Get all packages
   */
  getPackages: async (): Promise<{ success: boolean; data: { packages: RechargePackage[]; salesStats: any } }> => {
    const response = await api.get('/admin/packages');
    return response.data;
  },

  /**
   * Create a new package
   */
  createPackage: async (packageData: Partial<RechargePackage>): Promise<{ success: boolean; data: RechargePackage }> => {
    const response = await api.post('/admin/packages', packageData);
    return response.data;
  },

  /**
   * Update an existing package
   */
  updatePackage: async (id: string, packageData: Partial<RechargePackage>): Promise<{ success: boolean; data: RechargePackage }> => {
    const response = await api.put(`/admin/packages/${id}`, packageData);
    return response.data;
  },

  /**
   * Delete a package
   */
  deletePackage: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/packages/${id}`);
    return response.data;
  },

  // ============ User Management ============
  
  /**
   * Get all users with search and pagination
   */
  getUsers: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ success: boolean; data: { users: any[]; pagination: any } }> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  /**
   * Get detailed user information
   */
  getUserDetails: async (userId: string): Promise<{ success: boolean; data: any }> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // ============ Credit Management ============
  
  /**
   * Get user's credit information
   */
  getUserCredits: async (userId: string): Promise<{ success: boolean; data: { credits: UserCredit; usageStats: any } }> => {
    const response = await api.get(`/admin/users/${userId}/credits`);
    return response.data;
  },

  /**
   * Adjust user's credit balance
   */
  adjustUserCredits: async (userId: string, data: { amount: number; description: string }): Promise<{ success: boolean; data: CreditTransaction }> => {
    const response = await api.post(`/admin/users/${userId}/credits/adjust`, data);
    return response.data;
  },

  /**
   * Get system-wide credit statistics
   */
  getCreditStatistics: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/admin/credit-statistics');
    return response.data;
  },

  // ============ System Statistics ============
  
  /**
   * Get comprehensive system statistics
   */
  getStatistics: async (): Promise<{ success: boolean; data: SystemStatistics }> => {
    const response = await api.get('/admin/statistics');
    return response.data;
  },

  /**
   * Get revenue statistics
   */
  getRevenueStats: async (days?: number): Promise<{ success: boolean; data: any }> => {
    const params = days ? { days } : {};
    const response = await api.get('/admin/revenue-stats', { params });
    return response.data;
  },

  /**
   * Get usage statistics
   */
  getUsageStats: async (days?: number): Promise<{ success: boolean; data: any }> => {
    const params = days ? { days } : {};
    const response = await api.get('/admin/usage-stats', { params });
    return response.data;
  },

  /**
   * Get user statistics
   */
  getUserStats: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/admin/user-stats');
    return response.data;
  },

  // ============ Task Queue Management ============
  
  /**
   * Get task queue metrics
   */
  getQueueMetrics: async (): Promise<{ success: boolean; data: QueueMetrics }> => {
    const response = await api.get('/admin/queue-metrics');
    return response.data;
  },

  /**
   * Get all tasks
   */
  getAllTasks: async (params?: { 
    status?: string; 
    type?: string; 
    userId?: string; 
    limit?: number; 
    offset?: number 
  }): Promise<{ success: boolean; data: { tasks: AsyncTask[]; totalCount: number } }> => {
    const response = await api.get('/admin/tasks', { params });
    return response.data;
  },

  /**
   * Get failed tasks
   */
  getFailedTasks: async (params?: { limit?: number; offset?: number }): Promise<{ success: boolean; data: { tasks: AsyncTask[]; totalCount: number } }> => {
    const response = await api.get('/admin/failed-tasks', { params });
    return response.data;
  },

  /**
   * Retry failed tasks
   */
  retryFailedTasks: async (taskIds: string[]): Promise<{ success: boolean; data: { retriedTasks: number; taskIds: string[] } }> => {
    const response = await api.post('/admin/retry-failed-tasks', { taskIds });
    return response.data;
  },

  /**
   * Clear completed and failed tasks
   */
  clearQueue: async (data: { days?: number; includeCompleted?: boolean; includeFailed?: boolean }): Promise<{ success: boolean; data: { deletedTasks: number; clearedDays: number } }> => {
    const response = await api.post('/admin/clear-queue', data);
    return response.data;
  }
};

export default adminApi;