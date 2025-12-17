"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const uuid_1 = require("uuid");
const PaymentService_1 = require("./../services/PaymentService");
const CreditService_1 = require("./../services/CreditService");
const RechargePackage_1 = require("./../models/RechargePackage");
const PaymentOrder_1 = require("./../models/PaymentOrder");
const credit_1 = require("./../types/credit");
const setup_1 = require("../setup");
describe('Payment System Property Tests', () => {
    let paymentService;
    let creditService;
    let packageModel;
    let orderModel;
    let testUserId;
    beforeAll(async () => {
        if (!setup_1.testDb) {
            console.warn('Test database not available, skipping payment system tests');
            return;
        }
        try {
            paymentService = new PaymentService_1.PaymentService(setup_1.testDb);
            creditService = new CreditService_1.CreditService(setup_1.testDb);
            packageModel = new RechargePackage_1.RechargePackageModel(setup_1.testDb);
            orderModel = new PaymentOrder_1.PaymentOrderModel(setup_1.testDb);
            testUserId = (0, uuid_1.v4)();
            const userResult = await setup_1.testDb.query('INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id', [testUserId, 'paymentuser', 'payment@test.com', 'hashedpassword']);
            await creditService.initializeUserCredits(testUserId, 0);
        }
        catch (error) {
            console.warn('Failed to setup payment test environment:', error);
            testUserId = '';
        }
    });
    afterAll(async () => {
        if (setup_1.testDb && testUserId) {
            try {
                await setup_1.testDb.query('DELETE FROM users WHERE id = $1', [testUserId]);
            }
            catch (error) {
                console.warn('Failed to cleanup test user:', error);
            }
        }
    });
    beforeEach(async () => {
        if (!setup_1.testDb || !testUserId) {
            return;
        }
        try {
            await setup_1.testDb.query('DELETE FROM payment_orders WHERE user_id = $1', [testUserId]);
            await setup_1.testDb.query('DELETE FROM recharge_packages WHERE created_by = $1', [testUserId]);
            await setup_1.testDb.query('DELETE FROM credit_transactions WHERE user_id = $1', [testUserId]);
            await setup_1.testDb.query('UPDATE user_credits SET current_balance = 0, total_earned = 0, total_spent = 0 WHERE user_id = $1', [testUserId]);
        }
        catch (error) {
            console.warn('Failed to cleanup test data:', error);
        }
    });
    test('Property 12: Payment consistency - successful payments increase credit balance correctly', async () => {
        if (!setup_1.testDb || !testUserId) {
            console.warn('Skipping test due to database setup failure');
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            packageName: fast_check_1.default.string({ minLength: 5, maxLength: 50 }),
            packageDescription: fast_check_1.default.string({ minLength: 10, maxLength: 200 }),
            priceInCents: fast_check_1.default.integer({ min: 100, max: 100000 }),
            creditAmount: fast_check_1.default.integer({ min: 10, max: 10000 }),
            bonusCredits: fast_check_1.default.integer({ min: 0, max: 1000 }),
            currency: fast_check_1.default.constantFrom('USD', 'CNY'),
            paymentMethod: fast_check_1.default.constantFrom(PaymentOrder_1.PaymentMethod.ALIPAY, PaymentOrder_1.PaymentMethod.WECHAT, PaymentOrder_1.PaymentMethod.CREDIT_CARD, PaymentOrder_1.PaymentMethod.PAYPAL),
        }), async (testData) => {
            const initialCredits = await creditService.getUserCredits(testUserId);
            const initialBalance = initialCredits?.currentBalance || 0;
            const packageData = {
                name: testData.packageName,
                description: testData.packageDescription,
                priceInCents: testData.priceInCents,
                currency: testData.currency,
                creditAmount: testData.creditAmount,
                bonusCredits: testData.bonusCredits,
                isActive: true,
                createdBy: testUserId,
            };
            const package_ = await packageModel.create(packageData);
            const expectedCredits = testData.creditAmount + testData.bonusCredits;
            const order = await paymentService.createOrder({
                userId: testUserId,
                packageId: package_.id,
                amount: testData.priceInCents,
                currency: testData.currency,
                creditAmount: expectedCredits,
                paymentMethod: testData.paymentMethod,
            });
            await paymentService['handlePaymentSuccess'](order.id, 'mock_gateway_id');
            const updatedOrder = await orderModel.getById(order.id);
            expect(updatedOrder?.status).toBe(PaymentOrder_1.OrderStatus.COMPLETED);
            const finalCredits = await creditService.getUserCredits(testUserId);
            const finalBalance = finalCredits?.currentBalance || 0;
            const actualIncrease = finalBalance - initialBalance;
            expect(actualIncrease).toBe(expectedCredits);
            const transactions = await setup_1.testDb.query('SELECT * FROM credit_transactions WHERE user_id = $1 AND type = $2 AND related_id = $3', [testUserId, credit_1.TransactionType.PURCHASE, order.id]);
            expect(transactions.rows).toHaveLength(1);
            expect(transactions.rows[0].amount).toBe(expectedCredits);
            expect(transactions.rows[0].description).toContain(package_.id);
        }), { numRuns: 50 });
    });
    test('Property: Payment order creation maintains data consistency', async () => {
        if (!setup_1.testDb || !testUserId) {
            console.warn('Skipping test due to database setup failure');
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            packageName: fast_check_1.default.string({ minLength: 5, maxLength: 50 }),
            priceInCents: fast_check_1.default.integer({ min: 100, max: 50000 }),
            creditAmount: fast_check_1.default.integer({ min: 10, max: 5000 }),
            bonusCredits: fast_check_1.default.integer({ min: 0, max: 500 }),
            paymentMethod: fast_check_1.default.constantFrom(PaymentOrder_1.PaymentMethod.ALIPAY, PaymentOrder_1.PaymentMethod.WECHAT, PaymentOrder_1.PaymentMethod.CREDIT_CARD),
        }), async (testData) => {
            const packageData = {
                name: testData.packageName,
                description: 'Test package description',
                priceInCents: testData.priceInCents,
                creditAmount: testData.creditAmount,
                bonusCredits: testData.bonusCredits,
                isActive: true,
                createdBy: testUserId,
            };
            const package_ = await packageModel.create(packageData);
            const expectedCredits = testData.creditAmount + testData.bonusCredits;
            const order = await paymentService.createOrder({
                userId: testUserId,
                packageId: package_.id,
                amount: testData.priceInCents,
                currency: 'USD',
                creditAmount: expectedCredits,
                paymentMethod: testData.paymentMethod,
            });
            expect(order.userId).toBe(testUserId);
            expect(order.packageId).toBe(package_.id);
            expect(order.amount).toBe(testData.priceInCents);
            expect(order.creditAmount).toBe(expectedCredits);
            expect(order.status).toBe(PaymentOrder_1.OrderStatus.PENDING);
            expect(order.expiredAt).toBeInstanceOf(Date);
            expect(order.expiredAt.getTime()).toBeGreaterThan(Date.now());
            const retrievedOrder = await orderModel.getById(order.id);
            expect(retrievedOrder).not.toBeNull();
            expect(retrievedOrder?.id).toBe(order.id);
        }), { numRuns: 30 });
    });
    test('Property: Order validation prevents price/credit mismatches', async () => {
        if (!setup_1.testDb || !testUserId) {
            console.warn('Skipping test due to database setup failure');
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            packagePrice: fast_check_1.default.integer({ min: 100, max: 10000 }),
            packageCredits: fast_check_1.default.integer({ min: 10, max: 1000 }),
            bonusCredits: fast_check_1.default.integer({ min: 0, max: 100 }),
            orderAmount: fast_check_1.default.integer({ min: 50, max: 15000 }),
            orderCredits: fast_check_1.default.integer({ min: 5, max: 1500 }),
        }), async (testData) => {
            const packageData = {
                name: 'Test Package',
                description: 'Test package for validation',
                priceInCents: testData.packagePrice,
                creditAmount: testData.packageCredits,
                bonusCredits: testData.bonusCredits,
                isActive: true,
                createdBy: testUserId,
            };
            const package_ = await packageModel.create(packageData);
            const correctAmount = testData.packagePrice;
            const correctCredits = testData.packageCredits + testData.bonusCredits;
            if (testData.orderAmount === correctAmount && testData.orderCredits === correctCredits) {
                const order = await paymentService.createOrder({
                    userId: testUserId,
                    packageId: package_.id,
                    amount: testData.orderAmount,
                    currency: 'USD',
                    creditAmount: testData.orderCredits,
                });
                expect(order).toBeDefined();
                expect(order.amount).toBe(correctAmount);
                expect(order.creditAmount).toBe(correctCredits);
            }
            else {
                await expect(paymentService.createOrder({
                    userId: testUserId,
                    packageId: package_.id,
                    amount: testData.orderAmount,
                    currency: 'USD',
                    creditAmount: testData.orderCredits,
                })).rejects.toThrow();
            }
        }), { numRuns: 40 });
    });
    test('Property: Failed payments do not affect credit balance', async () => {
        if (!setup_1.testDb || !testUserId) {
            console.warn('Skipping test due to database setup failure');
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            priceInCents: fast_check_1.default.integer({ min: 100, max: 5000 }),
            creditAmount: fast_check_1.default.integer({ min: 10, max: 500 }),
            failureReason: fast_check_1.default.string({ minLength: 5, maxLength: 100 }),
        }), async (testData) => {
            const initialCredits = await creditService.getUserCredits(testUserId);
            const initialBalance = initialCredits?.currentBalance || 0;
            const packageData = {
                name: 'Test Package',
                description: 'Test package for failure',
                priceInCents: testData.priceInCents,
                creditAmount: testData.creditAmount,
                bonusCredits: 0,
                isActive: true,
                createdBy: testUserId,
            };
            const package_ = await packageModel.create(packageData);
            const order = await paymentService.createOrder({
                userId: testUserId,
                packageId: package_.id,
                amount: testData.priceInCents,
                currency: 'USD',
                creditAmount: testData.creditAmount,
            });
            await paymentService['handlePaymentFailure'](order.id, testData.failureReason);
            const updatedOrder = await orderModel.getById(order.id);
            expect(updatedOrder?.status).toBe(PaymentOrder_1.OrderStatus.FAILED);
            expect(updatedOrder?.failureReason).toBe(testData.failureReason);
            const finalCredits = await creditService.getUserCredits(testUserId);
            const finalBalance = finalCredits?.currentBalance || 0;
            expect(finalBalance).toBe(initialBalance);
            const transactions = await setup_1.testDb.query('SELECT * FROM credit_transactions WHERE user_id = $1 AND type = $2 AND related_id = $3', [testUserId, credit_1.TransactionType.PURCHASE, order.id]);
            expect(transactions.rows).toHaveLength(0);
        }), { numRuns: 25 });
    });
    test('Property: Expired orders are handled correctly', async () => {
        if (!setup_1.testDb || !testUserId) {
            console.warn('Skipping test due to database setup failure');
            return;
        }
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            priceInCents: fast_check_1.default.integer({ min: 100, max: 2000 }),
            creditAmount: fast_check_1.default.integer({ min: 10, max: 200 }),
        }), async (testData) => {
            const packageData = {
                name: 'Test Package',
                description: 'Test package for expiration',
                priceInCents: testData.priceInCents,
                creditAmount: testData.creditAmount,
                bonusCredits: 0,
                isActive: true,
                createdBy: testUserId,
            };
            const package_ = await packageModel.create(packageData);
            const expiredAt = new Date(Date.now() - 1000);
            const order = await orderModel.create({
                userId: testUserId,
                packageId: package_.id,
                amount: testData.priceInCents,
                currency: 'USD',
                creditAmount: testData.creditAmount,
                expiredAt,
            });
            const result = await paymentService.processPayment(order.id, PaymentOrder_1.PaymentMethod.ALIPAY);
            expect(result.success).toBe(false);
            expect(result.error).toContain('expired');
            const updatedOrder = await orderModel.getById(order.id);
            expect(updatedOrder?.status).toBe(PaymentOrder_1.OrderStatus.EXPIRED);
        }), { numRuns: 20 });
    });
});
//# sourceMappingURL=paymentSystem.test.js.map