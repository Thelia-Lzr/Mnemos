"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const uuid_1 = require("uuid");
const PaymentService_1 = require("./../services/PaymentService");
const RechargePackage_1 = require("./../models/RechargePackage");
const setup_1 = require("../setup");
describe('Admin Functionality Property Tests', () => {
    let paymentService;
    let packageModel;
    let adminUserId;
    beforeAll(async () => {
        if (!setup_1.testDb) {
            console.warn('Test database not available, skipping admin functionality tests');
            return;
        }
        try {
            paymentService = new PaymentService_1.PaymentService(setup_1.testDb);
            packageModel = new RechargePackage_1.RechargePackageModel(setup_1.testDb);
            adminUserId = (0, uuid_1.v4)();
            await setup_1.testDb.query(`INSERT INTO users (id, username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO UPDATE SET 
           id = EXCLUDED.id,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role`, [
                adminUserId,
                `admin_test_${Date.now()}`,
                `admin_${Date.now()}@test.com`,
                'hashed_password',
                'admin'
            ]);
        }
        catch (error) {
            console.warn('Failed to setup admin test environment:', error);
        }
    });
    afterAll(async () => {
        if (!setup_1.testDb)
            return;
        try {
            await setup_1.testDb.query('DELETE FROM recharge_packages WHERE created_by = $1', [adminUserId]);
            await setup_1.testDb.query('DELETE FROM users WHERE id = $1', [adminUserId]);
        }
        catch (error) {
            console.warn('Failed to cleanup admin test data:', error);
        }
    });
    beforeEach(async () => {
        if (!setup_1.testDb)
            return;
        try {
            const userCheck = await setup_1.testDb.query('SELECT id FROM users WHERE id = $1', [adminUserId]);
            if (userCheck.rows.length === 0) {
                await setup_1.testDb.query(`INSERT INTO users (id, username, email, password_hash, role) 
           VALUES ($1, $2, $3, $4, $5)`, [
                    adminUserId,
                    `admin_test_${Date.now()}`,
                    `admin_${Date.now()}@test.com`,
                    'hashed_password',
                    'admin'
                ]);
            }
        }
        catch (error) {
            console.warn('Failed to ensure admin user exists:', error);
        }
        try {
            await setup_1.testDb.query('DELETE FROM recharge_packages WHERE created_by = $1', [adminUserId]);
        }
        catch (error) {
        }
    });
    describe('Property 13: Package Configuration Effectiveness', () => {
        test('should immediately reflect package updates in user-facing API', async () => {
            if (!setup_1.testDb) {
                console.warn('Skipping test: database not available');
                return;
            }
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                name: fast_check_1.default.string({ minLength: 1, maxLength: 50 }),
                description: fast_check_1.default.string({ minLength: 1, maxLength: 200 }),
                priceInCents: fast_check_1.default.integer({ min: 100, max: 100000 }),
                creditAmount: fast_check_1.default.integer({ min: 1, max: 10000 }),
                bonusCredits: fast_check_1.default.integer({ min: 0, max: 1000 }),
                isActive: fast_check_1.default.boolean(),
                isPopular: fast_check_1.default.boolean(),
                displayOrder: fast_check_1.default.integer({ min: 0, max: 100 })
            }), fast_check_1.default.record({
                name: fast_check_1.default.option(fast_check_1.default.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                description: fast_check_1.default.option(fast_check_1.default.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
                priceInCents: fast_check_1.default.option(fast_check_1.default.integer({ min: 100, max: 100000 }), { nil: undefined }),
                creditAmount: fast_check_1.default.option(fast_check_1.default.integer({ min: 1, max: 10000 }), { nil: undefined }),
                bonusCredits: fast_check_1.default.option(fast_check_1.default.integer({ min: 0, max: 1000 }), { nil: undefined }),
                isActive: fast_check_1.default.option(fast_check_1.default.boolean(), { nil: undefined }),
                isPopular: fast_check_1.default.option(fast_check_1.default.boolean(), { nil: undefined }),
                displayOrder: fast_check_1.default.option(fast_check_1.default.integer({ min: 0, max: 100 }), { nil: undefined })
            }), async (initialData, updateData) => {
                const createData = {
                    ...initialData,
                    currency: 'USD',
                    createdBy: adminUserId
                };
                const createdPackage = await paymentService.createPackage(createData);
                expect(createdPackage).toBeDefined();
                expect(createdPackage.id).toBeDefined();
                const initialActivePackages = await paymentService.getActivePackages();
                const initialPackageInList = initialActivePackages.find(pkg => pkg.id === createdPackage.id);
                if (initialData.isActive) {
                    expect(initialPackageInList).toBeDefined();
                    expect(initialPackageInList.name).toBe(initialData.name);
                    expect(initialPackageInList.priceInCents).toBe(initialData.priceInCents);
                    expect(initialPackageInList.creditAmount).toBe(initialData.creditAmount);
                }
                else {
                    expect(initialPackageInList).toBeUndefined();
                }
                const updatedPackage = await paymentService.updatePackage(createdPackage.id, updateData);
                expect(updatedPackage).toBeDefined();
                const updatedActivePackages = await paymentService.getActivePackages();
                const updatedPackageInList = updatedActivePackages.find(pkg => pkg.id === createdPackage.id);
                const expectedName = updateData.name !== undefined ? updateData.name : initialData.name;
                const expectedPrice = updateData.priceInCents !== undefined ? updateData.priceInCents : initialData.priceInCents;
                const expectedCredits = updateData.creditAmount !== undefined ? updateData.creditAmount : initialData.creditAmount;
                const expectedBonusCredits = updateData.bonusCredits !== undefined ? updateData.bonusCredits : initialData.bonusCredits;
                const expectedActive = updateData.isActive !== undefined ? updateData.isActive : initialData.isActive;
                const expectedPopular = updateData.isPopular !== undefined ? updateData.isPopular : initialData.isPopular;
                const expectedOrder = updateData.displayOrder !== undefined ? updateData.displayOrder : initialData.displayOrder;
                if (expectedActive) {
                    expect(updatedPackageInList).toBeDefined();
                    expect(updatedPackageInList.name).toBe(expectedName);
                    expect(updatedPackageInList.priceInCents).toBe(expectedPrice);
                    expect(updatedPackageInList.creditAmount).toBe(expectedCredits);
                    expect(updatedPackageInList.bonusCredits).toBe(expectedBonusCredits);
                    expect(updatedPackageInList.isPopular).toBe(expectedPopular);
                    expect(updatedPackageInList.displayOrder).toBe(expectedOrder);
                    expect(updatedPackageInList.isActive).toBe(true);
                }
                else {
                    expect(updatedPackageInList).toBeUndefined();
                }
                const allPackages = await paymentService.getAllPackages();
                const packageInAdminList = allPackages.find(pkg => pkg.id === createdPackage.id);
                expect(packageInAdminList).toBeDefined();
                expect(packageInAdminList.name).toBe(expectedName);
                expect(packageInAdminList.priceInCents).toBe(expectedPrice);
                expect(packageInAdminList.creditAmount).toBe(expectedCredits);
                expect(packageInAdminList.isActive).toBe(expectedActive);
                const individualPackage = await paymentService.getPackageById(createdPackage.id);
                expect(individualPackage).toBeDefined();
                expect(individualPackage.name).toBe(expectedName);
                expect(individualPackage.priceInCents).toBe(expectedPrice);
                expect(individualPackage.creditAmount).toBe(expectedCredits);
                expect(individualPackage.isActive).toBe(expectedActive);
            }), { numRuns: 50 });
        });
        test('should maintain package ordering consistency after updates', async () => {
            if (!setup_1.testDb) {
                console.warn('Skipping test: database not available');
                return;
            }
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.record({
                name: fast_check_1.default.string({ minLength: 1, maxLength: 50 }),
                description: fast_check_1.default.string({ minLength: 1, maxLength: 200 }),
                priceInCents: fast_check_1.default.integer({ min: 100, max: 100000 }),
                creditAmount: fast_check_1.default.integer({ min: 1, max: 10000 }),
                displayOrder: fast_check_1.default.integer({ min: 0, max: 10 }),
                isActive: fast_check_1.default.constant(true)
            }), { minLength: 2, maxLength: 5 }), fast_check_1.default.record({
                packageIndex: fast_check_1.default.integer({ min: 0, max: 4 }),
                newDisplayOrder: fast_check_1.default.integer({ min: 0, max: 10 })
            }), async (packagesData, updateInfo) => {
                if (updateInfo.packageIndex >= packagesData.length)
                    return;
                const createdPackages = [];
                for (const packageData of packagesData) {
                    const createData = {
                        ...packageData,
                        currency: 'USD',
                        bonusCredits: 0,
                        isPopular: false,
                        createdBy: adminUserId
                    };
                    const pkg = await paymentService.createPackage(createData);
                    createdPackages.push(pkg);
                }
                const initialActivePackages = await paymentService.getActivePackages();
                const initialOrdering = initialActivePackages
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map(pkg => pkg.id);
                const packageToUpdate = createdPackages[updateInfo.packageIndex];
                await paymentService.updatePackage(packageToUpdate.id, {
                    displayOrder: updateInfo.newDisplayOrder
                });
                const updatedActivePackages = await paymentService.getActivePackages();
                const updatedOrdering = updatedActivePackages
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map(pkg => pkg.id);
                const updatedPackage = updatedActivePackages.find(pkg => pkg.id === packageToUpdate.id);
                expect(updatedPackage).toBeDefined();
                expect(updatedPackage.displayOrder).toBe(updateInfo.newDisplayOrder);
                const expectedPosition = updatedActivePackages
                    .filter(pkg => pkg.displayOrder <= updateInfo.newDisplayOrder)
                    .length - 1;
                const actualPosition = updatedOrdering.indexOf(packageToUpdate.id);
                expect(actualPosition).toBeGreaterThanOrEqual(0);
                expect(updatedPackage.displayOrder).toBe(updateInfo.newDisplayOrder);
            }), { numRuns: 30 });
        });
        test('should handle package activation/deactivation immediately', async () => {
            if (!setup_1.testDb) {
                console.warn('Skipping test: database not available');
                return;
            }
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
                name: fast_check_1.default.string({ minLength: 1, maxLength: 50 }),
                description: fast_check_1.default.string({ minLength: 1, maxLength: 200 }),
                priceInCents: fast_check_1.default.integer({ min: 100, max: 100000 }),
                creditAmount: fast_check_1.default.integer({ min: 1, max: 10000 }),
                initialActive: fast_check_1.default.boolean()
            }), async (packageData) => {
                const createData = {
                    ...packageData,
                    currency: 'USD',
                    bonusCredits: 0,
                    isPopular: false,
                    displayOrder: 0,
                    isActive: packageData.initialActive,
                    createdBy: adminUserId
                };
                const createdPackage = await paymentService.createPackage(createData);
                const initialActivePackages = await paymentService.getActivePackages();
                const initiallyVisible = initialActivePackages.some(pkg => pkg.id === createdPackage.id);
                expect(initiallyVisible).toBe(packageData.initialActive);
                const newActiveState = !packageData.initialActive;
                await paymentService.updatePackage(createdPackage.id, {
                    isActive: newActiveState
                });
                const updatedActivePackages = await paymentService.getActivePackages();
                const nowVisible = updatedActivePackages.some(pkg => pkg.id === createdPackage.id);
                expect(nowVisible).toBe(newActiveState);
                await paymentService.updatePackage(createdPackage.id, {
                    isActive: packageData.initialActive
                });
                const finalActivePackages = await paymentService.getActivePackages();
                const finallyVisible = finalActivePackages.some(pkg => pkg.id === createdPackage.id);
                expect(finallyVisible).toBe(packageData.initialActive);
            }), { numRuns: 50 });
        });
    });
});
//# sourceMappingURL=adminFunctionality.test.js.map