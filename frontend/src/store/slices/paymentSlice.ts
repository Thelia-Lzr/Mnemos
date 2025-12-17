import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import paymentApi, { RechargePackage, PaymentOrder, PaymentResult, TransactionHistory } from '../../services/paymentApi';

interface PaymentState {
  packages: RechargePackage[];
  paymentMethods: string[];
  creditBalance: number;
  transactions: TransactionHistory | null;
  currentOrder: PaymentOrder | null;
  loading: boolean;
  error: string | null;
  
  // UI state
  selectedPackage: RechargePackage | null;
  selectedPaymentMethod: string | null;
  paymentInProgress: boolean;
}

const initialState: PaymentState = {
  packages: [],
  paymentMethods: [],
  creditBalance: 0,
  transactions: null,
  currentOrder: null,
  loading: false,
  error: null,
  
  selectedPackage: null,
  selectedPaymentMethod: null,
  paymentInProgress: false,
};

// Async thunks
export const fetchPackages = createAsyncThunk(
  'payment/fetchPackages',
  async () => {
    return await paymentApi.getPackages();
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'payment/fetchPaymentMethods',
  async () => {
    return await paymentApi.getPaymentMethods();
  }
);

export const createOrder = createAsyncThunk(
  'payment/createOrder',
  async (data: { packageId: string; paymentMethod?: string }) => {
    return await paymentApi.createOrder(data);
  }
);

export const confirmPayment = createAsyncThunk(
  'payment/confirmPayment',
  async (data: { orderId: string; paymentMethod: string }) => {
    return await paymentApi.confirmPayment(data);
  }
);

export const fetchTransactions = createAsyncThunk(
  'payment/fetchTransactions',
  async (params?: { limit?: number; offset?: number }) => {
    return await paymentApi.getTransactions(params?.limit, params?.offset);
  }
);

export const queryOrderStatus = createAsyncThunk(
  'payment/queryOrderStatus',
  async (orderId: string) => {
    return await paymentApi.getOrderStatus(orderId);
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setSelectedPackage: (state, action: PayloadAction<RechargePackage | null>) => {
      state.selectedPackage = action.payload;
    },
    setSelectedPaymentMethod: (state, action: PayloadAction<string | null>) => {
      state.selectedPaymentMethod = action.payload;
    },
    setCreditBalance: (state, action: PayloadAction<number>) => {
      state.creditBalance = action.payload;
    },
    setPaymentInProgress: (state, action: PayloadAction<boolean>) => {
      state.paymentInProgress = action.payload;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
      state.selectedPackage = null;
      state.selectedPaymentMethod = null;
      state.paymentInProgress = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch packages
    builder
      .addCase(fetchPackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch packages';
      });

    // Fetch payment methods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentMethods = action.payload;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payment methods';
      });

    // Create order
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create order';
      });

    // Confirm payment
    builder
      .addCase(confirmPayment.pending, (state) => {
        state.paymentInProgress = true;
        state.error = null;
      })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.paymentInProgress = false;
        // Handle successful payment
        if (action.payload.success) {
          // Payment successful - could update credit balance here
        }
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.paymentInProgress = false;
        state.error = action.error.message || 'Payment failed';
      });

    // Fetch transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
        state.creditBalance = action.payload.summary.currentBalance;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch transactions';
      });

    // Query order status
    builder
      .addCase(queryOrderStatus.fulfilled, (state, action) => {
        if (state.currentOrder && state.currentOrder.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      });
  },
});

export const {
  setSelectedPackage,
  setSelectedPaymentMethod,
  setCreditBalance,
  setPaymentInProgress,
  clearCurrentOrder,
  clearError,
} = paymentSlice.actions;

export default paymentSlice.reducer;