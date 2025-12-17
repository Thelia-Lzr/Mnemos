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

export abstract class BasePaymentGateway {
  protected config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  abstract createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  abstract validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult>;
  abstract queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse>;
  abstract refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse>;
}

/**
 * Mock Payment Gateway for testing
 */
export class MockPaymentGateway extends BasePaymentGateway {
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const gatewayOrderId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock 90% success rate
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      return {
        success: true,
        gatewayOrderId,
        paymentUrl: `https://mock-gateway.com/pay/${gatewayOrderId}`,
        qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`
      };
    } else {
      return {
        success: false,
        error: 'Payment gateway temporarily unavailable',
        errorCode: 'GATEWAY_ERROR'
      };
    }
  }

  async validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult> {
    // Mock webhook validation
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

  async queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse> {
    // Mock status query
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      success: true,
      gatewayOrderId
    };
  }

  async refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse> {
    // Mock refund
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      gatewayOrderId: `refund_${gatewayOrderId}`
    };
  }

  private generateMockSignature(body: any): string {
    // Mock signature generation
    return `mock_sig_${JSON.stringify(body).length}`;
  }
}

/**
 * Alipay Gateway (placeholder implementation)
 */
export class AlipayGateway extends BasePaymentGateway {
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // In a real implementation, you would:
      // 1. Format the request according to Alipay API
      // 2. Sign the request with your private key
      // 3. Make HTTP request to Alipay API
      // 4. Parse and return the response

      const params = {
        app_id: this.config.apiKey,
        method: 'alipay.trade.page.pay',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString(),
        version: '1.0',
        biz_content: JSON.stringify({
          out_trade_no: request.orderId,
          total_amount: (request.amount / 100).toFixed(2), // Convert cents to yuan
          subject: request.description,
          product_code: 'FAST_INSTANT_TRADE_PAY'
        })
      };

      // Mock response for now
      return {
        success: true,
        gatewayOrderId: `alipay_${request.orderId}`,
        paymentUrl: `https://openapi.alipay.com/gateway.do?${new URLSearchParams(params).toString()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Alipay payment failed',
        errorCode: 'ALIPAY_ERROR'
      };
    }
  }

  async validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult> {
    // In a real implementation, you would validate the signature using Alipay's public key
    // For now, return a mock validation
    return {
      isValid: true,
      orderId: body.out_trade_no,
      status: body.trade_status === 'TRADE_SUCCESS' ? 'success' : 'failed',
      amount: parseFloat(body.total_amount) * 100, // Convert yuan to cents
      currency: 'CNY'
    };
  }

  async queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse> {
    // Mock implementation
    return { success: true, gatewayOrderId };
  }

  async refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse> {
    // Mock implementation
    return { success: true, gatewayOrderId: `refund_${gatewayOrderId}` };
  }
}

/**
 * WeChat Pay Gateway (placeholder implementation)
 */
export class WeChatPayGateway extends BasePaymentGateway {
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // In a real implementation, you would:
      // 1. Format the request according to WeChat Pay API
      // 2. Sign the request with your API key
      // 3. Make HTTP request to WeChat Pay API
      // 4. Parse and return the response

      const params = {
        appid: this.config.apiKey,
        mch_id: 'your_merchant_id',
        nonce_str: Math.random().toString(36).substr(2, 15),
        body: request.description,
        out_trade_no: request.orderId,
        total_fee: request.amount.toString(), // WeChat Pay uses cents
        spbill_create_ip: '127.0.0.1',
        notify_url: request.webhookUrl || 'https://your-domain.com/api/payment/webhook',
        trade_type: 'NATIVE' // QR code payment
      };

      // Mock response for now
      return {
        success: true,
        gatewayOrderId: `wechat_${request.orderId}`,
        qrCode: `weixin://wxpay/bizpayurl?pr=${Math.random().toString(36).substr(2, 20)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'WeChat Pay payment failed',
        errorCode: 'WECHAT_ERROR'
      };
    }
  }

  async validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult> {
    // In a real implementation, you would validate the signature using WeChat Pay's algorithm
    return {
      isValid: true,
      orderId: body.out_trade_no,
      status: body.result_code === 'SUCCESS' ? 'success' : 'failed',
      amount: parseInt(body.total_fee),
      currency: 'CNY'
    };
  }

  async queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse> {
    return { success: true, gatewayOrderId };
  }

  async refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse> {
    return { success: true, gatewayOrderId: `refund_${gatewayOrderId}` };
  }
}

/**
 * Stripe Gateway (placeholder implementation)
 */
export class StripeGateway extends BasePaymentGateway {
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // In a real implementation, you would use the Stripe SDK
      // const stripe = require('stripe')(this.config.secretKey);
      // const paymentIntent = await stripe.paymentIntents.create({...});

      // Mock response for now
      return {
        success: true,
        gatewayOrderId: `pi_${Math.random().toString(36).substr(2, 20)}`,
        paymentUrl: `https://checkout.stripe.com/pay/${request.orderId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe payment failed',
        errorCode: 'STRIPE_ERROR'
      };
    }
  }

  async validateWebhook(headers: Record<string, string>, body: any): Promise<WebhookValidationResult> {
    // In a real implementation, you would use Stripe's webhook signature validation
    return {
      isValid: true,
      orderId: body.data?.object?.metadata?.orderId,
      status: body.type === 'payment_intent.succeeded' ? 'success' : 'failed',
      amount: body.data?.object?.amount,
      currency: body.data?.object?.currency?.toUpperCase()
    };
  }

  async queryPaymentStatus(gatewayOrderId: string): Promise<PaymentResponse> {
    return { success: true, gatewayOrderId };
  }

  async refundPayment(gatewayOrderId: string, amount?: number): Promise<PaymentResponse> {
    return { success: true, gatewayOrderId: `re_${gatewayOrderId}` };
  }
}

/**
 * Payment Gateway Manager
 */
export class PaymentGatewayManager {
  private gateways: Map<PaymentMethod, BasePaymentGateway> = new Map();

  constructor() {
    this.initializeGateways();
  }

  private initializeGateways(): void {
    // Initialize gateways with configuration
    // In production, these would come from environment variables or config files
    
    const mockConfig: PaymentGatewayConfig = {
      name: 'Mock Gateway',
      apiKey: process.env.MOCK_API_KEY || 'mock_key',
      secretKey: process.env.MOCK_SECRET_KEY || 'mock_secret',
      webhookSecret: process.env.MOCK_WEBHOOK_SECRET || 'mock_webhook_secret',
      baseUrl: 'https://mock-gateway.com',
      enabled: true
    };

    const alipayConfig: PaymentGatewayConfig = {
      name: 'Alipay',
      apiKey: process.env.ALIPAY_APP_ID || '',
      secretKey: process.env.ALIPAY_PRIVATE_KEY || '',
      webhookSecret: process.env.ALIPAY_PUBLIC_KEY || '',
      baseUrl: 'https://openapi.alipay.com/gateway.do',
      enabled: !!process.env.ALIPAY_APP_ID
    };

    const wechatConfig: PaymentGatewayConfig = {
      name: 'WeChat Pay',
      apiKey: process.env.WECHAT_APP_ID || '',
      secretKey: process.env.WECHAT_API_KEY || '',
      webhookSecret: process.env.WECHAT_API_KEY || '',
      baseUrl: 'https://api.mch.weixin.qq.com',
      enabled: !!process.env.WECHAT_APP_ID
    };

    const stripeConfig: PaymentGatewayConfig = {
      name: 'Stripe',
      apiKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      baseUrl: 'https://api.stripe.com',
      enabled: !!process.env.STRIPE_SECRET_KEY
    };

    // Register gateways
    this.gateways.set(PaymentMethod.ALIPAY, new AlipayGateway(alipayConfig));
    this.gateways.set(PaymentMethod.WECHAT, new WeChatPayGateway(wechatConfig));
    this.gateways.set(PaymentMethod.CREDIT_CARD, new StripeGateway(stripeConfig));
    this.gateways.set(PaymentMethod.PAYPAL, new MockPaymentGateway(mockConfig)); // Use mock for PayPal for now

    // Always have mock gateway available for testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      this.gateways.set(PaymentMethod.ALIPAY, new MockPaymentGateway(mockConfig));
      this.gateways.set(PaymentMethod.WECHAT, new MockPaymentGateway(mockConfig));
      this.gateways.set(PaymentMethod.CREDIT_CARD, new MockPaymentGateway(mockConfig));
    }
  }

  getGateway(paymentMethod: PaymentMethod): BasePaymentGateway | null {
    return this.gateways.get(paymentMethod) || null;
  }

  getAvailablePaymentMethods(): PaymentMethod[] {
    return Array.from(this.gateways.keys());
  }

  async createPayment(paymentMethod: PaymentMethod, request: PaymentRequest): Promise<PaymentResponse> {
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

  async validateWebhook(paymentMethod: PaymentMethod, headers: Record<string, string>, body: any): Promise<WebhookValidationResult> {
    const gateway = this.getGateway(paymentMethod);
    if (!gateway) {
      return { isValid: false };
    }

    return gateway.validateWebhook(headers, body);
  }

  async queryPaymentStatus(paymentMethod: PaymentMethod, gatewayOrderId: string): Promise<PaymentResponse> {
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

  async refundPayment(paymentMethod: PaymentMethod, gatewayOrderId: string, amount?: number): Promise<PaymentResponse> {
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
