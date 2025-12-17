"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValidator = exports.EncryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32);
const IV_LENGTH = 16;
const SALT_ROUNDS = 12;
class EncryptionService {
    static encrypt(text) {
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipher('aes-256-cbc', ENCRYPTION_KEY);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            encrypted,
            iv: iv.toString('hex')
        };
    }
    static decrypt(encryptedData) {
        const decipher = crypto_1.default.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    static async hashPassword(password) {
        return bcrypt_1.default.hash(password, SALT_ROUNDS);
    }
    static async verifyPassword(password, hashedPassword) {
        return bcrypt_1.default.compare(password, hashedPassword);
    }
    static generateSecureToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    static hashData(data) {
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    static generateHMAC(data, secret) {
        const hmacSecret = secret || process.env.HMAC_SECRET || 'default-secret';
        return crypto_1.default.createHmac('sha256', hmacSecret).update(data).digest('hex');
    }
    static verifyHMAC(data, hmac, secret) {
        const expectedHmac = this.generateHMAC(data, secret);
        return crypto_1.default.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
    }
    static sanitizeForLogging(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'creditCard'];
        const sanitized = { ...data };
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        }
        for (const key in sanitized) {
            if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeForLogging(sanitized[key]);
            }
        }
        return sanitized;
    }
    static maskSensitiveString(str, visibleChars = 4) {
        if (str.length <= visibleChars * 2) {
            return '*'.repeat(str.length);
        }
        const start = str.substring(0, visibleChars);
        const end = str.substring(str.length - visibleChars);
        const middle = '*'.repeat(str.length - visibleChars * 2);
        return start + middle + end;
    }
}
exports.EncryptionService = EncryptionService;
class InputValidator {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static isValidPassword(password) {
        const errors = [];
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    static sanitizeInput(input) {
        return input
            .trim()
            .replace(/[<>]/g, '')
            .replace(/['"]/g, '')
            .substring(0, 1000);
    }
    static isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        return usernameRegex.test(username);
    }
    static hasSQLInjection(input) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
            /(--|\/\*|\*\/|;)/,
            /(\b(OR|AND)\b.*=.*)/i
        ];
        return sqlPatterns.some(pattern => pattern.test(input));
    }
    static hasXSS(input) {
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];
        return xssPatterns.some(pattern => pattern.test(input));
    }
}
exports.InputValidator = InputValidator;
//# sourceMappingURL=encryption.js.map