import axios from 'axios';
import ErrorHandler from '../utils/errorHandler';
import SecurityUtils from '../utils/security';

const resolveApiBaseUrl = () => {
  const raw = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').trim();
  return raw.endsWith('/api') ? raw : `${raw}/api`;
};

const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for better UX
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
  },
  withCredentials: true, // Include cookies for session management
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token and security headers
api.interceptors.request.use(
  (config) => {
    // Add authentication token
    const token = SecurityUtils.getSecureItem<string>('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add security headers
    config.headers['X-Request-ID'] = SecurityUtils.generateSecureToken(16);
    config.headers['X-Timestamp'] = Date.now().toString();

    // Rate limiting check (relaxed for admin operations and AI chat)
    const endpoint = config.url || '';
    const isAdminEndpoint = endpoint.includes('/admin/');
    const isChatEndpoint = endpoint.includes('/chat/');
    const isAuthEndpoint = endpoint.includes('/auth/');
    
    // More relaxed rate limiting for admin, chat, and auth operations
    let maxRequests = 100;
    let windowMs = 60000; // 1 minute
    
    if (isAdminEndpoint) {
      maxRequests = 200; // Allow more admin operations
      windowMs = 60000;
    } else if (isChatEndpoint) {
      maxRequests = 50; // Allow reasonable chat frequency
      windowMs = 60000;
    } else if (isAuthEndpoint) {
      maxRequests = 20; // Reasonable auth attempts
      windowMs = 300000; // 5 minutes
    }
    
    if (!SecurityUtils.checkRateLimit(`api_${endpoint}`, maxRequests, windowMs)) {
      ErrorHandler.showWarning('请求过于频繁，请稍后再试');
      return Promise.reject(new Error('Rate limit exceeded'));
    }

    // Log API request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    ErrorHandler.logError(error, 'API Request Interceptor');
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful API response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const apiError = ErrorHandler.handleApiError(error);

    // Log error
    ErrorHandler.logError(error, `API ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);

    // Handle different error types
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = SecurityUtils.getSecureItem<string>('refreshToken');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          const token = response.data.token || response.data.access_token;

          if (token) {
            SecurityUtils.setSecureItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            
            processQueue(null, token);
            
            return api(originalRequest);
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          SecurityUtils.clearSensitiveData();
          ErrorHandler.showError('登录已过期，请重新登录');
          setTimeout(() => {
            window.location.href = '/auth';
          }, 2000);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        SecurityUtils.clearSensitiveData();
        ErrorHandler.showError('请先登录');
        window.location.href = '/auth';
      }
    } else if (error.response?.status === 429) {
      // Rate limiting
      ErrorHandler.showWarning('请求过于频繁，请稍后再试');
    } else if (error.response?.status === 403) {
      // Forbidden
      ErrorHandler.showError('您没有权限执行此操作');
    } else if (error.response?.status >= 500) {
      // Server errors
      ErrorHandler.handleServerError(apiError);
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      // Network errors
      ErrorHandler.handleNetworkError();
    } else if (error.response?.status === 400) {
      // Validation errors
      ErrorHandler.handleValidationError(apiError);
    }

    return Promise.reject(apiError);
  }
);

export default api;