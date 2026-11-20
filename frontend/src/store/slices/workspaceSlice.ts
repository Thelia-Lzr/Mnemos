import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

interface WorkspaceProfile {
  id: string;
  username: string;
  email: string;
}

export const loadWorkspaceProfile = createAsyncThunk('workspace/loadProfile', async () => {
  const response = await api.get<WorkspaceProfile>('/users/profile');
  return response.data;
});

const initialState: { profile: WorkspaceProfile | null } = { profile: null };

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadWorkspaceProfile.fulfilled, (state, action) => {
      state.profile = action.payload;
    });
  },
});

export default workspaceSlice.reducer;
