export declare class EncryptionService {
    static encrypt(text: string): {
        encrypted: string;
        iv: string;
    };
    static decrypt(encryptedData: {
        encrypted: string;
        iv: string;
    }): string;
    static hashPassword(password: string): Promise<string>;
    static verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
    static generateSecureToken(length?: number): string;
    static hashData(data: string): string;
    static generateHMAC(data: string, secret?: string): string;
    static verifyHMAC(data: string, hmac: string, secret?: string): boolean;
    static sanitizeForLogging(data: any): any;
    static maskSensitiveString(str: string, visibleChars?: number): string;
}
export declare class InputValidator {
    static isValidEmail(email: string): boolean;
    static isValidPassword(password: string): {
        valid: boolean;
        errors: string[];
    };
    static sanitizeInput(input: string): string;
    static isValidUsername(username: string): boolean;
    static hasSQLInjection(input: string): boolean;
    static hasXSS(input: string): boolean;
}
//# sourceMappingURL=encryption.d.ts.map