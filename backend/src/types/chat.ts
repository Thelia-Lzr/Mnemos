// Chat-related types and interfaces

export enum MessageType {
  USER_TEXT = 'user_text',
  USER_FILE = 'user_file',
  AI_RESPONSE = 'ai_response',
  SYSTEM = 'system'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum UserIntent {
  // 练习相关
  GENERATE_PRACTICE = 'generate_practice',
  VIEW_PRACTICE_HISTORY = 'view_practice_history',
  START_PRACTICE = 'start_practice',
  
  // 学习进度
  CHECK_PROGRESS = 'check_progress',
  VIEW_CAPABILITIES = 'view_capabilities',
  SET_LEARNING_GOALS = 'set_learning_goals',
  
  // 词汇管理
  ADD_VOCABULARY = 'add_vocabulary',
  VIEW_VOCABULARY = 'view_vocabulary',
  REMOVE_VOCABULARY = 'remove_vocabulary',
  
  // PK对战
  START_PK_MATCH = 'start_pk_match',
  VIEW_PK_HISTORY = 'view_pk_history',
  CHECK_MMR = 'check_mmr',
  
  // 统计查看
  VIEW_STATISTICS = 'view_statistics',
  CHECK_CREDITS = 'check_credits',
  VIEW_MILESTONES = 'view_milestones',
  
  // 设置管理
  UPDATE_PREFERENCES = 'update_preferences',
  CHANGE_LANGUAGE = 'change_language',
  
  // 学习对话
  LANGUAGE_LEARNING = 'language_learning',
  MATERIAL_ANALYSIS = 'material_analysis',
  
  // 隐私敏感（拒绝执行）
  ACCOUNT_MANAGEMENT = 'account_management',
  PAYMENT_OPERATIONS = 'payment_operations',
  PASSWORD_CHANGE = 'password_change'
}

export interface FileAttachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  processedAt?: Date;
  extractedContent?: string;
}

export interface FunctionCall {
  id: string;
  intent: UserIntent;
  parameters: Record<string, any>;
  executedAt: Date;
  executionTime: number;
  success: boolean;
}

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresUserAction?: boolean;
  actionUrl?: string;
}

export interface IntentResult {
  intent: UserIntent;
  confidence: number;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  isPrivacySensitive: boolean;
}

export interface FunctionIntent {
  intent: UserIntent;
  parameters: Record<string, any>;
  userId: string;
  language: string;
}

export interface Message {
  id: string;
  userId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  
  // AI响应相关
  aiResponse?: {
    content: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
    metadata?: Record<string, any>;
  };
  processingStatus: ProcessingStatus;
  
  // 功能调用相关
  detectedIntent?: UserIntent;
  functionCalls?: FunctionCall[];
  functionResults?: FunctionResult[];
  
  // 文件上传相关
  attachments?: FileAttachment[];
  
  // 学习数据提取
  extractedVocabulary?: string[];
  identifiedGrammar?: string[];
}

export interface ChatSession {
  userId: string;
  messages: Message[];
  language: string;
  context: Record<string, any>;
}

// Request/Response types for API
export interface SendMessageRequest {
  content: string;
  language?: string;
  context?: Record<string, any>;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  taskId?: string; // For async operations
  error?: string;
}

export interface UploadMaterialRequest {
  language?: string;
  context?: Record<string, any>;
}

export interface UploadMaterialResponse {
  success: boolean;
  message?: Message;
  taskId?: string; // For async operations
  extractedContent?: string;
  error?: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}

export interface FunctionCallRequest {
  intent: UserIntent;
  parameters: Record<string, any>;
  language?: string;
}

export interface FunctionCallResponse {
  success: boolean;
  result?: FunctionResult;
  taskId?: string; // For async operations
  error?: string;
}

export interface ParseIntentRequest {
  message: string;
  context?: Record<string, any>;
  language?: string;
}

export interface ParseIntentResponse {
  success: boolean;
  result?: IntentResult;
  error?: string;
}

export interface AvailableFunctionsResponse {
  success: boolean;
  functions: {
    intent: UserIntent;
    description: string;
    parameters: Record<string, any>;
    isPrivacySensitive: boolean;
  }[];
  error?: string;
}
