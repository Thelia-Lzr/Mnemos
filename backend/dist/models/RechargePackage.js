"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RechargePackageModel = void 0;
const uuid_1 = require("uuid");
class RechargePackageModel {
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const id = (0, uuid_1.v4)();
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
    async getActivePackages() {
        const query = `
      SELECT * FROM recharge_packages 
      WHERE is_active = true 
      ORDER BY display_order ASC, created_at ASC
    `;
        const result = await this.db.query(query);
        return result.rows.map(row => this.mapRowToPackage(row));
    }
    async getAllPackages() {
        const query = `
      SELECT * FROM recharge_packages 
      ORDER BY display_order ASC, created_at ASC
    `;
        const result = await this.db.query(query);
        return result.rows.map(row => this.mapRowToPackage(row));
    }
    async getById(id) {
        const query = 'SELECT * FROM recharge_packages WHERE id = $1';
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToPackage(result.rows[0]);
    }
    async update(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
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
    async delete(id) {
        const query = 'DELETE FROM recharge_packages WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }
    async getPackageSalesStats() {
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
    mapRowToPackage(row) {
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
    camelToSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}
exports.RechargePackageModel = RechargePackageModel;
//# sourceMappingURL=RechargePackage.js.map