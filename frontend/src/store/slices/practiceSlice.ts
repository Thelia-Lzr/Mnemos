import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PracticeGroup {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  difficulty: string;
  type: string;
}

interface Question {
  id: string;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface PracticeState {
  currentGroup: PracticeGroup | null;
  practiceHistory: PracticeGroup[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  isGenerating: boolean;
  generationTaskId: string | null;
  error: string | null;
}

const initialState: PracticeState = {
  currentGroup: null,
  practiceHistory: [],
  currentQuestionIndex: 0,
  answers: {},
  isGenerating: false,
  generationTaskId: null,
  error: null,
};

const practiceSlice = createSlice({
  name: 'practice',
  initialState,
  reducers: {
    setCurrentGroup: (state, action: PayloadAction<PracticeGroup | null>) => {
      state.currentGroup = action.payload;
      state.currentQuestionIndex = 0;
      state.answers = {};
    },
    setCurrentQuestionIndex: (state, action: PayloadAction<number>) => {
      state.currentQuestionIndex = action.payload;
    },
    setAnswer: (state, action: PayloadAction<{ questionId: string; answer: string }>) => {
      state.answers[action.payload.questionId] = action.payload.answer;
    },
    addToPracticeHistory: (state, action: PayloadAction<PracticeGroup>) => {
      state.practiceHistory.unshift(action.payload);
    },
    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    setGenerationTaskId: (state, action: PayloadAction<string | null>) => {
      state.generationTaskId = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentGroup,
  setCurrentQuestionIndex,
  setAnswer,
  addToPracticeHistory,
  setGenerating,
  setGenerationTaskId,
  setError,
} = practiceSlice.actions;
export default practiceSlice.reducer;