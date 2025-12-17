import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import SecurityUtils from '../../utils/security';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
  lastLoginAt?: string;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notificationsEmail: boolean;
  notificationsPush: boolean;
  practiceReminders: boolean;
  dailyQuoteEnabled: boolean;
  reviewReminders: boolean;
  milestoneUpdates: boolean;
  pkInvitations: boolean;
}

interface AuthState {
  user: User | null;
  preferences: UserPreferences | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  preferences: null,
  token: SecurityUtils.getSecureItem<string>('token'),
  refreshToken: SecurityUtils.getSecureItem<string>('refreshToken'),
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false,
};

// Async thunk for refreshing token
export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = SecurityUtils.getSecureItem<string>('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      
      if (response.data.success) {
        return {
          user: response.data.user,
          token: response.data.token
        };
      } else {
        throw new Error(response.data.message || 'Token refresh failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
    }
  }
);

// Async thunk for loading user profile
export const loadUserProfile = createAsyncThunk(
  'auth/loadProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/profile');
      
      if (response.data.success) {
        return {
          user: response.data.user,
          preferences: response.data.preferences
        };
      } else {
        throw new Error(response.data.message || 'Failed to load profile');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string; refreshToken?: string }>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.initialized = true;
      
      SecurityUtils.setSecureItem('token', action.payload.token);
      
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
        SecurityUtils.setSecureItem('refreshToken', action.payload.refreshToken);
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.initialized = true;
    },
    logout: (state) => {
      state.user = null;
      state.preferences = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.initialized = true;
      SecurityUtils.clearSensitiveData();
    },
    clearError: (state) => {
      state.error = null;
    },
    updatePreferences: (state, action: PayloadAction<UserPreferences>) => {
      state.preferences = action.payload;
    },
    setInitialized: (state) => {
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshAuthToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        SecurityUtils.setSecureItem('token', action.payload.token);
      })
      .addCase(refreshAuthToken.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = action.payload as string;
        SecurityUtils.clearSensitiveData();
      })
      .addCase(loadUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.preferences = action.payload.preferences;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(loadUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.initialized = true;
      });
  },
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout, 
  clearError, 
  updatePreferences,
  setInitialized 
} = authSlice.actions;

export default authSlice.reducer;