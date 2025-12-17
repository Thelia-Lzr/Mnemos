import { PaymentMethod } from '../models/PaymentOrder';
export interface PaymentGatewayConfig {
    name: string;
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
    baseUrl: string;
    enabled: boolean;
}
export interface PaymentRequest {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
    returnUrl?: string;
    cancelUrl?: string;
    webhookUrl?: string;
    customerInfo?: {
        email?: string;
        name?: string;
        phone?: string;
    };
}
export interface PaymentResponse {
    success: boolean;
    gatewayOrderId?: string;
    paymentUrl?: string;
    qrCode?: string;
    error?: string;
    errorCode?: string;
}
export interface WebhookValidationResult {
    isValid: boolean;
    orderId?: string;
    status?: 'success' | 'failed' | 'pending';
    amount?: number;
    currency?: string;
    failureReason?: string;
}
export declare abstract class BasePaymentGateway {
    protected config: PaymentGatewayConfig;
    constructor(config: PaymentGatewayConfig);
    abstract createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    abstract validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult>;
    abstract queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse>;
    abstract refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse>;
}
export declare class MockPaymentGateway extends BasePaymentGateway {
    createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult>;
    queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse>;
    refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse>;
    private generateMockSignature;
}
export declare class AlipayGateway extends BasePaymentGateway {
    createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult>;
    queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse>;
    refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse>;
}
export declare class WeChatPayGateway extends BasePaymentGateway {
    createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult>;
    queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse>;
    refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse>;
}
export declare class StripeGateway extends BasePaymentGateway {
    createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult>;
    queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse>;
    refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse>;
}
export declare class PaymentGatewayManager {
    private gateways;
    constructor();
    private initializeGateways;
    getGateway(paymentMethod: PaymentMethod): BasePaymentGateway | null;
    getAvailablePaymentMethods(): PaymentMethod[];
    createPayment(paymentMethod: PaymentMethod, request: PaymentRequest): Promise<PaymentResponse>;
    validateWebhook(paymentMethod: PaymentMethod, headers: Record<string, string>, body: any): Promise<WebhookValidationResult>;
    queryPaymentStatus(paymentMethod: PaymentMethod, gatewayOrderId: string): Promise<PaymentResponse>;
    refundPayment(paymentMethod: PaymentMethod, gatewayOrderId: string, amount?: number): Promise<PaymentResponse>;
}
//# sourceMappingURL=PaymentGatewayService.d.ts.map