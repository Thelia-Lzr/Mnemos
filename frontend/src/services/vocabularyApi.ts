import { api } from './api';

export interface VocabularyWord {
  id: string;
  userId: string;
  word: string;
  language: 'en' | 'ja' | 'fr';
  definition?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  difficulty: number;
  frequency: number;
  masteryLevel: 'new' | 'learning' | 'short_term' | 'long_term' | 'mastered';
  masteryScore: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  addedAt: string;
  firstEncounteredAt: string;
  forgettingCurveParams: {
    initialStrength: number;
    decayRate: number;
    reviewCount: number;
    lastReviewScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MasteryStats {
  totalWords: number;
  newWords: number;
  learningWords: number;
  shortTermWords: number;
  longTermWords: number;
  masteredWords: number;
  averageMasteryScore: number;
  wordsNeedingReview: number;
  dailyReviewTarget: number;
}

export interface WordExtractionResult {
  words: string[];
  extractedCount: number;
  duplicateCount: number;
  newWordsAdded: VocabularyWord[];
}

export interface ReviewSchedule {
  wordId: string;
  nextReviewAt: string;
  priority: number;
  estimatedDifficulty: number;
}

export interface LearningEfficiencyMetrics {
  wordsLearned: number;
  averageLearningTime: number;
  retentionRate: number;
  masteryProgression: number;
  weaknessAreas: string[];
}

export interface VocabularyPracticeGroup {
  id: string;
  title: string;
  description: string;
  words: VocabularyWord[];
  questions: VocabularyQuestion[];
  estimatedDuration: number;
  focusAreas: string[];
}

export interface VocabularyQuestion {
  id: string;
  type: 'definition_to_word' | 'word_to_definition' | 'fill_in_blank' | 'synonym_antonym' | 'usage_in_context';
  targetWord: VocabularyWord;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
}

export interface PracticeResult {
  wordId: string;
  questionType: string;
  isCorrect: boolean;
  responseTime: number;
  score: number;
}

export const vocabularyApi = {
  // Get user's vocabulary words
  getVocabularyWords: async (language: string, masteryLevel?: string): Promise<{ words: VocabularyWord[] }> => {
    const params = new URLSearchParams({ language });
    if (masteryLevel) {
      params.append('mastery_level', masteryLevel);
    }
    
    const response = await api.get(`/vocabulary/words?${params.toString()}`);
    const payload = response.data?.data ?? response.data;
    const words = Array.isArray(payload?.words)
      ? payload.words
      : Array.isArray(payload)
        ? payload
        : [];
    return { words };
  },

  // Add words from text
  addWordsFromText: async (text: string, language: string): Promise<WordExtractionResult> => {
    const response = await api.post('/vocabulary/add-words', { text, language });
    return response.data.data;
  },

  // Remove a word
  removeWord: async (wordId: string): Promise<void> => {
    await api.delete(`/vocabulary/word/${wordId}`);
  },

  // Update word mastery
  updateMastery: async (wordId: string, practiceScore: number, responseTime: number): Promise<any> => {
    const response = await api.put(`/vocabulary/word/${wordId}/mastery`, {
      mastery_score: practiceScore
    });
    return response.data.data;
  },

  // Get mastery statistics
  getMasteryStats: async (language: string): Promise<MasteryStats> => {
    const response = await api.get(`/vocabulary/mastery-stats?language=${language}`);
    return response.data.data;
  },

  // Get words needing review
  getWordsNeedingReview: async (language: string, limit?: number): Promise<{ words: VocabularyWord[] }> => {
    const params = new URLSearchParams({ language });
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    const response = await api.get(`/vocabulary/words-needing-review?${params.toString()}`);
    return response.data.data;
  },

  // Apply daily decay
  applyDailyDecay: async (language: string): Promise<void> => {
    await api.post('/vocabulary/apply-daily-decay', { language });
  },

  // Get scheduled reviews
  getScheduledReviews: async (language: string, limit?: number): Promise<{ schedules: ReviewSchedule[] }> => {
    const params = new URLSearchParams({ language });
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    const response = await api.get(`/vocabulary/scheduled-reviews?${params.toString()}`);
    return response.data.data;
  },

  // Get review reminders
  getReviewReminders: async (): Promise<{ reminders: any[] }> => {
    const response = await api.get('/vocabulary/review-reminders');
    return response.data.data;
  },

  // Get forgetting curve metrics
  getForgettingCurveMetrics: async (language: string): Promise<any> => {
    const response = await api.get(`/vocabulary/forgetting-curve-metrics?language=${language}`);
    return response.data.data;
  },

  // Generate vocabulary practice
  generateVocabularyPractice: async (options: {
    language: string;
    wordIds?: string[];
    masteryLevels?: string[];
    maxWords?: number;
    focusOnWeakWords?: boolean;
    includeReviewWords?: boolean;
  }): Promise<VocabularyPracticeGroup> => {
    const response = await api.post('/vocabulary/generate-practice', options);
    return response.data.data;
  },

  // Generate adaptive practice
  generateAdaptivePractice: async (language: string): Promise<VocabularyPracticeGroup> => {
    const response = await api.post('/vocabulary/generate-practice', { language });
    return response.data.data;
  },

  // Submit practice results
  submitPracticeResults: async (results: PracticeResult[]): Promise<void> => {
    await api.post('/vocabulary/submit-practice', { results });
  },

  // Get learning efficiency metrics
  getLearningEfficiencyMetrics: async (language: string, days?: number): Promise<LearningEfficiencyMetrics> => {
    const params = new URLSearchParams({ language });
    if (days) {
      params.append('days', days.toString());
    }
    
    const response = await api.get(`/vocabulary/learning-efficiency-metrics?${params.toString()}`);
    return response.data.data;
  }
};