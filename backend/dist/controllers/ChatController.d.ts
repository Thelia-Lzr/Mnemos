import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ChatController {
    private chatService;
    private aiFunctionService;
    constructor();
    sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    uploadMaterial(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    sendMessageAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    uploadMaterialAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    executeFunction(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    executeFunctionAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    parseIntent(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAvailableFunctions(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    clearChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    searchMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=ChatController.d.ts.map