import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  userId: string;
  content: string;
  type: 'user_text' | 'user_file' | 'ai_response' | 'system';
  timestamp: Date;
  aiResponse?: {
    content: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
    metadata?: Record<string, any>;
  };
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  detectedIntent?: string;
  functionCalls?: any[];
  functionResults?: any[];
  attachments?: any[];
  extractedVocabulary?: string[];
  identifiedGrammar?: string[];
  isProcessing?: boolean;
}

export interface TaskProgress {
  taskId: string;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  estimatedCompletion?: Date;
  error?: string;
}

export interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  extractedContent?: string;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  currentTaskId: string | null;
  activeTasks: Record<string, TaskProgress>;
  fileUploads: Record<string, FileUpload>;
  error: string | null;
  isConnected: boolean;
  language: string;
  context: Record<string, any>;
  availableFunctions: any[];
  totalMessageCount: number;
  hasMoreMessages: boolean;
  isLoadingHistory: boolean;
}

const initialState: ChatState = {
  messages: [],
  isTyping: false,
  currentTaskId: null,
  activeTasks: {},
  fileUploads: {},
  error: null,
  isConnected: true,
  language: 'en',
  context: {},
  availableFunctions: [],
  totalMessageCount: 0,
  hasMoreMessages: false,
  isLoadingHistory: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Message management
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    addMessages: (state, action: PayloadAction<Message[]>) => {
      // Add messages at the beginning for history loading
      state.messages.unshift(...action.payload);
    },
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<Message> }>) => {
      const message = state.messages.find(m => m.id === action.payload.id);
      if (message) {
        Object.assign(message, action.payload.updates);
      }
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(m => m.id !== action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
      state.totalMessageCount = 0;
      state.hasMoreMessages = false;
    },

    // Chat state management
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setCurrentTask: (state, action: PayloadAction<string | null>) => {
      state.currentTaskId = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    updateContext: (state, action: PayloadAction<Record<string, any>>) => {
      state.context = { ...state.context, ...action.payload };
    },

    // Task management
    addTask: (state, action: PayloadAction<TaskProgress>) => {
      state.activeTasks[action.payload.taskId] = action.payload;
    },
    updateTask: (state, action: PayloadAction<{ taskId: string; updates: Partial<TaskProgress> }>) => {
      const task = state.activeTasks[action.payload.taskId];
      if (task) {
        Object.assign(task, action.payload.updates);
      }
    },
    removeTask: (state, action: PayloadAction<string>) => {
      delete state.activeTasks[action.payload];
    },
    clearTasks: (state) => {
      state.activeTasks = {};
    },

    // File upload management
    addFileUpload: (state, action: PayloadAction<FileUpload>) => {
      state.fileUploads[action.payload.id] = action.payload;
    },
    updateFileUpload: (state, action: PayloadAction<{ id: string; updates: Partial<FileUpload> }>) => {
      const upload = state.fileUploads[action.payload.id];
      if (upload) {
        Object.assign(upload, action.payload.updates);
      }
    },
    removeFileUpload: (state, action: PayloadAction<string>) => {
      delete state.fileUploads[action.payload];
    },
    clearFileUploads: (state) => {
      state.fileUploads = {};
    },

    // Function management
    setAvailableFunctions: (state, action: PayloadAction<any[]>) => {
      state.availableFunctions = action.payload;
    },

    // History management
    setHistoryInfo: (state, action: PayloadAction<{ totalCount: number; hasMore: boolean }>) => {
      state.totalMessageCount = action.payload.totalCount;
      state.hasMoreMessages = action.payload.hasMore;
    },
    setLoadingHistory: (state, action: PayloadAction<boolean>) => {
      state.isLoadingHistory = action.payload;
    },
  },
});

export const { 
  // Message actions
  addMessage, 
  addMessages,
  updateMessage,
  removeMessage,
  clearMessages,
  
  // Chat state actions
  setTyping, 
  setCurrentTask, 
  setError,
  setConnected,
  setLanguage,
  updateContext,
  
  // Task actions
  addTask,
  updateTask,
  removeTask,
  clearTasks,
  
  // File upload actions
  addFileUpload,
  updateFileUpload,
  removeFileUpload,
  clearFileUploads,
  
  // Function actions
  setAvailableFunctions,
  
  // History actions
  setHistoryInfo,
  setLoadingHistory,
} = chatSlice.actions;

export default chatSlice.reducer;