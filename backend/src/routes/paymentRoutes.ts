import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authenticate } from '../middleware/auth';

const router = Router();
const paymentController = new PaymentController();

// Webhook endpoint (no auth required)
router.post('/webhook', paymentController.handleWebhook.bind(paymentController));

// All other payment routes require authentication
router.use(authenticate);

// Payment methods
router.get('/methods', paymentController.getPaymentMethods.bind(paymentController));

// Recharge packages
router.get('/packages', paymentController.getPackages.bind(paymentController));
router.get('/package/:id', paymentController.getPackage.bind(paymentController));

// Recharge process
router.post('/create-order', paymentController.createOrder.bind(paymentController));
router.post('/confirm-payment', paymentController.confirmPayment.bind(paymentController));
router.get('/order-status/:orderId', paymentController.getOrderStatus.bind(paymentController));
router.get('/query-status/:orderId', paymentController.queryPaymentStatus.bind(paymentController));

// Order management
router.post('/cancel-order/:orderId', paymentController.cancelOrder.bind(paymentController));
router.post('/retry-payment/:orderId', paymentController.retryPayment.bind(paymentController));

// Transaction history
router.get('/transactions', paymentController.getTransactions.bind(paymentController));
router.get('/transaction/:transactionId', paymentController.getTransaction.bind(paymentController));

export default router;
