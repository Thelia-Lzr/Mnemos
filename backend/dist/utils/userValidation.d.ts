import { UserValidationResult, UserDataValidation, CreateUserRequest } from '../models/User';
export declare class UserValidator implements UserDataValidation {
    validateUsername(username: string): UserValidationResult;
    validateEmail(email: string): UserValidationResult;
    validatePassword(password: string): UserValidationResult;
    validateUserData(userData: Partial<CreateUserRequest>): UserValidationResult;
    validateUserPreferences(preferences: any): UserValidationResult;
    validatePasswordStrength(password: string): {
        score: number;
        feedback: string[];
        isStrong: boolean;
    };
}
export declare const userValidator: UserValidator;
//# sourceMappingURL=userValidation.d.ts.map