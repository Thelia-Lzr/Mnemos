"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskResultManager = exports.TaskResultManager = void 0;
const redis_1 = require("../config/redis");
class TaskResultManager {
    constructor() {
        this.defaultCacheOptions = {
            ttl: 86400,
            compress: true,
            maxSize: 1024 * 1024
        };
        this.defaultCleanupPolicy = {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            maxResults: 100,
            cleanupInterval: 60 * 60 * 1000
        };
        this.startCleanupTimer();
    }
    static getInstance() {
        if (!TaskResultManager.instance) {
            TaskResultManager.instance = new TaskResultManager();
        }
        return TaskResultManager.instance;
    }
    async storeTaskResult(taskId, result, options = {}) {
        const cacheOptions = { ...this.defaultCacheOptions, ...options };
        try {
            let resultData = JSON.stringify(result);
            if (cacheOptions.compress && resultData.length > (cacheOptions.maxSize || 0)) {
                resultData = await this.compressData(resultData);
            }
            const cacheKey = this.getResultCacheKey(taskId);
            await redis_1.RedisService.set(cacheKey, resultData, cacheOptions.ttl);
            const metadataKey = this.getResultMetadataKey(taskId);
            const metadata = {
                taskId,
                userId: this.extractUserIdFromResult(result),
                taskType: this.extractTaskTypeFromResult(result),
                success: result.success,
                completedAt: result.completedAt,
                executionTime: result.executionTime,
                tokensUsed: result.tokensUsed,
                compressed: cacheOptions.compress && resultData.length > (cacheOptions.maxSize || 0)
            };
            await redis_1.RedisService.set(metadataKey, JSON.stringify(metadata), cacheOptions.ttl);
            if (metadata.userId) {
                await this.addToUserResultIndex(metadata.userId, taskId, result.completedAt);
            }
            console.log(`📦 Stored result for task ${taskId}`);
        }
        catch (error) {
            console.error(`Error storing task result ${taskId}:`, error);
            throw error;
        }
    }
    async getTaskResult(taskId) {
        try {
            const cacheKey = this.getResultCacheKey(taskId);
            const resultData = await redis_1.RedisService.get(cacheKey);
            if (!resultData) {
                return null;
            }
            const metadataKey = this.getResultMetadataKey(taskId);
            const metadataStr = await redis_1.RedisService.get(metadataKey);
            let finalResultData = resultData;
            if (metadataStr) {
                const metadata = JSON.parse(metadataStr);
                if (metadata.compressed) {
                    finalResultData = await this.decompressData(resultData);
                }
            }
            const result = JSON.parse(finalResultData);
            result.cached = true;
            result.cacheKey = cacheKey;
            return result;
        }
        catch (error) {
            console.error(`Error getting task result ${taskId}:`, error);
            return null;
        }
    }
    async deleteTaskResult(taskId) {
        try {
            const cacheKey = this.getResultCacheKey(taskId);
            const metadataKey = this.getResultMetadataKey(taskId);
            const metadataStr = await redis_1.RedisService.get(metadataKey);
            if (metadataStr) {
                const metadata = JSON.parse(metadataStr);
                if (metadata.userId) {
                    await this.removeFromUserResultIndex(metadata.userId, taskId);
                }
            }
            const deletedCount = await Promise.all([
                redis_1.RedisService.del(cacheKey),
                redis_1.RedisService.del(metadataKey)
            ]);
            return deletedCount.some(count => count > 0);
        }
        catch (error) {
            console.error(`Error deleting task result ${taskId}:`, error);
            return false;
        }
    }
    async getUserTaskResults(userId, limit = 50, offset = 0) {
        try {
            const indexKey = this.getUserResultIndexKey(userId);
            const taskIds = await this.getUserResultTaskIds(userId, limit, offset);
            const results = [];
            for (const taskId of taskIds) {
                const result = await this.getTaskResult(taskId);
                if (result) {
                    results.push(result);
                }
            }
            return results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        }
        catch (error) {
            console.error(`Error getting user task results for ${userId}:`, error);
            return [];
        }
    }
    async getUserSuccessfulResults(userId, limit = 20) {
        const allResults = await this.getUserTaskResults(userId, limit * 2);
        return allResults.filter(result => result.success).slice(0, limit);
    }
    async getUserFailedResults(userId, limit = 20) {
        const allResults = await this.getUserTaskResults(userId, limit * 2);
        return allResults.filter(result => !result.success).slice(0, limit);
    }
    async sendTaskCompletionNotification(taskId, result, config) {
        try {
            if (config.webhookUrl) {
                await this.sendWebhookNotification(config.webhookUrl, taskId, result);
            }
            if (config.emailNotification) {
                await this.sendEmailNotification(config.userId, taskId, result);
            }
            if (config.pushNotification) {
                await this.sendPushNotification(config.userId, taskId, result);
            }
            console.log(`📬 Sent notifications for task ${taskId}`);
        }
        catch (error) {
            console.error(`Error sending notifications for task ${taskId}:`, error);
        }
    }
    async storeBatchTaskResults(results) {
        const promises = results.map(({ taskId, result, options }) => this.storeTaskResult(taskId, result, options));
        await Promise.all(promises);
    }
    async getBatchTaskResults(taskIds) {
        const promises = taskIds.map(taskId => this.getTaskResult(taskId));
        return await Promise.all(promises);
    }
    async getTaskResultStats(userId) {
        try {
            let results;
            if (userId) {
                results = await this.getUserTaskResults(userId, 1000);
            }
            else {
                results = await this.getAllTaskResults(1000);
            }
            const total = results.length;
            const successful = results.filter(r => r.success).length;
            const failed = total - successful;
            const averageExecutionTime = total > 0
                ? results.reduce((sum, r) => sum + r.executionTime, 0) / total
                : 0;
            const totalTokensUsed = results.reduce((sum, r) => sum + r.tokensUsed, 0);
            return {
                total,
                successful,
                failed,
                averageExecutionTime,
                totalTokensUsed
            };
        }
        catch (error) {
            console.error('Error getting task result stats:', error);
            return {
                total: 0,
                successful: 0,
                failed: 0,
                averageExecutionTime: 0,
                totalTokensUsed: 0
            };
        }
    }
    async cleanupExpiredResults(policy = {}) {
        const cleanupPolicy = { ...this.defaultCleanupPolicy, ...policy };
        let cleanedCount = 0;
        try {
            const userIndexKeys = await this.getAllUserIndexKeys();
            for (const indexKey of userIndexKeys) {
                const userId = this.extractUserIdFromIndexKey(indexKey);
                const taskIds = await this.getUserResultTaskIds(userId, 1000);
                const taskResults = [];
                for (const taskId of taskIds) {
                    const metadata = await this.getTaskResultMetadata(taskId);
                    if (metadata) {
                        taskResults.push({
                            taskId,
                            completedAt: new Date(metadata.completedAt)
                        });
                    }
                }
                taskResults.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
                const now = Date.now();
                for (let i = 0; i < taskResults.length; i++) {
                    const { taskId, completedAt } = taskResults[i];
                    const age = now - completedAt.getTime();
                    if (age > cleanupPolicy.maxAge || i >= cleanupPolicy.maxResults) {
                        const deleted = await this.deleteTaskResult(taskId);
                        if (deleted) {
                            cleanedCount++;
                        }
                    }
                }
            }
            console.log(`🧹 Cleaned up ${cleanedCount} expired task results`);
            return cleanedCount;
        }
        catch (error) {
            console.error('Error cleaning up expired results:', error);
            return cleanedCount;
        }
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(async () => {
            await this.cleanupExpiredResults();
        }, this.defaultCleanupPolicy.cleanupInterval);
    }
    stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }
    getResultCacheKey(taskId) {
        return `task:result:${taskId}`;
    }
    getResultMetadataKey(taskId) {
        return `task:result:meta:${taskId}`;
    }
    getUserResultIndexKey(userId) {
        return `user:results:${userId}`;
    }
    async compressData(data) {
        return Buffer.from(data).toString('base64');
    }
    async decompressData(compressedData) {
        return Buffer.from(compressedData, 'base64').toString();
    }
    extractUserIdFromResult(result) {
        return null;
    }
    extractTaskTypeFromResult(result) {
        return null;
    }
    async addToUserResultIndex(userId, taskId, completedAt) {
        const indexKey = this.getUserResultIndexKey(userId);
        const score = completedAt.getTime();
        try {
            await redis_1.RedisService.lPush(indexKey, taskId);
        }
        catch (error) {
            console.error('Error adding to user result index:', error);
        }
    }
    async removeFromUserResultIndex(userId, taskId) {
        console.log(`Removing ${taskId} from user ${userId} index`);
    }
    async getUserResultTaskIds(userId, limit, offset = 0) {
        return [];
    }
    async getAllUserIndexKeys() {
        return [];
    }
    extractUserIdFromIndexKey(indexKey) {
        return indexKey.replace('user:results:', '');
    }
    async getTaskResultMetadata(taskId) {
        const metadataKey = this.getResultMetadataKey(taskId);
        const metadataStr = await redis_1.RedisService.get(metadataKey);
        return metadataStr ? JSON.parse(metadataStr) : null;
    }
    async getAllTaskResults(limit) {
        return [];
    }
    async sendWebhookNotification(webhookUrl, taskId, result) {
        console.log(`Sending webhook notification for task ${taskId} to ${webhookUrl}`);
    }
    async sendEmailNotification(userId, taskId, result) {
        console.log(`Sending email notification for task ${taskId} to user ${userId}`);
    }
    async sendPushNotification(userId, taskId, result) {
        console.log(`Sending push notification for task ${taskId} to user ${userId}`);
    }
}
exports.TaskResultManager = TaskResultManager;
exports.taskResultManager = TaskResultManager.getInstance();
//# sourceMappingURL=TaskResultManager.js.map