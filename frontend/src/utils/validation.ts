export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  language?: string;
  currentLevel?: string;
}

export const validateLoginForm = (data: LoginFormData): ValidationResult => {
  const errors: Record<string, string> = {};
  
  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please provide a valid email address';
  }
  
  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateRegisterForm = (data: RegisterFormData): ValidationResult => {
  const errors: Record<string, string> = {};
  
  // Username validation
  if (!data.username) {
    errors.username = 'Username is required';
  } else if (data.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (data.username.length > 50) {
    errors.username = 'Username must be no more than 50 characters';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  
  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please provide a valid email address';
  }
  
  // Password validation - match backend requirements
  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordErrors = [];
    
    if (data.password.length < 8) {
      passwordErrors.push('at least 8 characters');
    }
    if (!/(?=.*[a-z])/.test(data.password)) {
      passwordErrors.push('one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(data.password)) {
      passwordErrors.push('one uppercase letter');
    }
    if (!/(?=.*\d)/.test(data.password)) {
      passwordErrors.push('one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(data.password)) {
      passwordErrors.push('one special character (@$!%*?&)');
    }
    
    if (passwordErrors.length > 0) {
      errors.password = `Password must contain ${passwordErrors.join(', ')}`;
    }
  }
  
  // Confirm password validation
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Language validation (optional)
  if (data.language && !['en', 'ja', 'fr'].includes(data.language)) {
    errors.language = 'Please select a valid language';
  }
  
  // Current level validation (optional, but required if language is selected)
  if (data.language && data.currentLevel && !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(data.currentLevel)) {
    errors.currentLevel = 'Please select a valid language level';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateUsername = (username: string): boolean => {
  return username.length >= 3 && 
         username.length <= 50 && 
         /^[a-zA-Z0-9_-]+$/.test(username);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8 &&
         /(?=.*[a-z])/.test(password) &&
         /(?=.*[A-Z])/.test(password) &&
         /(?=.*\d)/.test(password) &&
         /(?=.*[@$!%*?&])/.test(password);
};