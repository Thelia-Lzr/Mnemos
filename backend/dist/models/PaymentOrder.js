"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrderModel = exports.OrderStatus = exports.PaymentMethod = void 0;
const uuid_1 = require("uuid");
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["ALIPAY"] = "alipay";
    PaymentMethod["WECHAT"] = "wechat";
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["PAYPAL"] = "paypal";
})(PaymentMethod = exports.PaymentMethod || (exports.PaymentMethod = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["PAID"] = "paid";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["FAILED"] = "failed";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["EXPIRED"] = "expired";
})(OrderStatus = exports.OrderStatus || (exports.OrderStatus = {}));
class PaymentOrderModel {
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const id = (0, uuid_1.v4)();
        const expiredAt = data.expiredAt || new Date(Date.now() + 30 * 60 * 1000);
        const query = `
      INSERT INTO payment_orders (
        id, user_id, package_id, amount, currency, credit_amount,
        payment_method, payment_gateway, status, expired_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
        const values = [
            id,
            data.userId,
            data.packageId,
            data.amount,
            data.currency || 'USD',
            data.creditAmount,
            data.paymentMethod,
            data.paymentGateway,
            OrderStatus.PENDING,
            expiredAt
        ];
        const result = await this.db.query(query, values);
        return this.mapRowToOrder(result.rows[0]);
    }
    async getById(id) {
        const query = 'SELECT * FROM payment_orders WHERE id = $1';
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToOrder(result.rows[0]);
    }
    async getByUserId(userId, limit = 50, offset = 0) {
        const query = `
      SELECT * FROM payment_orders 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
        const result = await this.db.query(query, [userId, limit, offset]);
        return result.rows.map(row => this.mapRowToOrder(row));
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
      UPDATE payment_orders 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToOrder(result.rows[0]);
    }
    async markAsPaid(id, gatewayOrderId) {
        return this.update(id, {
            status: OrderStatus.PAID,
            paidAt: new Date(),
            gatewayOrderId
        });
    }
    async markAsCompleted(id) {
        return this.update(id, {
            status: OrderStatus.COMPLETED
        });
    }
    async markAsFailed(id, failureReason) {
        return this.update(id, {
            status: OrderStatus.FAILED,
            failureReason
        });
    }
    async getExpiredOrders() {
        const query = `
      SELECT * FROM payment_orders 
      WHERE status = $1 AND expired_at < CURRENT_TIMESTAMP
    `;
        const result = await this.db.query(query, [OrderStatus.PENDING]);
        return result.rows.map(row => this.mapRowToOrder(row));
    }
    async markExpiredOrders() {
        const query = `
      UPDATE payment_orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE status = $2 AND expired_at < CURRENT_TIMESTAMP
    `;
        const result = await this.db.query(query, [OrderStatus.EXPIRED, OrderStatus.PENDING]);
        return result.rowCount || 0;
    }
    async getByStatus(status, limit = 100) {
        const query = `
      SELECT * FROM payment_orders 
      WHERE status = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
        const result = await this.db.query(query, [status, limit]);
        return result.rows.map(row => this.mapRowToOrder(row));
    }
    async getRevenueStats(days = 30) {
        const query = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(AVG(amount), 0) as average_order_value
      FROM payment_orders 
      WHERE status = $1 AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `;
        const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as orders
      FROM payment_orders 
      WHERE status = $1 AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
        const [statsResult, dailyResult] = await Promise.all([
            this.db.query(query, [OrderStatus.COMPLETED]),
            this.db.query(dailyQuery, [OrderStatus.COMPLETED])
        ]);
        return {
            totalRevenue: parseInt(statsResult.rows[0].total_revenue),
            totalOrders: parseInt(statsResult.rows[0].total_orders),
            averageOrderValue: parseFloat(statsResult.rows[0].average_order_value),
            dailyRevenue: dailyResult.rows.map(row => ({
                date: row.date,
                revenue: parseInt(row.revenue),
                orders: parseInt(row.orders)
            }))
        };
    }
    mapRowToOrder(row) {
        return {
            id: row.id,
            userId: row.user_id,
            packageId: row.package_id,
            amount: row.amount,
            currency: row.currency,
            creditAmount: row.credit_amount,
            paymentMethod: row.payment_method,
            paymentGateway: row.payment_gateway,
            gatewayOrderId: row.gateway_order_id,
            status: row.status,
            paidAt: row.paid_at,
            expiredAt: row.expired_at,
            failureReason: row.failure_reason,
            retryCount: row.retry_count,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    camelToSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}
exports.PaymentOrderModel = PaymentOrderModel;
//# sourceMappingURL=PaymentOrder.js.map