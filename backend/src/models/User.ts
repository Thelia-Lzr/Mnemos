export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt: Date | null;
  updatedAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark';
  notificationsEmail: boolean;
  notificationsPush: boolean;
  practiceReminders: boolean;
  dailyQuoteEnabled: boolean;
  reviewReminders: boolean;
  milestoneUpdates: boolean;
  pkInvitations: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  language?: 'en' | 'ja' | 'fr';
  currentLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
  };
  message?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt: Date | null;
  preferences: UserPreferences;
  totalStudyTime: number;
  activeLanguages: string[];
}

// Validation interfaces
export interface UserValidationRules {
  username: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  email: {
    pattern: RegExp;
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

// Validation constants
export const USER_VALIDATION_RULES: UserValidationRules = {
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

// Validation error messages
export const USER_VALIDATION_MESSAGES = {
  username: {
    required: 'Username is required',
    minLength: `Username must be at least ${USER_VALIDATION_RULES.username.minLength} characters long`,
    maxLength: `Username must be no more than ${USER_VALIDATION_RULES.username.maxLength} characters long`,
    pattern: 'Username can only contain letters, numbers, underscores, and hyphens'
  },
  email: {
    required: 'Email is required',
    invalid: 'Please provide a valid email address'
  },
  password: {
    required: 'Password is required',
    minLength: `Password must be at least ${USER_VALIDATION_RULES.password.minLength} characters long`,
    uppercase: 'Password must contain at least one uppercase letter',
    lowercase: 'Password must contain at least one lowercase letter',
    numbers: 'Password must contain at least one number',
    specialChars: 'Password must contain at least one special character (@$!%*?&)'
  }
};

// Additional validation interfaces
export interface UserValidationResult {
  isValid: boolean;
  errors: string[];
  field?: string;
}

export interface UserDataValidation {
  validateUsername(username: string): UserValidationResult;
  validateEmail(email: string): UserValidationResult;
  validatePassword(password: string): UserValidationResult;
  validateUserData(userData: Partial<CreateUserRequest>): UserValidationResult;
}

// Additional interfaces for comprehensive user management
export interface UserListQuery {
  page?: number;
  limit?: number;
  searchTerm?: string;
  role?: 'user' | 'admin';
  sortBy?: 'username' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserWithStats extends User {
  preferences: UserPreferences;
  capabilities: any[];
  learningProgress: any[];
  credits: any;
  recentActivity: any[];
  totalPracticeGroups: number;
  averageAccuracy: number;
  totalStudyTime: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: {
    user: number;
    admin: number;
  };
  usersByLanguage?: {
    [key: string]: number;
  };
}

export interface BatchUserOperation {
  userIds: string[];
  operation: 'update' | 'delete' | 'suspend' | 'activate';
  data?: any;
}

export interface BatchOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
}

// User activity tracking
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// User session management
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastUsedAt: Date;
}
