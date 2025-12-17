import { 
  USER_VALIDATION_RULES, 
  USER_VALIDATION_MESSAGES, 
  UserValidationResult, 
  UserDataValidation,
  CreateUserRequest 
} from '../models/User';

export class UserValidator implements UserDataValidation {
  
  validateUsername(username: string): UserValidationResult {
    const errors: string[] = [];

    if (!username) {
      errors.push(USER_VALIDATION_MESSAGES.username.required);
    } else {
      if (username.length < USER_VALIDATION_RULES.username.minLength) {
        errors.push(USER_VALIDATION_MESSAGES.username.minLength);
      }
      
      if (username.length > USER_VALIDATION_RULES.username.maxLength) {
        errors.push(USER_VALIDATION_MESSAGES.username.maxLength);
      }
      
      if (!USER_VALIDATION_RULES.username.pattern.test(username)) {
        errors.push(USER_VALIDATION_MESSAGES.username.pattern);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      field: 'username'
    };
  }

  validateEmail(email: string): UserValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push(USER_VALIDATION_MESSAGES.email.required);
    } else if (!USER_VALIDATION_RULES.email.pattern.test(email)) {
      errors.push(USER_VALIDATION_MESSAGES.email.invalid);
    }

    return {
      isValid: errors.length === 0,
      errors,
      field: 'email'
    };
  }

  validatePassword(password: string): UserValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push(USER_VALIDATION_MESSAGES.password.required);
    } else {
      if (password.length < USER_VALIDATION_RULES.password.minLength) {
        errors.push(USER_VALIDATION_MESSAGES.password.minLength);
      }
      
      if (USER_VALIDATION_RULES.password.requireUppercase && !/(?=.*[A-Z])/.test(password)) {
        errors.push(USER_VALIDATION_MESSAGES.password.uppercase);
      }
      
      if (USER_VALIDATION_RULES.password.requireLowercase && !/(?=.*[a-z])/.test(password)) {
        errors.push(USER_VALIDATION_MESSAGES.password.lowercase);
      }
      
      if (USER_VALIDATION_RULES.password.requireNumbers && !/(?=.*\d)/.test(password)) {
        errors.push(USER_VALIDATION_MESSAGES.password.numbers);
      }
      
      if (USER_VALIDATION_RULES.password.requireSpecialChars && !/(?=.*[@$!%*?&])/.test(password)) {
        errors.push(USER_VALIDATION_MESSAGES.password.specialChars);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      field: 'password'
    };
  }

  validateUserData(userData: Partial<CreateUserRequest>): UserValidationResult {
    const allErrors: string[] = [];

    // Validate username if provided
    if (userData.username !== undefined) {
      const usernameValidation = this.validateUsername(userData.username);
      if (!usernameValidation.isValid) {
        allErrors.push(...usernameValidation.errors);
      }
    }

    // Validate email if provided
    if (userData.email !== undefined) {
      const emailValidation = this.validateEmail(userData.email);
      if (!emailValidation.isValid) {
        allErrors.push(...emailValidation.errors);
      }
    }

    // Validate password if provided
    if (userData.password !== undefined) {
      const passwordValidation = this.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        allErrors.push(...passwordValidation.errors);
      }
    }

    // Validate language if provided
    if (userData.language !== undefined) {
      if (!['en', 'ja', 'fr'].includes(userData.language)) {
        allErrors.push('Language must be en, ja, or fr');
      }
    }

    // Validate current level if provided
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

  // Additional validation methods for specific use cases
  validateUserPreferences(preferences: any): UserValidationResult {
    const errors: string[] = [];

    if (preferences.theme !== undefined && !['light', 'dark'].includes(preferences.theme)) {
      errors.push('Theme must be light or dark');
    }

    // Validate boolean fields
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

  // Validate password strength (additional method for password change)
  validatePasswordStrength(password: string): { 
    score: number; 
    feedback: string[]; 
    isStrong: boolean 
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('Add special characters (@$!%*?&)');

    // Common patterns check
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

// Export singleton instance
export const userValidator = new UserValidator();
