"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewayManager = exports.StripeGateway = exports.WeChatPayGateway = exports.AlipayGateway = exports.MockPaymentGateway = exports.BasePaymentGateway = void 0;
const PaymentOrder_1 = require("../models/PaymentOrder");
class BasePaymentGateway {
    constructor(config) {
        this.config = config;
    }
}
exports.BasePaymentGateway = BasePaymentGateway;
class MockPaymentGateway extends BasePaymentGateway {
    async createPayment(request) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const gatewayOrderId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const isSuccess = Math.random() > 0.1;
        if (isSuccess) {
            return {
                success: true,
                gatewayOrderId,
                paymentUrl: `https://mock-gateway.com/pay/${gatewayOrderId}`,
                qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`
            };
        }
        else {
            return {
                success: false,
                error: 'Payment gateway temporarily unavailable',
                errorCode: 'GATEWAY_ERROR'
            };
        }
    }
    async validateWebhook(headers, body) {
        const signature = headers['x-mock-signature'];
        const expectedSignature = this.generateMockSignature(body);
        if (signature !== expectedSignature) {
            return { isValid: false };
        }
        return {
            isValid: true,
            orderId: body.orderId,
            status: body.status,
            amount: body.amount,
            currency: body.currency,
            failureReason: body.failureReason
        };
    }
    async queryPaymentStatus(gatewayOrderId) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            success: true,
            gatewayOrderId
        };
    }
    async refundPayment(gatewayOrderId, amount) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            success: true,
            gatewayOrderId: `refund_${gatewayOrderId}`
        };
    }
    generateMockSignature(body) {
        return `mock_sig_${JSON.stringify(body).length}`;
    }
}
exports.MockPaymentGateway = MockPaymentGateway;
class AlipayGateway extends BasePaymentGateway {
    async createPayment(request) {
        try {
            const params = {
                app_id: this.config.apiKey,
                method: 'alipay.trade.page.pay',
                charset: 'utf-8',
                sign_type: 'RSA2',
                timestamp: new Date().toISOString(),
                version: '1.0',
                biz_content: JSON.stringify({
                    out_trade_no: request.orderId,
                    total_amount: (request.amount / 100).toFixed(2),
                    subject: request.description,
                    product_code: 'FAST_INSTANT_TRADE_PAY'
                })
            };
            return {
                success: true,
                gatewayOrderId: `alipay_${request.orderId}`,
                paymentUrl: `https://openapi.alipay.com/gateway.do?${new URLSearchParams(params).toString()}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Alipay payment failed',
                errorCode: 'ALIPAY_ERROR'
            };
        }
    }
    async validateWebhook(headers, body) {
        return {
            isValid: true,
            orderId: body.out_trade_no,
            status: body.trade_status === 'TRADE_SUCCESS' ? 'success' : 'failed',
            amount: parseFloat(body.total_amount) * 100,
            currency: 'CNY'
        };
    }
    async queryPaymentStatus(gatewayOrderId) {
        return { success: true, gatewayOrderId };
    }
    async refundPayment(gatewayOrderId, amount) {
        return { success: true, gatewayOrderId: `refund_${gatewayOrderId}` };
    }
}
exports.AlipayGateway = AlipayGateway;
class WeChatPayGateway extends BasePaymentGateway {
    async createPayment(request) {
        try {
            const params = {
                appid: this.config.apiKey,
                mch_id: 'your_merchant_id',
                nonce_str: Math.random().toString(36).substr(2, 15),
                body: request.description,
                out_trade_no: request.orderId,
                total_fee: request.amount.toString(),
                spbill_create_ip: '127.0.0.1',
                notify_url: request.webhookUrl || 'https://your-domain.com/api/payment/webhook',
                trade_type: 'NATIVE'
            };
            return {
                success: true,
                gatewayOrderId: `wechat_${request.orderId}`,
                qrCode: `weixin://wxpay/bizpayurl?pr=${Math.random().toString(36).substr(2, 20)}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'WeChat Pay payment failed',
                errorCode: 'WECHAT_ERROR'
            };
        }
    }
    async validateWebhook(headers, body) {
        return {
            isValid: true,
            orderId: body.out_trade_no,
            status: body.result_code === 'SUCCESS' ? 'success' : 'failed',
            amount: parseInt(body.total_fee),
            currency: 'CNY'
        };
    }
    async queryPaymentStatus(gatewayOrderId) {
        return { success: true, gatewayOrderId };
    }
    async refundPayment(gatewayOrderId, amount) {
        return { success: true, gatewayOrderId: `refund_${gatewayOrderId}` };
    }
}
exports.WeChatPayGateway = WeChatPayGateway;
class StripeGateway extends BasePaymentGateway {
    async createPayment(request) {
        try {
            return {
                success: true,
                gatewayOrderId: `pi_${Math.random().toString(36).substr(2, 20)}`,
                paymentUrl: `https://checkout.stripe.com/pay/${request.orderId}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Stripe payment failed',
                errorCode: 'STRIPE_ERROR'
            };
        }
    }
    async validateWebhook(headers, body) {
        return {
            isValid: true,
            orderId: body.data?.object?.metadata?.orderId,
            status: body.type === 'payment_intent.succeeded' ? 'success' : 'failed',
            amount: body.data?.object?.amount,
            currency: body.data?.object?.currency?.toUpperCase()
        };
    }
    async queryPaymentStatus(gatewayOrderId) {
        return { success: true, gatewayOrderId };
    }
    async refundPayment(gatewayOrderId, amount) {
        return { success: true, gatewayOrderId: `re_${gatewayOrderId}` };
    }
}
exports.StripeGateway = StripeGateway;
class PaymentGatewayManager {
    constructor() {
        this.gateways = new Map();
        this.initializeGateways();
    }
    initializeGateways() {
        const mockConfig = {
            name: 'Mock Gateway',
            apiKey: process.env.MOCK_API_KEY || 'mock_key',
            secretKey: process.env.MOCK_SECRET_KEY || 'mock_secret',
            webhookSecret: process.env.MOCK_WEBHOOK_SECRET || 'mock_webhook_secret',
            baseUrl: 'https://mock-gateway.com',
            enabled: true
        };
        const alipayConfig = {
            name: 'Alipay',
            apiKey: process.env.ALIPAY_APP_ID || '',
            secretKey: process.env.ALIPAY_PRIVATE_KEY || '',
            webhookSecret: process.env.ALIPAY_PUBLIC_KEY || '',
            baseUrl: 'https://openapi.alipay.com/gateway.do',
            enabled: !!process.env.ALIPAY_APP_ID
        };
        const wechatConfig = {
            name: 'WeChat Pay',
            apiKey: process.env.WECHAT_APP_ID || '',
            secretKey: process.env.WECHAT_API_KEY || '',
            webhookSecret: process.env.WECHAT_API_KEY || '',
            baseUrl: 'https://api.mch.weixin.qq.com',
            enabled: !!process.env.WECHAT_APP_ID
        };
        const stripeConfig = {
            name: 'Stripe',
            apiKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
            secretKey: process.env.STRIPE_SECRET_KEY || '',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
            baseUrl: 'https://api.stripe.com',
            enabled: !!process.env.STRIPE_SECRET_KEY
        };
        this.gateways.set(PaymentOrder_1.PaymentMethod.ALIPAY, new AlipayGateway(alipayConfig));
        this.gateways.set(PaymentOrder_1.PaymentMethod.WECHAT, new WeChatPayGateway(wechatConfig));
        this.gateways.set(PaymentOrder_1.PaymentMethod.CREDIT_CARD, new StripeGateway(stripeConfig));
        this.gateways.set(PaymentOrder_1.PaymentMethod.PAYPAL, new MockPaymentGateway(mockConfig));
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
            this.gateways.set(PaymentOrder_1.PaymentMethod.ALIPAY, new MockPaymentGateway(mockConfig));
            this.gateways.set(PaymentOrder_1.PaymentMethod.WECHAT, new MockPaymentGateway(mockConfig));
            this.gateways.set(PaymentOrder_1.PaymentMethod.CREDIT_CARD, new MockPaymentGateway(mockConfig));
        }
    }
    getGateway(paymentMethod) {
        return this.gateways.get(paymentMethod) || null;
    }
    getAvailablePaymentMethods() {
        return Array.from(this.gateways.keys());
    }
    async createPayment(paymentMethod, request) {
        const gateway = this.getGateway(paymentMethod);
        if (!gateway) {
            return {
                success: false,
                error: `Payment method ${paymentMethod} is not supported`,
                errorCode: 'UNSUPPORTED_PAYMENT_METHOD'
            };
        }
        return gateway.createPayment(request);
    }
    async validateWebhook(paymentMethod, headers, body) {
        const gateway = this.getGateway(paymentMethod);
        if (!gateway) {
            return { isValid: false };
        }
        return gateway.validateWebhook(headers, body);
    }
    async queryPaymentStatus(paymentMethod, gatewayOrderId) {
        const gateway = this.getGateway(paymentMethod);
        if (!gateway) {
            return {
                success: false,
                error: `Payment method ${paymentMethod} is not supported`,
                errorCode: 'UNSUPPORTED_PAYMENT_METHOD'
            };
        }
        return gateway.queryPaymentStatus(gatewayOrderId);
    }
    async refundPayment(paymentMethod, gatewayOrderId, amount) {
        const gateway = this.getGateway(paymentMethod);
        if (!gateway) {
            return {
                success: false,
                error: `Payment method ${paymentMethod} is not supported`,
                errorCode: 'UNSUPPORTED_PAYMENT_METHOD'
            };
        }
        return gateway.refundPayment(gatewayOrderId, amount);
    }
}
exports.PaymentGatewayManager = PaymentGatewayManager;
//# sourceMappingURL=PaymentGatewayService.js.map