import { Pool } from 'pg';
export declare enum PaymentMethod {
    ALIPAY = "alipay",
    WECHAT = "wechat",
    CREDIT_CARD = "credit_card",
    PAYPAL = "paypal"
}
export declare enum OrderStatus {
    PENDING = "pending",
    PAID = "paid",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export interface PaymentOrder {
    id: string;
    userId: string;
    packageId: string;
    amount: number;
    currency: string;
    creditAmount: number;
    paymentMethod?: PaymentMethod;
    paymentGateway?: string;
    gatewayOrderId?: string;
    status: OrderStatus;
    paidAt?: Date;
    expiredAt: Date;
    failureReason?: string;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreatePaymentOrderData {
    userId: string;
    packageId: string;
    amount: number;
    currency?: string;
    creditAmount: number;
    paymentMethod?: PaymentMethod;
    paymentGateway?: string;
    expiredAt?: Date;
}
export interface UpdatePaymentOrderData {
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    paymentGateway?: string;
    gatewayOrderId?: string;
    paidAt?: Date;
    expiredAt?: Date;
    failureReason?: string;
    retryCount?: number;
}
export declare class PaymentOrderModel {
    private db;
    constructor(db: Pool);
    create(data: CreatePaymentOrderData): Promise<PaymentOrder>;
    getById(id: string): Promise<PaymentOrder | null>;
    getByUserId(userId: string, limit?: number, offset?: number): Promise<PaymentOrder[]>;
    update(id: string, data: UpdatePaymentOrderData): Promise<PaymentOrder | null>;
    markAsPaid(id: string, gatewayOrderId?: string): Promise<PaymentOrder | null>;
    markAsCompleted(id: string): Promise<PaymentOrder | null>;
    markAsFailed(id: string, failureReason: string): Promise<PaymentOrder | null>;
    getExpiredOrders(): Promise<PaymentOrder[]>;
    markExpiredOrders(): Promise<number>;
    getByStatus(status: OrderStatus, limit?: number): Promise<PaymentOrder[]>;
    getRevenueStats(days?: number): Promise<{
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        dailyRevenue: Array<{
            date: string;
            revenue: number;
            orders: number;
        }>;
    }>;
    private mapRowToOrder;
    private camelToSnakeCase;
}
//# sourceMappingURL=PaymentOrder.d.ts.map