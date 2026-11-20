import api from './api';

export type AssessmentLanguage = 'en' | 'ja' | 'fr';
export type AssessmentBand = 'beginner' | 'intermediate' | 'advanced';

export const assessmentLanguages: Record<AssessmentLanguage, string> = {
  en: '英语',
  ja: '日语',
  fr: '法语',
};

export const assessmentBands: Record<AssessmentBand, string> = {
  beginner: '基础',
  intermediate: '进阶',
  advanced: '高阶',
};

export interface UserCapability {
  id: string;
  language: AssessmentLanguage;
  currentLevel: string | null;
  learningGoal: string | null;
  overallLevel: string | null;
  lastAssessedAt: string | null;
  listeningLevel: number | null;
  speakingLevel: number | null;
  readingLevel: number | null;
  writingLevel: number | null;
}

export interface BandScore {
  band: AssessmentBand;
  correct: number;
  total: number;
}

export interface AssessmentQuestion {
  id: string;
  band: AssessmentBand;
  prompt: string;
  options: string[];
}

export interface AssessmentAnswer extends AssessmentQuestion {
  selectedIndex: number;
  correctIndex: number;
  explanation: string;
}

export interface AssessmentReport {
  id: string;
  source: 'practice' | 'self_test';
  language: AssessmentLanguage;
  completedAt: string;
  band: AssessmentBand | null;
  correct: number;
  total: number;
  minimumQuestions: number;
  passingPercent: number;
  bands: BandScore[];
  practice: (BandScore & { resultId: string; title: string; completedAt: string })[];
  answers: AssessmentAnswer[];
}

export interface AssessmentSession {
  id: string;
  language: AssessmentLanguage;
  questions: AssessmentQuestion[];
  report: AssessmentReport | null;
}

interface Response<T> {
  data: T;
}

const assessmentApi = {
  async getAllCapabilities(signal?: AbortSignal) {
    return (await api.get<Response<UserCapability[]>>('/assessment/capabilities', { signal })).data.data;
  },

  async getHistory(language: AssessmentLanguage, signal?: AbortSignal) {
    return (await api.get<Response<AssessmentReport[]>>(`/assessment/history/${language}`, { signal })).data.data;
  },

  async assessPractice(language: AssessmentLanguage) {
    return (await api.post<Response<AssessmentReport>>('/assessment/comprehensive', { language })).data.data;
  },

  async startSelfTest(language: AssessmentLanguage) {
    return (await api.post<Response<AssessmentSession>>('/assessment/reassessment', { language })).data.data;
  },

  async getSelfTest(id: string, signal?: AbortSignal) {
    return (await api.get<Response<AssessmentSession>>(`/assessment/reassessment/${id}`, { signal })).data.data;
  },

  async submitSelfTest(id: string, answers: Record<string, number>) {
    return (await api.post<Response<AssessmentReport>>(`/assessment/reassessment/${id}/submit`, { answers })).data.data;
  },
};

export default assessmentApi;
