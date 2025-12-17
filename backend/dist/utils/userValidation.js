"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userValidator = exports.UserValidator = void 0;
const User_1 = require("../models/User");
class UserValidator {
    validateUsername(username) {
        const errors = [];
        if (!username) {
            errors.push(User_1.USER_VALIDATION_MESSAGES.username.required);
        }
        else {
            if (username.length < User_1.USER_VALIDATION_RULES.username.minLength) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.username.minLength);
            }
            if (username.length > User_1.USER_VALIDATION_RULES.username.maxLength) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.username.maxLength);
            }
            if (!User_1.USER_VALIDATION_RULES.username.pattern.test(username)) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.username.pattern);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            field: 'username'
        };
    }
    validateEmail(email) {
        const errors = [];
        if (!email) {
            errors.push(User_1.USER_VALIDATION_MESSAGES.email.required);
        }
        else if (!User_1.USER_VALIDATION_RULES.email.pattern.test(email)) {
            errors.push(User_1.USER_VALIDATION_MESSAGES.email.invalid);
        }
        return {
            isValid: errors.length === 0,
            errors,
            field: 'email'
        };
    }
    validatePassword(password) {
        const errors = [];
        if (!password) {
            errors.push(User_1.USER_VALIDATION_MESSAGES.password.required);
        }
        else {
            if (password.length < User_1.USER_VALIDATION_RULES.password.minLength) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.password.minLength);
            }
            if (User_1.USER_VALIDATION_RULES.password.requireUppercase && !/(?=.*[A-Z])/.test(password)) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.password.uppercase);
            }
            if (User_1.USER_VALIDATION_RULES.password.requireLowercase && !/(?=.*[a-z])/.test(password)) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.password.lowercase);
            }
            if (User_1.USER_VALIDATION_RULES.password.requireNumbers && !/(?=.*\d)/.test(password)) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.password.numbers);
            }
            if (User_1.USER_VALIDATION_RULES.password.requireSpecialChars && !/(?=.*[@$!%*?&])/.test(password)) {
                errors.push(User_1.USER_VALIDATION_MESSAGES.password.specialChars);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            field: 'password'
        };
    }
    validateUserData(userData) {
        const allErrors = [];
        if (userData.username !== undefined) {
            const usernameValidation = this.validateUsername(userData.username);
            if (!usernameValidation.isValid) {
                allErrors.push(...usernameValidation.errors);
            }
        }
        if (userData.email !== undefined) {
            const emailValidation = this.validateEmail(userData.email);
            if (!emailValidation.isValid) {
                allErrors.push(...emailValidation.errors);
            }
        }
        if (userData.password !== undefined) {
            const passwordValidation = this.validatePassword(userData.password);
            if (!passwordValidation.isValid) {
                allErrors.push(...passwordValidation.errors);
            }
        }
        if (userData.language !== undefined) {
            if (!['en', 'ja', 'fr'].includes(userData.language)) {
                allErrors.push('Language must be en, ja, or fr');
            }
        }
        if (userData.currentLevel !== undefined) {
            if (!['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(userData.currentLevel)) {
                allErrors.push('Current level must be A1, A2, B1, B2, C1, or C2');
            }
        }
        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }
    validateUserPreferences(preferences) {
        const errors = [];
        if (preferences.theme !== undefined && !['light', 'dark'].includes(preferences.theme)) {
            errors.push('Theme must be light or dark');
        }
        const booleanFields = [
            'notificationsEmail', 'notificationsPush', 'practiceReminders',
            'dailyQuoteEnabled', 'reviewReminders', 'milestoneUpdates', 'pkInvitations'
        ];
        booleanFields.forEach(field => {
            if (preferences[field] !== undefined && typeof preferences[field] !== 'boolean') {
                errors.push(`${field} must be a boolean value`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    validatePasswordStrength(password) {
        let score = 0;
        const feedback = [];
        if (password.length >= 8)
            score += 1;
        else
            feedback.push('Use at least 8 characters');
        if (password.length >= 12)
            score += 1;
        else if (password.length >= 8)
            feedback.push('Consider using 12+ characters for better security');
        if (/[a-z]/.test(password))
            score += 1;
        else
            feedback.push('Add lowercase letters');
        if (/[A-Z]/.test(password))
            score += 1;
        else
            feedback.push('Add uppercase letters');
        if (/\d/.test(password))
            score += 1;
        else
            feedback.push('Add numbers');
        if (/[@$!%*?&]/.test(password))
            score += 1;
        else
            feedback.push('Add special characters (@$!%*?&)');
        if (/(.)\1{2,}/.test(password)) {
            score -= 1;
            feedback.push('Avoid repeating characters');
        }
        if (/123|abc|qwe/i.test(password)) {
            score -= 1;
            feedback.push('Avoid common sequences');
        }
        return {
            score: Math.max(0, score),
            feedback,
            isStrong: score >= 5
        };
    }
}
exports.UserValidator = UserValidator;
exports.userValidator = new UserValidator();
//# sourceMappingURL=userValidation.js.map