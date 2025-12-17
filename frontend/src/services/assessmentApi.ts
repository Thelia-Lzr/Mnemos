import api from './api';

export interface UserCapability {
  id: string;
  userId: string;
  language: string;
  currentLevel: string;
  learningGoal: string;
  isActiveLearning: boolean;
  overallLevel: string;
  confidenceScore: number;
  listeningLevel: number;
  speakingLevel: number;
  readingLevel: number;
  writingLevel: number;
  estimatedVocabularySize: number;
  masteredWordsCount: number;
  learningWordsCount: number;
  lastAssessedAt: string;
  nextAssessmentDue: string | null;
  vocabularyCapability: VocabularyCapability;
  grammarCapability: GrammarCapability;
  comprehensionCapability: ComprehensionCapability;
  assessmentHistory: CapabilityAssessment[];
  learningStyle: string;
  strengths: string[];
  weaknesses: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyCapability {
  estimatedVocabularySize: number;
  masteredWordsCount: number;
  learningWordsCount: number;
  basicVocabularyMastery: number;
  intermediateVocabularyMastery: number;
  advancedVocabularyMastery: number;
  averageLearningSpeed: number;
  retentionRate: number;
  contextualUsageScore: number;
  collocationsScore: number;
}

export interface GrammarCapability {
  overallGrammarScore: number;
  grammarPointsMastered: string[];
  grammarPointsLearning: string[];
  grammarPointsWeak: string[];
  sentenceStructureScore: number;
  tenseUsageScore: number;
  complexityHandlingScore: number;
}

export interface ComprehensionCapability {
  readingComprehensionScore: number;
  listeningComprehensionScore: number;
  literalComprehension: number;
  inferentialComprehension: number;
  criticalComprehension: number;
  maxTextComplexity: string;
  processingSpeed: number;
}

export interface CapabilityAssessment {
  id: string;
  userId: string;
  language: string;
  assessmentDate: string;
  assessmentType: string;
  overallScore: number;
  skillScores: Record<string, number>;
  dataSource: string;
  confidenceLevel: number;
  improvementAreas: string[];
  regressionAreas: string[];
  recommendations: string[];
  nextSteps: string[];
  createdAt: string;
}

export interface ReassessmentCase {
  id: string;
  userId: string;
  language: string;
  originalAssessmentId: string;
  reason: string;
  focusAreas: string[];
  userObjections: string[];
  status: string;
  targetedQuestions: string[];
  userResponses: ReassessmentResponse[];
  newAssessmentId?: string;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ReassessmentResponse {
  questionId: string;
  question: string;
  userAnswer: string;
  aiEvaluation: {
    score: number;
    feedback: string;
    skillAreas: string[];
  };
  submittedAt: string;
}

export interface CreateCapabilityRequest {
  language: string;
  currentLevel: string;
  learningGoal: string;
}

export interface UpdateCapabilityRequest {
  currentLevel?: string;
  learningGoal?: string;
  isActiveLearning?: boolean;
  overallLevel?: string;
  confidenceScore?: number;
  listeningLevel?: number;
  speakingLevel?: number;
  readingLevel?: number;
  writingLevel?: number;
  vocabularyCapability?: Partial<VocabularyCapability>;
  grammarCapability?: Partial<GrammarCapability>;
  comprehensionCapability?: Partial<ComprehensionCapability>;
  learningStyle?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export interface AssessmentRequest {
  language: string;
  assessmentType?: string;
  dataSource?: string;
  includeRecommendations?: boolean;
}

export interface ReassessmentRequest {
  language: string;
  reason: string;
  focusAreas?: string[];
}

class AssessmentApi {
  /**
   * Get all user capabilities
   */
  async getAllCapabilities(): Promise<UserCapability[]> {
    const response = await api.get('/assessment/capabilities');
    return response.data.data;
  }

  /**
   * Get user capability for a specific language
   */
  async getCapability(language: string): Promise<UserCapability> {
    const response = await api.get(`/assessment/capability/${language}`);
    return response.data.data;
  }

  /**
   * Create user capability for a language
   */
  async createCapability(request: CreateCapabilityRequest): Promise<UserCapability> {
    const response = await api.post('/assessment/capability', request);
    return response.data.data;
  }

  /**
   * Update user capability
   */
  async updateCapability(language: string, request: UpdateCapabilityRequest): Promise<UserCapability> {
    const response = await api.put(`/assessment/capability/${language}`, request);
    return response.data.data;
  }

  /**
   * Perform comprehensive assessment
   */
  async performComprehensiveAssessment(request: AssessmentRequest): Promise<CapabilityAssessment> {
    const response = await api.post('/assessment/comprehensive', request);
    return response.data.data;
  }

  /**
   * Get assessment history for a language
   */
  async getAssessmentHistory(language: string, limit: number = 10): Promise<CapabilityAssessment[]> {
    const response = await api.get(`/assessment/history/${language}`, {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * Initiate reassessment
   */
  async initiateReassessment(request: ReassessmentRequest): Promise<ReassessmentCase> {
    const response = await api.post('/assessment/reassessment', request);
    return response.data.data;
  }

  /**
   * Get reassessment case
   */
  async getReassessmentCase(reassessmentId: string): Promise<ReassessmentCase> {
    const response = await api.get(`/assessment/reassessment/${reassessmentId}`);
    return response.data.data;
  }

  /**
   * Submit reassessment response
   */
  async submitReassessmentResponse(
    reassessmentId: string, 
    questionId: string, 
    userAnswer: string
  ): Promise<ReassessmentResponse> {
    const response = await api.post(`/assessment/reassessment/${reassessmentId}/response`, {
      questionId,
      userAnswer
    });
    return response.data.data;
  }

  /**
   * Cancel reassessment
   */
  async cancelReassessment(reassessmentId: string, reason?: string): Promise<void> {
    await api.delete(`/assessment/reassessment/${reassessmentId}`, {
      data: { reason }
    });
  }

  /**
   * Get reassessment history for a language
   */
  async getReassessmentHistory(language: string): Promise<ReassessmentCase[]> {
    const response = await api.get(`/assessment/reassessment-history/${language}`);
    return response.data.data;
  }
}

export const assessmentApi = new AssessmentApi();
export default assessmentApi;