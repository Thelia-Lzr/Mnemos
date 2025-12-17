"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCreditTransaction = exports.logAPIUsage = exports.logSecurityEvent = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
const transports = [
    new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }),
    new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
    }),
    new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'combined.log'),
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
    }),
];
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
    exitOnError: false,
});
const fs_1 = __importDefault(require("fs"));
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
const logSecurityEvent = (event, details) => {
    exports.logger.warn(`SECURITY: ${event}`, {
        type: 'security',
        event,
        details,
        timestamp: new Date().toISOString()
    });
};
exports.logSecurityEvent = logSecurityEvent;
const logAPIUsage = (endpoint, userId, duration) => {
    exports.logger.info(`API: ${endpoint}`, {
        type: 'api_usage',
        endpoint,
        userId,
        duration,
        timestamp: new Date().toISOString()
    });
};
exports.logAPIUsage = logAPIUsage;
const logCreditTransaction = (userId, amount, type, balance) => {
    exports.logger.info(`CREDIT: ${type}`, {
        type: 'credit_transaction',
        userId,
        amount,
        transactionType: type,
        newBalance: balance,
        timestamp: new Date().toISOString()
    });
};
exports.logCreditTransaction = logCreditTransaction;
//# sourceMappingURL=logger.js.map