import winston from 'winston';
export declare const logger: winston.Logger;
export declare const logSecurityEvent: (event: string, details: any) => void;
export declare const logAPIUsage: (endpoint: string, userId: string, duration: number) => void;
export declare const logCreditTransaction: (userId: string, amount: number, type: string, balance: number) => void;
//# sourceMappingURL=logger.d.ts.map