import { toast } from 'react-toastify';

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ErrorHandler {
  // Get error message from various error types
  static getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return '发生未知错误';
  }

  // Handle API errors
  static handleApiError(error: any): ApiError {
    let apiError: ApiError = {
      message: '发生未知错误',
      statusCode: 500
    };

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      apiError = {
        message: data?.message || (typeof data?.detail === 'string' ? data.detail : '服务器错误'),
        statusCode: status,
        code: data?.code,
        details: data?.details
      };
    } else if (error.request) {
      // Network error
      apiError = {
        message: '网络连接失败，请检查网络设置',
        statusCode: 0,
        code: 'NETWORK_ERROR'
      };
    } else {
      // Other errors
      apiError = {
        message: error.message || '发生未知错误',
        statusCode: 500,
        code: 'UNKNOWN_ERROR'
      };
    }

    return apiError;
  }

  // Show error notification
  static showError(error: ApiError | string, options?: { 
    autoClose?: number;
    position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  }) {
    const message = typeof error === 'string' ? error : error.message;
    
    toast.error(message, {
      position: options?.position || 'top-right',
      autoClose: options?.autoClose || 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  // Show success notification
  static showSuccess(message: string, options?: { 
    autoClose?: number;
    position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  }) {
    toast.success(message, {
      position: options?.position || 'top-right',
      autoClose: options?.autoClose || 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  // Show warning notification
  static showWarning(message: string, options?: { 
    autoClose?: number;
    position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  }) {
    toast.warning(message, {
      position: options?.position || 'top-right',
      autoClose: options?.autoClose || 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  // Show info notification
  static showInfo(message: string, options?: { 
    autoClose?: number;
    position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  }) {
    toast.info(message, {
      position: options?.position || 'top-right',
      autoClose: options?.autoClose || 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  // Handle specific error types
  static handleAuthError(error: ApiError) {
    if (error.statusCode === 401) {
      this.showError('登录已过期，请重新登录');
      // Redirect to login page
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
    } else if (error.statusCode === 403) {
      this.showError('您没有权限执行此操作');
    } else {
      this.showError(error);
    }
  }

  static handleValidationError(error: ApiError) {
    if (error.details && Array.isArray(error.details)) {
      // Show first validation error
      const firstError = error.details[0];
      this.showError(firstError.message || firstError);
    } else {
      this.showError(error.message || '输入数据验证失败');
    }
  }

  static handleNetworkError() {
    this.showError('网络连接失败，请检查网络设置后重试');
  }

  static handleServerError(error: ApiError) {
    if (error.statusCode === 500) {
      this.showError('服务器内部错误，请稍后重试');
    } else if (error.statusCode === 503) {
      this.showError('服务暂时不可用，请稍后重试');
    } else {
      this.showError(error);
    }
  }

  // Log errors for debugging
  static logError(error: any, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error${context ? ` in ${context}` : ''}`);
      console.error('Error object:', error);
      console.error('Stack trace:', error.stack);
      console.groupEnd();
    }

    // In production, you might want to send errors to a logging service
    // this.sendToLoggingService(error, context);
  }

  // Retry mechanism for failed operations
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }

  // Validate input data
  static validateRequired(data: any, fields: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of fields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} 是必填项`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Sanitize user input
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, 1000); // Limit length
  }

  // Check if error is recoverable
  static isRecoverableError(error: ApiError): boolean {
    const recoverableStatusCodes = [408, 429, 500, 502, 503, 504];
    return error.statusCode ? recoverableStatusCodes.includes(error.statusCode) : false;
  }
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.logError(event.reason, 'Unhandled Promise Rejection');
  ErrorHandler.showError('发生未处理的错误，请刷新页面重试');
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  ErrorHandler.logError(event.error, 'JavaScript Error');
  ErrorHandler.showError('页面发生错误，请刷新页面重试');
});

export default ErrorHandler;