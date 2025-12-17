import { Pool } from 'pg';
import { Language, LanguageLevel, UserCapability } from '../../models/UserCapability';
export interface TestUser {
    id: string;
    username: string;
    email: string;
    password: string;
    passwordHash: string;
    role: 'user' | 'admin';
}
export interface CreateUserOptions {
    username?: string;
    email?: string;
    password?: string;
    role?: 'user' | 'admin';
}
export interface CreateUserCapabilityOptions {
    language: Language;
    currentLevel: LanguageLevel;
    learningGoal: LanguageLevel;
    isActiveLearning?: boolean;
}
export declare class UserFactory {
    static create(options?: CreateUserOptions): Promise<TestUser>;
    static createMany(count: number, options?: CreateUserOptions): Promise<TestUser[]>;
    static createAdmin(options?: CreateUserOptions): Promise<TestUser>;
}
export declare function createTestUser(db: Pool, options?: CreateUserOptions): Promise<TestUser>;
export declare function createTestUserCapability(db: Pool, userId: string, options: CreateUserCapabilityOptions): Promise<UserCapability>;
//# sourceMappingURL=userFactory.d.ts.map