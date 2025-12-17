export declare class PKSchedulerService {
    private matchingService;
    private rewardService;
    private cleanupInterval;
    private readonly CLEANUP_INTERVAL_MS;
    constructor();
    start(): void;
    stop(): void;
    private performCleanup;
}
export declare const pkScheduler: PKSchedulerService;
//# sourceMappingURL=PKSchedulerService.d.ts.map