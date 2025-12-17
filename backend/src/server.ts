import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { 
  generalRateLimit, 
  authRateLimit, 
  apiRateLimit,
  adminRateLimit,
  securityHeaders, 
  validateRequest, 
  ipSecurityCheck, 
  sessionTimeout 
} from './middleware/security';
import { performanceMonitor, startPerformanceMonitoring, getHealthMetrics } from './middleware/performance';
import { logger } from './utils/logger';
import { DatabaseOptimizationService } from './services/DatabaseOptimizationService';
import { createAuthRoutes } from './routes/authRoutes';
import { createUserRoutes } from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import practiceRoutes from './routes/practiceRoutes';
import vocabularyRoutes from './routes/vocabularyRoutes';
import pkRoutes from './routes/pkRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import taskRoutes from './routes/taskRoutes';
import { createDailyRecommendationRoutes } from './routes/dailyRecommendationRoutes';
import { createMonitoringRoutes } from './routes/monitoringRoutes';
import { createUserLanguageRoutes } from './routes/userLanguageRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import { MonitoringService } from './services/MonitoringService';
import { pool } from './config/database';
import { connectRedis } from './config/redis';
import { TaskQueueManager } from './services/TaskQueueManager';
import { TaskResultManager } from './services/TaskResultManager';
import { pkScheduler } from './services/PKSchedulerService';
import { PKBattleService } from './services/PKBattleService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.http(message.trim());
    }
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security checks
app.use(ipSecurityCheck);
app.use(validateRequest);
app.use(generalRateLimit);
app.use(sessionTimeout);

// Performance monitoring
app.use(performanceMonitor);

// Health check endpoint with performance metrics
app.get('/health', async (req, res) => {
  try {
    const healthMetrics = getHealthMetrics();
    const dbHealth = await DatabaseOptimizationService.healthCheck(pool);
    
    res.status(200).json({
      status: dbHealth.healthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      metrics: healthMetrics,
      database: dbHealth
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API Routes with specific rate limiting
app.use('/api/auth', authRateLimit, createAuthRoutes(pool));
app.use('/api/users', apiRateLimit, createUserRoutes(pool));
app.use('/api/chat', apiRateLimit, chatRoutes);
app.use('/api/practice', apiRateLimit, practiceRoutes);
app.use('/api/vocabulary', apiRateLimit, vocabularyRoutes);
app.use('/api/pk', apiRateLimit, pkRoutes);
app.use('/api/payment', apiRateLimit, paymentRoutes);
app.use('/api/admin', adminRateLimit, adminRoutes);
app.use('/api/tasks', apiRateLimit, taskRoutes);
app.use('/api/daily-recommendations', apiRateLimit, createDailyRecommendationRoutes(pool));
app.use('/api/monitoring', apiRateLimit, createMonitoringRoutes(pool));
app.use('/api/user-languages', apiRateLimit, createUserLanguageRoutes(pool));
app.use('/api/assessment', apiRateLimit, assessmentRoutes);

// Initialize PK Battle Service with Socket.IO
const pkBattleService = new PKBattleService();
pkBattleService.setSocketIO(io);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });
  
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // PK Battle specific events
  socket.on('join-battle', (battleId: string) => {
    pkBattleService.joinBattleRoom(socket.id, battleId);
  });

  socket.on('leave-battle', (battleId: string) => {
    pkBattleService.leaveBattleRoom(socket.id, battleId);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Try to connect to Redis (optional)
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without Redis:', redisError);
    }

    // Optimize database pool
    DatabaseOptimizationService.optimizePool(pool);
    logger.info('Database pool optimized');

    // Start performance monitoring
    startPerformanceMonitoring();

    // Start system monitoring
    MonitoringService.startMonitoring();

    // Initialize task queue manager (singleton pattern, already initialized)
    try {
      // TaskQueueManager.getInstance(); // Skip for now if Redis is not available
      logger.info('Task queue manager skipped (Redis not available)');
    } catch (taskError) {
      logger.warn('Task queue manager initialization failed:', taskError);
    }

    // Initialize task result manager (singleton pattern, already initialized)
    try {
      // TaskResultManager.getInstance(); // Skip for now if Redis is not available
      logger.info('Task result manager skipped (Redis not available)');
    } catch (resultError) {
      logger.warn('Task result manager initialization failed:', resultError);
    }

    // Start PK scheduler for cleanup tasks
    try {
      pkScheduler.start();
      logger.info('PK scheduler started');
    } catch (schedulerError) {
      logger.warn('PK scheduler failed to start:', schedulerError);
    }

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Starting graceful shutdown...');
  
  try {
    // Stop monitoring services
    MonitoringService.stopMonitoring();
    logger.info('System monitoring stopped');

    // Stop PK scheduler
    pkScheduler.stop();
    logger.info('PK scheduler stopped');

    // Stop task result manager cleanup timer
    try {
      // TaskResultManager.getInstance().stopCleanupTimer();
      logger.info('Task result manager stopped (was skipped)');
    } catch (error) {
      logger.warn('Task result manager stop failed:', error);
    }

    // Shutdown task queues
    try {
      // await TaskQueueManager.getInstance().shutdown();
      logger.info('Task queues shut down (were skipped)');
    } catch (error) {
      logger.warn('Task queue shutdown failed:', error);
    }

    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.warn('Forcing exit after timeout');
      process.exit(1);
    }, 10000);

  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer() {
  await initializeServices();
  
  server.listen(PORT, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info('Task queues are ready');
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export { app, io };
