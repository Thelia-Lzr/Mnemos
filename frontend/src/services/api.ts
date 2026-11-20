import axios from 'axios';
import ErrorHandler from '../utils/errorHandler';
import SecurityUtils from '../utils/security';

const rawApiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').trim().replace(/\/+$/, '');
const baseURL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

// An AI request may try five providers with up to 120 seconds each.
const AI_REQUEST_TIMEOUT = 610_000;
const inferenceEndpoint = /^\/(?:chat\/(?:message|upload-material|function-call|parse-intent)|practice\/(?:generate-group|followup|result\/[^/]+\/analyze)|vocabulary\/(?:add-words|generate-practice)|daily-recommendations\/[^/]+\/(?:today|generate))$/;

export const api = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = SecurityUtils.generateSecureToken(16);
  const endpoint = config.url?.split('?')[0] || '';
  if (inferenceEndpoint.test(endpoint)) {
    config.timeout = AI_REQUEST_TIMEOUT;
  }
  const maxRequests = endpoint.startsWith('/admin/') ? 200 : endpoint.startsWith('/chat/') ? 50 : 100;
  if (!SecurityUtils.checkRateLimit(`api_${endpoint}`, maxRequests, 60_000)) {
    ErrorHandler.showWarning('请求过于频繁，请稍后再试');
    return Promise.reject(new Error('Rate limit exceeded'));
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const apiError = ErrorHandler.handleApiError(error);
    // The configuration page displays its own errors. Avoid logging requests containing keys.
    if (!error.config?.url?.startsWith('/ai-settings')) {
      if (apiError.statusCode === 429) {
        ErrorHandler.showWarning('请求过于频繁，请稍后再试');
      } else if (apiError.statusCode === 403) {
        ErrorHandler.showError(apiError);
      } else if ((apiError.statusCode || 0) >= 500 && error.response) {
        ErrorHandler.handleServerError(apiError);
      } else if (!error.response) {
        ErrorHandler.handleNetworkError();
      } else if (apiError.statusCode === 400) {
        ErrorHandler.handleValidationError(apiError);
      }
    }
    return Promise.reject(apiError);
  },
);

export default api;
