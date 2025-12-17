import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';
import practiceSlice from './slices/practiceSlice';
import vocabularySlice from './slices/vocabularySlice';
import pkSlice from './slices/pkSlice';
import paymentSlice from './slices/paymentSlice';
import dailyRecommendationSlice from './slices/dailyRecommendationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    practice: practiceSlice,
    vocabulary: vocabularySlice,
    pk: pkSlice,
    payment: paymentSlice,
    dailyRecommendation: dailyRecommendationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;