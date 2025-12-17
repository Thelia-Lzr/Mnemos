import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export enum PaymentMethod {
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal'
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface PaymentOrder {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  currency: string;
  creditAmount: number;
  paymentMethod?: PaymentMethod;
  paymentGateway?: string;
  gatewayOrderId?: string;
  status: OrderStatus;
  paidAt?: Date;
  expiredAt: Date;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentOrderData {
  userId: string;
  packageId: string;
  amount: number;
  currency?: string;
  creditAmount: number;
  paymentMethod?: PaymentMethod;
  paymentGateway?: string;
  expiredAt?: Date;
}

export interface UpdatePaymentOrderData {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentGateway?: string;
  gatewayOrderId?: string;
  paidAt?: Date;
  expiredAt?: Date;
  failureReason?: string;
  retryCount?: number;
}

export class PaymentOrderModel {
  constructor(private db: Pool) {}

  /**
   * Create a new payment order
   */
  async create(data: CreatePaymentOrderData): Promise<PaymentOrder> {
    const id = uuidv4();
    const expiredAt = data.expiredAt || new Date(Date.now() + 30 * 60 * 1000); // 30 minutes default

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

  /**
   * Get payment order by ID
   */
  async getById(id: string): Promise<PaymentOrder | null> {
    const query = 'SELECT * FROM payment_orders WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToOrder(result.rows[0]);
  }

  /**
   * Get payment orders by user ID
   */
  async getByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<PaymentOrder[]> {
    const query = `
      SELECT * FROM payment_orders 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.db.query(query, [userId, limit, offset]);
    return result.rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Update payment order
   */
  async update(id: string, data: UpdatePaymentOrderData): Promise<PaymentOrder | null> {
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

  /**
   * Mark order as paid
   */
  async markAsPaid(id: string, gatewayOrderId?: string): Promise<PaymentOrder | null> {
    return this.update(id, {
      status: OrderStatus.PAID,
      paidAt: new Date(),
      gatewayOrderId
    });
  }

  /**
   * Mark order as completed
   */
  async markAsCompleted(id: string): Promise<PaymentOrder | null> {
    return this.update(id, {
      status: OrderStatus.COMPLETED
    });
  }

  /**
   * Mark order as failed
   */
  async markAsFailed(id: string, failureReason: string): Promise<PaymentOrder | null> {
    return this.update(id, {
      status: OrderStatus.FAILED,
      failureReason
    });
  }

  /**
   * Get expired orders that need to be marked as expired
   */
  async getExpiredOrders(): Promise<PaymentOrder[]> {
    const query = `
      SELECT * FROM payment_orders 
      WHERE status = $1 AND expired_at < CURRENT_TIMESTAMP
    `;
    
    const result = await this.db.query(query, [OrderStatus.PENDING]);
    return result.rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Mark expired orders
   */
  async markExpiredOrders(): Promise<number> {
    const query = `
      UPDATE payment_orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE status = $2 AND expired_at < CURRENT_TIMESTAMP
    `;
    
    const result = await this.db.query(query, [OrderStatus.EXPIRED, OrderStatus.PENDING]);
    return result.rowCount || 0;
  }

  /**
   * Get orders by status
   */
  async getByStatus(status: OrderStatus, limit: number = 100): Promise<PaymentOrder[]> {
    const query = `
      SELECT * FROM payment_orders 
      WHERE status = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    const result = await this.db.query(query, [status, limit]);
    return result.rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(days: number = 30): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  }> {
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

  /**
   * Map database row to PaymentOrder interface
   */
  private mapRowToOrder(row: any): PaymentOrder {
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

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
