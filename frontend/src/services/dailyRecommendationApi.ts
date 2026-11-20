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
  private static normalizeRecommendation(raw: any): DailyLearningRecommendation {
    const recommendationData = raw?.recommendationData || {};

    const quickPracticeOptions =
      (raw?.quickPracticeOptions ?? recommendationData.quick_practice_options ?? []).map((option: any) => ({
        ...option,
        difficultyLevel: option.difficultyLevel ?? option.difficulty ?? option.difficulty_level,
      }));

    const normalizedRecommendations: LearningRecommendation[] =
      Array.isArray(raw?.recommendations) && raw.recommendations.length > 0
        ? raw.recommendations
        : [
            {
              id: 'review_items',
              type: RecommendationType.REVIEW_REMINDER,
              title: '复习任务',
              description:
                recommendationData.review_items?.[0]?.description || '完成今日复习任务',
              priority: 1,
              focusAreas: ['review'],
              suggestedActivities: recommendationData.practice_suggestions || [],
              estimatedTime: recommendationData.review_items?.[0]?.count || 10,
            },
            {
              id: 'new_learning',
              type: RecommendationType.SKILL_IMPROVEMENT,
              title: '新学习内容',
              description:
                recommendationData.new_learning?.[0]?.topic || '学习新知识点',
              priority: 2,
              focusAreas: ['learning'],
              suggestedActivities: recommendationData.practice_suggestions || [],
              estimatedTime: recommendationData.new_learning?.[0]?.estimated_time || 15,
            },
          ];

    return {
      id: raw?.id || 'unknown',
      userId: raw?.userId || '',
      language: raw?.language || 'en',
      date: raw?.date || new Date().toISOString().slice(0, 10),
      recommendations: normalizedRecommendations,
      quickPracticeOptions,
      basedOnCapability: raw?.basedOnCapability,
      basedOnMilestones: raw?.basedOnMilestones || [],
      basedOnVocabulary: raw?.basedOnVocabulary || [],
      userFeedback: raw?.userFeedback ?? (raw?.feedbackRating != null ? {
        rating: raw.feedbackRating,
        isHelpful: Boolean(raw.feedbackIsHelpful),
        comments: raw.feedbackComments,
        followedRecommendations: recommendationData.feedback_followed_ids ?? [],
        submittedAt: raw.viewedAt ?? raw.date,
      } : undefined),
      isViewed: Boolean(raw?.isViewed),
      viewedAt: raw?.viewedAt,
      aiModel: raw?.aiModel || 'fallback/local',
      generationTime: raw?.generationTime || 0,
      tokensUsed: raw?.tokensUsed || 0,
      createdAt: raw?.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Get today's daily learning recommendation
   */
  static async getTodaysRecommendation(language: string): Promise<DailyLearningRecommendation> {
    const response = await api.get<ApiResponse<DailyLearningRecommendation[]>>(
      `/daily-recommendations/${language}/today`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get daily recommendation');
    }

    if (response.data.data.length === 0) {
      throw new Error('No daily recommendation available');
    }

    return this.normalizeRecommendation(response.data.data[0]);
  }

  /**
   * Generate new daily recommendation (synchronous)
   */
  static async generateRecommendation(language: string): Promise<DailyLearningRecommendation> {
    const response = await api.post<ApiResponse<unknown>>(
      `/daily-recommendations/${language}/generate`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate daily recommendation');
    }

    return this.getTodaysRecommendation(language);
  }

  /**
   * Submit feedback for daily recommendation
   */
  static async submitFeedback(
    language: string,
    recommendationId: string,
    feedback: Omit<RecommendationFeedback, 'submittedAt'>
  ): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/daily-recommendations/${language}/feedback`,
      {
        recommendation_id: recommendationId,
        request: { rating: feedback.rating, isHelpful: feedback.isHelpful, comments: feedback.comments, followedRecommendations: feedback.followedRecommendations }
      }
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
    const response = await api.get<ApiResponse<DailyLearningRecommendation[]>>(
      `/daily-recommendations/${language}/history?limit=${limit}`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get recommendation history');
    }
    
    return {
      history: response.data.data.map((item) => this.normalizeRecommendation(item)),
      count: response.data.data.length
    };
  }

  /**
   * Mark recommendation as viewed
   */
  static async markAsViewed(language: string, date?: string): Promise<void> {
    const recommendation = date
      ? await this.getRecommendationByDate(language, date)
      : await this.getTodaysRecommendation(language);

    const response = await api.post<ApiResponse<void>>(
      `/daily-recommendations/${language}/view`,
      { recommendation_id: recommendation.id }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to mark recommendation as viewed');
    }
  }

  /**
   * Get recommendation for specific date
   */
  static async getRecommendationByDate(language: string, date: string): Promise<DailyLearningRecommendation> {
    const response = await api.get<ApiResponse<DailyLearningRecommendation[]>>(
      `/daily-recommendations/${language}/date/${date}`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get recommendation for date');
    }
    
    if (response.data.data.length === 0) {
      throw new Error('No recommendation found for the selected date');
    }

    return this.normalizeRecommendation(response.data.data[0]);
  }
}