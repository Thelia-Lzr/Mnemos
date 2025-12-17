import { Pool } from 'pg';
export interface RechargePackage {
    id: string;
    name: string;
    description: string;
    priceInCents: number;
    currency: string;
    creditAmount: number;
    bonusCredits: number;
    isActive: boolean;
    isPopular: boolean;
    displayOrder: number;
    originalPrice?: number;
    discountPercentage?: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
export interface CreateRechargePackageData {
    name: string;
    description: string;
    priceInCents: number;
    currency?: string;
    creditAmount: number;
    bonusCredits?: number;
    isActive?: boolean;
    isPopular?: boolean;
    displayOrder?: number;
    originalPrice?: number;
    discountPercentage?: number;
    createdBy: string;
}
export interface UpdateRechargePackageData {
    name?: string;
    description?: string;
    priceInCents?: number;
    currency?: string;
    creditAmount?: number;
    bonusCredits?: number;
    isActive?: boolean;
    isPopular?: boolean;
    displayOrder?: number;
    originalPrice?: number;
    discountPercentage?: number;
}
export declare class RechargePackageModel {
    private db;
    constructor(db: Pool);
    create(data: CreateRechargePackageData): Promise<RechargePackage>;
    getActivePackages(): Promise<RechargePackage[]>;
    getAllPackages(): Promise<RechargePackage[]>;
    getById(id: string): Promise<RechargePackage | null>;
    update(id: string, data: UpdateRechargePackageData): Promise<RechargePackage | null>;
    delete(id: string): Promise<boolean>;
    getPackageSalesStats(): Promise<Array<{
        packageId: string;
        packageName: string;
        totalSales: number;
        totalRevenue: number;
        averageOrderValue: number;
    }>>;
    private mapRowToPackage;
    private camelToSnakeCase;
}
//# sourceMappingURL=RechargePackage.d.ts.map