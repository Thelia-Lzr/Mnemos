"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_VALIDATION_MESSAGES = exports.USER_VALIDATION_RULES = void 0;
exports.USER_VALIDATION_RULES = {
    username: {
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_-]+$/
    },
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
    }
};
exports.USER_VALIDATION_MESSAGES = {
    username: {
        required: 'Username is required',
        minLength: `Username must be at least ${exports.USER_VALIDATION_RULES.username.minLength} characters long`,
        maxLength: `Username must be no more than ${exports.USER_VALIDATION_RULES.username.maxLength} characters long`,
        pattern: 'Username can only contain letters, numbers, underscores, and hyphens'
    },
    email: {
        required: 'Email is required',
        invalid: 'Please provide a valid email address'
    },
    password: {
        required: 'Password is required',
        minLength: `Password must be at least ${exports.USER_VALIDATION_RULES.password.minLength} characters long`,
        uppercase: 'Password must contain at least one uppercase letter',
        lowercase: 'Password must contain at least one lowercase letter',
        numbers: 'Password must contain at least one number',
        specialChars: 'Password must contain at least one special character (@$!%*?&)'
    }
};
//# sourceMappingURL=User.js.map