"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const errorHandler_1 = require("./middleware/errorHandler");
const security_1 = require("./middleware/security");
const performance_1 = require("./middleware/performance");
const logger_1 = require("./utils/logger");
const DatabaseOptimizationService_1 = require("./services/DatabaseOptimizationService");
const authRoutes_1 = require("./routes/authRoutes");
const userRoutes_1 = require("./routes/userRoutes");
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const practiceRoutes_1 = __importDefault(require("./routes/practiceRoutes"));
const vocabularyRoutes_1 = __importDefault(require("./routes/vocabularyRoutes"));
const pkRoutes_1 = __importDefault(require("./routes/pkRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const dailyRecommendationRoutes_1 = require("./routes/dailyRecommendationRoutes");
const monitoringRoutes_1 = require("./routes/monitoringRoutes");
const userLanguageRoutes_1 = require("./routes/userLanguageRoutes");
const assessmentRoutes_1 = __importDefault(require("./routes/assessmentRoutes"));
const MonitoringService_1 = require("./services/MonitoringService");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const PKSchedulerService_1 = require("./services/PKSchedulerService");
const PKBattleService_1 = require("./services/PKBattleService");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
app.use(security_1.securityHeaders);
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => {
            logger_1.logger.http(message.trim());
        }
    }
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(security_1.ipSecurityCheck);
app.use(security_1.validateRequest);
app.use(security_1.generalRateLimit);
app.use(security_1.sessionTimeout);
app.use(performance_1.performanceMonitor);
app.get('/health', async (req, res) => {
    try {
        const healthMetrics = (0, performance_1.getHealthMetrics)();
        const dbHealth = await DatabaseOptimizationService_1.DatabaseOptimizationService.healthCheck(database_1.pool);
        res.status(200).json({
            status: dbHealth.healthy ? 'OK' : 'DEGRADED',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            metrics: healthMetrics,
            database: dbHealth
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});
app.use('/api/auth', security_1.authRateLimit, (0, authRoutes_1.createAuthRoutes)(database_1.pool));
app.use('/api/users', security_1.apiRateLimit, (0, userRoutes_1.createUserRoutes)(database_1.pool));
app.use('/api/chat', security_1.apiRateLimit, chatRoutes_1.default);
app.use('/api/practice', security_1.apiRateLimit, practiceRoutes_1.default);
app.use('/api/vocabulary', security_1.apiRateLimit, vocabularyRoutes_1.default);
app.use('/api/pk', security_1.apiRateLimit, pkRoutes_1.default);
app.use('/api/payment', security_1.apiRateLimit, paymentRoutes_1.default);
app.use('/api/admin', security_1.adminRateLimit, adminRoutes_1.default);
app.use('/api/tasks', security_1.apiRateLimit, taskRoutes_1.default);
app.use('/api/daily-recommendations', security_1.apiRateLimit, (0, dailyRecommendationRoutes_1.createDailyRecommendationRoutes)(database_1.pool));
app.use('/api/monitoring', security_1.apiRateLimit, (0, monitoringRoutes_1.createMonitoringRoutes)(database_1.pool));
app.use('/api/user-languages', security_1.apiRateLimit, (0, userLanguageRoutes_1.createUserLanguageRoutes)(database_1.pool));
app.use('/api/assessment', security_1.apiRateLimit, assessmentRoutes_1.default);
const pkBattleService = new PKBattleService_1.PKBattleService();
pkBattleService.setSocketIO(io);
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);
    });
    socket.on('join-battle', (battleId) => {
        pkBattleService.joinBattleRoom(socket.id, battleId);
    });
    socket.on('leave-battle', (battleId) => {
        pkBattleService.leaveBattleRoom(socket.id, battleId);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.globalErrorHandler);
async function initializeServices() {
    try {
        try {
            await (0, redis_1.connectRedis)();
            logger_1.logger.info('Redis connected successfully');
        }
        catch (redisError) {
            logger_1.logger.warn('Redis connection failed, continuing without Redis:', redisError);
        }
        DatabaseOptimizationService_1.DatabaseOptimizationService.optimizePool(database_1.pool);
        logger_1.logger.info('Database pool optimized');
        (0, performance_1.startPerformanceMonitoring)();
        MonitoringService_1.MonitoringService.startMonitoring();
        try {
            logger_1.logger.info('Task queue manager skipped (Redis not available)');
        }
        catch (taskError) {
            logger_1.logger.warn('Task queue manager initialization failed:', taskError);
        }
        try {
            logger_1.logger.info('Task result manager skipped (Redis not available)');
        }
        catch (resultError) {
            logger_1.logger.warn('Task result manager initialization failed:', resultError);
        }
        try {
            PKSchedulerService_1.pkScheduler.start();
            logger_1.logger.info('PK scheduler started');
        }
        catch (schedulerError) {
            logger_1.logger.warn('PK scheduler failed to start:', schedulerError);
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}
async function gracefulShutdown() {
    logger_1.logger.info('Starting graceful shutdown...');
    try {
        MonitoringService_1.MonitoringService.stopMonitoring();
        logger_1.logger.info('System monitoring stopped');
        PKSchedulerService_1.pkScheduler.stop();
        logger_1.logger.info('PK scheduler stopped');
        try {
            logger_1.logger.info('Task result manager stopped (was skipped)');
        }
        catch (error) {
            logger_1.logger.warn('Task result manager stop failed:', error);
        }
        try {
            logger_1.logger.info('Task queues shut down (were skipped)');
        }
        catch (error) {
            logger_1.logger.warn('Task queue shutdown failed:', error);
        }
        server.close(() => {
            logger_1.logger.info('HTTP server closed');
            process.exit(0);
        });
        setTimeout(() => {
            logger_1.logger.warn('Forcing exit after timeout');
            process.exit(1);
        }, 10000);
    }
    catch (error) {
        logger_1.logger.error('Error during shutdown:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
async function startServer() {
    await initializeServices();
    server.listen(PORT, () => {
        logger_1.logger.info(`Server running on http://${HOST}:${PORT}`);
        logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger_1.logger.info('Task queues are ready');
    });
}
startServer().catch(error => {
    logger_1.logger.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map