import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PaymentService } from '../services/PaymentService';
import { PaymentMethod } from '../models/PaymentOrder';
import { CreditService } from '../services/CreditService';
import { pool } from '../config/database';

export class PaymentController {
  private paymentService: PaymentService;
  private creditService: CreditService;

  constructor() {
    this.paymentService = new PaymentService(pool);
    this.creditService = new CreditService(pool);
  }

  /**
   * Get all active recharge packages
   */
  async getPackages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const packages = await this.paymentService.getActivePackages();
      res.status(200).json({
        success: true,
        data: packages
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific package by ID
   */
  async getPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const package_ = await this.paymentService.getPackageById(id);
      
      if (!package_) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: package_
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a payment order
   */
  async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { packageId, paymentMethod } = req.body;

      if (!packageId) {
        res.status(400).json({
          success: false,
          message: 'Package ID is required'
        });
        return;
      }

      // Get package details
      const package_ = await this.paymentService.getPackageById(packageId);
      if (!package_) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      if (!package_.isActive) {
        res.status(400).json({
          success: false,
          message: 'Package is not available'
        });
        return;
      }

      // Create order
      const order = await this.paymentService.createOrder({
        userId,
        packageId,
        amount: package_.priceInCents,
        currency: package_.currency,
        creditAmount: package_.creditAmount + package_.bonusCredits,
        paymentMethod: paymentMethod as PaymentMethod
      });

      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process payment for an order
   */
  async confirmPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, paymentMethod } = req.body;

      if (!orderId || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: 'Order ID and payment method are required'
        });
        return;
      }

      // Verify order belongs to user
      const order = await this.paymentService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      if (order.userId !== req.user!.id) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized to access this order'
        });
        return;
      }

      // Process payment
      const result = await this.paymentService.processPayment(orderId, paymentMethod);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
          data: result
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await this.paymentService.getOrderById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      if (order.userId !== req.user!.id) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized to access this order'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's payment transactions (credit transactions)
   */
  async getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit = 50, offset = 0 } = req.query;

      // Get payment orders
      const orders = await this.paymentService.getUserOrders(
        userId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );

      // Get credit transactions
      const creditStats = await this.creditService.getCreditUsageStats(userId, 30);

      res.status(200).json({
        success: true,
        data: {
          orders,
          creditTransactions: creditStats.recentTransactions,
          summary: {
            totalOrders: orders.length,
            currentBalance: (await this.creditService.getUserCredits(userId))?.currentBalance || 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific transaction details
   */
  async getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;
      
      // Try to find as payment order first
      const order = await this.paymentService.getOrderById(transactionId);
      if (order && order.userId === req.user!.id) {
        res.status(200).json({
          success: true,
          data: {
            type: 'payment_order',
            transaction: order
          }
        });
        return;
      }

      // If not found as order, it might be a credit transaction ID
      // For now, return not found as we don't have direct credit transaction lookup
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user!.id;

      const success = await this.paymentService.cancelOrder(orderId, userId);
      
      if (success) {
        res.status(200).json({
          success: true,
          message: 'Order cancelled successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to cancel order'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      
      // Verify order belongs to user
      const order = await this.paymentService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      if (order.userId !== req.user!.id) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized to access this order'
        });
        return;
      }

      const result = await this.paymentService.retryPayment(orderId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
          data: result
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle payment webhook (for external payment gateways)
   */
  async handleWebhook(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentMethod } = req.query;
      const headers = req.headers as Record<string, string>;
      const body = req.body;

      if (!paymentMethod) {
        res.status(400).json({
          success: false,
          message: 'Payment method is required in query parameters'
        });
        return;
      }

      await this.paymentService.handlePaymentWebhook(
        paymentMethod as PaymentMethod,
        headers,
        body
      );
      
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Webhook processing failed'
      });
    }
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const methods = this.paymentService.getAvailablePaymentMethods();
      
      res.status(200).json({
        success: true,
        data: methods
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Query payment status from gateway
   */
  async queryPaymentStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      
      // Verify order belongs to user
      const order = await this.paymentService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      if (order.userId !== req.user!.id) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized to access this order'
        });
        return;
      }

      const result = await this.paymentService.queryPaymentStatus(orderId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
