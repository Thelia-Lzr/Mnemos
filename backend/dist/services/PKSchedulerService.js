"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pkScheduler = exports.PKSchedulerService = void 0;
const PKMatchingService_1 = require("./PKMatchingService");
const PKRewardService_1 = require("./PKRewardService");
class PKSchedulerService {
    constructor() {
        this.cleanupInterval = null;
        this.CLEANUP_INTERVAL_MS = 60000;
        this.matchingService = new PKMatchingService_1.PKMatchingService();
        this.rewardService = new PKRewardService_1.PKRewardService();
    }
    start() {
        if (this.cleanupInterval) {
            return;
        }
        console.log('Starting PK scheduler service...');
        this.performCleanup();
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.CLEANUP_INTERVAL_MS);
    }
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('PK scheduler service stopped');
        }
    }
    async performCleanup() {
        try {
            await this.matchingService.cleanupExpiredRequests();
            await this.rewardService.processUnprocessedBattles();
        }
        catch (error) {
            console.error('Error during PK cleanup:', error);
        }
    }
}
exports.PKSchedulerService = PKSchedulerService;
exports.pkScheduler = new PKSchedulerService();
//# sourceMappingURL=PKSchedulerService.js.map