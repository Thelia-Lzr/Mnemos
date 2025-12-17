"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('Property-Based Tests: User Data Consistency', () => {
    describe('User Registration Data Consistency (Requirement 1.2)', () => {
        it('should maintain password hashing consistency for arbitrary user data', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
                email: fc.emailAddress(),
                password: fc.string({ minLength: 6, maxLength: 100 }),
                role: fc.constantFrom('user', 'admin')
            }), async (userData) => {
                const saltRounds = 4;
                const hashedPassword = await bcryptjs_1.default.hash(userData.password, saltRounds);
                expect(hashedPassword).toBeDefined();
                expect(hashedPassword).not.toBe(userData.password);
                expect(hashedPassword.length).toBeGreaterThan(20);
                const isValidPassword = await bcryptjs_1.default.compare(userData.password, hashedPassword);
                expect(isValidPassword).toBe(true);
                const wrongPassword = userData.password + 'wrong';
                const isWrongPassword = await bcryptjs_1.default.compare(wrongPassword, hashedPassword);
                expect(isWrongPassword).toBe(false);
            }), { numRuns: 20 });
        });
        it('should maintain JWT token consistency for user data', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                id: fc.uuid(),
                username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
                email: fc.emailAddress(),
                role: fc.constantFrom('user', 'admin')
            }), async (userData) => {
                const jwtSecret = 'test-jwt-secret-key';
                const token = jsonwebtoken_1.default.sign({
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    role: userData.role
                }, jwtSecret, { expiresIn: '15m' });
                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                expect(token.length).toBeGreaterThan(0);
                const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
                expect(decoded.id).toBe(userData.id);
                expect(decoded.username).toBe(userData.username);
                expect(decoded.email).toBe(userData.email);
                expect(decoded.role).toBe(userData.role);
                expect(decoded.exp).toBeDefined();
                expect(decoded.iat).toBeDefined();
                expect(decoded.exp).toBeGreaterThan(decoded.iat);
            }), { numRuns: 100 });
        });
        it('should maintain data integrity with special characters in usernames', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                username: fc.string({ minLength: 3, maxLength: 20 })
                    .filter(s => /^[a-zA-Z0-9_]+$/.test(s) && s.includes('_')),
                email: fc.emailAddress(),
                password: fc.string({ minLength: 8, maxLength: 50 })
            }), async (userData) => {
                const hashedPassword = await bcryptjs_1.default.hash(userData.password, 4);
                const token = jsonwebtoken_1.default.sign({
                    id: 'test-id',
                    username: userData.username,
                    email: userData.email,
                    role: 'user'
                }, 'test-secret', { expiresIn: '15m' });
                const decoded = jsonwebtoken_1.default.verify(token, 'test-secret');
                expect(decoded.username).toBe(userData.username);
                expect(decoded.username).toContain('_');
                expect(decoded.email).toBe(userData.email);
                const isValidPassword = await bcryptjs_1.default.compare(userData.password, hashedPassword);
                expect(isValidPassword).toBe(true);
            }), { numRuns: 20 });
        });
    });
    describe('User Preferences Data Consistency (Requirement 1.4)', () => {
        it('should maintain consistency when serializing and deserializing user preferences', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                userId: fc.uuid(),
                theme: fc.constantFrom('light', 'dark'),
                notificationsEmail: fc.boolean(),
                notificationsPush: fc.boolean(),
                practiceReminders: fc.boolean(),
                dailyQuoteEnabled: fc.boolean(),
                reviewReminders: fc.boolean(),
                milestoneUpdates: fc.boolean(),
                pkInvitations: fc.boolean()
            }), async (preferences) => {
                const dbPreferences = {
                    user_id: preferences.userId,
                    theme: preferences.theme,
                    notifications_email: preferences.notificationsEmail,
                    notifications_push: preferences.notificationsPush,
                    practice_reminders: preferences.practiceReminders,
                    daily_quote_enabled: preferences.dailyQuoteEnabled,
                    review_reminders: preferences.reviewReminders,
                    milestone_updates: preferences.milestoneUpdates,
                    pk_invitations: preferences.pkInvitations
                };
                const serialized = JSON.stringify(dbPreferences);
                expect(serialized).toBeDefined();
                const deserialized = JSON.parse(serialized);
                expect(deserialized.user_id).toBe(preferences.userId);
                expect(deserialized.theme).toBe(preferences.theme);
                expect(deserialized.notifications_email).toBe(preferences.notificationsEmail);
                expect(deserialized.notifications_push).toBe(preferences.notificationsPush);
                expect(deserialized.practice_reminders).toBe(preferences.practiceReminders);
                expect(deserialized.daily_quote_enabled).toBe(preferences.dailyQuoteEnabled);
                expect(deserialized.review_reminders).toBe(preferences.reviewReminders);
                expect(deserialized.milestone_updates).toBe(preferences.milestoneUpdates);
                expect(deserialized.pk_invitations).toBe(preferences.pkInvitations);
                expect(typeof deserialized.theme).toBe('string');
                expect(typeof deserialized.notifications_email).toBe('boolean');
                expect(typeof deserialized.notifications_push).toBe('boolean');
                expect(typeof deserialized.practice_reminders).toBe('boolean');
                expect(typeof deserialized.daily_quote_enabled).toBe('boolean');
                expect(typeof deserialized.review_reminders).toBe('boolean');
                expect(typeof deserialized.milestone_updates).toBe('boolean');
                expect(typeof deserialized.pk_invitations).toBe('boolean');
            }), { numRuns: 100 });
        });
        it('should maintain consistency during partial preference updates', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                initialPreferences: fc.record({
                    theme: fc.constantFrom('light', 'dark'),
                    notificationsEmail: fc.boolean(),
                    notificationsPush: fc.boolean(),
                    practiceReminders: fc.boolean(),
                    dailyQuoteEnabled: fc.boolean(),
                    reviewReminders: fc.boolean(),
                    milestoneUpdates: fc.boolean(),
                    pkInvitations: fc.boolean()
                }),
                updates: fc.record({
                    theme: fc.option(fc.constantFrom('light', 'dark'), { nil: undefined }),
                    notificationsEmail: fc.option(fc.boolean(), { nil: undefined }),
                    practiceReminders: fc.option(fc.boolean(), { nil: undefined })
                })
            }), async (testData) => {
                const currentPreferences = { ...testData.initialPreferences };
                const filteredUpdates = Object.fromEntries(Object.entries(testData.updates).filter(([_, value]) => value !== undefined));
                if (Object.keys(filteredUpdates).length === 0) {
                    return;
                }
                Object.assign(currentPreferences, filteredUpdates);
                if (testData.updates.theme !== undefined) {
                    expect(currentPreferences.theme).toBe(testData.updates.theme);
                }
                else {
                    expect(currentPreferences.theme).toBe(testData.initialPreferences.theme);
                }
                if (testData.updates.notificationsEmail !== undefined) {
                    expect(currentPreferences.notificationsEmail).toBe(testData.updates.notificationsEmail);
                }
                else {
                    expect(currentPreferences.notificationsEmail).toBe(testData.initialPreferences.notificationsEmail);
                }
                if (testData.updates.practiceReminders !== undefined) {
                    expect(currentPreferences.practiceReminders).toBe(testData.updates.practiceReminders);
                }
                else {
                    expect(currentPreferences.practiceReminders).toBe(testData.initialPreferences.practiceReminders);
                }
                expect(currentPreferences.notificationsPush).toBe(testData.initialPreferences.notificationsPush);
                expect(currentPreferences.dailyQuoteEnabled).toBe(testData.initialPreferences.dailyQuoteEnabled);
                expect(currentPreferences.reviewReminders).toBe(testData.initialPreferences.reviewReminders);
                expect(currentPreferences.milestoneUpdates).toBe(testData.initialPreferences.milestoneUpdates);
                expect(currentPreferences.pkInvitations).toBe(testData.initialPreferences.pkInvitations);
            }), { numRuns: 100 });
        });
    });
    describe('Authentication Token Consistency', () => {
        it('should maintain user identity consistency in JWT tokens', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                id: fc.uuid(),
                username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
                email: fc.emailAddress(),
                role: fc.constantFrom('user', 'admin')
            }), async (userData) => {
                const jwtSecret = 'test-jwt-secret-key';
                const refreshSecret = 'test-jwt-refresh-secret-key';
                const accessToken = jsonwebtoken_1.default.sign({
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    role: userData.role
                }, jwtSecret, { expiresIn: '15m' });
                const refreshToken = jsonwebtoken_1.default.sign({
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    role: userData.role
                }, refreshSecret, { expiresIn: '7d' });
                expect(accessToken).toBeDefined();
                expect(refreshToken).toBeDefined();
                expect(typeof accessToken).toBe('string');
                expect(typeof refreshToken).toBe('string');
                const decodedAccess = jsonwebtoken_1.default.verify(accessToken, jwtSecret);
                expect(decodedAccess.id).toBe(userData.id);
                expect(decodedAccess.username).toBe(userData.username);
                expect(decodedAccess.email).toBe(userData.email);
                expect(decodedAccess.role).toBe(userData.role);
                const decodedRefresh = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
                expect(decodedRefresh.id).toBe(userData.id);
                expect(decodedRefresh.username).toBe(userData.username);
                expect(decodedRefresh.email).toBe(userData.email);
                expect(decodedRefresh.role).toBe(userData.role);
                expect(decodedAccess.id).toBe(decodedRefresh.id);
                expect(decodedAccess.username).toBe(decodedRefresh.username);
                expect(decodedAccess.email).toBe(decodedRefresh.email);
                expect(decodedAccess.role).toBe(decodedRefresh.role);
                expect(decodedAccess.exp).toBeLessThan(decodedRefresh.exp);
            }), { numRuns: 100 });
        });
        it('should maintain password verification consistency', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                password: fc.string({ minLength: 6, maxLength: 100 }),
                wrongPassword: fc.string({ minLength: 1, maxLength: 100 })
            }).filter(data => data.password !== data.wrongPassword), async (testData) => {
                const saltRounds = 4;
                const hashedPassword = await bcryptjs_1.default.hash(testData.password, saltRounds);
                const correctVerification = await bcryptjs_1.default.compare(testData.password, hashedPassword);
                expect(correctVerification).toBe(true);
                const wrongVerification = await bcryptjs_1.default.compare(testData.wrongPassword, hashedPassword);
                expect(wrongVerification).toBe(false);
                const secondCorrectVerification = await bcryptjs_1.default.compare(testData.password, hashedPassword);
                expect(secondCorrectVerification).toBe(true);
                const secondWrongVerification = await bcryptjs_1.default.compare(testData.wrongPassword, hashedPassword);
                expect(secondWrongVerification).toBe(false);
            }), { numRuns: 20 });
        });
    });
});
//# sourceMappingURL=userDataConsistency.test.js.map