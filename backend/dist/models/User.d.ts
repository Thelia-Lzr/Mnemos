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
export declare const USER_VALIDATION_RULES: UserValidationRules;
export declare const USER_VALIDATION_MESSAGES: {
    username: {
        required: string;
        minLength: string;
        maxLength: string;
        pattern: string;
    };
    email: {
        required: string;
        invalid: string;
    };
    password: {
        required: string;
        minLength: string;
        uppercase: string;
        lowercase: string;
        numbers: string;
        specialChars: string;
    };
};
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
export interface UserActivity {
    id: string;
    userId: string;
    action: string;
    details: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
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
//# sourceMappingURL=User.d.ts.map