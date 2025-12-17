import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { vocabularyApi, VocabularyWord, MasteryStats, LearningEfficiencyMetrics, VocabularyPracticeGroup } from '../../services/vocabularyApi';

interface VocabularyState {
  words: VocabularyWord[];
  masteryStats: MasteryStats | null;
  learningMetrics: LearningEfficiencyMetrics | null;
  currentPracticeGroup: VocabularyPracticeGroup | null;
  selectedLanguage: 'en' | 'ja' | 'fr';
  loading: boolean;
  error: string | null;
}

const initialState: VocabularyState = {
  words: [],
  masteryStats: null,
  learningMetrics: null,
  currentPracticeGroup: null,
  selectedLanguage: 'en',
  loading: false,
  error: null,
};

// Async thunks
export const fetchVocabularyWords = createAsyncThunk(
  'vocabulary/fetchWords',
  async ({ language, masteryLevel }: { language: string; masteryLevel?: string }) => {
    const response = await vocabularyApi.getVocabularyWords(language, masteryLevel);
    return response.words;
  }
);

export const addWordsFromText = createAsyncThunk(
  'vocabulary/addWordsFromText',
  async ({ text, language }: { text: string; language: string }) => {
    const response = await vocabularyApi.addWordsFromText(text, language);
    return response;
  }
);

export const removeVocabularyWord = createAsyncThunk(
  'vocabulary/removeWord',
  async (wordId: string) => {
    await vocabularyApi.removeWord(wordId);
    return wordId;
  }
);

export const fetchMasteryStats = createAsyncThunk(
  'vocabulary/fetchMasteryStats',
  async (language: string) => {
    return await vocabularyApi.getMasteryStats(language);
  }
);

export const fetchLearningMetrics = createAsyncThunk(
  'vocabulary/fetchLearningMetrics',
  async ({ language, days }: { language: string; days?: number }) => {
    return await vocabularyApi.getLearningEfficiencyMetrics(language, days);
  }
);

export const generateVocabularyPractice = createAsyncThunk(
  'vocabulary/generatePractice',
  async (options: {
    language: string;
    wordIds?: string[];
    masteryLevels?: string[];
    maxWords?: number;
    focusOnWeakWords?: boolean;
    includeReviewWords?: boolean;
  }) => {
    return await vocabularyApi.generateVocabularyPractice(options);
  }
);

export const generateAdaptivePractice = createAsyncThunk(
  'vocabulary/generateAdaptivePractice',
  async (language: string) => {
    return await vocabularyApi.generateAdaptivePractice(language);
  }
);

const vocabularySlice = createSlice({
  name: 'vocabulary',
  initialState,
  reducers: {
    setSelectedLanguage: (state, action: PayloadAction<'en' | 'ja' | 'fr'>) => {
      state.selectedLanguage = action.payload;
    },
    clearCurrentPracticeGroup: (state) => {
      state.currentPracticeGroup = null;
    },
    updateWordMastery: (state, action: PayloadAction<{ id: string; masteryLevel: string; masteryScore: number }>) => {
      const word = state.words.find(w => w.id === action.payload.id);
      if (word) {
        word.masteryLevel = action.payload.masteryLevel as any;
        word.masteryScore = action.payload.masteryScore;
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch vocabulary words
      .addCase(fetchVocabularyWords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVocabularyWords.fulfilled, (state, action) => {
        state.loading = false;
        state.words = action.payload;
      })
      .addCase(fetchVocabularyWords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch vocabulary words';
      })
      
      // Add words from text
      .addCase(addWordsFromText.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addWordsFromText.fulfilled, (state, action) => {
        state.loading = false;
        // Add new words to the existing list
        state.words.push(...action.payload.newWordsAdded);
      })
      .addCase(addWordsFromText.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add words';
      })
      
      // Remove word
      .addCase(removeVocabularyWord.fulfilled, (state, action) => {
        state.words = state.words.filter(w => w.id !== action.payload);
      })
      .addCase(removeVocabularyWord.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to remove word';
      })
      
      // Fetch mastery stats
      .addCase(fetchMasteryStats.fulfilled, (state, action) => {
        state.masteryStats = action.payload;
      })
      .addCase(fetchMasteryStats.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch mastery stats';
      })
      
      // Fetch learning metrics
      .addCase(fetchLearningMetrics.fulfilled, (state, action) => {
        state.learningMetrics = action.payload;
      })
      .addCase(fetchLearningMetrics.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch learning metrics';
      })
      
      // Generate vocabulary practice
      .addCase(generateVocabularyPractice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateVocabularyPractice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPracticeGroup = action.payload;
      })
      .addCase(generateVocabularyPractice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate practice';
      })
      
      // Generate adaptive practice
      .addCase(generateAdaptivePractice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateAdaptivePractice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPracticeGroup = action.payload;
      })
      .addCase(generateAdaptivePractice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate adaptive practice';
      });
  },
});

export const {
  setSelectedLanguage,
  clearCurrentPracticeGroup,
  updateWordMastery,
  setError,
} = vocabularySlice.actions;

export default vocabularySlice.reducer;