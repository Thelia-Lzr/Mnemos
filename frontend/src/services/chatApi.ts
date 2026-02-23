import api from './api';

// Types for chat API
export interface Message {
  id: string;
  userId: string;
  content: string;
  type: 'user_text' | 'user_file' | 'ai_response' | 'system';
  timestamp: Date;
  aiResponse?: {
    content: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
    metadata?: Record<string, any>;
  };
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  detectedIntent?: string;
  functionCalls?: any[];
  functionResults?: any[];
  attachments?: any[];
  extractedVocabulary?: string[];
  identifiedGrammar?: string[];
}

export interface SendMessageRequest {
  content: string;
  language?: string;
  context?: Record<string, any>;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  taskId?: string;
  error?: string;
}

export interface UploadMaterialRequest {
  language?: string;
  context?: Record<string, any>;
}

export interface UploadMaterialResponse {
  success: boolean;
  message?: Message;
  taskId?: string;
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
  intent: string;
  parameters: Record<string, any>;
  language?: string;
}

export interface FunctionCallResponse {
  success: boolean;
  result?: any;
  taskId?: string;
  error?: string;
}

export interface ParseIntentRequest {
  message: string;
  context?: Record<string, any>;
  language?: string;
}

export interface ParseIntentResponse {
  success: boolean;
  result?: {
    intent: string;
    confidence: number;
    parameters: Record<string, any>;
    requiresConfirmation: boolean;
    isPrivacySensitive: boolean;
  };
  error?: string;
}

export interface AvailableFunctionsResponse {
  success: boolean;
  functions: {
    intent: string;
    description: string;
    parameters: Record<string, any>;
    isPrivacySensitive: boolean;
  }[];
  error?: string;
}

export interface TaskStatusResponse {
  success: boolean;
  status?: {
    taskId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';
    progress: number;
    startedAt?: Date;
    completedAt?: Date;
    estimatedCompletion?: Date;
    error?: any;
    retryCount: number;
  };
  error?: string;
}

export interface TaskResultResponse {
  success: boolean;
  result?: {
    taskId: string;
    success: boolean;
    result?: any;
    error?: any;
    executionTime: number;
    tokensUsed: number;
    retryCount: number;
    cached: boolean;
    completedAt: Date;
  };
  error?: string;
}

class ChatApiService {
  // Synchronous chat methods
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await api.post('/chat/message', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send message'
      };
    }
  }

  async uploadMaterial(file: File, request: UploadMaterialRequest = {}): Promise<UploadMaterialResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add other request data
      Object.entries(request).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      const response = await api.post('/chat/upload-material', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to upload material'
      };
    }
  }

  // Asynchronous chat methods
  async sendMessageAsync(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await api.post('/chat/message', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send message'
      };
    }
  }

  async uploadMaterialAsync(file: File, request: UploadMaterialRequest = {}): Promise<UploadMaterialResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add other request data
      Object.entries(request).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      const response = await api.post('/chat/upload-material', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to upload material'
      };
    }
  }

  // Chat history and management
  async getChatHistory(limit: number = 50, offset: number = 0, language?: string): Promise<ChatHistoryResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (language) {
        params.append('language', language);
      }

      const response = await api.get(`/chat/history?${params}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        messages: [],
        totalCount: 0,
        hasMore: false,
        error: error.response?.data?.error || error.message || 'Failed to get chat history'
      };
    }
  }

  async clearChatHistory(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const response = await api.delete('/chat/history');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to clear chat history'
      };
    }
  }

  async searchMessages(searchTerm: string, limit: number = 20): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        limit: limit.toString(),
      });

      const response = await api.get(`/chat/search?${params}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to search messages'
      };
    }
  }

  // Function calling methods
  async executeFunction(request: FunctionCallRequest): Promise<FunctionCallResponse> {
    try {
      const response = await api.post('/chat/function-call', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to execute function'
      };
    }
  }

  async executeFunctionAsync(request: FunctionCallRequest): Promise<FunctionCallResponse> {
    try {
      const response = await api.post('/chat/function-call', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to execute function'
      };
    }
  }

  async parseIntent(request: ParseIntentRequest): Promise<ParseIntentResponse> {
    try {
      const response = await api.post('/chat/parse-intent', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to parse intent'
      };
    }
  }

  async getAvailableFunctions(): Promise<AvailableFunctionsResponse> {
    try {
      const response = await api.get('/chat/available-functions');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        functions: [],
        error: error.response?.data?.error || error.message || 'Failed to get available functions'
      };
    }
  }

  // Task management methods
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const response = await api.get(`/tasks/${taskId}/status`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get task status'
      };
    }
  }

  async getTaskResult(taskId: string): Promise<TaskResultResponse> {
    try {
      const response = await api.get(`/tasks/${taskId}/result`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get task result'
      };
    }
  }

  async cancelTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post(`/tasks/${taskId}/cancel`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to cancel task'
      };
    }
  }

  // Utility methods for polling task status
  async waitForTaskCompletion(
    taskId: string, 
    onProgress?: (progress: number) => void,
    timeoutMs: number = 300000, // 5 minutes
    pollIntervalMs: number = 2000 // 2 seconds
  ): Promise<TaskResultResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const statusResponse = await this.getTaskStatus(taskId);
      
      if (!statusResponse.success) {
        return {
          success: false,
          error: statusResponse.error
        };
      }

      const status = statusResponse.status!;
      
      // Update progress if callback provided
      if (onProgress) {
        onProgress(status.progress);
      }

      // Check if task is completed
      if (status.status === 'completed') {
        return await this.getTaskResult(taskId);
      }

      // Check if task failed
      if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'timeout') {
        return {
          success: false,
          error: `Task ${status.status}: ${status.error?.message || 'Unknown error'}`
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    return {
      success: false,
      error: 'Task timeout - exceeded maximum wait time'
    };
  }
}

export const chatApi = new ChatApiService();
export default chatApi;