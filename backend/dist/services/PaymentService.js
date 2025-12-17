"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const RechargePackage_1 = require("../models/RechargePackage");
const PaymentOrder_1 = require("../models/PaymentOrder");
const CreditService_1 = require("./CreditService");
const credit_1 = require("../types/credit");
const PaymentGatewayService_1 = require("./PaymentGatewayService");
class PaymentService {
    constructor(db) {
        this.db = db;
        this.packageModel = new RechargePackage_1.RechargePackageModel(db);
        this.orderModel = new PaymentOrder_1.PaymentOrderModel(db);
        this.creditService = new CreditService_1.CreditService(db);
        this.gatewayManager = new PaymentGatewayService_1.PaymentGatewayManager();
    }
    async createPackage(data) {
        return this.packageModel.create(data);
    }
    async getActivePackages() {
        return this.packageModel.getActivePackages();
    }
    async getAllPackages() {
        return this.packageModel.getAllPackages();
    }
    async getPackageById(id) {
        return this.packageModel.getById(id);
    }
    async updatePackage(id, data) {
        return this.packageModel.update(id, data);
    }
    async deletePackage(id) {
        return this.packageModel.delete(id);
    }
    async getPackageSalesStats() {
        return this.packageModel.getPackageSalesStats();
    }
    async createOrder(data) {
        const package_ = await this.packageModel.getById(data.packageId);
        if (!package_) {
            throw new Error('Package not found');
        }
        if (!package_.isActive) {
            throw new Error('Package is not active');
        }
        const expectedAmount = package_.priceInCents;
        if (data.amount !== expectedAmount) {
            throw new Error('Amount does not match package price');
        }
        const expectedCredits = package_.creditAmount + package_.bonusCredits;
        if (data.creditAmount !== expectedCredits) {
            throw new Error('Credit amount does not match package');
        }
        return this.orderModel.create(data);
    }
    async getOrderById(id) {
        return this.orderModel.getById(id);
    }
    async getUserOrders(userId, limit = 50, offset = 0) {
        return this.orderModel.getByUserId(userId, limit, offset);
    }
    async processPayment(orderId, paymentMethod) {
        const order = await this.orderModel.getById(orderId);
        if (!order) {
            return { success: false, orderId, error: 'Order not found' };
        }
        if (order.status !== PaymentOrder_1.OrderStatus.PENDING) {
            return { success: false, orderId, error: 'Order is not in pending status' };
        }
        if (new Date() > order.expiredAt) {
            await this.orderModel.update(orderId, { status: PaymentOrder_1.OrderStatus.EXPIRED });
            return { success: false, orderId, error: 'Order has expired' };
        }
        try {
            const package_ = await this.packageModel.getById(order.packageId);
            const description = package_ ? `${package_.name} - ${package_.creditAmount} Credits` : 'Credit Purchase';
            const paymentRequest = {
                orderId,
                amount: order.amount,
                currency: order.currency,
                description,
                webhookUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payment/webhook`,
                returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/success`,
                cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/cancel`
            };
            await this.orderModel.update(orderId, {
                paymentMethod,
                paymentGateway: this.getGatewayName(paymentMethod),
                status: PaymentOrder_1.OrderStatus.PROCESSING
            });
            const gatewayResponse = await this.gatewayManager.createPayment(paymentMethod, paymentRequest);
            if (gatewayResponse.success) {
                await this.orderModel.update(orderId, {
                    gatewayOrderId: gatewayResponse.gatewayOrderId
                });
                return {
                    success: true,
                    orderId,
                    gatewayOrderId: gatewayResponse.gatewayOrderId,
                    paymentUrl: gatewayResponse.paymentUrl
                };
            }
            else {
                await this.handlePaymentFailure(orderId, gatewayResponse.error || 'Payment gateway error');
                return {
                    success: false,
                    orderId,
                    error: gatewayResponse.error || 'Payment processing failed'
                };
            }
        }
        catch (error) {
            await this.handlePaymentFailure(orderId, error instanceof Error ? error.message : 'Unknown error');
            return {
                success: false,
                orderId,
                error: error instanceof Error ? error.message : 'Payment processing failed'
            };
        }
    }
    async handlePaymentWebhook(paymentMethod, headers, body) {
        const validationResult = await this.gatewayManager.validateWebhook(paymentMethod, headers, body);
        if (!validationResult.isValid) {
            throw new Error('Invalid webhook signature');
        }
        if (!validationResult.orderId) {
            throw new Error('Order ID not found in webhook data');
        }
        const order = await this.orderModel.getById(validationResult.orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        if (validationResult.status === 'success') {
            await this.handlePaymentSuccess(order.id, order.gatewayOrderId || '');
        }
        else {
            await this.handlePaymentFailure(order.id, validationResult.failureReason || 'Payment failed');
        }
    }
    async handlePaymentWebhookLegacy(webhookData) {
        const orders = await this.orderModel.getByStatus(PaymentOrder_1.OrderStatus.PROCESSING);
        const order = orders.find((o) => o.gatewayOrderId === webhookData.gatewayOrderId);
        if (!order) {
            throw new Error('Order not found for gateway order ID');
        }
        if (webhookData.status === 'success') {
            await this.handlePaymentSuccess(order.id, webhookData.gatewayOrderId);
        }
        else {
            await this.handlePaymentFailure(order.id, webhookData.failureReason || 'Payment failed');
        }
    }
    async handlePaymentSuccess(orderId, gatewayOrderId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            await this.orderModel.markAsPaid(orderId, gatewayOrderId);
            const order = await this.orderModel.getById(orderId);
            if (!order) {
                throw new Error('Order not found after payment');
            }
            await this.creditService.addCredits(order.userId, order.creditAmount, credit_1.TransactionType.PURCHASE, `Purchase from package ${order.packageId}`, orderId);
            await this.orderModel.markAsCompleted(orderId);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async handlePaymentFailure(orderId, reason) {
        await this.orderModel.markAsFailed(orderId, reason);
    }
    getGatewayName(paymentMethod) {
        switch (paymentMethod) {
            case PaymentOrder_1.PaymentMethod.ALIPAY:
                return 'alipay';
            case PaymentOrder_1.PaymentMethod.WECHAT:
                return 'wechat_pay';
            case PaymentOrder_1.PaymentMethod.CREDIT_CARD:
                return 'stripe';
            case PaymentOrder_1.PaymentMethod.PAYPAL:
                return 'paypal';
            default:
                return 'unknown';
        }
    }
    async cancelOrder(orderId, userId) {
        const order = await this.orderModel.getById(orderId);
        if (!order) {
            return false;
        }
        if (order.userId !== userId) {
            throw new Error('Unauthorized to cancel this order');
        }
        if (order.status !== PaymentOrder_1.OrderStatus.PENDING) {
            throw new Error('Can only cancel pending orders');
        }
        await this.orderModel.update(orderId, { status: PaymentOrder_1.OrderStatus.CANCELLED });
        return true;
    }
    async markExpiredOrders() {
        return this.orderModel.markExpiredOrders();
    }
    async getRevenueStats(days = 30) {
        return this.orderModel.getRevenueStats(days);
    }
    async retryPayment(orderId) {
        const order = await this.orderModel.getById(orderId);
        if (!order) {
            return { success: false, orderId, error: 'Order not found' };
        }
        if (order.status !== PaymentOrder_1.OrderStatus.FAILED) {
            return { success: false, orderId, error: 'Order is not in failed status' };
        }
        if (order.retryCount >= 3) {
            return { success: false, orderId, error: 'Maximum retry attempts exceeded' };
        }
        await this.orderModel.update(orderId, {
            status: PaymentOrder_1.OrderStatus.PENDING,
            retryCount: order.retryCount + 1,
            failureReason: undefined,
            expiredAt: new Date(Date.now() + 30 * 60 * 1000)
        });
        return this.processPayment(orderId, order.paymentMethod);
    }
    getAvailablePaymentMethods() {
        return this.gatewayManager.getAvailablePaymentMethods();
    }
    async queryPaymentStatus(orderId) {
        const order = await this.orderModel.getById(orderId);
        if (!order) {
            return { success: false, orderId, error: 'Order not found' };
        }
        if (!order.paymentMethod || !order.gatewayOrderId) {
            return { success: false, orderId, error: 'Payment not initiated' };
        }
        try {
            const gatewayResponse = await this.gatewayManager.queryPaymentStatus(order.paymentMethod, order.gatewayOrderId);
            return {
                success: gatewayResponse.success,
                orderId,
                gatewayOrderId: order.gatewayOrderId,
                error: gatewayResponse.error
            };
        }
        catch (error) {
            return {
                success: false,
                orderId,
                error: error instanceof Error ? error.message : 'Failed to query payment status'
            };
        }
    }
    async refundPayment(orderId, amount) {
        const order = await this.orderModel.getById(orderId);
        if (!order) {
            return { success: false, orderId, error: 'Order not found' };
        }
        if (order.status !== PaymentOrder_1.OrderStatus.COMPLETED) {
            return { success: false, orderId, error: 'Order is not completed' };
        }
        if (!order.paymentMethod || !order.gatewayOrderId) {
            return { success: false, orderId, error: 'Payment information not found' };
        }
        try {
            const refundAmount = amount || order.amount;
            const gatewayResponse = await this.gatewayManager.refundPayment(order.paymentMethod, order.gatewayOrderId, refundAmount);
            if (gatewayResponse.success) {
                await this.creditService.consumeCredits(order.userId, 'refund', 0, `Refund for order ${orderId}`, orderId);
                return {
                    success: true,
                    orderId,
                    gatewayOrderId: gatewayResponse.gatewayOrderId
                };
            }
            else {
                return {
                    success: false,
                    orderId,
                    error: gatewayResponse.error || 'Refund failed'
                };
            }
        }
        catch (error) {
            return {
                success: false,
                orderId,
                error: error instanceof Error ? error.message : 'Refund processing failed'
            };
        }
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=PaymentService.js.map