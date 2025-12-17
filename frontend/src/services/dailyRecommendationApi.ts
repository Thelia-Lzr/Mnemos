import { api } from './api';

export interface DailyLearningRecommendation {
  id: string;
  userId: string;
  language: string;
  date: string;
  recommendations: LearningRecommendation[];
  quickPracticeOptions: QuickPracticeOption[];
  basedOnCapability?: any;
  basedOnMilestones?: any[];
  basedOnVocabulary?: any[];
  userFeedback?: RecommendationFeedback;
  isViewed: boolean;
  viewedAt?: string;
  aiModel: string;
  generationTime: number;
  tokensUsed: number;
  createdAt: string;
}

export interface LearningRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: number;
  focusAreas: string[];
  suggestedActivities: string[];
  estimatedTime: number;
  relatedVocabulary?: string[];
  relatedGrammar?: string[];
  relatedMilestone?: string;
}

export interface QuickPracticeOption {
  id: string;
  title: string;
  description: string;
  type: string;
  estimatedQuestions: number;
  estimatedTime: number;
  focusAreas: string[];
  difficultyLevel: string;
  includeVocabulary: string[];
  canGenerateImmediately: boolean;
}

export interface RecommendationFeedback {
  rating: number;
  isHelpful: boolean;
  followedRecommendations: string[];
  comments?: string;
  submittedAt: string;
}

export enum RecommendationType {
  VOCABULARY_FOCUS = "vocabulary_focus",
  GRAMMAR_PRACTICE = "grammar_practice",
  SKILL_IMPROVEMENT = "skill_improvement",
  MILESTONE_PROGRESS = "milestone_progress",
  REVIEW_REMINDER = "review_reminder",
  WEAKNESS_TARGETING = "weakness_targeting"
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface TaskResponse {
  taskId: string;
  message: string;
  status: string;
}

export class DailyRecommendationApi {
  /**
   * Get today's daily learning recommendation
   */
  static async getTodaysRecommendation(language: string): Promise<DailyLearningRecommendation> {
    const response = await api.get<ApiResponse<DailyLearningRecommendation>>(
      `/daily-recommendations/${language}/today`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get daily recommendation');
    }
    
    return response.data.data;
  }

  /**
   * Generate new daily recommendation (synchronous)
   */
  static async generateRecommendation(language: string): Promise<DailyLearningRecommendation> {
    const response = await api.post<ApiResponse<DailyLearningRecommendation>>(
      `/daily-recommendations/${language}/generate`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to generate daily recommendation');
    }
    
    return response.data.data;
  }

  /**
   * Generate new daily recommendation (asynchronous)
   */
  static async generateRecommendationAsync(language: string): Promise<TaskResponse> {
    const response = await api.post<ApiResponse<TaskResponse>>(
      `/daily-recommendations/${language}/generate-async`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to start recommendation generation');
    }
    
    return response.data.data;
  }

  /**
   * Generate quick practice based on recommendation option
   */
  static async generateQuickPractice(language: string, practiceOptionId: string): Promise<TaskResponse> {
    const response = await api.post<ApiResponse<TaskResponse>>(
      `/daily-recommendations/${language}/quick-practice/${practiceOptionId}`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to generate quick practice');
    }
    
    return response.data.data;
  }

  /**
   * Submit feedback for daily recommendation
   */
  static async submitFeedback(
    language: string, 
    feedback: Omit<RecommendationFeedback, 'submittedAt'>
  ): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/daily-recommendations/${language}/feedback`,
      feedback
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to submit feedback');
    }
  }

  /**
   * Get recommendation history
   */
  static async getRecommendationHistory(
    language: string, 
    limit: number = 30
  ): Promise<{ history: DailyLearningRecommendation[]; count: number }> {
    const response = await api.get<ApiResponse<{ history: DailyLearningRecommendation[]; count: number }>>(
      `/daily-recommendations/${language}/history?limit=${limit}`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get recommendation history');
    }
    
    return response.data.data;
  }

  /**
   * Mark recommendation as viewed
   */
  static async markAsViewed(language: string, date?: string): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/daily-recommendations/${language}/mark-viewed`,
      { date }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to mark recommendation as viewed');
    }
  }

  /**
   * Get recommendation for specific date
   */
  static async getRecommendationByDate(language: string, date: string): Promise<DailyLearningRecommendation> {
    const response = await api.get<ApiResponse<DailyLearningRecommendation>>(
      `/daily-recommendations/${language}/date/${date}`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get recommendation for date');
    }
    
    return response.data.data;
  }
}