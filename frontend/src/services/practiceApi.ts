import api from './api';

export interface PracticeGroup {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  difficulty: string;
  type: string;
  estimatedDuration: number;
  focusAreas: string[];
  createdAt: string;
  userId: string;
  language: string;
}

export interface Question {
  id: string;
  practiceGroupId: string;
  type: 'multiple_choice' | 'fill_blank' | 'translation' | 'listening';
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  vocabularyWords: string[];
  grammarPoints: string[];
  difficulty: number;
  orderIndex: number;
}

export interface PracticeResult {
  id: string;
  practiceGroupId: string;
  userId: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  totalTime: number;
  averageTimePerQuestion: number;
  weakAreas: string[];
  improvedAreas: string[];
  recommendedFocus: string[];
  capabilityUpdates: any[];
  vocabularyUpdates: any[];
  completedAt: string;
}

export interface CreatePracticeRequest {
  language: string;
  difficulty: string;
  type: string;
  focusAreas?: string[];
  vocabularyWords?: string[];
  grammarPoints?: string[];
  count?: number;
}

export interface CreateAIPracticeRequest {
  message: string;
  language?: string;
  type?: string;
  difficulty?: string;
}

export interface CreateEnhancedPracticeRequest {
  language: string;
  type: string;
  difficulty: string;
  additionalPrompt?: string;
}

export interface SubmitPracticeRequest {
  answers: Array<{
    questionId: string;
    userAnswer: string;
    timeSpent: number;
    attempts: number;
  }>;
  totalTime: number;
}

export interface AIAnalysis {
  id: string;
  practiceResultId: string;
  userId: string;
  analysisContent: string;
  learningAdvice: string;
  strengthsIdentified: string[];
  weaknessesIdentified: string[];
  improvementSuggestions: string[];
  confidenceScore: number;
  aiModel: string;
  tokensUsed?: number;
  createdAt: string;
}

export interface PracticeHistoryItem {
  practiceGroupId: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  type: string;
  practiceCreatedAt: string;
  result?: {
    id: string;
    accuracy: number;
    totalTime: number;
    completedAt: string;
  };
  analysis?: {
    id: string;
    analysisContent: string;
    learningAdvice: string;
    createdAt: string;
  };
}

export interface QuestionFollowUpRequest {
  questionId: string;
  questionContent: string;
  correctAnswer?: string;
  userAnswer?: string;
  explanation?: string;
  followUpQuestion: string;
  language: string;
  // Enhanced context
  options?: string[];
  userAnswerText?: string;
  correctAnswerText?: string;
  vocabularyWords?: string[];
  grammarPoints?: string[];
}

export interface PracticeGroupFollowUpRequest {
  practiceGroupId: string;
  practiceGroupTitle?: string;
  practiceGroupDescription?: string;
  totalQuestions?: number;
  correctAnswers?: number;
  accuracy?: number;
  followUpQuestion: string;
  language: string;
  practiceResultId?: string; // For detailed context
}

export interface FollowUpResponse {
  answer: string;
  relatedConcepts?: string[];
  additionalTips?: string[];
  creditCost: number;
}

class PracticeApi {
  private mapPracticeTypeToSkillAreas(type?: string): string[] {
    switch (type) {
      case 'vocabulary':
        return ['vocabulary'];
      case 'grammar':
        return ['grammar'];
      case 'comprehensive':
        return ['vocabulary', 'grammar', 'reading', 'listening'];
      case 'general':
      default:
        return ['reading', 'writing'];
    }
  }

  private extractPracticeGroup(responseData: any): PracticeGroup {
    return (responseData?.data ?? responseData) as PracticeGroup;
  }

  /**
   * Get all practice groups for the current user
   */
  async getPracticeGroups(limit: number = 20, offset: number = 0): Promise<{
    data: PracticeGroup[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    const response = await api.get('/practice/groups', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Get a specific practice group by ID
   */
  async getPracticeGroup(id: string): Promise<PracticeGroup> {
    const response = await api.get(`/practice/group/${id}`);
    return response.data.data;
  }

  /**
   * Create a new practice group
   */
  async createPracticeGroup(request: CreatePracticeRequest): Promise<PracticeGroup> {
    const response = await api.post('/practice/generate-group', {
      language: request.language,
      difficulty: request.difficulty,
      questionCount: request.count || 10,
      skillAreas: this.mapPracticeTypeToSkillAreas(request.type),
      focusAreas: request.focusAreas,
      title: request.type ? `${request.type} practice` : undefined,
      description: undefined,
    });
    return this.extractPracticeGroup(response.data);
  }

  /**
   * Create an AI-generated practice group
   */
  async createAIPracticeGroup(request: CreateAIPracticeRequest): Promise<{
    practiceGroup: PracticeGroup;
    aiAnalysis: {
      detectedIntent: string;
      confidence: number;
      parameters: any;
    };
  }> {
    const response = await api.post('/practice/generate-group', {
      language: request.language || 'en',
      difficulty: request.difficulty || 'intermediate',
      skillAreas: this.mapPracticeTypeToSkillAreas(request.type || 'general'),
      focusAreas: [request.message],
      questionCount: 10
    });
    const practiceGroup = this.extractPracticeGroup(response.data);
    return {
      practiceGroup,
      aiAnalysis: {
        detectedIntent: request.type || 'general',
        confidence: 1,
        parameters: {
          language: request.language || 'en',
          difficulty: request.difficulty || 'intermediate',
        },
      },
    };
  }

  /**
   * Create an enhanced practice group with optional additional prompt
   */
  async createEnhancedPracticeGroup(request: CreateEnhancedPracticeRequest): Promise<{
    practiceGroup: PracticeGroup;
    aiAnalysis?: {
      detectedIntent?: string;
      confidence?: number;
      parameters?: any;
    };
  }> {
    const response = await api.post('/practice/generate-group', {
      language: request.language,
      difficulty: request.difficulty,
      skillAreas: this.mapPracticeTypeToSkillAreas(request.type),
      focusAreas: request.additionalPrompt ? [request.additionalPrompt] : undefined,
      questionCount: 10
    });
    const practiceGroup = this.extractPracticeGroup(response.data);
    return {
      practiceGroup,
      aiAnalysis: {
        detectedIntent: request.type,
        confidence: 1,
        parameters: {
          language: request.language,
          difficulty: request.difficulty,
        },
      },
    };
  }

  /**
   * Create an enhanced practice group asynchronously with optional additional prompt
   */
  async createEnhancedPracticeGroupAsync(request: CreateEnhancedPracticeRequest): Promise<{
    taskId: string;
    message: string;
  }> {
    await this.createEnhancedPracticeGroup(request);
    return {
      taskId: 'sync-generated',
      message: 'Practice group generated synchronously'
    };
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: PracticeGroup;
    error?: string;
    progress?: number;
  }> {
    const response = await api.get(`/tasks/${taskId}/status`);
    return response.data.data;
  }

  /**
   * Submit practice answers and get results
   */
  async submitPractice(practiceGroupId: string, request: SubmitPracticeRequest): Promise<PracticeResult> {
    const response = await api.post(`/practice/group/${practiceGroupId}/submit`, request);
    return response.data.data;
  }

  /**
   * Get practice history
   */
  async getPracticeHistory(limit: number = 20, offset: number = 0): Promise<{
    data: PracticeHistoryItem[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    const response = await api.get('/practice/history', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Generate comprehensive practice
   */
  async generateComprehensivePractice(request: {
    language: string;
    includeCapabilityData?: boolean;
    includeMilestones?: boolean;
    includeVocabulary?: boolean;
  }): Promise<PracticeGroup> {
    const response = await api.post('/practice/generate-group', {
      language: request.language,
      difficulty: 'mixed',
      type: 'comprehensive',
      questionCount: 15
    });
    return response.data.data;
  }

  /**
   * Generate vocabulary practice
   */
  async generateVocabularyPractice(request: {
    language: string;
    vocabularyWords: string[];
  }): Promise<PracticeGroup> {
    const response = await api.post('/practice/generate-group', {
      language: request.language,
      difficulty: 'intermediate',
      type: 'vocabulary',
      vocabularyWords: request.vocabularyWords,
      questionCount: 10
    });
    return response.data.data;
  }

  /**
   * Create practice group asynchronously
   */
  async createPracticeGroupAsync(request: CreatePracticeRequest): Promise<{
    taskId: string;
    message: string;
  }> {
    await this.createPracticeGroup(request);
    return {
      taskId: 'sync-generated',
      message: 'Practice group generated synchronously'
    };
  }

  /**
   * Create AI practice group asynchronously
   */
  async createAIPracticeGroupAsync(request: CreateAIPracticeRequest): Promise<{
    taskId: string;
    message: string;
  }> {
    await this.createAIPracticeGroup(request);
    return {
      taskId: 'sync-generated',
      message: 'AI practice generated synchronously'
    };
  }

  /**
   * Delete a practice group
   */
  async deletePracticeGroup(id: string): Promise<void> {
    await api.delete(`/practice/group/${id}`);
  }

  /**
   * Batch delete practice groups
   */
  async batchDeletePracticeGroups(practiceGroupIds: string[]): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> {
    await Promise.all(practiceGroupIds.map((id) => this.deletePracticeGroup(id)));
    return {
      success: true,
      message: 'Practice groups deleted',
      deletedCount: practiceGroupIds.length
    };
  }

  /**
   * Batch delete practice history (results only, keep practice groups)
   */
  async batchDeletePracticeHistory(practiceGroupIds: string[]): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> {
    const response = await api.delete('/practice/history', {
      data: { practiceGroupIds }
    });
    return response.data;
  }

  /**
   * Update user capabilities based on practice results
   */
  async updateCapabilities(practiceResultId: string): Promise<void> {
    return;
  }

  /**
   * Generate AI analysis for practice result
   */
  async generatePracticeAnalysis(practiceResultId: string, userAnswers: Record<string, string>): Promise<AIAnalysis> {
    const response = await api.post(`/practice/result/${practiceResultId}/analyze`, {
      userAnswers
    });
    return response.data.data;
  }

  /**
   * Get existing AI analysis for practice result
   */
  async getPracticeAnalysis(practiceResultId: string): Promise<AIAnalysis | null> {
    return null;
  }

  /**
   * Get practice result detail
   */
  async getPracticeResultDetail(practiceResultId: string): Promise<{
    result: PracticeResult;
    practiceGroup: PracticeGroup;
    userAnswers: Record<string, string>;
  }> {
    throw new Error('当前后端未提供练习结果详情端点');
  }

  /**
   * Ask follow-up question about a specific question
   */
  async askQuestionFollowUp(request: QuestionFollowUpRequest): Promise<FollowUpResponse> {
    const response = await api.post('/practice/followup', {
      question: request.followUpQuestion,
      userAnswer: request.userAnswer,
      questionId: request.questionId
    });
    return { ...response.data.data, answer: response.data.data.response };
  }

  /**
   * Ask follow-up question about the entire practice group
   */
  async askPracticeGroupFollowUp(request: PracticeGroupFollowUpRequest): Promise<FollowUpResponse> {
    const response = await api.post('/practice/followup', {
      question: request.followUpQuestion,
      practiceGroupId: request.practiceGroupId
    });
    return { ...response.data.data, answer: response.data.data.response };
  }

  /**
   * Ask follow-up question about a specific question with streaming
   */
  async askQuestionFollowUpStream(
    request: QuestionFollowUpRequest,
    onChunk: (chunk: string) => void,
    onCreditCost: (cost: number) => void,
    onEnd: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const data = await this.askQuestionFollowUp(request);
      onCreditCost(data.creditCost || 0);
      onChunk(data.answer || '');
      onEnd();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Ask follow-up question about the entire practice group with streaming
   */
  async askPracticeGroupFollowUpStream(
    request: PracticeGroupFollowUpRequest,
    onChunk: (chunk: string) => void,
    onCreditCost: (cost: number) => void,
    onEnd: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const data = await this.askPracticeGroupFollowUp(request);
      onCreditCost(data.creditCost || 0);
      onChunk(data.answer || '');
      onEnd();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }
}

export const practiceApi = new PracticeApi();
export default practiceApi;