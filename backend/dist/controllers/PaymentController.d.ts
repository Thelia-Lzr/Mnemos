import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class PaymentController {
    private paymentService;
    private creditService;
    constructor();
    getPackages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    confirmPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getOrderStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    cancelOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    retryPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    handleWebhook(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPaymentMethods(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    queryPaymentStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=PaymentController.d.ts.map