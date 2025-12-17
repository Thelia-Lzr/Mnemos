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
    const response = await api.post('/practice/generate-group', request);
    return response.data.data;
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
    const response = await api.post('/practice/generate-ai-practice', request);
    return response.data.data;
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
    const response = await api.post('/practice/generate-enhanced-practice', request);
    return response.data.data;
  }

  /**
   * Create an enhanced practice group asynchronously with optional additional prompt
   */
  async createEnhancedPracticeGroupAsync(request: CreateEnhancedPracticeRequest): Promise<{
    taskId: string;
    message: string;
  }> {
    const response = await api.post('/practice/generate-enhanced-practice-async', request);
    return response.data;
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
    const response = await api.post('/practice/generate-comprehensive', request);
    return response.data.data;
  }

  /**
   * Generate vocabulary practice
   */
  async generateVocabularyPractice(request: {
    language: string;
    vocabularyWords: string[];
  }): Promise<PracticeGroup> {
    const response = await api.post('/practice/vocabulary-group', request);
    return response.data.data;
  }

  /**
   * Create practice group asynchronously
   */
  async createPracticeGroupAsync(request: CreatePracticeRequest): Promise<{
    taskId: string;
    message: string;
  }> {
    const response = await api.post('/practice/generate-group-async', request);
    return response.data;
  }

  /**
   * Create AI practice group asynchronously
   */
  async createAIPracticeGroupAsync(request: CreateAIPracticeRequest): Promise<{
    taskId: string;
    message: string;
  }> {
    // Note: This endpoint might not exist yet, but we can add it if needed
    const response = await api.post('/practice/generate-ai-practice-async', request);
    return response.data;
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
    const response = await api.delete('/practice/groups/batch', {
      data: { practiceGroupIds }
    });
    return response.data;
  }

  /**
   * Batch delete practice history (results only, keep practice groups)
   */
  async batchDeletePracticeHistory(practiceGroupIds: string[]): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> {
    const response = await api.delete('/practice/history/batch', {
      data: { practiceGroupIds }
    });
    return response.data;
  }

  /**
   * Update user capabilities based on practice results
   */
  async updateCapabilities(practiceResultId: string): Promise<void> {
    await api.post('/practice/update-capabilities', {
      practiceResultId
    });
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
    try {
      const response = await api.get(`/practice/result/${practiceResultId}/analysis`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get practice result detail
   */
  async getPracticeResultDetail(practiceResultId: string): Promise<{
    result: PracticeResult;
    practiceGroup: PracticeGroup;
    userAnswers: Record<string, string>;
  }> {
    const response = await api.get(`/practice/result/${practiceResultId}/detail`);
    return response.data.data;
  }

  /**
   * Ask follow-up question about a specific question
   */
  async askQuestionFollowUp(request: QuestionFollowUpRequest): Promise<FollowUpResponse> {
    const response = await api.post('/practice/question/followup', request);
    return response.data.data;
  }

  /**
   * Ask follow-up question about the entire practice group
   */
  async askPracticeGroupFollowUp(request: PracticeGroupFollowUpRequest): Promise<FollowUpResponse> {
    const response = await api.post('/practice/group/followup', request);
    return response.data.data;
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
      // Get token directly from SecurityUtils
      const { default: SecurityUtils } = await import('../utils/security');
      const token = SecurityUtils.getSecureItem<string>('token');
      
      if (!token) {
        throw new Error('用户未登录，请重新登录');
      }

      const response = await fetch(`${api.defaults.baseURL}/practice/question/followup/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('登录已过期，请刷新页面重新登录');
        }
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'credit_cost') {
                onCreditCost(data.creditCost);
              } else if (data.type === 'content') {
                onChunk(data.content);
              } else if (data.type === 'end') {
                onEnd();
                return;
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', line);
            }
          }
        }
      }
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
      // Get token directly from SecurityUtils
      const { default: SecurityUtils } = await import('../utils/security');
      const token = SecurityUtils.getSecureItem<string>('token');
      
      if (!token) {
        throw new Error('用户未登录，请重新登录');
      }

      const response = await fetch(`${api.defaults.baseURL}/practice/group/followup/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('登录已过期，请刷新页面重新登录');
        }
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'credit_cost') {
                onCreditCost(data.creditCost);
              } else if (data.type === 'content') {
                onChunk(data.content);
              } else if (data.type === 'end') {
                onEnd();
                return;
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', line);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }
}

export const practiceApi = new PracticeApi();
export default practiceApi;