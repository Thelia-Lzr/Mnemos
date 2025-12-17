"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const PaymentService_1 = require("../services/PaymentService");
const CreditService_1 = require("../services/CreditService");
const database_1 = require("../config/database");
class PaymentController {
    constructor() {
        this.paymentService = new PaymentService_1.PaymentService(database_1.pool);
        this.creditService = new CreditService_1.CreditService(database_1.pool);
    }
    async getPackages(req, res, next) {
        try {
            const packages = await this.paymentService.getActivePackages();
            res.status(200).json({
                success: true,
                data: packages
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPackage(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    async createOrder(req, res, next) {
        try {
            const userId = req.user.id;
            const { packageId, paymentMethod } = req.body;
            if (!packageId) {
                res.status(400).json({
                    success: false,
                    message: 'Package ID is required'
                });
                return;
            }
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
            const order = await this.paymentService.createOrder({
                userId,
                packageId,
                amount: package_.priceInCents,
                currency: package_.currency,
                creditAmount: package_.creditAmount + package_.bonusCredits,
                paymentMethod: paymentMethod
            });
            res.status(201).json({
                success: true,
                data: order
            });
        }
        catch (error) {
            next(error);
        }
    }
    async confirmPayment(req, res, next) {
        try {
            const { orderId, paymentMethod } = req.body;
            if (!orderId || !paymentMethod) {
                res.status(400).json({
                    success: false,
                    message: 'Order ID and payment method are required'
                });
                return;
            }
            const order = await this.paymentService.getOrderById(orderId);
            if (!order) {
                res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
                return;
            }
            if (order.userId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Unauthorized to access this order'
                });
                return;
            }
            const result = await this.paymentService.processPayment(orderId, paymentMethod);
            if (result.success) {
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: result.error,
                    data: result
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getOrderStatus(req, res, next) {
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
            if (order.userId !== req.user.id) {
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
        }
        catch (error) {
            next(error);
        }
    }
    async getTransactions(req, res, next) {
        try {
            const userId = req.user.id;
            const { limit = 50, offset = 0 } = req.query;
            const orders = await this.paymentService.getUserOrders(userId, parseInt(limit), parseInt(offset));
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
        }
        catch (error) {
            next(error);
        }
    }
    async getTransaction(req, res, next) {
        try {
            const { transactionId } = req.params;
            const order = await this.paymentService.getOrderById(transactionId);
            if (order && order.userId === req.user.id) {
                res.status(200).json({
                    success: true,
                    data: {
                        type: 'payment_order',
                        transaction: order
                    }
                });
                return;
            }
            res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelOrder(req, res, next) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;
            const success = await this.paymentService.cancelOrder(orderId, userId);
            if (success) {
                res.status(200).json({
                    success: true,
                    message: 'Order cancelled successfully'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to cancel order'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async retryPayment(req, res, next) {
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
            if (order.userId !== req.user.id) {
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
            }
            else {
                res.status(400).json({
                    success: false,
                    message: result.error,
                    data: result
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async handleWebhook(req, res, next) {
        try {
            const { paymentMethod } = req.query;
            const headers = req.headers;
            const body = req.body;
            if (!paymentMethod) {
                res.status(400).json({
                    success: false,
                    message: 'Payment method is required in query parameters'
                });
                return;
            }
            await this.paymentService.handlePaymentWebhook(paymentMethod, headers, body);
            res.status(200).json({
                success: true,
                message: 'Webhook processed successfully'
            });
        }
        catch (error) {
            console.error('Webhook processing error:', error);
            res.status(400).json({
                success: false,
                message: error instanceof Error ? error.message : 'Webhook processing failed'
            });
        }
    }
    async getPaymentMethods(req, res, next) {
        try {
            const methods = this.paymentService.getAvailablePaymentMethods();
            res.status(200).json({
                success: true,
                data: methods
            });
        }
        catch (error) {
            next(error);
        }
    }
    async queryPaymentStatus(req, res, next) {
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
            if (order.userId !== req.user.id) {
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
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=PaymentController.js.map