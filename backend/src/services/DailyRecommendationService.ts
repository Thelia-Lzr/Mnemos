import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from './AIService';
import { UserCapabilityService } from './UserCapabilityService';
import { VocabularyService } from './VocabularyService';
import { AsyncTaskManager } from './AsyncTaskManager';
import { TaskType, Language } from '../types/openrouter';
import { AITaskType, TaskPriority } from '../types/task';
import { UserCapability, Milestone, SkillArea } from '../models/UserCapability';
import { VocabularyWord } from '../models/VocabularyWord';

export interface DailyLearningRecommendation {
  id: string;
  userId: string;
  language: Language;
  date: string; // YYYY-MM-DD format
  recommendations: LearningRecommendation[];
  quickPracticeOptions: QuickPracticeOption[];
  basedOnCapability?: UserCapability;
  basedOnMilestones?: Milestone[];
  basedOnVocabulary?: VocabularyWord[];
  userFeedback?: RecommendationFeedback;
  isViewed: boolean;
  viewedAt?: Date;
  aiModel: string;
  generationTime: number;
  tokensUsed: number;
  createdAt: Date;
}

export interface LearningRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: number;
  focusAreas: SkillArea[];
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
  type: PracticeType;
  estimatedQuestions: number;
  estimatedTime: number;
  focusAreas: SkillArea[];
  difficultyLevel: DifficultyLevel;
  includeVocabulary: string[];
  canGenerateImmediately: boolean;
}

export interface RecommendationFeedback {
  rating: number; // 1-5 star rating
  isHelpful: boolean;
  followedRecommendations: string[]; // IDs of recommendations user actually followed
  comments?: string;
  submittedAt: Date;
}

export enum RecommendationType {
  VOCABULARY_FOCUS = "vocabulary_focus",
  GRAMMAR_PRACTICE = "grammar_practice", 
  SKILL_IMPROVEMENT = "skill_improvement",
  MILESTONE_PROGRESS = "milestone_progress",
  REVIEW_REMINDER = "review_reminder",
  WEAKNESS_TARGETING = "weakness_targeting"
}

export enum PracticeType {
  GENERAL = "general",
  VOCABULARY = "vocabulary",
  GRAMMAR = "grammar",
  MATERIAL_BASED = "material_based",
  REVIEW = "review",
  COMPREHENSIVE = "comprehensive"
}

export enum DifficultyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced"
}

export class DailyRecommendationService {
  constructor(
    private db: Pool,
    private aiService: AIService,
    private userCapabilityService: UserCapabilityService,
    private vocabularyService: VocabularyService,
    private asyncTaskManager: AsyncTaskManager
  ) {}

  /**
   * Generate daily learning recommendations for a user
   */
  async generateDailyRecommendation(userId: string, language: Language): Promise<DailyLearningRecommendation> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if recommendation already exists for today
    const existing = await this.getTodaysRecommendation(userId, language, today);
    if (existing) {
      return existing;
    }

    // Gather user data for recommendation generation
    const userData = await this.gatherUserData(userId, language);
    
    // Generate AI-powered recommendations
    const aiRecommendations = await this.generateAIRecommendations(userId, language, userData);
    
    // Create quick practice options
    const quickPracticeOptions = this.generateQuickPracticeOptions(userData);
    
    // Save recommendation to database
    const recommendation: DailyLearningRecommendation = {
      id: uuidv4(),
      userId,
      language,
      date: today,
      recommendations: aiRecommendations.recommendations,
      quickPracticeOptions,
      basedOnCapability: userData.capability || undefined,
      basedOnMilestones: userData.milestones,
      basedOnVocabulary: userData.vocabulary,
      isViewed: false,
      aiModel: aiRecommendations.aiModel,
      generationTime: aiRecommendations.generationTime,
      tokensUsed: aiRecommendations.tokensUsed,
      createdAt: new Date()
    };

    await this.saveRecommendation(recommendation);
    return recommendation;
  }

  /**
   * Generate daily recommendation asynchronously
   */
  async generateDailyRecommendationAsync(userId: string, language: Language): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if recommendation already exists for today
    const existing = await this.getTodaysRecommendation(userId, language, today);
    if (existing) {
      throw new Error('Daily recommendation already exists for today');
    }

    // Create async task for recommendation generation
    const taskId = await this.asyncTaskManager.createTask({
      userId,
      type: AITaskType.DAILY_RECOMMENDATION,
      priority: TaskPriority.NORMAL,
      model: this.selectAIModel(),
      prompt: 'Generate daily learning recommendation',
      context: { language, date: today },
      maxRetries: 3,
      timeout: 180000, // 3 minutes
      notifyUser: true
    });

    return taskId;
  }

  /**
   * Generate quick practice based on recommendation
   */
  async generateQuickPracticeAsync(userId: string, language: Language, practiceOptionId: string): Promise<string> {
    // Get the practice option details
    const recommendation = await this.getTodaysRecommendation(userId, language);
    if (!recommendation) {
      throw new Error('No daily recommendation found');
    }

    const practiceOption = recommendation.quickPracticeOptions.find(opt => opt.id === practiceOptionId);
    if (!practiceOption) {
      throw new Error('Practice option not found');
    }

    // Create async task for practice generation
    const taskId = await this.asyncTaskManager.createTask({
      userId,
      type: AITaskType.PRACTICE_GENERATION,
      priority: TaskPriority.HIGH, // Higher priority for quick practice
      model: this.selectAIModel(),
      prompt: this.buildQuickPracticePrompt(practiceOption),
      context: { 
        language, 
        practiceOption,
        type: 'quick_practice'
      },
      maxRetries: 3,
      timeout: 240000, // 4 minutes
      notifyUser: true
    });

    return taskId;
  }

  /**
   * Get today's recommendation for a user
   */
  async getTodaysRecommendation(userId: string, language: Language, date?: string): Promise<DailyLearningRecommendation | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      const result = await this.db.query(
        'SELECT * FROM daily_learning_recommendations WHERE user_id = $1 AND language = $2 AND date = $3',
        [userId, language, targetDate]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRecommendation(result.rows[0]);
    } catch (error) {
      console.error('Error getting today\'s recommendation:', error);
      return null;
    }
  }

  /**
   * Mark recommendation as viewed
   */
  async markRecommendationAsViewed(userId: string, language: Language, date?: string): Promise<boolean> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      const result = await this.db.query(
        `UPDATE daily_learning_recommendations 
         SET is_viewed = true, viewed_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND language = $2 AND date = $3`,
        [userId, language, targetDate]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error marking recommendation as viewed:', error);
      return false;
    }
  }

  /**
   * Submit user feedback for recommendation
   */
  async submitRecommendationFeedback(
    userId: string, 
    language: Language, 
    feedback: Omit<RecommendationFeedback, 'submittedAt'>,
    date?: string
  ): Promise<boolean> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      const feedbackWithTimestamp: RecommendationFeedback = {
        ...feedback,
        submittedAt: new Date()
      };

      const result = await this.db.query(
        `UPDATE daily_learning_recommendations 
         SET user_feedback = $1 
         WHERE user_id = $2 AND language = $3 AND date = $4`,
        [JSON.stringify(feedbackWithTimestamp), userId, language, targetDate]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error submitting recommendation feedback:', error);
      return false;
    }
  }

  /**
   * Get recommendation history for a user
   */
  async getRecommendationHistory(userId: string, language: Language, limit: number = 30): Promise<DailyLearningRecommendation[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM daily_learning_recommendations 
         WHERE user_id = $1 AND language = $2 
         ORDER BY date DESC 
         LIMIT $3`,
        [userId, language, limit]
      );

      return result.rows.map(row => this.mapRowToRecommendation(row));
    } catch (error) {
      console.error('Error getting recommendation history:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private async gatherUserData(userId: string, language: Language): Promise<{
    capability: UserCapability | null;
    milestones: Milestone[];
    vocabulary: VocabularyWord[];
  }> {
    const [capability, milestones, vocabulary] = await Promise.all([
      this.userCapabilityService.getUserCapability(userId, language),
      this.userCapabilityService.getUserMilestones(userId, language),
      this.vocabularyService.getUserVocabulary(userId, language) // Get all vocabulary words
    ]);

    return { capability, milestones, vocabulary };
  }

  private async generateAIRecommendations(
    userId: string, 
    language: Language, 
    userData: any
  ): Promise<{
    recommendations: LearningRecommendation[];
    aiModel: string;
    generationTime: number;
    tokensUsed: number;
  }> {
    const startTime = Date.now();
    const prompt = this.buildRecommendationPrompt(language, userData);
    const model = this.selectAIModel();

    try {
      const response = await this.aiService.callAIWithCredits(
        userId,
        TaskType.FUNCTION_CALLING,
        language,
        prompt,
        { userData },
        `daily_recommendation_${new Date().toISOString().split('T')[0]}`
      );

      const generationTime = Date.now() - startTime;
      const recommendations = this.parseRecommendationResponse(response.content);

      return {
        recommendations,
        aiModel: response.model,
        generationTime,
        tokensUsed: response.tokensUsed
      };
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      // Return fallback recommendations
      return {
        recommendations: this.generateFallbackRecommendations(userData),
        aiModel: model,
        generationTime: Date.now() - startTime,
        tokensUsed: 0
      };
    }
  }

  private buildRecommendationPrompt(language: Language, userData: any): string {
    const languageName = this.getLanguageName(language);
    
    let prompt = `Generate personalized daily learning recommendations for a ${languageName} language learner.

User Profile:
`;

    if (userData.capability) {
      prompt += `Current Capability:
- Overall level: ${userData.capability.overallLevel}
- Listening: ${userData.capability.listeningLevel}/100
- Speaking: ${userData.capability.speakingLevel}/100  
- Reading: ${userData.capability.readingLevel}/100
- Writing: ${userData.capability.writingLevel}/100
- Vocabulary size: ${userData.capability.vocabularyCapability?.estimatedVocabularySize || 'Unknown'}
- Grammar score: ${userData.capability.grammarCapability?.overallGrammarScore || 'Unknown'}
- Strengths: ${userData.capability.strengths?.join(', ') || 'None identified'}
- Weaknesses: ${userData.capability.weaknesses?.join(', ') || 'None identified'}
- Learning style: ${userData.capability.learningStyle || 'Unknown'}

`;
    }

    if (userData.milestones && userData.milestones.length > 0) {
      prompt += `Learning Milestones:
${userData.milestones.map((m: Milestone) => 
  `- ${m.title}: ${m.isCompleted ? 'Completed' : 'In Progress'} (Priority: ${m.priority})`
).join('\n')}

`;
    }

    if (userData.vocabulary && userData.vocabulary.length > 0) {
      const vocabularyByMastery = userData.vocabulary.reduce((acc: any, word: VocabularyWord) => {
        acc[word.masteryLevel] = (acc[word.masteryLevel] || 0) + 1;
        return acc;
      }, {});

      prompt += `Vocabulary Status:
- Total words in learning: ${userData.vocabulary.length}
- By mastery level: ${Object.entries(vocabularyByMastery).map(([level, count]) => `${level}: ${count}`).join(', ')}
- Recent words: ${userData.vocabulary.slice(0, 10).map((w: VocabularyWord) => w.word).join(', ')}

`;
    }

    prompt += `
Please generate 3-5 personalized learning recommendations for today. Each recommendation should:
1. Be specific and actionable
2. Consider the user's current level and identified weaknesses
3. Include estimated time commitment
4. Suggest specific activities or focus areas
5. Be motivating and achievable

Respond with a JSON object in this format:
{
  "recommendations": [
    {
      "type": "vocabulary_focus|grammar_practice|skill_improvement|milestone_progress|review_reminder|weakness_targeting",
      "title": "Recommendation title",
      "description": "Detailed description of what to do and why",
      "priority": 1-5,
      "focusAreas": ["vocabulary", "grammar", "listening", "speaking", "reading", "writing"],
      "suggestedActivities": ["Activity 1", "Activity 2", "Activity 3"],
      "estimatedTime": 15,
      "relatedVocabulary": ["word1", "word2"],
      "relatedGrammar": ["grammar point"],
      "relatedMilestone": "milestone_id_if_applicable"
    }
  ]
}

Make recommendations specific to ${languageName} learning and the user's current situation.`;

    return prompt;
  }

  private generateQuickPracticeOptions(userData: any): QuickPracticeOption[] {
    const options: QuickPracticeOption[] = [];
    
    // Always include a general practice option
    options.push({
      id: uuidv4(),
      title: '综合练习',
      description: '基于你当前水平的综合语言练习',
      type: PracticeType.GENERAL,
      estimatedQuestions: 10,
      estimatedTime: 15,
      focusAreas: ['vocabulary', 'grammar', 'reading'] as SkillArea[],
      difficultyLevel: this.determineDifficultyLevel(userData.capability),
      includeVocabulary: [],
      canGenerateImmediately: true
    });

    // Add vocabulary practice if user has vocabulary words
    if (userData.vocabulary && userData.vocabulary.length > 0) {
      const vocabularyWords = userData.vocabulary
        .filter((w: VocabularyWord) => w.masteryLevel === 'learning' || w.masteryLevel === 'short_term')
        .slice(0, 20)
        .map((w: VocabularyWord) => w.word);

      if (vocabularyWords.length > 0) {
        options.push({
          id: uuidv4(),
          title: '生词表练习',
          description: `练习你的 ${vocabularyWords.length} 个学习中的单词`,
          type: PracticeType.VOCABULARY,
          estimatedQuestions: 10,
          estimatedTime: 12,
          focusAreas: ['vocabulary'] as SkillArea[],
          difficultyLevel: this.determineDifficultyLevel(userData.capability),
          includeVocabulary: vocabularyWords,
          canGenerateImmediately: true
        });
      }
    }

    // Add weakness-focused practice
    if (userData.capability?.weaknesses && userData.capability.weaknesses.length > 0) {
      options.push({
        id: uuidv4(),
        title: '弱项强化练习',
        description: `针对你的薄弱环节：${userData.capability.weaknesses.join('、')}`,
        type: PracticeType.GENERAL,
        estimatedQuestions: 10,
        estimatedTime: 18,
        focusAreas: userData.capability.weaknesses,
        difficultyLevel: this.determineDifficultyLevel(userData.capability),
        includeVocabulary: [],
        canGenerateImmediately: true
      });
    }

    // Add comprehensive assessment if user has sufficient data
    if (userData.capability && userData.milestones && userData.vocabulary) {
      options.push({
        id: uuidv4(),
        title: '综合评估练习',
        description: '基于你的完整学习档案的全面评估练习',
        type: PracticeType.COMPREHENSIVE,
        estimatedQuestions: 10,
        estimatedTime: 25,
        focusAreas: ['vocabulary', 'grammar', 'reading', 'writing'] as SkillArea[],
        difficultyLevel: this.determineDifficultyLevel(userData.capability),
        includeVocabulary: [],
        canGenerateImmediately: true
      });
    }

    return options;
  }

  private parseRecommendationResponse(content: string): LearningRecommendation[] {
    try {
      const parsed = JSON.parse(content);
      
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid response structure');
      }

      return parsed.recommendations.map((rec: any, index: number) => ({
        id: uuidv4(),
        type: rec.type as RecommendationType || RecommendationType.SKILL_IMPROVEMENT,
        title: rec.title || `Recommendation ${index + 1}`,
        description: rec.description || 'No description provided',
        priority: typeof rec.priority === 'number' ? rec.priority : index + 1,
        focusAreas: Array.isArray(rec.focusAreas) ? rec.focusAreas : [],
        suggestedActivities: Array.isArray(rec.suggestedActivities) ? rec.suggestedActivities : [],
        estimatedTime: typeof rec.estimatedTime === 'number' ? rec.estimatedTime : 15,
        relatedVocabulary: Array.isArray(rec.relatedVocabulary) ? rec.relatedVocabulary : [],
        relatedGrammar: Array.isArray(rec.relatedGrammar) ? rec.relatedGrammar : [],
        relatedMilestone: rec.relatedMilestone || undefined
      }));
    } catch (error) {
      console.error('Error parsing recommendation response:', error);
      return [];
    }
  }

  private generateFallbackRecommendations(userData: any): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];
    
    // Basic vocabulary recommendation
    recommendations.push({
      id: uuidv4(),
      type: RecommendationType.VOCABULARY_FOCUS,
      title: '词汇学习',
      description: '今天学习一些新单词，扩展你的词汇量',
      priority: 1,
      focusAreas: ['vocabulary'] as SkillArea[],
      suggestedActivities: ['学习5-10个新单词', '复习之前学过的单词', '练习单词的使用'],
      estimatedTime: 15,
      relatedVocabulary: [],
      relatedGrammar: []
    });

    // Basic practice recommendation
    recommendations.push({
      id: uuidv4(),
      type: RecommendationType.SKILL_IMPROVEMENT,
      title: '语言练习',
      description: '完成一组练习题来巩固你的语言技能',
      priority: 2,
      focusAreas: ['grammar', 'reading'] as SkillArea[],
      suggestedActivities: ['完成语法练习', '阅读短文', '练习写作'],
      estimatedTime: 20,
      relatedVocabulary: [],
      relatedGrammar: []
    });

    return recommendations;
  }

  private buildQuickPracticePrompt(practiceOption: QuickPracticeOption): string {
    return `Generate a ${practiceOption.type} practice group with ${practiceOption.estimatedQuestions} questions.
Focus areas: ${practiceOption.focusAreas.join(', ')}
Difficulty: ${practiceOption.difficultyLevel}
${practiceOption.includeVocabulary.length > 0 ? `Include vocabulary: ${practiceOption.includeVocabulary.join(', ')}` : ''}
Estimated time: ${practiceOption.estimatedTime} minutes`;
  }

  private determineDifficultyLevel(capability: UserCapability | null): DifficultyLevel {
    if (!capability) {
      return DifficultyLevel.INTERMEDIATE;
    }

    const averageScore = (
      capability.listeningLevel + 
      capability.speakingLevel + 
      capability.readingLevel + 
      capability.writingLevel
    ) / 4;

    if (averageScore < 40) {
      return DifficultyLevel.BEGINNER;
    } else if (averageScore < 70) {
      return DifficultyLevel.INTERMEDIATE;
    } else {
      return DifficultyLevel.ADVANCED;
    }
  }

  private selectAIModel(): string {
    // Use configured model for daily recommendation generation
    return process.env.DAILY_RECOMMENDATION_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
  }

  private getLanguageName(language: Language): string {
    switch (language) {
      case Language.ENGLISH:
        return 'English';
      case Language.JAPANESE:
        return 'Japanese';
      case Language.FRENCH:
        return 'French';
      default:
        return 'English';
    }
  }

  private async saveRecommendation(recommendation: DailyLearningRecommendation): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO daily_learning_recommendations (
          id, user_id, language, date, recommendations, quick_practice_options,
          based_on_capability, based_on_milestones, based_on_vocabulary,
          is_viewed, ai_model, generation_time, tokens_used, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          recommendation.id,
          recommendation.userId,
          recommendation.language,
          recommendation.date,
          JSON.stringify(recommendation.recommendations),
          JSON.stringify(recommendation.quickPracticeOptions),
          recommendation.basedOnCapability ? JSON.stringify(recommendation.basedOnCapability) : null,
          recommendation.basedOnMilestones ? JSON.stringify(recommendation.basedOnMilestones) : null,
          recommendation.basedOnVocabulary ? JSON.stringify(recommendation.basedOnVocabulary) : null,
          recommendation.isViewed,
          recommendation.aiModel,
          recommendation.generationTime,
          recommendation.tokensUsed,
          recommendation.createdAt
        ]
      );
    } catch (error) {
      console.error('Error saving recommendation:', error);
      throw error;
    }
  }

  private mapRowToRecommendation(row: any): DailyLearningRecommendation {
    return {
      id: row.id,
      userId: row.user_id,
      language: row.language,
      date: row.date,
      recommendations: this.parseJsonField(row.recommendations, []),
      quickPracticeOptions: this.parseJsonField(row.quick_practice_options, []),
      basedOnCapability: this.parseJsonField(row.based_on_capability, undefined),
      basedOnMilestones: this.parseJsonField(row.based_on_milestones, undefined),
      basedOnVocabulary: this.parseJsonField(row.based_on_vocabulary, undefined),
      userFeedback: this.parseJsonField(row.user_feedback, undefined),
      isViewed: row.is_viewed,
      viewedAt: row.viewed_at,
      aiModel: row.ai_model,
      generationTime: row.generation_time,
      tokensUsed: row.tokens_used,
      createdAt: row.created_at
    };
  }

  private parseJsonField<T>(field: any, defaultValue: T): T {
    if (!field) return defaultValue;
    try {
      return typeof field === 'string' ? JSON.parse(field) : field;
    } catch {
      return defaultValue;
    }
  }
}
