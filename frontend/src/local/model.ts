export const languages = { en: '英语', ja: '日语', fr: '法语' } as const;
export type Language = keyof typeof languages;

export const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = typeof levels[number];

export type AiConfig =
  | { provider: 'openrouter' | 'compatible'; baseUrl: string; model: string; secret: string }
  | { provider: 'codex' | 'claude'; origin: string; model: string; secret: string };

export interface Profile {
  name: string;
  language: Language;
  level: Level;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface Word {
  id: string;
  language: Language;
  term: string;
  meaning: string;
  example: string;
  reviews: number;
  due: number;
}

export interface Question {
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export type ActivityKind = 'practice' | 'assessment' | 'vocabulary';

export interface Result {
  id: string;
  kind: ActivityKind;
  language: Language;
  level: Level;
  topic: string;
  at: number;
  correct: number;
  total: number;
}
