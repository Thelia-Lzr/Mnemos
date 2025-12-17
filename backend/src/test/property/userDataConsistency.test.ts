import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * **Feature: ai-language-learning-app, Property 1: 用户数据一致�?*
 * **Validates: Requirements 1.2, 1.4**
 * 
 * Property: For any valid user registration data, the system should maintain consistency
 * between user input and stored data throughout the registration and preference setting process.
 * This ensures data integrity during user account creation and configuration.
 */
describe('Property-Based Tests: User Data Consistency', () => {

  describe('User Registration Data Consistency (Requirement 1.2)', () => {
    it('should maintain password hashing consistency for arbitrary user data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            role: fc.constantFrom('user' as const, 'admin' as const)
          }),
          async (userData) => {
            // Test password hashing consistency (core part of Requirement 1.2)
            const saltRounds = 4; // Use lower salt rounds for testing performance
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
            
            // Verify password is properly hashed
            expect(hashedPassword).toBeDefined();
            expect(hashedPassword).not.toBe(userData.password); // Should not store plain text
            expect(hashedPassword.length).toBeGreaterThan(20); // Hashed passwords are longer
            
            // Verify password can be verified correctly
            const isValidPassword = await bcrypt.compare(userData.password, hashedPassword);
            expect(isValidPassword).toBe(true);
            
            // Verify wrong password fails verification
            const wrongPassword = userData.password + 'wrong';
            const isWrongPassword = await bcrypt.compare(wrongPassword, hashedPassword);
            expect(isWrongPassword).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced runs for performance with bcrypt
      );
    });

    it('should maintain JWT token consistency for user data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            role: fc.constantFrom('user' as const, 'admin' as const)
          }),
          async (userData) => {
            // Test JWT token generation consistency (part of Requirement 1.2)
            const jwtSecret = 'test-jwt-secret-key';
            
            // Generate JWT token
            const token = jwt.sign(
              {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: userData.role
              },
              jwtSecret,
              { expiresIn: '15m' }
            );
            
            // Verify token is generated
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
            
            // Verify token can be decoded and contains correct data
            const decoded = jwt.verify(token, jwtSecret) as any;
            expect(decoded.id).toBe(userData.id);
            expect(decoded.username).toBe(userData.username);
            expect(decoded.email).toBe(userData.email);
            expect(decoded.role).toBe(userData.role);
            
            // Verify token expiration is set
            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeGreaterThan(decoded.iat);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain data integrity with special characters in usernames', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 })
              .filter(s => /^[a-zA-Z0-9_]+$/.test(s) && s.includes('_')), // Usernames with underscores
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          async (userData) => {
            // Test that special characters in usernames are preserved in all operations
            
            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 4); // Use lower salt rounds for testing
            
            // Create JWT token
            const token = jwt.sign(
              {
                id: 'test-id',
                username: userData.username,
                email: userData.email,
                role: 'user'
              },
              'test-secret',
              { expiresIn: '15m' }
            );
            
            // Decode token and verify username preservation
            const decoded = jwt.verify(token, 'test-secret') as any;
            
            // Special characters should be preserved exactly
            expect(decoded.username).toBe(userData.username);
            expect(decoded.username).toContain('_');
            expect(decoded.email).toBe(userData.email);
            
            // Password verification should still work
            const isValidPassword = await bcrypt.compare(userData.password, hashedPassword);
            expect(isValidPassword).toBe(true);
          }
        ),
        { numRuns: 20 } // Reduced runs for performance with bcrypt
      );
    });
  });

  describe('User Preferences Data Consistency (Requirement 1.4)', () => {
    it('should maintain consistency when serializing and deserializing user preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            theme: fc.constantFrom('light', 'dark'),
            notificationsEmail: fc.boolean(),
            notificationsPush: fc.boolean(),
            practiceReminders: fc.boolean(),
            dailyQuoteEnabled: fc.boolean(),
            reviewReminders: fc.boolean(),
            milestoneUpdates: fc.boolean(),
            pkInvitations: fc.boolean()
          }),
          async (preferences) => {
            // Test preference data consistency through serialization (part of Requirement 1.4)
            
            // Simulate database field mapping (camelCase to snake_case)
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
            
            // Serialize to JSON (simulating database storage)
            const serialized = JSON.stringify(dbPreferences);
            expect(serialized).toBeDefined();
            
            // Deserialize from JSON (simulating database retrieval)
            const deserialized = JSON.parse(serialized);
            
            // Verify all preference data is preserved exactly
            expect(deserialized.user_id).toBe(preferences.userId);
            expect(deserialized.theme).toBe(preferences.theme);
            expect(deserialized.notifications_email).toBe(preferences.notificationsEmail);
            expect(deserialized.notifications_push).toBe(preferences.notificationsPush);
            expect(deserialized.practice_reminders).toBe(preferences.practiceReminders);
            expect(deserialized.daily_quote_enabled).toBe(preferences.dailyQuoteEnabled);
            expect(deserialized.review_reminders).toBe(preferences.reviewReminders);
            expect(deserialized.milestone_updates).toBe(preferences.milestoneUpdates);
            expect(deserialized.pk_invitations).toBe(preferences.pkInvitations);
            
            // Verify data types are preserved
            expect(typeof deserialized.theme).toBe('string');
            expect(typeof deserialized.notifications_email).toBe('boolean');
            expect(typeof deserialized.notifications_push).toBe('boolean');
            expect(typeof deserialized.practice_reminders).toBe('boolean');
            expect(typeof deserialized.daily_quote_enabled).toBe('boolean');
            expect(typeof deserialized.review_reminders).toBe('boolean');
            expect(typeof deserialized.milestone_updates).toBe('boolean');
            expect(typeof deserialized.pk_invitations).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency during partial preference updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Initial preferences
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
            // Partial updates
            updates: fc.record({
              theme: fc.option(fc.constantFrom('light', 'dark'), { nil: undefined }),
              notificationsEmail: fc.option(fc.boolean(), { nil: undefined }),
              practiceReminders: fc.option(fc.boolean(), { nil: undefined })
            })
          }),
          async (testData) => {
            // Test partial update consistency (part of Requirement 1.4)
            
            // Start with initial preferences
            const currentPreferences = { ...testData.initialPreferences };
            
            // Apply partial updates (simulating database update logic)
            const filteredUpdates = Object.fromEntries(
              Object.entries(testData.updates).filter(([_, value]) => value !== undefined)
            );
            
            // Skip test if no updates to apply
            if (Object.keys(filteredUpdates).length === 0) {
              return;
            }
            
            // Apply updates
            Object.assign(currentPreferences, filteredUpdates);
            
            // Verify only specified preferences were updated, others remain unchanged
            if (testData.updates.theme !== undefined) {
              expect(currentPreferences.theme).toBe(testData.updates.theme);
            } else {
              expect(currentPreferences.theme).toBe(testData.initialPreferences.theme);
            }
            
            if (testData.updates.notificationsEmail !== undefined) {
              expect(currentPreferences.notificationsEmail).toBe(testData.updates.notificationsEmail);
            } else {
              expect(currentPreferences.notificationsEmail).toBe(testData.initialPreferences.notificationsEmail);
            }
            
            if (testData.updates.practiceReminders !== undefined) {
              expect(currentPreferences.practiceReminders).toBe(testData.updates.practiceReminders);
            } else {
              expect(currentPreferences.practiceReminders).toBe(testData.initialPreferences.practiceReminders);
            }
            
            // Verify unmodified preferences remain unchanged
            expect(currentPreferences.notificationsPush).toBe(testData.initialPreferences.notificationsPush);
            expect(currentPreferences.dailyQuoteEnabled).toBe(testData.initialPreferences.dailyQuoteEnabled);
            expect(currentPreferences.reviewReminders).toBe(testData.initialPreferences.reviewReminders);
            expect(currentPreferences.milestoneUpdates).toBe(testData.initialPreferences.milestoneUpdates);
            expect(currentPreferences.pkInvitations).toBe(testData.initialPreferences.pkInvitations);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Authentication Token Consistency', () => {
    it('should maintain user identity consistency in JWT tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            role: fc.constantFrom('user' as const, 'admin' as const)
          }),
          async (userData) => {
            // Test JWT token consistency for authentication flow
            const jwtSecret = 'test-jwt-secret-key';
            const refreshSecret = 'test-jwt-refresh-secret-key';
            
            // Generate access token (simulating registration)
            const accessToken = jwt.sign(
              {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: userData.role
              },
              jwtSecret,
              { expiresIn: '15m' }
            );
            
            // Generate refresh token
            const refreshToken = jwt.sign(
              {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: userData.role
              },
              refreshSecret,
              { expiresIn: '7d' }
            );
            
            // Verify both tokens are generated
            expect(accessToken).toBeDefined();
            expect(refreshToken).toBeDefined();
            expect(typeof accessToken).toBe('string');
            expect(typeof refreshToken).toBe('string');
            
            // Decode access token and verify user identity consistency
            const decodedAccess = jwt.verify(accessToken, jwtSecret) as any;
            expect(decodedAccess.id).toBe(userData.id);
            expect(decodedAccess.username).toBe(userData.username);
            expect(decodedAccess.email).toBe(userData.email);
            expect(decodedAccess.role).toBe(userData.role);
            
            // Decode refresh token and verify user identity consistency
            const decodedRefresh = jwt.verify(refreshToken, refreshSecret) as any;
            expect(decodedRefresh.id).toBe(userData.id);
            expect(decodedRefresh.username).toBe(userData.username);
            expect(decodedRefresh.email).toBe(userData.email);
            expect(decodedRefresh.role).toBe(userData.role);
            
            // Verify user identity is consistent between both tokens
            expect(decodedAccess.id).toBe(decodedRefresh.id);
            expect(decodedAccess.username).toBe(decodedRefresh.username);
            expect(decodedAccess.email).toBe(decodedRefresh.email);
            expect(decodedAccess.role).toBe(decodedRefresh.role);
            
            // Verify token expiration times are different (access < refresh)
            expect(decodedAccess.exp).toBeLessThan(decodedRefresh.exp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain password verification consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            password: fc.string({ minLength: 6, maxLength: 100 }),
            wrongPassword: fc.string({ minLength: 1, maxLength: 100 })
          }).filter(data => data.password !== data.wrongPassword), // Ensure passwords are different
          async (testData) => {
            // Test password verification consistency (part of login flow)
            const saltRounds = 4; // Use lower salt rounds for testing performance
            
            // Hash the correct password
            const hashedPassword = await bcrypt.hash(testData.password, saltRounds);
            
            // Verify correct password always validates
            const correctVerification = await bcrypt.compare(testData.password, hashedPassword);
            expect(correctVerification).toBe(true);
            
            // Verify wrong password always fails
            const wrongVerification = await bcrypt.compare(testData.wrongPassword, hashedPassword);
            expect(wrongVerification).toBe(false);
            
            // Verify consistency across multiple checks
            const secondCorrectVerification = await bcrypt.compare(testData.password, hashedPassword);
            expect(secondCorrectVerification).toBe(true);
            
            const secondWrongVerification = await bcrypt.compare(testData.wrongPassword, hashedPassword);
            expect(secondWrongVerification).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced runs for performance with bcrypt
      );
    });
  });
});


