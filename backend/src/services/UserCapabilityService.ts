import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  UserCapability, 
  LearningProgress, 
  Milestone,
  CreateUserCapabilityRequest,
  UpdateUserCapabilityRequest,
  CapabilityAssessment,
  AssessmentRequest,
  ReassessmentRequest,
  AssessmentType,
  AssessmentDataSource,
  SkillArea,
  Language,
  LanguageLevel,
  VocabularyCapability,
  GrammarCapability,
  ComprehensionCapability,
  LearningStyle
} from '../models/UserCapability';
import { AIService } from './AIService';
import { AIAssessmentService, AssessmentData } from './AIAssessmentService';

export class UserCapabilityService {
  private aiAssessmentService: AIAssessmentService;

  constructor(
    private db: Pool,
    private aiService: AIService
  ) {
    this.aiAssessmentService = new AIAssessmentService(aiService);
  }

  async createUserCapability(userId: string, data: CreateUserCapabilityRequest): Promise<UserCapability | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Create user capability
      const capabilityId = uuidv4();
      const capabilityResult = await client.query(
        `INSERT INTO user_capabilities (
          id, user_id, language, current_level, learning_goal, overall_level,
          confidence_score, listening_level, speaking_level, reading_level, writing_level,
          estimated_vocabulary_size, mastered_words_count, learning_words_count,
          last_assessed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [capabilityId, userId, data.language, data.currentLevel, data.learningGoal]
      );

      // Create learning progress record
      const progressId = uuidv4();
      await client.query(
        `INSERT INTO learning_progress (id, user_id, language, total_study_time, streak_days, created_at, updated_at)
         VALUES ($1, $2, $3, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [progressId, userId, data.language]
      );

      // Create user MMR record
      const mmrId = uuidv4();
      await client.query(
        `INSERT INTO user_mmr (id, user_id, language, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [mmrId, userId, data.language]
      );

      await client.query('COMMIT');

      // Return the capability data from the INSERT RETURNING result
      if (capabilityResult.rows.length === 0) {
        console.error('Failed to create capability:', capabilityId);
        return null;
      }

      return this.mapRowToUserCapability(capabilityResult.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating user capability:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getUserCapability(userId: string, language: Language): Promise<UserCapability | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_capabilities WHERE user_id = $1 AND language = $2',
        [userId, language]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUserCapability(result.rows[0]);
    } catch (error) {
      console.error('Error getting user capability:', error);
      return null;
    }
  }

  async getAllUserCapabilities(userId: string): Promise<UserCapability[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_capabilities WHERE user_id = $1 ORDER BY created_at',
        [userId]
      );

      return result.rows.map(row => this.mapRowToUserCapability(row));
    } catch (error) {
      console.error('Error getting all user capabilities:', error);
      return [];
    }
  }

  async updateUserCapability(userId: string, language: Language, updates: UpdateUserCapabilityRequest): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert camelCase to snake_case for database
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return false;
      }

      values.push(userId, language);
      const query = `
        UPDATE user_capabilities 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $${paramIndex} AND language = $${paramIndex + 1}
      `;

      const result = await this.db.query(query, values);
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      console.error('Error updating user capability:', error);
      return false;
    }
  }

  async getLearningProgress(userId: string, language: Language): Promise<LearningProgress | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM learning_progress WHERE user_id = $1 AND language = $2',
        [userId, language]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToLearningProgress(result.rows[0]);
    } catch (error) {
      console.error('Error getting learning progress:', error);
      return null;
    }
  }

  async updateLearningProgress(userId: string, language: Language, studyTimeMinutes: number): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get current progress
      const currentResult = await client.query(
        'SELECT total_study_time, last_study_date, streak_days FROM learning_progress WHERE user_id = $1 AND language = $2',
        [userId, language]
      );

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const current = currentResult.rows[0];
      const today = new Date().toDateString();
      const lastStudyDate = current.last_study_date ? new Date(current.last_study_date).toDateString() : null;
      
      let newStreakDays = current.streak_days;
      
      // Update streak logic
      if (lastStudyDate !== today) {
        if (lastStudyDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()) {
          // Consecutive day
          newStreakDays += 1;
        } else if (lastStudyDate !== today) {
          // Streak broken or first study
          newStreakDays = 1;
        }
      }

      // Update progress
      await client.query(
        `UPDATE learning_progress 
         SET total_study_time = total_study_time + $1, 
             streak_days = $2, 
             last_study_date = CURRENT_DATE,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND language = $4`,
        [studyTimeMinutes, newStreakDays, userId, language]
      );

      await client.query('COMMIT');
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating learning progress:', error);
      return false;
    } finally {
      client.release();
    }
  }

  async getUserMilestones(userId: string, language: Language): Promise<Milestone[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM milestones WHERE user_id = $1 AND language = $2 ORDER BY priority, created_at',
        [userId, language]
      );

      return result.rows.map(row => this.mapRowToMilestone(row));
    } catch (error) {
      console.error('Error getting user milestones:', error);
      return [];
    }
  }

  async createMilestone(userId: string, language: Language, milestone: Omit<Milestone, 'id' | 'userId' | 'language' | 'createdAt' | 'updatedAt'>): Promise<Milestone | null> {
    try {
      const milestoneId = uuidv4();
      const result = await this.db.query(
        `INSERT INTO milestones (
          id, user_id, language, title, description, target_level, 
          estimated_duration, priority, is_completed, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          milestoneId, userId, language, milestone.title, milestone.description,
          milestone.targetLevel, milestone.estimatedDuration, milestone.priority, 
          milestone.isCompleted
        ]
      );

      return this.mapRowToMilestone(result.rows[0]);
    } catch (error) {
      console.error('Error creating milestone:', error);
      return null;
    }
  }

  async completeMilestone(milestoneId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE milestones 
         SET is_completed = true, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [milestoneId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error completing milestone:', error);
      return false;
    }
  }

  private mapRowToUserCapability(row: any): UserCapability {
    return {
      id: row.id,
      userId: row.user_id,
      language: row.language,
      currentLevel: row.current_level,
      learningGoal: row.learning_goal,
      isActiveLearning: row.is_active_learning,
      overallLevel: row.overall_level,
      confidenceScore: row.confidence_score,
      listeningLevel: row.listening_level,
      speakingLevel: row.speaking_level,
      readingLevel: row.reading_level,
      writingLevel: row.writing_level,
      estimatedVocabularySize: row.estimated_vocabulary_size,
      masteredWordsCount: row.mastered_words_count,
      learningWordsCount: row.learning_words_count,
      lastAssessedAt: row.last_assessed_at,
      nextAssessmentDue: row.next_assessment_due,
      
      // Enhanced capability details with defaults
      vocabularyCapability: this.parseJsonField(row.vocabulary_capability, {
        estimatedVocabularySize: row.estimated_vocabulary_size || 0,
        masteredWordsCount: row.mastered_words_count || 0,
        learningWordsCount: row.learning_words_count || 0,
        basicVocabularyMastery: 0,
        intermediateVocabularyMastery: 0,
        advancedVocabularyMastery: 0,
        averageLearningSpeed: 0,
        retentionRate: 0,
        contextualUsageScore: 0,
        collocationsScore: 0
      }),
      
      grammarCapability: this.parseJsonField(row.grammar_capability, {
        overallGrammarScore: 0,
        grammarPointsMastered: [],
        grammarPointsLearning: [],
        grammarPointsWeak: [],
        sentenceStructureScore: 0,
        tenseUsageScore: 0,
        complexityHandlingScore: 0
      }),
      
      comprehensionCapability: this.parseJsonField(row.comprehension_capability, {
        readingComprehensionScore: row.reading_level || 0,
        listeningComprehensionScore: row.listening_level || 0,
        literalComprehension: 0,
        inferentialComprehension: 0,
        criticalComprehension: 0,
        maxTextComplexity: 'beginner' as const,
        processingSpeed: 0
      }),
      
      assessmentHistory: [],
      learningStyle: (row.learning_style as LearningStyle) || 'mixed',
      strengths: this.parseJsonField(row.strengths, []),
      weaknesses: this.parseJsonField(row.weaknesses, []),
      
      createdAt: row.created_at,
      updatedAt: row.updated_at
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

  private mapRowToLearningProgress(row: any): LearningProgress {
    return {
      id: row.id,
      userId: row.user_id,
      language: row.language,
      totalStudyTime: row.total_study_time,
      streakDays: row.streak_days,
      lastStudyDate: row.last_study_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Enhanced Assessment Methods

  async performComprehensiveAssessment(request: AssessmentRequest): Promise<CapabilityAssessment | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get current user capability
      const capability = await this.getUserCapability(request.userId, request.language);
      if (!capability) {
        throw new Error('User capability not found');
      }

      // Gather assessment data based on data source
      const assessmentData = await this.gatherAssessmentData(request);
      
      // Use AI to analyze and generate assessment
      const aiAssessment = await this.generateAIAssessment(assessmentData, capability, request);
      
      // Create assessment record
      const assessmentId = uuidv4();
      const assessment: CapabilityAssessment = {
        id: assessmentId,
        userId: request.userId,
        language: request.language,
        assessmentDate: new Date(),
        assessmentType: request.assessmentType,
        overallScore: aiAssessment.overallScore,
        skillScores: aiAssessment.skillScores,
        dataSource: request.dataSource,
        confidenceLevel: aiAssessment.confidenceLevel,
        improvementAreas: aiAssessment.improvementAreas,
        regressionAreas: aiAssessment.regressionAreas,
        recommendations: aiAssessment.recommendations,
        nextSteps: aiAssessment.nextSteps,
        createdAt: new Date()
      };

      // Save assessment to database
      await client.query(
        `INSERT INTO capability_assessments (
          id, user_id, language, assessment_date, assessment_type, overall_score,
          skill_scores, data_source, confidence_level, improvement_areas,
          regression_areas, recommendations, next_steps, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          assessmentId, request.userId, request.language, assessment.assessmentDate,
          assessment.assessmentType, assessment.overallScore, JSON.stringify(assessment.skillScores),
          assessment.dataSource, assessment.confidenceLevel, JSON.stringify(assessment.improvementAreas),
          JSON.stringify(assessment.regressionAreas), JSON.stringify(assessment.recommendations),
          JSON.stringify(assessment.nextSteps), assessment.createdAt
        ]
      );

      // Update user capability with new assessment results
      await this.updateCapabilityFromAssessment(request.userId, request.language, assessment);

      await client.query('COMMIT');
      return assessment;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error performing comprehensive assessment:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getAssessmentHistory(userId: string, language: Language, limit: number = 10): Promise<CapabilityAssessment[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM capability_assessments 
         WHERE user_id = $1 AND language = $2 
         ORDER BY assessment_date DESC 
         LIMIT $3`,
        [userId, language, limit]
      );

      return result.rows.map(row => this.mapRowToAssessment(row));
    } catch (error) {
      console.error('Error getting assessment history:', error);
      return [];
    }
  }

  async requestReassessment(request: ReassessmentRequest): Promise<any> {
    // Import ReassessmentService dynamically to avoid circular dependency
    const { ReassessmentService } = await import('./ReassessmentService');
    const reassessmentService = new ReassessmentService(this.db, this.aiService, this);
    
    return reassessmentService.initiateReassessment(request);
  }

  async analyzeCapabilityTrends(userId: string, language: Language, days: number = 30): Promise<any> {
    try {
      const result = await this.db.query(
        `SELECT * FROM capability_assessments 
         WHERE user_id = $1 AND language = $2 
         AND assessment_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY assessment_date ASC`,
        [userId, language]
      );

      const assessments = result.rows.map(row => this.mapRowToAssessment(row));
      
      if (assessments.length < 2) {
        return { trend: 'insufficient_data', assessments };
      }

      // Calculate trends for each skill area
      const trends: Record<SkillArea, number> = {} as Record<SkillArea, number>;
      const skillAreas: SkillArea[] = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
      
      skillAreas.forEach(skill => {
        const scores = assessments.map(a => a.skillScores[skill]).filter(s => s !== undefined);
        if (scores.length >= 2) {
          trends[skill] = scores[scores.length - 1] - scores[0];
        }
      });

      return {
        trend: 'calculated',
        assessments,
        skillTrends: trends,
        overallTrend: assessments[assessments.length - 1].overallScore - assessments[0].overallScore
      };

    } catch (error) {
      console.error('Error analyzing capability trends:', error);
      return { trend: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateLearningCharacteristics(userId: string, language: Language, characteristics: {
    learningStyle?: LearningStyle;
    strengths?: SkillArea[];
    weaknesses?: SkillArea[];
  }): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (characteristics.learningStyle) {
        updateFields.push(`learning_style = $${paramIndex++}`);
        values.push(characteristics.learningStyle);
      }

      if (characteristics.strengths) {
        updateFields.push(`strengths = $${paramIndex++}`);
        values.push(JSON.stringify(characteristics.strengths));
      }

      if (characteristics.weaknesses) {
        updateFields.push(`weaknesses = $${paramIndex++}`);
        values.push(JSON.stringify(characteristics.weaknesses));
      }

      if (updateFields.length === 0) {
        return false;
      }

      values.push(userId, language);
      const query = `
        UPDATE user_capabilities 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $${paramIndex++} AND language = $${paramIndex++}
      `;

      const result = await this.db.query(query, values);
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      console.error('Error updating learning characteristics:', error);
      return false;
    }
  }

  // Private helper methods

  private async gatherAssessmentData(request: AssessmentRequest): Promise<any> {
    const data: any = {};

    switch (request.dataSource) {
      case 'chat_analysis':
        data.chatHistory = await this.getChatAnalysisData(request.userId, request.language);
        break;
      case 'practice_performance':
        data.practiceResults = await this.getPracticePerformanceData(request.userId, request.language);
        break;
      case 'vocabulary_tracking':
        data.vocabularyData = await this.getVocabularyTrackingData(request.userId, request.language);
        break;
      case 'comprehensive_test':
        data.allData = await this.getAllAssessmentData(request.userId, request.language);
        break;
    }

    return data;
  }

  private async getChatAnalysisData(userId: string, language: Language): Promise<any> {
    try {
      const result = await this.db.query(
        `SELECT content, ai_response, created_at FROM chat_messages 
         WHERE user_id = $1 AND language = $2 
         ORDER BY created_at DESC LIMIT 50`,
        [userId, language]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting chat analysis data:', error);
      return [];
    }
  }

  private async getPracticePerformanceData(userId: string, language: Language): Promise<any> {
    try {
      const result = await this.db.query(
        `SELECT accuracy, total_time, weak_areas, completed_at 
         FROM practice_results 
         WHERE user_id = $1 AND language = $2 
         ORDER BY completed_at DESC LIMIT 20`,
        [userId, language]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting practice performance data:', error);
      return [];
    }
  }

  private async getVocabularyTrackingData(userId: string, language: Language): Promise<any> {
    try {
      const result = await this.db.query(
        `SELECT mastery_level, mastery_score, practice_history 
         FROM vocabulary_words 
         WHERE user_id = $1 AND language = $2`,
        [userId, language]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting vocabulary tracking data:', error);
      return [];
    }
  }

  private async getAllAssessmentData(userId: string, language: Language): Promise<any> {
    const [chatData, practiceData, vocabularyData] = await Promise.all([
      this.getChatAnalysisData(userId, language),
      this.getPracticePerformanceData(userId, language),
      this.getVocabularyTrackingData(userId, language)
    ]);

    return {
      chatHistory: chatData,
      practiceResults: practiceData,
      vocabularyData: vocabularyData
    };
  }

  private async generateAIAssessment(data: AssessmentData, currentCapability: UserCapability, request: AssessmentRequest): Promise<any> {
    try {
      const aiResult = await this.aiAssessmentService.performComprehensiveAssessment(data, currentCapability, request);
      
      return {
        overallScore: aiResult.overallScore,
        skillScores: aiResult.skillScores,
        confidenceLevel: aiResult.confidenceLevel,
        improvementAreas: aiResult.improvementAreas,
        regressionAreas: aiResult.regressionAreas,
        recommendations: aiResult.recommendations,
        nextSteps: aiResult.nextSteps,
        vocabularyCapability: aiResult.vocabularyCapability,
        grammarCapability: aiResult.grammarCapability,
        comprehensionCapability: aiResult.comprehensionCapability,
        suggestedLearningStyle: aiResult.suggestedLearningStyle
      };
    } catch (error) {
      console.error('Error generating AI assessment:', error);
      return this.generateFallbackAssessment(currentCapability);
    }
  }



  private generateFallbackAssessment(capability?: UserCapability): any {
    return {
      overallScore: capability?.confidenceScore || 50,
      skillScores: {
        vocabulary: capability?.estimatedVocabularySize ? Math.min(capability.estimatedVocabularySize / 50, 100) : 50,
        grammar: 50,
        listening: capability?.listeningLevel || 50,
        speaking: capability?.speakingLevel || 50,
        reading: capability?.readingLevel || 50,
        writing: capability?.writingLevel || 50
      },
      confidenceLevel: 30,
      improvementAreas: ['vocabulary', 'grammar'],
      regressionAreas: [],
      recommendations: ['Continue regular practice', 'Focus on weak areas'],
      nextSteps: ['Take more practice tests', 'Review assessment in 2 weeks']
    };
  }

  private async updateCapabilityFromAssessment(userId: string, language: Language, assessment: CapabilityAssessment): Promise<void> {
    // Get the AI assessment result from the assessment data
    const aiResult = await this.aiAssessmentService.performComprehensiveAssessment(
      {}, // Empty data since we're using stored assessment
      await this.getUserCapability(userId, language) as UserCapability,
      { userId, language, assessmentType: assessment.assessmentType, dataSource: assessment.dataSource }
    );

    const updates: UpdateUserCapabilityRequest = {
      overallLevel: this.scoreToLevel(assessment.overallScore),
      confidenceScore: assessment.confidenceLevel,
      listeningLevel: assessment.skillScores.listening,
      speakingLevel: assessment.skillScores.speaking,
      readingLevel: assessment.skillScores.reading,
      writingLevel: assessment.skillScores.writing,
      vocabularyCapability: aiResult.vocabularyCapability,
      grammarCapability: aiResult.grammarCapability,
      comprehensionCapability: aiResult.comprehensionCapability,
      learningStyle: aiResult.suggestedLearningStyle,
      strengths: Object.keys(assessment.skillScores).filter(skill => 
        assessment.skillScores[skill as SkillArea] > 70
      ) as SkillArea[],
      weaknesses: assessment.improvementAreas
    };

    await this.updateUserCapability(userId, language, updates);
  }

  private scoreToLevel(score: number): LanguageLevel {
    if (score >= 90) return 'C2';
    if (score >= 80) return 'C1';
    if (score >= 70) return 'B2';
    if (score >= 60) return 'B1';
    if (score >= 50) return 'A2';
    return 'A1';
  }

  private mapRowToAssessment(row: any): CapabilityAssessment {
    return {
      id: row.id,
      userId: row.user_id,
      language: row.language,
      assessmentDate: row.assessment_date,
      assessmentType: row.assessment_type,
      overallScore: row.overall_score,
      skillScores: JSON.parse(row.skill_scores || '{}'),
      dataSource: row.data_source,
      confidenceLevel: row.confidence_level,
      improvementAreas: JSON.parse(row.improvement_areas || '[]'),
      regressionAreas: JSON.parse(row.regression_areas || '[]'),
      recommendations: JSON.parse(row.recommendations || '[]'),
      nextSteps: JSON.parse(row.next_steps || '[]'),
      createdAt: row.created_at
    };
  }

  private mapRowToMilestone(row: any): Milestone {
    return {
      id: row.id,
      userId: row.user_id,
      language: row.language,
      title: row.title,
      description: row.description,
      targetLevel: row.target_level,
      estimatedDuration: row.estimated_duration,
      priority: row.priority,
      isCompleted: row.is_completed,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
