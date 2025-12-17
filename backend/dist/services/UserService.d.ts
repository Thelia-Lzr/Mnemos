import { Pool } from 'pg';
import { User, UserPreferences, CreateUserRequest, LoginRequest, AuthResponse } from '../models/User';
export declare class UserService {
    private db;
    constructor(db: Pool);
    createUser(userData: CreateUserRequest): Promise<AuthResponse>;
    loginUser(loginData: LoginRequest): Promise<AuthResponse>;
    getUserById(userId: string): Promise<User | null>;
    getUserPreferences(userId: string): Promise<UserPreferences | null>;
    updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean>;
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    private generateAccessToken;
    private generateRefreshToken;
    updateUser(userId: string, updates: {
        username?: string;
        email?: string;
    }): Promise<boolean>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
    getUserProfile(userId: string): Promise<any | null>;
    deleteUser(userId: string): Promise<boolean>;
    validateUserData(userData: any): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    validateUserPreferences(preferences: any): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    validatePasswordStrength(password: string): Promise<{
        score: number;
        feedback: string[];
        isStrong: boolean;
    }>;
    getAllUsers(page?: number, limit?: number, searchTerm?: string): Promise<{
        users: User[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getUserWithStats(userId: string): Promise<any | null>;
    updateUserRole(userId: string, role: 'user' | 'admin'): Promise<boolean>;
    suspendUser(userId: string, reason?: string): Promise<boolean>;
    getUserStatistics(): Promise<{
        totalUsers: number;
        activeUsers: number;
        newUsersToday: number;
        newUsersThisWeek: number;
        newUsersThisMonth: number;
        usersByRole: {
            user: number;
            admin: number;
        };
    }>;
    batchUpdateUsers(userIds: string[], updates: Partial<User>): Promise<number>;
    batchDeleteUsers(userIds: string[]): Promise<number>;
}
//# sourceMappingURL=UserService.d.ts.map