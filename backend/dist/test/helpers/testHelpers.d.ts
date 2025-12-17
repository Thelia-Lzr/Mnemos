/// <reference types="jest" />
import { TestUser } from '../factories/userFactory';
export declare class TestHelpers {
    static generateAuthToken(user: TestUser): string;
    static insertUser(user: TestUser): Promise<void>;
    static insertUserCredits(userId: string, balance?: number): Promise<void>;
    static getUser(userId: string): Promise<any>;
    static getUserCredits(userId: string): Promise<any>;
    static wait(ms: number): Promise<void>;
    static randomString(length?: number): string;
    static randomEmail(): string;
    static randomInt(min: number, max: number): number;
    static createMockRequest(overrides?: any): any;
    static createMockResponse(): any;
    static createMockNext(): jest.Mock;
    static assertSuccessResponse(response: any, expectedData?: any): void;
    static assertErrorResponse(response: any, expectedMessage?: string): void;
    static cleanupUser(userId: string): Promise<void>;
    static cleanupAllTestData(): Promise<void>;
}
//# sourceMappingURL=testHelpers.d.ts.map