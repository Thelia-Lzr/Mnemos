export class SecurityUtils {
  // Sanitize user input to prevent XSS
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  static validatePassword(password: string): { 
    valid: boolean; 
    score: number; 
    errors: string[] 
  } {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 8) {
      errors.push('密码至少需要8个字符');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('密码需要包含至少一个大写字母');
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('密码需要包含至少一个小写字母');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push('密码需要包含至少一个数字');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码需要包含至少一个特殊字符');
    } else {
      score += 1;
    }

    // Additional checks for stronger passwords
    if (password.length >= 12) {
      score += 1;
    }

    if (/[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1; // Multiple special characters
    }

    return {
      valid: errors.length === 0,
      score: Math.min(score, 5), // Max score of 5
      errors
    };
  }

  // Generate secure random string
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Mask sensitive data for display
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length);
    }
    
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(data.length - visibleChars * 2);
    
    return start + middle + end;
  }

  // Check for common password patterns
  static hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i
    ];

    return commonPatterns.some(pattern => pattern.test(password));
  }

  // Validate username
  static isValidUsername(username: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (username.length < 3) {
      errors.push('用户名至少需要3个字符');
    }

    if (username.length > 20) {
      errors.push('用户名不能超过20个字符');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('用户名只能包含字母、数字、下划线和连字符');
    }

    if (/^[0-9]/.test(username)) {
      errors.push('用户名不能以数字开头');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Secure local storage operations
  static setSecureItem(key: string, value: unknown): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  static getSecureItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }

  static removeSecureItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }

  // Clear all sensitive data from storage
  static clearSensitiveData(): void {
    const sensitiveKeys = ['token', 'refreshToken', 'userCredentials', 'authData'];
    
    sensitiveKeys.forEach(key => {
      this.removeSecureItem(key);
    });

    // Clear session storage as well
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error);
    }
  }

  // Check if running in secure context (HTTPS)
  static isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  }

  // Validate file upload security
  static validateFileUpload(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.size > maxSize) {
      errors.push('文件大小不能超过10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('不支持的文件类型');
    }

    // Check for suspicious file names
    if (/\.(exe|bat|cmd|scr|pif|com|jar|js|vbs|ps1)$/i.test(file.name)) {
      errors.push('不允许上传可执行文件');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Rate limiting for client-side operations
  private static rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // Clear rate limit for a specific key (useful for admin operations)
  static clearRateLimit(key: string): void {
    this.rateLimitMap.delete(key);
  }

  // Clear all rate limits (useful for debugging or admin reset)
  static clearAllRateLimits(): void {
    this.rateLimitMap.clear();
  }

  // Content Security Policy helpers
  static createNonce(): string {
    return this.generateSecureToken(16);
  }

  // Prevent clickjacking
  static preventClickjacking(): void {
    if (window.top !== window.self) {
      // Page is in an iframe
      document.body.style.display = 'none';
      throw new Error('Page cannot be displayed in a frame');
    }
  }

  // Secure cookie operations (if needed)
  static setSecureCookie(name: string, value: string, days: number = 7): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const secure = this.isSecureContext() ? '; Secure' : '';
    const sameSite = '; SameSite=Strict';
    
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/${secure}${sameSite}`;
  }

  static getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    
    return null;
  }

  static deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

export default SecurityUtils;