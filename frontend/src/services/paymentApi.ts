import api from './api';

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
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  currency: string;
  creditAmount: number;
  paymentMethod?: string;
  paymentGateway?: string;
  gatewayOrderId?: string;
  status: string;
  paidAt?: string;
  expiredAt: string;
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentResult {
  success: boolean;
  orderId: string;
  gatewayOrderId?: string;
  paymentUrl?: string;
  error?: string;
}

export interface CreateOrderRequest {
  packageId: string;
  paymentMethod?: string;
}

export interface ConfirmPaymentRequest {
  orderId: string;
  paymentMethod: string;
}

export interface TransactionHistory {
  orders: PaymentOrder[];
  creditTransactions: any[];
  summary: {
    totalOrders: number;
    currentBalance: number;
  };
}

export const paymentApi = {
  // Get available payment methods
  getPaymentMethods: async (): Promise<string[]> => {
    const response = await api.get('/payment/methods');
    return response.data.data;
  },

  // Get all active packages
  getPackages: async (): Promise<RechargePackage[]> => {
    const response = await api.get('/payment/packages');
    return response.data.data;
  },

  // Get specific package
  getPackage: async (id: string): Promise<RechargePackage> => {
    const response = await api.get(`/payment/package/${id}`);
    return response.data.data;
  },

  // Create payment order
  createOrder: async (data: CreateOrderRequest): Promise<PaymentOrder> => {
    const response = await api.post('/payment/create-order', data);
    return response.data.data;
  },

  // Confirm payment
  confirmPayment: async (data: ConfirmPaymentRequest): Promise<PaymentResult> => {
    const response = await api.post(`/payment/order/${data.orderId}/confirm`, {
      payment_method: data.paymentMethod
    });
    return response.data.data;
  },

  // Get order status
  getOrderStatus: async (orderId: string): Promise<PaymentOrder> => {
    const response = await api.get(`/payment/order/${orderId}/status`);
    return response.data.data;
  },

  // Query payment status from gateway
  queryPaymentStatus: async (orderId: string): Promise<PaymentResult> => {
    const response = await api.get(`/payment/order/${orderId}/status`);
    return response.data.data;
  },

  // Cancel order
  cancelOrder: async (orderId: string): Promise<void> => {
    await api.post(`/payment/order/${orderId}/cancel`);
  },

  // Retry payment
  retryPayment: async (orderId: string): Promise<PaymentResult> => {
    const response = await api.get(`/payment/order/${orderId}/status`);
    return response.data.data;
  },

  // Get transaction history
  getTransactions: async (limit?: number, offset?: number): Promise<TransactionHistory> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const response = await api.get(`/payment/transactions?${params.toString()}`);
    const payload = response.data?.data ?? response.data;

    if (payload?.orders && payload?.creditTransactions && payload?.summary) {
      return payload;
    }

    const creditTransactions = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.creditTransactions)
        ? payload.creditTransactions
        : [];

    return {
      orders: Array.isArray(payload?.orders) ? payload.orders : [],
      creditTransactions,
      summary: {
        totalOrders: Array.isArray(payload?.orders) ? payload.orders.length : 0,
        currentBalance: payload?.summary?.currentBalance ?? 0,
      },
    };
  },

  // Get specific transaction
  getTransaction: async (transactionId: string): Promise<any> => {
    const response = await api.get(`/payment/order/${transactionId}`);
    return response.data.data;
  }
};

export default paymentApi;