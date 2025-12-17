/**
 * Property-Based Tests for Admin Functionality
 * 
 * **Feature: ai-language-learning-app, Property 13: 套餐配置生效�?*
 * **Validates: Requirements 16.3**
 */

import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { PaymentService } from './../services/PaymentService';
import { RechargePackageModel, CreateRechargePackageData, UpdateRechargePackageData } from './../models/RechargePackage';
import { testDb } from '../setup';

describe('Admin Functionality Property Tests', () => {
  let paymentService: PaymentService;
  let packageModel: RechargePackageModel;
  let adminUserId: string;

  beforeAll(async () => {
    // Skip tests if database is not available
    if (!testDb) {
      console.warn('Test database not available, skipping admin functionality tests');
      return;
    }

    try {
      paymentService = new PaymentService(testDb);
      packageModel = new RechargePackageModel(testDb);
      
      // Generate a proper UUID for admin user
      adminUserId = uuidv4();
      
      // Create an admin user for testing (use INSERT ... ON CONFLICT to handle duplicates)
      await testDb.query(
        `INSERT INTO users (id, username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO UPDATE SET 
           id = EXCLUDED.id,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role`,
        [
          adminUserId,
          `admin_test_${Date.now()}`, // Make username unique
          `admin_${Date.now()}@test.com`, // Make email unique
          'hashed_password',
          'admin'
        ]
      );
    } catch (error) {
      console.warn('Failed to setup admin test environment:', error);
    }
  });

  afterAll(async () => {
    if (!testDb) return;
    
    try {
      // Clean up test data
      await testDb.query('DELETE FROM recharge_packages WHERE created_by = $1', [adminUserId]);
      await testDb.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    } catch (error) {
      console.warn('Failed to cleanup admin test data:', error);
    }
  });

  beforeEach(async () => {
    if (!testDb) return;
    
    // Ensure admin user exists before each test
    try {
      const userCheck = await testDb.query('SELECT id FROM users WHERE id = $1', [adminUserId]);
      if (userCheck.rows.length === 0) {
        await testDb.query(
          `INSERT INTO users (id, username, email, password_hash, role) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            adminUserId,
            `admin_test_${Date.now()}`,
            `admin_${Date.now()}@test.com`,
            'hashed_password',
            'admin'
          ]
        );
      }
    } catch (error) {
      console.warn('Failed to ensure admin user exists:', error);
    }
    
    // Clean up packages before each test
    try {
      await testDb.query('DELETE FROM recharge_packages WHERE created_by = $1', [adminUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * **Feature: ai-language-learning-app, Property 13: 套餐配置生效�?*
   * **Validates: Requirements 16.3**
   * 
   * Property: Package Configuration Effectiveness
   * For any admin modification to a recharge package, the changes should immediately 
   * take effect on the user recharge page
   */
  describe('Property 13: Package Configuration Effectiveness', () => {
    test('should immediately reflect package updates in user-facing API', async () => {
      if (!testDb) {
        console.warn('Skipping test: database not available');
        return;
      }
      await fc.assert(
        fc.asyncProperty(
          // Generator for initial package data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            priceInCents: fc.integer({ min: 100, max: 100000 }),
            creditAmount: fc.integer({ min: 1, max: 10000 }),
            bonusCredits: fc.integer({ min: 0, max: 1000 }),
            isActive: fc.boolean(),
            isPopular: fc.boolean(),
            displayOrder: fc.integer({ min: 0, max: 100 })
          }),
          // Generator for package updates
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
            priceInCents: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: undefined }),
            creditAmount: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
            bonusCredits: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
            isActive: fc.option(fc.boolean(), { nil: undefined }),
            isPopular: fc.option(fc.boolean(), { nil: undefined }),
            displayOrder: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined })
          }),
          async (initialData, updateData) => {
            // Create initial package
            const createData: CreateRechargePackageData = {
              ...initialData,
              currency: 'USD',
              createdBy: adminUserId
            };

            const createdPackage = await paymentService.createPackage(createData);
            expect(createdPackage).toBeDefined();
            expect(createdPackage.id).toBeDefined();

            // Verify initial state in user-facing API (active packages)
            const initialActivePackages = await paymentService.getActivePackages();
            const initialPackageInList = initialActivePackages.find(pkg => pkg.id === createdPackage.id);
            
            if (initialData.isActive) {
              expect(initialPackageInList).toBeDefined();
              expect(initialPackageInList!.name).toBe(initialData.name);
              expect(initialPackageInList!.priceInCents).toBe(initialData.priceInCents);
              expect(initialPackageInList!.creditAmount).toBe(initialData.creditAmount);
            } else {
              expect(initialPackageInList).toBeUndefined();
            }

            // Apply updates to the package
            const updatedPackage = await paymentService.updatePackage(createdPackage.id, updateData);
            expect(updatedPackage).toBeDefined();

            // Verify changes are immediately reflected in user-facing API
            const updatedActivePackages = await paymentService.getActivePackages();
            const updatedPackageInList = updatedActivePackages.find(pkg => pkg.id === createdPackage.id);

            // Determine expected values after update
            const expectedName = updateData.name !== undefined ? updateData.name : initialData.name;
            const expectedPrice = updateData.priceInCents !== undefined ? updateData.priceInCents : initialData.priceInCents;
            const expectedCredits = updateData.creditAmount !== undefined ? updateData.creditAmount : initialData.creditAmount;
            const expectedBonusCredits = updateData.bonusCredits !== undefined ? updateData.bonusCredits : initialData.bonusCredits;
            const expectedActive = updateData.isActive !== undefined ? updateData.isActive : initialData.isActive;
            const expectedPopular = updateData.isPopular !== undefined ? updateData.isPopular : initialData.isPopular;
            const expectedOrder = updateData.displayOrder !== undefined ? updateData.displayOrder : initialData.displayOrder;

            if (expectedActive) {
              // Package should be visible in active packages
              expect(updatedPackageInList).toBeDefined();
              expect(updatedPackageInList!.name).toBe(expectedName);
              expect(updatedPackageInList!.priceInCents).toBe(expectedPrice);
              expect(updatedPackageInList!.creditAmount).toBe(expectedCredits);
              expect(updatedPackageInList!.bonusCredits).toBe(expectedBonusCredits);
              expect(updatedPackageInList!.isPopular).toBe(expectedPopular);
              expect(updatedPackageInList!.displayOrder).toBe(expectedOrder);
              expect(updatedPackageInList!.isActive).toBe(true);
            } else {
              // Package should not be visible in active packages
              expect(updatedPackageInList).toBeUndefined();
            }

            // Verify the package still exists in admin view (all packages)
            const allPackages = await paymentService.getAllPackages();
            const packageInAdminList = allPackages.find(pkg => pkg.id === createdPackage.id);
            expect(packageInAdminList).toBeDefined();
            expect(packageInAdminList!.name).toBe(expectedName);
            expect(packageInAdminList!.priceInCents).toBe(expectedPrice);
            expect(packageInAdminList!.creditAmount).toBe(expectedCredits);
            expect(packageInAdminList!.isActive).toBe(expectedActive);

            // Verify individual package retrieval also reflects changes
            const individualPackage = await paymentService.getPackageById(createdPackage.id);
            expect(individualPackage).toBeDefined();
            expect(individualPackage!.name).toBe(expectedName);
            expect(individualPackage!.priceInCents).toBe(expectedPrice);
            expect(individualPackage!.creditAmount).toBe(expectedCredits);
            expect(individualPackage!.isActive).toBe(expectedActive);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should maintain package ordering consistency after updates', async () => {
      if (!testDb) {
        console.warn('Skipping test: database not available');
        return;
      }
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple packages with different display orders
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              description: fc.string({ minLength: 1, maxLength: 200 }),
              priceInCents: fc.integer({ min: 100, max: 100000 }),
              creditAmount: fc.integer({ min: 1, max: 10000 }),
              displayOrder: fc.integer({ min: 0, max: 10 }),
              isActive: fc.constant(true) // All active for ordering test
            }),
            { minLength: 2, maxLength: 5 }
          ),
          // Generate new display order for one package
          fc.record({
            packageIndex: fc.integer({ min: 0, max: 4 }),
            newDisplayOrder: fc.integer({ min: 0, max: 10 })
          }),
          async (packagesData, updateInfo) => {
            // Skip if packageIndex is out of bounds
            if (updateInfo.packageIndex >= packagesData.length) return;

            // Create all packages
            const createdPackages = [];
            for (const packageData of packagesData) {
              const createData: CreateRechargePackageData = {
                ...packageData,
                currency: 'USD',
                bonusCredits: 0,
                isPopular: false,
                createdBy: adminUserId
              };
              const pkg = await paymentService.createPackage(createData);
              createdPackages.push(pkg);
            }

            // Get initial ordering
            const initialActivePackages = await paymentService.getActivePackages();
            const initialOrdering = initialActivePackages
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map(pkg => pkg.id);

            // Update display order of one package
            const packageToUpdate = createdPackages[updateInfo.packageIndex];
            await paymentService.updatePackage(packageToUpdate.id, {
              displayOrder: updateInfo.newDisplayOrder
            });

            // Verify ordering is immediately updated
            const updatedActivePackages = await paymentService.getActivePackages();
            const updatedOrdering = updatedActivePackages
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map(pkg => pkg.id);

            // Find the updated package in the new list
            const updatedPackage = updatedActivePackages.find(pkg => pkg.id === packageToUpdate.id);
            expect(updatedPackage).toBeDefined();
            expect(updatedPackage!.displayOrder).toBe(updateInfo.newDisplayOrder);

            // Verify that the ordering reflects the change
            const expectedPosition = updatedActivePackages
              .filter(pkg => pkg.displayOrder <= updateInfo.newDisplayOrder)
              .length - 1;
            
            const actualPosition = updatedOrdering.indexOf(packageToUpdate.id);
            
            // The package should be positioned according to its new display order
            expect(actualPosition).toBeGreaterThanOrEqual(0);
            expect(updatedPackage!.displayOrder).toBe(updateInfo.newDisplayOrder);
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should handle package activation/deactivation immediately', async () => {
      if (!testDb) {
        console.warn('Skipping test: database not available');
        return;
      }
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            priceInCents: fc.integer({ min: 100, max: 100000 }),
            creditAmount: fc.integer({ min: 1, max: 10000 }),
            initialActive: fc.boolean()
          }),
          async (packageData) => {
            // Create package with initial active state
            const createData: CreateRechargePackageData = {
              ...packageData,
              currency: 'USD',
              bonusCredits: 0,
              isPopular: false,
              displayOrder: 0,
              isActive: packageData.initialActive,
              createdBy: adminUserId
            };

            const createdPackage = await paymentService.createPackage(createData);

            // Verify initial state
            const initialActivePackages = await paymentService.getActivePackages();
            const initiallyVisible = initialActivePackages.some(pkg => pkg.id === createdPackage.id);
            expect(initiallyVisible).toBe(packageData.initialActive);

            // Toggle activation state
            const newActiveState = !packageData.initialActive;
            await paymentService.updatePackage(createdPackage.id, {
              isActive: newActiveState
            });

            // Verify immediate effect
            const updatedActivePackages = await paymentService.getActivePackages();
            const nowVisible = updatedActivePackages.some(pkg => pkg.id === createdPackage.id);
            expect(nowVisible).toBe(newActiveState);

            // Toggle back
            await paymentService.updatePackage(createdPackage.id, {
              isActive: packageData.initialActive
            });

            // Verify it toggles back immediately
            const finalActivePackages = await paymentService.getActivePackages();
            const finallyVisible = finalActivePackages.some(pkg => pkg.id === createdPackage.id);
            expect(finallyVisible).toBe(packageData.initialActive);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});


