import { Pool } from 'pg';
import { RechargePackage, CreateRechargePackageData, UpdateRechargePackageData } from '../models/RechargePackage';
import { PaymentOrder, CreatePaymentOrderData, PaymentMethod } from '../models/PaymentOrder';
export interface PaymentGatewayConfig {
    name: string;
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
    baseUrl: string;
}
export interface PaymentResult {
    success: boolean;
    orderId: string;
    gatewayOrderId?: string;
    paymentUrl?: string;
    error?: string;
}
export interface PaymentWebhookData {
    gatewayOrderId: string;
    status: 'success' | 'failed';
    amount: number;
    currency: string;
    failureReason?: string;
}
export declare class PaymentService {
    private db;
    private packageModel;
    private orderModel;
    private creditService;
    private gatewayManager;
    constructor(db: Pool);
    createPackage(data: CreateRechargePackageData): Promise<RechargePackage>;
    getActivePackages(): Promise<RechargePackage[]>;
    getAllPackages(): Promise<RechargePackage[]>;
    getPackageById(id: string): Promise<RechargePackage | null>;
    updatePackage(id: string, data: UpdateRechargePackageData): Promise<RechargePackage | null>;
    deletePackage(id: string): Promise<boolean>;
    getPackageSalesStats(): Promise<{
        packageId: string;
        packageName: string;
        totalSales: number;
        totalRevenue: number;
        averageOrderValue: number;
    }[]>;
    createOrder(data: CreatePaymentOrderData): Promise<PaymentOrder>;
    getOrderById(id: string): Promise<PaymentOrder | null>;
    getUserOrders(userId: string, limit?: number, offset?: number): Promise<PaymentOrder[]>;
    processPayment(orderId: string, paymentMethod: PaymentMethod): Promise<PaymentResult>;
    handlePaymentWebhook(paymentMethod: PaymentMethod, headers: Record<string, string>, body: any): Promise<void>;
    handlePaymentWebhookLegacy(webhookData: PaymentWebhookData): Promise<void>;
    private handlePaymentSuccess;
    private handlePaymentFailure;
    private getGatewayName;
    cancelOrder(orderId: string, userId: string): Promise<boolean>;
    markExpiredOrders(): Promise<number>;
    getRevenueStats(days?: number): Promise<{
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        dailyRevenue: {
            date: string;
            revenue: number;
            orders: number;
        }[];
    }>;
    retryPayment(orderId: string): Promise<PaymentResult>;
    getAvailablePaymentMethods(): PaymentMethod[];
    queryPaymentStatus(orderId: string): Promise<PaymentResult>;
    refundPayment(orderId: string, amount?: number): Promise<PaymentResult>;
}
//# sourceMappingURL=PaymentService.d.ts.map