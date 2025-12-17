/// <reference types="node" />
import { Request, Response, NextFunction } from 'express';
export declare const generalRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const adminRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse<import("http").IncomingMessage>, next: (err?: unknown) => void) => void;
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const ipSecurityCheck: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateAPIKey: (req: Request, res: Response, next: NextFunction) => void;
export declare const sessionTimeout: (req: Request & {
    user?: any;
    session?: any;
}, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map