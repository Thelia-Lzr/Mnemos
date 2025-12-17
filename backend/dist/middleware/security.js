"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionTimeout = exports.validateAPIKey = exports.ipSecurityCheck = exports.validateRequest = exports.securityHeaders = exports.adminRateLimit = exports.apiRateLimit = exports.authRateLimit = exports.generalRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("./errorHandler");
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        (0, logger_1.logSecurityEvent)('RATE_LIMIT_EXCEEDED', {
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
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        (0, logger_1.logSecurityEvent)('AUTH_RATE_LIMIT_EXCEEDED', {
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
exports.apiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 300,
    message: {
        success: false,
        message: 'API rate limit exceeded, please slow down.'
    },
    handler: (req, res) => {
        (0, logger_1.logSecurityEvent)('API_RATE_LIMIT_EXCEEDED', {
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
exports.adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 500,
    message: {
        success: false,
        message: 'Admin API rate limit exceeded, please slow down.'
    },
    handler: (req, res) => {
        (0, logger_1.logSecurityEvent)('ADMIN_RATE_LIMIT_EXCEEDED', {
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
exports.securityHeaders = (0, helmet_1.default)({
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
const validateRequest = (req, res, next) => {
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
            (0, logger_1.logSecurityEvent)('SUSPICIOUS_REQUEST_DETECTED', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.url,
                method: req.method,
                suspiciousData: requestData
            });
            throw new errorHandler_1.CustomError('Invalid request format', 400);
        }
    }
    next();
};
exports.validateRequest = validateRequest;
const blacklistedIPs = new Set();
const suspiciousIPs = new Map();
const whitelistedIPs = new Set([
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'localhost'
]);
const ipSecurityCheck = (req, res, next) => {
    const clientIP = req.ip || 'unknown';
    if (whitelistedIPs.has(clientIP)) {
        return next();
    }
    if (blacklistedIPs.has(clientIP)) {
        (0, logger_1.logSecurityEvent)('BLACKLISTED_IP_ACCESS', {
            ip: clientIP,
            userAgent: req.get('User-Agent'),
            url: req.url
        });
        throw new errorHandler_1.CustomError('Access denied', 403);
    }
    const now = new Date();
    const suspicious = suspiciousIPs.get(clientIP);
    if (suspicious) {
        const timeDiff = now.getTime() - suspicious.lastSeen.getTime();
        if (timeDiff > 60 * 60 * 1000) {
            suspiciousIPs.set(clientIP, { count: 1, lastSeen: now });
        }
        else {
            suspicious.count++;
            suspicious.lastSeen = now;
            if (suspicious.count > 10) {
                blacklistedIPs.add(clientIP);
                (0, logger_1.logSecurityEvent)('IP_BLACKLISTED', {
                    ip: clientIP,
                    suspiciousCount: suspicious.count
                });
            }
        }
    }
    else {
        suspiciousIPs.set(clientIP, { count: 1, lastSeen: now });
    }
    next();
};
exports.ipSecurityCheck = ipSecurityCheck;
const validateAPIKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        (0, logger_1.logSecurityEvent)('MISSING_API_KEY', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url
        });
        throw new errorHandler_1.CustomError('API key required', 401);
    }
    if (!/^[a-zA-Z0-9_-]{32,}$/.test(apiKey)) {
        (0, logger_1.logSecurityEvent)('INVALID_API_KEY_FORMAT', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            apiKey: apiKey.substring(0, 8) + '...'
        });
        throw new errorHandler_1.CustomError('Invalid API key format', 401);
    }
    next();
};
exports.validateAPIKey = validateAPIKey;
const sessionTimeout = (req, res, next) => {
    const sessionTimeout = 24 * 60 * 60 * 1000;
    if (req.user) {
        const now = new Date().getTime();
        const lastActivity = req.session?.lastActivity || now;
        if (now - lastActivity > sessionTimeout) {
            (0, logger_1.logSecurityEvent)('SESSION_TIMEOUT', {
                userId: req.user.id,
                ip: req.ip || 'unknown',
                lastActivity: new Date(lastActivity).toISOString()
            });
            req.session?.destroy((err) => {
                if (err) {
                    logger_1.logger.error('Session destruction error:', err);
                }
            });
            throw new errorHandler_1.CustomError('Session expired, please login again', 401);
        }
        if (req.session) {
            req.session.lastActivity = now;
        }
    }
    next();
};
exports.sessionTimeout = sessionTimeout;
//# sourceMappingURL=security.js.map