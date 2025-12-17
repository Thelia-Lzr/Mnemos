export enum AITaskType {
  CHAT_RESPONSE = "chat_response",
  PRACTICE_GENERATION = "practice_generation",
  MATERIAL_ANALYSIS = "material_analysis",
  LEVEL_ASSESSMENT = "level_assessment",
  DAILY_RECOMMENDATION = "daily_recommendation",
  VOCABULARY_EXTRACTION = "vocabulary_extraction",
  FUNCTION_CALL = "function_call"
}

export enum TaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

export enum TaskExecutionStatus {
  QUEUED = "queued",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  TIMEOUT = "timeout"
}

export interface AITask {
  id: string;
  userId: string;
  type: AITaskType;
  priority: TaskPriority;
  
  // 任务参数
  model: string;
  prompt: string;
  context?: any;
  
  // 调度信息
  createdAt: Date;
  scheduledAt?: Date;
  maxRetries: number;
  timeout: number;
  
  // 依赖关系
  dependencies?: string[];
  
  // 回调配置
  webhookUrl?: string;
  notifyUser: boolean;
}

export interface TaskStatus {
  taskId: string;
  status: TaskExecutionStatus;
  progress: number;  // 0-100
  
  // 执行信息
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  
  // 错误信息
  error?: TaskError;
  retryCount: number;
  
  // 资源使用
  tokensUsed?: number;
  executionTime?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: TaskError;
  
  // 执行统计
  executionTime: number;
  tokensUsed: number;
  retryCount: number;
  
  // 缓存信息
  cached: boolean;
  cacheKey?: string;
  
  completedAt: Date;
}

export interface TaskError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
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
}

export interface TaskJobData {
  taskId: string;
  userId: string;
  type: AITaskType;
  model: string;
  prompt: string;
  context?: any;
  maxRetries: number;
  timeout: number;
  notifyUser: boolean;
}

export interface TaskProcessorOptions {
  concurrency?: number;
  maxStalledCount?: number;
  stalledInterval?: number;
  maxConcurrency?: number;
}
