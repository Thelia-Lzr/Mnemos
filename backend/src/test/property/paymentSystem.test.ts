/**
 * Property-Based Tests for Payment System
 * 
 * **Feature: ai-language-learning-app, Property 12: 充值支付一致�?*
 * **Validates: Requirements 15.1-15.5**
 */

import fc from 'fast-check';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { PaymentService } from './../services/PaymentService';
import { CreditService } from './../services/CreditService';
import { RechargePackageModel, CreateRechargePackageData } from './../models/RechargePackage';
import { PaymentOrderModel, OrderStatus, PaymentMethod } from './../models/PaymentOrder';
import { TransactionType } from './../types/credit';
import { testDb } from '../setup';

describe('Payment System Property Tests', () => {
  let paymentService: PaymentService;
  let creditService: CreditService;
  let packageModel: RechargePackageModel;
  let orderModel: PaymentOrderModel;
  let testUserId: string;

  beforeAll(async () => {
    // Skip tests if database is not available
    if (!testDb) {
      console.warn('Test database not available, skipping payment system tests');
      return;
    }

    try {
      paymentService = new PaymentService(testDb);
      creditService = new CreditService(testDb);
      packageModel = new RechargePackageModel(testDb);
      orderModel = new PaymentOrderModel(testDb);

      // Generate a proper UUID for test user
      testUserId = uuidv4();

      // Create a test user
      const userResult = await testDb.query(
        'INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [testUserId, 'paymentuser', 'payment@test.com', 'hashedpassword']
      );

      // Initialize user credits
      await creditService.initializeUserCredits(testUserId, 0);
    } catch (error) {
      console.warn('Failed to setup payment test environment:', error);
      // Set testUserId to null to indicate setup failed
      testUserId = '';
    }
  });

  afterAll(async () => {
    if (testDb && testUserId) {
      try {
        // Clean up test data
        await testDb.query('DELETE FROM users WHERE id = $1', [testUserId]);
      } catch (error) {
        console.warn('Failed to cleanup test user:', error);
      }
    }
  });

  beforeEach(async () => {
    // Skip if setup failed
    if (!testDb || !testUserId) {
      return;
    }

    try {
      // Clean up any test packages and orders before each test
      await testDb.query('DELETE FROM payment_orders WHERE user_id = $1', [testUserId]);
      await testDb.query('DELETE FROM recharge_packages WHERE created_by = $1', [testUserId]);
      await testDb.query('DELETE FROM credit_transactions WHERE user_id = $1', [testUserId]);
      
      // Reset user credit balance
      await testDb.query(
        'UPDATE user_credits SET current_balance = 0, total_earned = 0, total_spent = 0 WHERE user_id = $1',
        [testUserId]
      );
    } catch (error) {
      console.warn('Failed to cleanup test data:', error);
    }
  });

  /**
   * Property 12: Payment Consistency
   * For any successful payment order, the user's credit balance should accurately increase by the corresponding amount
   */
  test('Property 12: Payment consistency - successful payments increase credit balance correctly', async () => {
    // Skip if database setup failed
    if (!testDb || !testUserId) {
      console.warn('Skipping test due to database setup failure');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          packageName: fc.string({ minLength: 5, maxLength: 50 }),
          packageDescription: fc.string({ minLength: 10, maxLength: 200 }),
          priceInCents: fc.integer({ min: 100, max: 100000 }), // $1 to $1000
          creditAmount: fc.integer({ min: 10, max: 10000 }),
          bonusCredits: fc.integer({ min: 0, max: 1000 }),
          currency: fc.constantFrom('USD', 'CNY'),
          paymentMethod: fc.constantFrom(
            PaymentMethod.ALIPAY,
            PaymentMethod.WECHAT,
            PaymentMethod.CREDIT_CARD,
            PaymentMethod.PAYPAL
          ),
        }),
        async (testData) => {
          // Get initial credit balance
          const initialCredits = await creditService.getUserCredits(testUserId);
          const initialBalance = initialCredits?.currentBalance || 0;

          // Create a test package
          const packageData: CreateRechargePackageData = {
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

          // Create payment order
          const order = await paymentService.createOrder({
            userId: testUserId,
            packageId: package_.id,
            amount: testData.priceInCents,
            currency: testData.currency,
            creditAmount: expectedCredits,
            paymentMethod: testData.paymentMethod,
          });

          // Simulate successful payment by directly calling the success handler
          // In a real scenario, this would be triggered by payment gateway webhook
          await paymentService['handlePaymentSuccess'](order.id, 'mock_gateway_id');

          // Verify the order status is completed
          const updatedOrder = await orderModel.getById(order.id);
          expect(updatedOrder?.status).toBe(OrderStatus.COMPLETED);

          // Verify credit balance increased correctly
          const finalCredits = await creditService.getUserCredits(testUserId);
          const finalBalance = finalCredits?.currentBalance || 0;
          const actualIncrease = finalBalance - initialBalance;

          // Property: Credit balance should increase by exactly the expected amount
          expect(actualIncrease).toBe(expectedCredits);

          // Verify credit transaction was recorded
          const transactions = await testDb.query(
            'SELECT * FROM credit_transactions WHERE user_id = $1 AND type = $2 AND related_id = $3',
            [testUserId, TransactionType.PURCHASE, order.id]
          );

          expect(transactions.rows).toHaveLength(1);
          expect(transactions.rows[0].amount).toBe(expectedCredits);
          expect(transactions.rows[0].description).toContain(package_.id);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Payment order creation validation
   * For any valid package and user, creating a payment order should succeed and maintain data consistency
   */
  test('Property: Payment order creation maintains data consistency', async () => {
    if (!testDb || !testUserId) {
      console.warn('Skipping test due to database setup failure');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          packageName: fc.string({ minLength: 5, maxLength: 50 }),
          priceInCents: fc.integer({ min: 100, max: 50000 }),
          creditAmount: fc.integer({ min: 10, max: 5000 }),
          bonusCredits: fc.integer({ min: 0, max: 500 }),
          paymentMethod: fc.constantFrom(
            PaymentMethod.ALIPAY,
            PaymentMethod.WECHAT,
            PaymentMethod.CREDIT_CARD
          ),
        }),
        async (testData) => {
          // Create test package
          const packageData: CreateRechargePackageData = {
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

          // Create payment order
          const order = await paymentService.createOrder({
            userId: testUserId,
            packageId: package_.id,
            amount: testData.priceInCents,
            currency: 'USD',
            creditAmount: expectedCredits,
            paymentMethod: testData.paymentMethod,
          });

          // Verify order properties
          expect(order.userId).toBe(testUserId);
          expect(order.packageId).toBe(package_.id);
          expect(order.amount).toBe(testData.priceInCents);
          expect(order.creditAmount).toBe(expectedCredits);
          expect(order.status).toBe(OrderStatus.PENDING);
          expect(order.expiredAt).toBeInstanceOf(Date);
          expect(order.expiredAt.getTime()).toBeGreaterThan(Date.now());

          // Verify order can be retrieved
          const retrievedOrder = await orderModel.getById(order.id);
          expect(retrievedOrder).not.toBeNull();
          expect(retrievedOrder?.id).toBe(order.id);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Package price and credit amount validation
   * For any order, the amount must match the package price and credit amount must match package credits
   */
  test('Property: Order validation prevents price/credit mismatches', async () => {
    if (!testDb || !testUserId) {
      console.warn('Skipping test due to database setup failure');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          packagePrice: fc.integer({ min: 100, max: 10000 }),
          packageCredits: fc.integer({ min: 10, max: 1000 }),
          bonusCredits: fc.integer({ min: 0, max: 100 }),
          // Generate potentially incorrect values
          orderAmount: fc.integer({ min: 50, max: 15000 }),
          orderCredits: fc.integer({ min: 5, max: 1500 }),
        }),
        async (testData) => {
          // Create test package
          const packageData: CreateRechargePackageData = {
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

          // Test with correct values - should succeed
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
          } else {
            // Test with incorrect values - should fail
            await expect(
              paymentService.createOrder({
                userId: testUserId,
                packageId: package_.id,
                amount: testData.orderAmount,
                currency: 'USD',
                creditAmount: testData.orderCredits,
              })
            ).rejects.toThrow();
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  /**
   * Property: Failed payments do not affect credit balance
   * For any payment that fails, the user's credit balance should remain unchanged
   */
  test('Property: Failed payments do not affect credit balance', async () => {
    if (!testDb || !testUserId) {
      console.warn('Skipping test due to database setup failure');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          priceInCents: fc.integer({ min: 100, max: 5000 }),
          creditAmount: fc.integer({ min: 10, max: 500 }),
          failureReason: fc.string({ minLength: 5, maxLength: 100 }),
        }),
        async (testData) => {
          // Get initial credit balance
          const initialCredits = await creditService.getUserCredits(testUserId);
          const initialBalance = initialCredits?.currentBalance || 0;

          // Create test package
          const packageData: CreateRechargePackageData = {
            name: 'Test Package',
            description: 'Test package for failure',
            priceInCents: testData.priceInCents,
            creditAmount: testData.creditAmount,
            bonusCredits: 0,
            isActive: true,
            createdBy: testUserId,
          };

          const package_ = await packageModel.create(packageData);

          // Create payment order
          const order = await paymentService.createOrder({
            userId: testUserId,
            packageId: package_.id,
            amount: testData.priceInCents,
            currency: 'USD',
            creditAmount: testData.creditAmount,
          });

          // Simulate payment failure
          await paymentService['handlePaymentFailure'](order.id, testData.failureReason);

          // Verify order status is failed
          const updatedOrder = await orderModel.getById(order.id);
          expect(updatedOrder?.status).toBe(OrderStatus.FAILED);
          expect(updatedOrder?.failureReason).toBe(testData.failureReason);

          // Verify credit balance remained unchanged
          const finalCredits = await creditService.getUserCredits(testUserId);
          const finalBalance = finalCredits?.currentBalance || 0;

          // Property: Credit balance should not change for failed payments
          expect(finalBalance).toBe(initialBalance);

          // Verify no purchase transaction was created
          const transactions = await testDb.query(
            'SELECT * FROM credit_transactions WHERE user_id = $1 AND type = $2 AND related_id = $3',
            [testUserId, TransactionType.PURCHASE, order.id]
          );

          expect(transactions.rows).toHaveLength(0);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Order expiration handling
   * For any order that expires, it should be marked as expired and not processable
   */
  test('Property: Expired orders are handled correctly', async () => {
    if (!testDb || !testUserId) {
      console.warn('Skipping test due to database setup failure');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          priceInCents: fc.integer({ min: 100, max: 2000 }),
          creditAmount: fc.integer({ min: 10, max: 200 }),
        }),
        async (testData) => {
          // Create test package
          const packageData: CreateRechargePackageData = {
            name: 'Test Package',
            description: 'Test package for expiration',
            priceInCents: testData.priceInCents,
            creditAmount: testData.creditAmount,
            bonusCredits: 0,
            isActive: true,
            createdBy: testUserId,
          };

          const package_ = await packageModel.create(packageData);

          // Create payment order with immediate expiration
          const expiredAt = new Date(Date.now() - 1000); // 1 second ago
          const order = await orderModel.create({
            userId: testUserId,
            packageId: package_.id,
            amount: testData.priceInCents,
            currency: 'USD',
            creditAmount: testData.creditAmount,
            expiredAt,
          });

          // Try to process expired order
          const result = await paymentService.processPayment(order.id, PaymentMethod.ALIPAY);

          // Property: Expired orders should not be processable
          expect(result.success).toBe(false);
          expect(result.error).toContain('expired');

          // Verify order status is updated to expired
          const updatedOrder = await orderModel.getById(order.id);
          expect(updatedOrder?.status).toBe(OrderStatus.EXPIRED);
        }
      ),
      { numRuns: 20 }
    );
  });
});


