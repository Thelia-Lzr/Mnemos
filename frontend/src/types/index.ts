// Common types used across the application

export enum Language {
  ENGLISH = "en",
  JAPANESE = "ja", 
  FRENCH = "fr"
}

export enum LanguageLevel {
  A1 = "A1",
  A2 = "A2", 
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2"
}

export enum DifficultyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate", 
  ADVANCED = "advanced"
}

export enum MasteryLevel {
  NEW = "new",
  LEARNING = "learning",
  SHORT_TERM = "short_term",
  LONG_TERM = "long_term",
  MASTERED = "mastered"
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}