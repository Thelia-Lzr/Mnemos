import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger, logSecurityEvent } from '../utils/logger';
import { CustomError } from './errorHandler';

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // increased limit for better user experience
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // increased limit for development and testing
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    });
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // increased limit for better user experience with AI chat
  message: {
    success: false,
    message: 'API rate limit exceeded, please slow down.'
  },
  handler: (req: Request, res: Response) => {
    logSecurityEvent('API_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded, please slow down.'
    });
  }
});

// Admin-specific rate limit (more permissive for admin operations)
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // very permissive for admin operations
  message: {
    success: false,
    message: 'Admin API rate limit exceeded, please slow down.'
  },
  handler: (req: Request, res: Response) => {
    logSecurityEvent('ADMIN_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      success: false,
      message: 'Admin API rate limit exceeded, please slow down.'
    });
  }
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(<script|javascript:|vbscript:|onload=|onerror=)/i,
    /(union.*select|drop.*table|insert.*into)/i,
    /(\.\.\/|\.\.\\)/,
    /(<iframe|<object|<embed)/i
  ];

  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      logSecurityEvent('SUSPICIOUS_REQUEST_DETECTED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        suspiciousData: requestData
      });
      
      throw new CustomError('Invalid request format', 400);
    }
  }

  next();
};

// IP whitelist/blacklist middleware
const blacklistedIPs = new Set<string>();
const suspiciousIPs = new Map<string, { count: number, lastSeen: Date }>();

// Whitelist for development and local IPs
const whitelistedIPs = new Set<string>([
  '127.0.0.1',    // IPv4 localhost
  '::1',          // IPv6 localhost
  '::ffff:127.0.0.1', // IPv4-mapped IPv6 localhost
  'localhost'
]);

export const ipSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';

  // Skip security checks for whitelisted IPs (development)
  if (whitelistedIPs.has(clientIP)) {
    return next();
  }

  // Check if IP is blacklisted
  if (blacklistedIPs.has(clientIP)) {
    logSecurityEvent('BLACKLISTED_IP_ACCESS', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    
    throw new CustomError('Access denied', 403);
  }

  // Track suspicious activity
  const now = new Date();
  const suspicious = suspiciousIPs.get(clientIP);
  
  if (suspicious) {
    const timeDiff = now.getTime() - suspicious.lastSeen.getTime();
    
    // Reset counter if more than 1 hour has passed
    if (timeDiff > 60 * 60 * 1000) {
      suspiciousIPs.set(clientIP, { count: 1, lastSeen: now });
    } else {
      suspicious.count++;
      suspicious.lastSeen = now;
      
      // Blacklist IP if too many suspicious activities
      if (suspicious.count > 10) {
        blacklistedIPs.add(clientIP);
        logSecurityEvent('IP_BLACKLISTED', {
          ip: clientIP,
          suspiciousCount: suspicious.count
        });
      }
    }
  } else {
    suspiciousIPs.set(clientIP, { count: 1, lastSeen: now });
  }

  next();
};

// API key validation middleware
export const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    logSecurityEvent('MISSING_API_KEY', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    
    throw new CustomError('API key required', 401);
  }

  // Validate API key format (basic validation)
  if (!/^[a-zA-Z0-9_-]{32,}$/.test(apiKey)) {
    logSecurityEvent('INVALID_API_KEY_FORMAT', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      apiKey: apiKey.substring(0, 8) + '...' // Log only first 8 chars
    });
    
    throw new CustomError('Invalid API key format', 401);
  }

  next();
};

// Session timeout middleware
export const sessionTimeout = (req: Request & { user?: any; session?: any }, res: Response, next: NextFunction) => {
  const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  
  if (req.user) {
    const now = new Date().getTime();
    const lastActivity = req.session?.lastActivity || now;
    
    if (now - lastActivity > sessionTimeout) {
      logSecurityEvent('SESSION_TIMEOUT', {
        userId: req.user.id,
        ip: req.ip || 'unknown',
        lastActivity: new Date(lastActivity).toISOString()
      });
      
      req.session?.destroy((err: any) => {
        if (err) {
          logger.error('Session destruction error:', err);
        }
      });
      
      throw new CustomError('Session expired, please login again', 401);
    }
    
    // Update last activity
    if (req.session) {
      req.session.lastActivity = now;
    }
  }

  next();
};
