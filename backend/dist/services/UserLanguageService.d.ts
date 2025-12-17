import { Pool } from 'pg';
import { Language } from '../models/PracticeGroup';
export interface UserLearningLanguage {
    id: string;
    userId: string;
    language: Language;
    currentLevel: LanguageLevel;
    targetLevel?: LanguageLevel;
    isPrimary: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export interface CreateUserLanguageRequest {
    language: Language;
    currentLevel: LanguageLevel;
    targetLevel?: LanguageLevel;
    isPrimary?: boolean;
}
export interface UpdateUserLanguageRequest {
    currentLevel?: LanguageLevel;
    targetLevel?: LanguageLevel;
    isPrimary?: boolean;
    isActive?: boolean;
}
export declare class UserLanguageService {
    private db;
    constructor(db: Pool);
    getUserLanguages(userId: string): Promise<UserLearningLanguage[]>;
    getActiveUserLanguages(userId: string): Promise<UserLearningLanguage[]>;
    getPrimaryLanguage(userId: string): Promise<UserLearningLanguage | null>;
    addUserLanguage(userId: string, request: CreateUserLanguageRequest): Promise<UserLearningLanguage | null>;
    updateUserLanguage(userId: string, language: Language, updates: UpdateUserLanguageRequest): Promise<boolean>;
    removeUserLanguage(userId: string, language: Language): Promise<boolean>;
    setPrimaryLanguage(userId: string, language: Language): Promise<boolean>;
    getUserLanguage(userId: string, language: Language): Promise<UserLearningLanguage | null>;
    private mapRowToUserLanguage;
}
//# sourceMappingURL=UserLanguageService.d.ts.map