import { Pool } from 'pg';
import { RechargePackageModel, RechargePackage, CreateRechargePackageData, UpdateRechargePackageData } from '../models/RechargePackage';
import { PaymentOrderModel, PaymentOrder, CreatePaymentOrderData, PaymentMethod, OrderStatus } from '../models/PaymentOrder';
import { CreditService } from './CreditService';
import { TransactionType } from '../types/credit';
import { PaymentGatewayManager, PaymentRequest } from './PaymentGatewayService';

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

export class PaymentService {
  private packageModel: RechargePackageModel;
  private orderModel: PaymentOrderModel;
  private creditService: CreditService;
  private gatewayManager: PaymentGatewayManager;

  constructor(private db: Pool) {
    this.packageModel = new RechargePackageModel(db);
    this.orderModel = new PaymentOrderModel(db);
    this.creditService = new CreditService(db);
    this.gatewayManager = new PaymentGatewayManager();
  }

  // ============ Package Management ============

  /**
   * Create a new recharge package (Admin only)
   */
  async createPackage(data: CreateRechargePackageData): Promise<RechargePackage> {
    return this.packageModel.create(data);
  }

  /**
   * Get all active packages for users
   */
  async getActivePackages(): Promise<RechargePackage[]> {
    return this.packageModel.getActivePackages();
  }

  /**
   * Get all packages for admin
   */
  async getAllPackages(): Promise<RechargePackage[]> {
    return this.packageModel.getAllPackages();
  }

  /**
   * Get package by ID
   */
  async getPackageById(id: string): Promise<RechargePackage | null> {
    return this.packageModel.getById(id);
  }

  /**
   * Update package (Admin only)
   */
  async updatePackage(id: string, data: UpdateRechargePackageData): Promise<RechargePackage | null> {
    return this.packageModel.update(id, data);
  }

  /**
   * Delete package (Admin only)
   */
  async deletePackage(id: string): Promise<boolean> {
    return this.packageModel.delete(id);
  }

  /**
   * Get package sales statistics
   */
  async getPackageSalesStats() {
    return this.packageModel.getPackageSalesStats();
  }

  // ============ Order Management ============

  /**
   * Create a payment order
   */
  async createOrder(data: CreatePaymentOrderData): Promise<PaymentOrder> {
    // Validate package exists and is active
    const package_ = await this.packageModel.getById(data.packageId);
    if (!package_) {
      throw new Error('Package not found');
    }
    if (!package_.isActive) {
      throw new Error('Package is not active');
    }

    // Validate amount matches package price
    const expectedAmount = package_.priceInCents;
    if (data.amount !== expectedAmount) {
      throw new Error('Amount does not match package price');
    }

    // Validate credit amount matches package
    const expectedCredits = package_.creditAmount + package_.bonusCredits;
    if (data.creditAmount !== expectedCredits) {
      throw new Error('Credit amount does not match package');
    }

    return this.orderModel.create(data);
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<PaymentOrder | null> {
    return this.orderModel.getById(id);
  }

  /**
   * Get user's payment orders
   */
  async getUserOrders(userId: string, limit: number = 50, offset: number = 0): Promise<PaymentOrder[]> {
    return this.orderModel.getByUserId(userId, limit, offset);
  }

  /**
   * Process payment using payment gateway
   */
  async processPayment(orderId: string, paymentMethod: PaymentMethod): Promise<PaymentResult> {
    const order = await this.orderModel.getById(orderId);
    if (!order) {
      return { success: false, orderId, error: 'Order not found' };
    }

    if (order.status !== OrderStatus.PENDING) {
      return { success: false, orderId, error: 'Order is not in pending status' };
    }

    if (new Date() > order.expiredAt) {
      await this.orderModel.update(orderId, { status: OrderStatus.EXPIRED });
      return { success: false, orderId, error: 'Order has expired' };
    }

    try {
      // Get package details for description
      const package_ = await this.packageModel.getById(order.packageId);
      const description = package_ ? `${package_.name} - ${package_.creditAmount} Credits` : 'Credit Purchase';

      // Create payment request
      const paymentRequest: PaymentRequest = {
        orderId,
        amount: order.amount,
        currency: order.currency,
        description,
        webhookUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payment/webhook`,
        returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/success`,
        cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/cancel`
      };

      // Update order status to processing
      await this.orderModel.update(orderId, {
        paymentMethod,
        paymentGateway: this.getGatewayName(paymentMethod),
        status: OrderStatus.PROCESSING
      });

      // Process payment through gateway
      const gatewayResponse = await this.gatewayManager.createPayment(paymentMethod, paymentRequest);

      if (gatewayResponse.success) {
        // Update order with gateway order ID
        await this.orderModel.update(orderId, {
          gatewayOrderId: gatewayResponse.gatewayOrderId
        });

        return {
          success: true,
          orderId,
          gatewayOrderId: gatewayResponse.gatewayOrderId,
          paymentUrl: gatewayResponse.paymentUrl
        };
      } else {
        await this.handlePaymentFailure(orderId, gatewayResponse.error || 'Payment gateway error');
        return {
          success: false,
          orderId,
          error: gatewayResponse.error || 'Payment processing failed'
        };
      }
    } catch (error) {
      await this.handlePaymentFailure(orderId, error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        orderId,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Handle payment webhook from gateway
   */
  async handlePaymentWebhook(paymentMethod: PaymentMethod, headers: Record<string, string>, body: any): Promise<void> {
    // Validate webhook using the appropriate gateway
    const validationResult = await this.gatewayManager.validateWebhook(paymentMethod, headers, body);
    
    if (!validationResult.isValid) {
      throw new Error('Invalid webhook signature');
    }

    if (!validationResult.orderId) {
      throw new Error('Order ID not found in webhook data');
    }

    // Find order by our order ID
    const order = await this.orderModel.getById(validationResult.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (validationResult.status === 'success') {
      await this.handlePaymentSuccess(order.id, order.gatewayOrderId || '');
    } else {
      await this.handlePaymentFailure(order.id, validationResult.failureReason || 'Payment failed');
    }
  }

  /**
   * Handle payment webhook (legacy method for backward compatibility)
   */
  async handlePaymentWebhookLegacy(webhookData: PaymentWebhookData): Promise<void> {
    // Find order by gateway order ID
    const orders = await this.orderModel.getByStatus(OrderStatus.PROCESSING);
    const order = orders.find((o: PaymentOrder) => o.gatewayOrderId === webhookData.gatewayOrderId);
    
    if (!order) {
      throw new Error('Order not found for gateway order ID');
    }

    if (webhookData.status === 'success') {
      await this.handlePaymentSuccess(order.id, webhookData.gatewayOrderId);
    } else {
      await this.handlePaymentFailure(order.id, webhookData.failureReason || 'Payment failed');
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(orderId: string, gatewayOrderId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Mark order as paid
      await this.orderModel.markAsPaid(orderId, gatewayOrderId);
      
      // Get order details
      const order = await this.orderModel.getById(orderId);
      if (!order) {
        throw new Error('Order not found after payment');
      }

      // Add credits to user account
      await this.creditService.addCredits(
        order.userId,
        order.creditAmount,
        TransactionType.PURCHASE,
        `Purchase from package ${order.packageId}`,
        orderId
      );

      // Mark order as completed
      await this.orderModel.markAsCompleted(orderId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(orderId: string, reason: string): Promise<void> {
    await this.orderModel.markAsFailed(orderId, reason);
  }

  /**
   * Get gateway name for payment method
   */
  private getGatewayName(paymentMethod: PaymentMethod): string {
    switch (paymentMethod) {
      case PaymentMethod.ALIPAY:
        return 'alipay';
      case PaymentMethod.WECHAT:
        return 'wechat_pay';
      case PaymentMethod.CREDIT_CARD:
        return 'stripe';
      case PaymentMethod.PAYPAL:
        return 'paypal';
      default:
        return 'unknown';
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, userId: string): Promise<boolean> {
    const order = await this.orderModel.getById(orderId);
    if (!order) {
      return false;
    }

    if (order.userId !== userId) {
      throw new Error('Unauthorized to cancel this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error('Can only cancel pending orders');
    }

    await this.orderModel.update(orderId, { status: OrderStatus.CANCELLED });
    return true;
  }

  /**
   * Mark expired orders (should be called periodically)
   */
  async markExpiredOrders(): Promise<number> {
    return this.orderModel.markExpiredOrders();
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(days: number = 30) {
    return this.orderModel.getRevenueStats(days);
  }

  /**
   * Retry failed payment
   */
  async retryPayment(orderId: string): Promise<PaymentResult> {
    const order = await this.orderModel.getById(orderId);
    if (!order) {
      return { success: false, orderId, error: 'Order not found' };
    }

    if (order.status !== OrderStatus.FAILED) {
      return { success: false, orderId, error: 'Order is not in failed status' };
    }

    if (order.retryCount >= 3) {
      return { success: false, orderId, error: 'Maximum retry attempts exceeded' };
    }

    // Reset order to pending and increment retry count
    await this.orderModel.update(orderId, {
      status: OrderStatus.PENDING,
      retryCount: order.retryCount + 1,
      failureReason: undefined,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000) // New 30-minute expiry
    });

    // Process payment again
    return this.processPayment(orderId, order.paymentMethod!);
  }

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods(): PaymentMethod[] {
    return this.gatewayManager.getAvailablePaymentMethods();
  }

  /**
   * Query payment status from gateway
   */
  async queryPaymentStatus(orderId: string): Promise<PaymentResult> {
    const order = await this.orderModel.getById(orderId);
    if (!order) {
      return { success: false, orderId, error: 'Order not found' };
    }

    if (!order.paymentMethod || !order.gatewayOrderId) {
      return { success: false, orderId, error: 'Payment not initiated' };
    }

    try {
      const gatewayResponse = await this.gatewayManager.queryPaymentStatus(
        order.paymentMethod,
        order.gatewayOrderId
      );

      return {
        success: gatewayResponse.success,
        orderId,
        gatewayOrderId: order.gatewayOrderId,
        error: gatewayResponse.error
      };
    } catch (error) {
      return {
        success: false,
        orderId,
        error: error instanceof Error ? error.message : 'Failed to query payment status'
      };
    }
  }

  /**
   * Refund a completed payment
   */
  async refundPayment(orderId: string, amount?: number): Promise<PaymentResult> {
    const order = await this.orderModel.getById(orderId);
    if (!order) {
      return { success: false, orderId, error: 'Order not found' };
    }

    if (order.status !== OrderStatus.COMPLETED) {
      return { success: false, orderId, error: 'Order is not completed' };
    }

    if (!order.paymentMethod || !order.gatewayOrderId) {
      return { success: false, orderId, error: 'Payment information not found' };
    }

    try {
      const refundAmount = amount || order.amount;
      const gatewayResponse = await this.gatewayManager.refundPayment(
        order.paymentMethod,
        order.gatewayOrderId,
        refundAmount
      );

      if (gatewayResponse.success) {
        // Deduct credits from user account
        await this.creditService.consumeCredits(
          order.userId,
          'refund',
          0,
          `Refund for order ${orderId}`,
          orderId
        );

        return {
          success: true,
          orderId,
          gatewayOrderId: gatewayResponse.gatewayOrderId
        };
      } else {
        return {
          success: false,
          orderId,
          error: gatewayResponse.error || 'Refund failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        orderId,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }
}
