import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PKBattle {
  id: string;
  player1Id: string;
  player2Id: string;
  status: 'waiting' | 'generating_practice' | 'in_progress' | 'completed';
  practiceGroupId?: string;
  player1Score: number;
  player2Score: number;
  player1Time: number;
  player2Time: number;
  winnerId?: string;
  player1MMRChange: number;
  player2MMRChange: number;
  language: string;
  createdAt: string;
}

interface PKState {
  currentBattle: PKBattle | null;
  isMatching: boolean;
  matchingTaskId: string | null;
  battleHistory: PKBattle[];
  mmr: number;
  userStats: any;
  leaderboard: any[];
  error: string | null;
}

const initialState: PKState = {
  currentBattle: null,
  isMatching: false,
  matchingTaskId: null,
  battleHistory: [],
  mmr: 1000,
  userStats: null,
  leaderboard: [],
  error: null,
};

const pkSlice = createSlice({
  name: 'pk',
  initialState,
  reducers: {
    setCurrentBattle: (state, action: PayloadAction<PKBattle | null>) => {
      state.currentBattle = action.payload;
    },
    setMatching: (state, action: PayloadAction<boolean>) => {
      state.isMatching = action.payload;
    },
    setMatchingTaskId: (state, action: PayloadAction<string | null>) => {
      state.matchingTaskId = action.payload;
    },
    addToBattleHistory: (state, action: PayloadAction<PKBattle>) => {
      state.battleHistory.unshift(action.payload);
    },
    setMMR: (state, action: PayloadAction<number>) => {
      state.mmr = action.payload;
    },
    setUserStats: (state, action: PayloadAction<any>) => {
      state.userStats = action.payload;
    },
    setLeaderboard: (state, action: PayloadAction<any[]>) => {
      state.leaderboard = action.payload;
    },
    setBattleHistory: (state, action: PayloadAction<PKBattle[]>) => {
      state.battleHistory = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentBattle,
  setMatching,
  setMatchingTaskId,
  addToBattleHistory,
  setMMR,
  setUserStats,
  setLeaderboard,
  setBattleHistory,
  setError,
} = pkSlice.actions;
export default pkSlice.reducer;