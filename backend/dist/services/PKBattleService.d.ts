import { Language } from '../models/PracticeGroup';
import { Server } from 'socket.io';
export interface PKBattle {
    id: string;
    player1Id: string;
    player2Id: string;
    language: Language;
    practiceGroupId?: string;
    startTime: Date;
    endTime?: Date;
    player1Score: number;
    player2Score: number;
    player1Time: number;
    player2Time: number;
    winnerId?: string;
    player1MMRChange: number;
    player2MMRChange: number;
    status: BattleStatus;
    createdAt: Date;
}
export interface BattleAnswer {
    battleId: string;
    userId: string;
    questionId: string;
    answer: string;
    isCorrect: boolean;
    timeSpent: number;
    answeredAt: Date;
}
export interface BattleProgress {
    battleId: string;
    player1Progress: PlayerProgress;
    player2Progress: PlayerProgress;
}
export interface PlayerProgress {
    userId: string;
    currentQuestion: number;
    correctAnswers: number;
    totalTime: number;
    isFinished: boolean;
}
export declare enum BattleStatus {
    WAITING = "waiting",
    GENERATING_PRACTICE = "generating_practice",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    TIMEOUT = "timeout"
}
export declare class PKBattleService {
    private practiceService;
    private rewardService;
    private userCapabilityService;
    private creditService;
    private asyncTaskManager;
    private io;
    private readonly BATTLE_TIMEOUT_MINUTES;
    constructor();
    setSocketIO(io: Server): void;
    startBattle(battleId: string): Promise<PKBattle>;
    private generateBattlePractice;
    private getUserCapability;
    private calculateAverageLevel;
    submitAnswer(battleId: string, userId: string, questionId: string, answer: string): Promise<BattleAnswer>;
    private calculateTimeSpent;
    private updateBattleProgress;
    private getPlayerProgress;
    private finishBattle;
    private determineWinner;
    getBattle(battleId: string): Promise<PKBattle | null>;
    updateBattleStatus(battleId: string, status: BattleStatus): Promise<void>;
    getBattleHistory(userId: string, limit?: number): Promise<PKBattle[]>;
    private mapBattleFromDB;
    joinBattleRoom(socketId: string, battleId: string): void;
    leaveBattleRoom(socketId: string, battleId: string): void;
}
//# sourceMappingURL=PKBattleService.d.ts.map