import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  DailyRecommendationApi, 
  DailyLearningRecommendation, 
  RecommendationFeedback,
  TaskResponse 
} from '../../services/dailyRecommendationApi';

export interface DailyRecommendationState {
  currentRecommendation: DailyLearningRecommendation | null;
  recommendationHistory: DailyLearningRecommendation[];
  loading: boolean;
  error: string | null;
  generatingRecommendation: boolean;
  generatingPractice: boolean;
  submittingFeedback: boolean;
  lastGeneratedTaskId: string | null;
  lastPracticeTaskId: string | null;
}

const initialState: DailyRecommendationState = {
  currentRecommendation: null,
  recommendationHistory: [],
  loading: false,
  error: null,
  generatingRecommendation: false,
  generatingPractice: false,
  submittingFeedback: false,
  lastGeneratedTaskId: null,
  lastPracticeTaskId: null,
};

// Async thunks
export const getTodaysRecommendation = createAsyncThunk(
  'dailyRecommendation/getTodaysRecommendation',
  async (language: string, { rejectWithValue }) => {
    try {
      return await DailyRecommendationApi.getTodaysRecommendation(language);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get recommendation');
    }
  }
);

export const generateRecommendation = createAsyncThunk(
  'dailyRecommendation/generateRecommendation',
  async (language: string, { rejectWithValue }) => {
    try {
      return await DailyRecommendationApi.generateRecommendation(language);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to generate recommendation');
    }
  }
);

export const generateRecommendationAsync = createAsyncThunk(
  'dailyRecommendation/generateRecommendationAsync',
  async (language: string, { rejectWithValue }) => {
    try {
      return await DailyRecommendationApi.generateRecommendationAsync(language);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to start recommendation generation');
    }
  }
);

export const generateQuickPractice = createAsyncThunk(
  'dailyRecommendation/generateQuickPractice',
  async ({ language, practiceOptionId }: { language: string; practiceOptionId: string }, { rejectWithValue }) => {
    try {
      return await DailyRecommendationApi.generateQuickPractice(language, practiceOptionId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to generate quick practice');
    }
  }
);

export const submitFeedback = createAsyncThunk(
  'dailyRecommendation/submitFeedback',
  async (
    { language, feedback }: { 
      language: string; 
      feedback: Omit<RecommendationFeedback, 'submittedAt'> 
    }, 
    { rejectWithValue }
  ) => {
    try {
      await DailyRecommendationApi.submitFeedback(language, feedback);
      return feedback;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to submit feedback');
    }
  }
);

export const getRecommendationHistory = createAsyncThunk(
  'dailyRecommendation/getRecommendationHistory',
  async ({ language, limit }: { language: string; limit?: number }, { rejectWithValue }) => {
    try {
      return await DailyRecommendationApi.getRecommendationHistory(language, limit);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get recommendation history');
    }
  }
);

export const markAsViewed = createAsyncThunk(
  'dailyRecommendation/markAsViewed',
  async ({ language, date }: { language: string; date?: string }, { rejectWithValue }) => {
    try {
      await DailyRecommendationApi.markAsViewed(language, date);
      return { date };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to mark as viewed');
    }
  }
);

export const getRecommendationByDate = createAsyncThunk(
  'dailyRecommendation/getRecommendationByDate',
  async ({ language, date }: { language: string; date: string }, { rejectWithValue }) => {
    try {
      return await DailyRecommendationApi.getRecommendationByDate(language, date);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get recommendation for date');
    }
  }
);

const dailyRecommendationSlice = createSlice({
  name: 'dailyRecommendation',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentRecommendation: (state) => {
      state.currentRecommendation = null;
    },
    clearTaskIds: (state) => {
      state.lastGeneratedTaskId = null;
      state.lastPracticeTaskId = null;
    },
    updateRecommendationViewed: (state, action: PayloadAction<{ date?: string }>) => {
      if (state.currentRecommendation) {
        const targetDate = action.payload.date || new Date().toISOString().split('T')[0];
        if (state.currentRecommendation.date === targetDate) {
          state.currentRecommendation.isViewed = true;
          state.currentRecommendation.viewedAt = new Date().toISOString();
        }
      }
    },
    updateRecommendationFeedback: (state, action: PayloadAction<RecommendationFeedback>) => {
      if (state.currentRecommendation) {
        state.currentRecommendation.userFeedback = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get today's recommendation
      .addCase(getTodaysRecommendation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTodaysRecommendation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRecommendation = action.payload;
        state.error = null;
      })
      .addCase(getTodaysRecommendation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Generate recommendation (sync)
      .addCase(generateRecommendation.pending, (state) => {
        state.generatingRecommendation = true;
        state.error = null;
      })
      .addCase(generateRecommendation.fulfilled, (state, action) => {
        state.generatingRecommendation = false;
        state.currentRecommendation = action.payload;
        state.error = null;
      })
      .addCase(generateRecommendation.rejected, (state, action) => {
        state.generatingRecommendation = false;
        state.error = action.payload as string;
      })

      // Generate recommendation (async)
      .addCase(generateRecommendationAsync.pending, (state) => {
        state.generatingRecommendation = true;
        state.error = null;
      })
      .addCase(generateRecommendationAsync.fulfilled, (state, action) => {
        state.generatingRecommendation = false;
        state.lastGeneratedTaskId = action.payload.taskId;
        state.error = null;
      })
      .addCase(generateRecommendationAsync.rejected, (state, action) => {
        state.generatingRecommendation = false;
        state.error = action.payload as string;
      })

      // Generate quick practice
      .addCase(generateQuickPractice.pending, (state) => {
        state.generatingPractice = true;
        state.error = null;
      })
      .addCase(generateQuickPractice.fulfilled, (state, action) => {
        state.generatingPractice = false;
        state.lastPracticeTaskId = action.payload.taskId;
        state.error = null;
      })
      .addCase(generateQuickPractice.rejected, (state, action) => {
        state.generatingPractice = false;
        state.error = action.payload as string;
      })

      // Submit feedback
      .addCase(submitFeedback.pending, (state) => {
        state.submittingFeedback = true;
        state.error = null;
      })
      .addCase(submitFeedback.fulfilled, (state, action) => {
        state.submittingFeedback = false;
        if (state.currentRecommendation) {
          state.currentRecommendation.userFeedback = {
            ...action.payload,
            submittedAt: new Date().toISOString()
          };
        }
        state.error = null;
      })
      .addCase(submitFeedback.rejected, (state, action) => {
        state.submittingFeedback = false;
        state.error = action.payload as string;
      })

      // Get recommendation history
      .addCase(getRecommendationHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRecommendationHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendationHistory = action.payload.history;
        state.error = null;
      })
      .addCase(getRecommendationHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Mark as viewed
      .addCase(markAsViewed.fulfilled, (state, action) => {
        if (state.currentRecommendation) {
          const targetDate = action.payload.date || new Date().toISOString().split('T')[0];
          if (state.currentRecommendation.date === targetDate) {
            state.currentRecommendation.isViewed = true;
            state.currentRecommendation.viewedAt = new Date().toISOString();
          }
        }
      })

      // Get recommendation by date
      .addCase(getRecommendationByDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRecommendationByDate.fulfilled, (state, action) => {
        state.loading = false;
        // If it's today's date, update current recommendation
        const today = new Date().toISOString().split('T')[0];
        if (action.payload.date === today) {
          state.currentRecommendation = action.payload;
        }
        state.error = null;
      })
      .addCase(getRecommendationByDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentRecommendation,
  clearTaskIds,
  updateRecommendationViewed,
  updateRecommendationFeedback,
} = dailyRecommendationSlice.actions;

export default dailyRecommendationSlice.reducer;