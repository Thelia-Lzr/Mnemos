import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

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

export class RechargePackageModel {
  constructor(private db: Pool) {}

  /**
   * Create a new recharge package
   */
  async create(data: CreateRechargePackageData): Promise<RechargePackage> {
    const id = uuidv4();
    const query = `
      INSERT INTO recharge_packages (
        id, name, description, price_in_cents, currency, credit_amount,
        bonus_credits, is_active, is_popular, display_order,
        original_price, discount_percentage, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      id,
      data.name,
      data.description,
      data.priceInCents,
      data.currency || 'USD',
      data.creditAmount,
      data.bonusCredits || 0,
      data.isActive !== false,
      data.isPopular || false,
      data.displayOrder || 0,
      data.originalPrice,
      data.discountPercentage,
      data.createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToPackage(result.rows[0]);
  }

  /**
   * Get all active recharge packages ordered by display order
   */
  async getActivePackages(): Promise<RechargePackage[]> {
    const query = `
      SELECT * FROM recharge_packages 
      WHERE is_active = true 
      ORDER BY display_order ASC, created_at ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows.map(row => this.mapRowToPackage(row));
  }

  /**
   * Get all recharge packages (for admin)
   */
  async getAllPackages(): Promise<RechargePackage[]> {
    const query = `
      SELECT * FROM recharge_packages 
      ORDER BY display_order ASC, created_at ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows.map(row => this.mapRowToPackage(row));
  }

  /**
   * Get a specific recharge package by ID
   */
  async getById(id: string): Promise<RechargePackage | null> {
    const query = 'SELECT * FROM recharge_packages WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPackage(result.rows[0]);
  }

  /**
   * Update a recharge package
   */
  async update(id: string, data: UpdateRechargePackageData): Promise<RechargePackage | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = this.camelToSnakeCase(key);
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);
    const query = `
      UPDATE recharge_packages 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPackage(result.rows[0]);
  }

  /**
   * Delete a recharge package
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM recharge_packages WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Get package sales statistics
   */
  async getPackageSalesStats(): Promise<Array<{
    packageId: string;
    packageName: string;
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>> {
    const query = `
      SELECT 
        rp.id as package_id,
        rp.name as package_name,
        COUNT(po.id) as total_sales,
        COALESCE(SUM(po.amount), 0) as total_revenue,
        COALESCE(AVG(po.amount), 0) as average_order_value
      FROM recharge_packages rp
      LEFT JOIN payment_orders po ON rp.id = po.package_id AND po.status = 'completed'
      GROUP BY rp.id, rp.name
      ORDER BY total_revenue DESC
    `;

    const result = await this.db.query(query);
    return result.rows.map(row => ({
      packageId: row.package_id,
      packageName: row.package_name,
      totalSales: parseInt(row.total_sales),
      totalRevenue: parseInt(row.total_revenue),
      averageOrderValue: parseFloat(row.average_order_value)
    }));
  }

  /**
   * Map database row to RechargePackage interface
   */
  private mapRowToPackage(row: any): RechargePackage {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priceInCents: row.price_in_cents,
      currency: row.currency,
      creditAmount: row.credit_amount,
      bonusCredits: row.bonus_credits,
      isActive: row.is_active,
      isPopular: row.is_popular,
      displayOrder: row.display_order,
      originalPrice: row.original_price,
      discountPercentage: row.discount_percentage,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
