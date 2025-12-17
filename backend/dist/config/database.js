"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.testConnection = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_language_learning',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
exports.pool = new pg_1.Pool(dbConfig);
const testConnection = async () => {
    try {
        const client = await exports.pool.connect();
        console.log('�?Database connected successfully');
        client.release();
    }
    catch (error) {
        console.error('�?Database connection failed:', error);
        process.exit(1);
    }
};
exports.testConnection = testConnection;
const closeDatabase = async () => {
    try {
        await exports.pool.end();
        console.log('Database connection pool closed');
    }
    catch (error) {
        console.error('Error closing database connection pool:', error);
    }
};
exports.closeDatabase = closeDatabase;
process.on('SIGINT', exports.closeDatabase);
process.on('SIGTERM', exports.closeDatabase);
//# sourceMappingURL=database.js.map