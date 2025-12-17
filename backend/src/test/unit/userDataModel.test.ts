/**
 * @jest-environment node
 */

import { userValidator } from './../utils/userValidation';
import { USER_VALIDATION_RULES, USER_VALIDATION_MESSAGES } from './../models/User';

// Mock the test setup to avoid database connection for unit tests
jest.mock('../setup', () => ({
  setupTestEnvironment: jest.fn(),
  teardownTestEnvironment: jest.fn(),
  testDb: null,
  testRedis: null
}));

describe('User Data Model and Validation', () => {
  describe('User Validation Rules', () => {
    test('should have correct validation rules defined', () => {
      expect(USER_VALIDATION_RULES.username.minLength).toBe(3);
      expect(USER_VALIDATION_RULES.username.maxLength).toBe(50);
      expect(USER_VALIDATION_RULES.password.minLength).toBe(8);
      expect(USER_VALIDATION_RULES.password.requireUppercase).toBe(true);
      expect(USER_VALIDATION_RULES.password.requireLowercase).toBe(true);
      expect(USER_VALIDATION_RULES.password.requireNumbers).toBe(true);
      expect(USER_VALIDATION_RULES.password.requireSpecialChars).toBe(true);
    });

    test('should have validation messages defined', () => {
      expect(USER_VALIDATION_MESSAGES.username.required).toBeDefined();
      expect(USER_VALIDATION_MESSAGES.email.invalid).toBeDefined();
      expect(USER_VALIDATION_MESSAGES.password.minLength).toBeDefined();
    });
  });

  describe('Username Validation', () => {
    test('should validate correct username', () => {
      const result = userValidator.validateUsername('testuser123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject username that is too short', () => {
      const result = userValidator.validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.username.minLength);
    });

    test('should reject username that is too long', () => {
      const longUsername = 'a'.repeat(51);
      const result = userValidator.validateUsername(longUsername);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.username.maxLength);
    });

    test('should reject username with invalid characters', () => {
      const result = userValidator.validateUsername('test@user');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.username.pattern);
    });

    test('should reject empty username', () => {
      const result = userValidator.validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.username.required);
    });
  });

  describe('Email Validation', () => {
    test('should validate correct email', () => {
      const result = userValidator.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid email format', () => {
      const result = userValidator.validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.email.invalid);
    });

    test('should reject empty email', () => {
      const result = userValidator.validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.email.required);
    });
  });

  describe('Password Validation', () => {
    test('should validate strong password', () => {
      const result = userValidator.validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject password that is too short', () => {
      const result = userValidator.validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.password.minLength);
    });

    test('should reject password without uppercase', () => {
      const result = userValidator.validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.password.uppercase);
    });

    test('should reject password without lowercase', () => {
      const result = userValidator.validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.password.lowercase);
    });

    test('should reject password without numbers', () => {
      const result = userValidator.validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.password.numbers);
    });

    test('should reject password without special characters', () => {
      const result = userValidator.validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.password.specialChars);
    });

    test('should reject empty password', () => {
      const result = userValidator.validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(USER_VALIDATION_MESSAGES.password.required);
    });
  });

  describe('User Data Validation', () => {
    test('should validate complete user data', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPass123!',
        language: 'en' as const,
        currentLevel: 'B1' as const
      };

      const result = userValidator.validateUserData(userData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate partial user data', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      const result = userValidator.validateUserData(userData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid language', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPass123!',
        language: 'invalid' as any
      };

      const result = userValidator.validateUserData(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Language must be en, ja, or fr');
    });

    test('should reject invalid current level', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPass123!',
        currentLevel: 'invalid' as any
      };

      const result = userValidator.validateUserData(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current level must be A1, A2, B1, B2, C1, or C2');
    });

    test('should accumulate multiple validation errors', () => {
      const userData = {
        username: 'ab', // too short
        email: 'invalid-email', // invalid format
        password: 'weak', // too weak
        language: 'invalid' as any,
        currentLevel: 'invalid' as any
      };

      const result = userValidator.validateUserData(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('User Preferences Validation', () => {
    test('should validate correct preferences', () => {
      const preferences = {
        theme: 'light',
        notificationsEmail: true,
        practiceReminders: false
      };

      const result = userValidator.validateUserPreferences(preferences);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid theme', () => {
      const preferences = {
        theme: 'invalid'
      };

      const result = userValidator.validateUserPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Theme must be light or dark');
    });

    test('should reject non-boolean notification settings', () => {
      const preferences = {
        notificationsEmail: 'yes' as any
      };

      const result = userValidator.validateUserPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('notificationsEmail must be a boolean value');
    });
  });

  describe('Password Strength Analysis', () => {
    test('should analyze strong password correctly', () => {
      const result = userValidator.validatePasswordStrength('VeryStr0ngP@ssw0rd!');
      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.isStrong).toBe(true);
      expect(result.feedback).toHaveLength(0);
    });

    test('should analyze weak password correctly', () => {
      const result = userValidator.validatePasswordStrength('weak');
      expect(result.score).toBeLessThan(5);
      expect(result.isStrong).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    test('should detect common patterns', () => {
      const result = userValidator.validatePasswordStrength('Password123');
      expect(result.feedback).toContain('Add special characters (@$!%*?&)');
    });

    test('should detect repeating characters', () => {
      const result = userValidator.validatePasswordStrength('Passsssword123!');
      expect(result.feedback).toContain('Avoid repeating characters');
    });

    test('should detect common sequences', () => {
      const result = userValidator.validatePasswordStrength('Password123abc');
      expect(result.feedback).toContain('Avoid common sequences');
    });
  });
});


