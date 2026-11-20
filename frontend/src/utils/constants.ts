export const APP_NAME = 'AI Language Learning';

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ja: 'Japanese',
  fr: 'French',
} as const;

export const LANGUAGE_LEVELS = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Proficient',
} as const;

export const ROUTES = {
  AI_SETTINGS: '/ai-settings',
  DASHBOARD: '/',
  CHAT: '/chat',
  PRACTICE: '/practice',
  VOCABULARY: '/vocabulary',
  PK: '/pk',
  PROFILE: '/profile',
  ADMIN: '/admin',
} as const;