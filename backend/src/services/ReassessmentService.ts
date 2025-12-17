import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  UserCapability, 
  CapabilityAssessment,
  ReassessmentRequest,
  AssessmentRequest,
  SkillArea,
  Language,
  AssessmentType
} from '../models/UserCapability';
import { UserCapabilityService } from './UserCapabilityService';
import { AIAssessmentService } from './AIAssessmentService';
import { AIService } from './AIService';

export interface ReassessmentCase {
  id: string;
  userId: string;
  language: Language;
  originalAssessmentId: string;
  reason: string;
  focusAreas: SkillArea[];
  userObjections: string[];
  status: ReassessmentStatus;
  targetedQuestions: string[];
  userResponses: ReassessmentResponse[];
  newAssessmentId?: string;
  resolutionNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ReassessmentResponse {
  questionId: string;
  question: string;
  userAnswer: string;
  aiEvaluation: {
    score: number;
    feedback: string;
    skillAreas: SkillArea[];
  };
  submittedAt: Date;
}

export type ReassessmentStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export class ReassessmentService {
  private aiAssessmentService: AIAssessmentService;

  constructor(
    private db: Pool,
    private aiService: AIService,
    private userCapabilityService: UserCapabilityService
  ) {
    this.aiAssessmentService = new AIAssessmentService(aiService);
  }

  async initiateReassessment(request: ReassessmentRequest): Promise<ReassessmentCase | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get current user capability
      const capability = await this.userCapabilityService.getUserCapability(request.userId, request.language);
      if (!capability) {
        throw new Error('User capability not found');
      }

      // Get the most recent assessment
      const assessmentHistory = await this.userCapabilityService.getAssessmentHistory(request.userId, request.language, 1);
      if (assessmentHistory.length === 0) {
        throw new Error('No previous assessment found');
      }

      const originalAssessment = assessmentHistory[0];

      // Determine focus areas based on user objections or use all weak areas
      const focusAreas = request.focusAreas || originalAssessment.improvementAreas;

      // Generate targeted questions for reassessment
      const targetedQuestions = await this.aiAssessmentService.generateTargetedReassessment(
        focusAreas,
        capability,
        request.reason
      );

      // Create reassessment case
      const reassessmentId = uuidv4();
      const reassessmentCase: ReassessmentCase = {
        id: reassessmentId,
        userId: request.userId,
        language: request.language,
        originalAssessmentId: originalAssessment.id,
        reason: request.reason,
        focusAreas,
        userObjections: [request.reason],
        status: 'pending',
        targetedQuestions,
        userResponses: [],
        createdAt: new Date()
      };

      // Save to database
      await client.query(
        `INSERT INTO reassessment_cases (
          id, user_id, language, original_assessment_id, reason, focus_areas,
          user_objections, status, targeted_questions, user_responses, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          reassessmentId, request.userId, request.language, originalAssessment.id,
          request.reason, JSON.stringify(focusAreas), JSON.stringify([request.reason]),
          'pending', JSON.stringify(targetedQuestions), JSON.stringify([]),
          reassessmentCase.createdAt
        ]
      );

      await client.query('COMMIT');
      return reassessmentCase;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error initiating reassessment:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async submitReassessmentResponse(
    reassessmentId: string, 
    questionId: string, 
    userAnswer: string
  ): Promise<ReassessmentResponse | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get reassessment case
      const caseResult = await client.query(
        'SELECT * FROM reassessment_cases WHERE id = $1',
        [reassessmentId]
      );

      if (caseResult.rows.length === 0) {
        throw new Error('Reassessment case not found');
      }

      const reassessmentCase = this.mapRowToReassessmentCase(caseResult.rows[0]);
      const question = reassessmentCase.targetedQuestions[parseInt(questionId)];

      if (!question) {
        throw new Error('Question not found');
      }

      // Evaluate the user's response using AI
      const aiEvaluation = await this.evaluateUserResponse(
        question,
        userAnswer,
        reassessmentCase.focusAreas,
        reassessmentCase.language
      );

      // Create response record
      const response: ReassessmentResponse = {
        questionId,
        question,
        userAnswer,
        aiEvaluation,
        submittedAt: new Date()
      };

      // Update reassessment case with new response
      const updatedResponses = [...reassessmentCase.userResponses, response];
      
      await client.query(
        `UPDATE reassessment_cases 
         SET user_responses = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          JSON.stringify(updatedResponses),
          updatedResponses.length >= reassessmentCase.targetedQuestions.length ? 'completed' : 'in_progress',
          reassessmentId
        ]
      );

      // If all questions are answered, trigger final reassessment
      if (updatedResponses.length >= reassessmentCase.targetedQuestions.length) {
        await this.completeReassessment(reassessmentId);
      }

      await client.query('COMMIT');
      return response;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error submitting reassessment response:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async completeReassessment(reassessmentId: string): Promise<CapabilityAssessment | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get reassessment case
      const caseResult = await client.query(
        'SELECT * FROM reassessment_cases WHERE id = $1',
        [reassessmentId]
      );

      if (caseResult.rows.length === 0) {
        throw new Error('Reassessment case not found');
      }

      const reassessmentCase = this.mapRowToReassessmentCase(caseResult.rows[0]);

      // Analyze all responses to generate new assessment
      const newAssessment = await this.generateReassessmentResult(reassessmentCase);

      if (newAssessment) {
        // Update reassessment case with completion
        await client.query(
          `UPDATE reassessment_cases 
           SET status = 'completed', new_assessment_id = $1, resolved_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [newAssessment.id, reassessmentId]
        );

        // Update user capability based on new assessment
        await this.updateCapabilityFromReassessment(reassessmentCase, newAssessment);
      }

      await client.query('COMMIT');
      return newAssessment;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error completing reassessment:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getReassessmentCase(reassessmentId: string): Promise<ReassessmentCase | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM reassessment_cases WHERE id = $1',
        [reassessmentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToReassessmentCase(result.rows[0]);
    } catch (error) {
      console.error('Error getting reassessment case:', error);
      return null;
    }
  }

  async getUserReassessmentHistory(userId: string, language: Language): Promise<ReassessmentCase[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM reassessment_cases 
         WHERE user_id = $1 AND language = $2 
         ORDER BY created_at DESC`,
        [userId, language]
      );

      return result.rows.map(row => this.mapRowToReassessmentCase(row));
    } catch (error) {
      console.error('Error getting user reassessment history:', error);
      return [];
    }
  }

  async cancelReassessment(reassessmentId: string, reason: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE reassessment_cases 
         SET status = 'cancelled', resolution_notes = $1, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [reason, reassessmentId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error cancelling reassessment:', error);
      return false;
    }
  }

  // Private helper methods

  private async evaluateUserResponse(
    question: string,
    userAnswer: string,
    focusAreas: SkillArea[],
    language: Language
  ): Promise<ReassessmentResponse['aiEvaluation']> {
    const prompt = `
      As a language assessment expert, evaluate the following user response to a targeted assessment question.

      Language: ${language}
      Focus Areas: ${focusAreas.join(', ')}
      Question: ${question}
      User Answer: ${userAnswer}

      Evaluate the response considering:
      1. Accuracy and correctness
      2. Language proficiency demonstrated
      3. Specific skills shown in focus areas
      4. Areas for improvement

      Provide evaluation in JSON format:
      {
        "score": number (0-100),
        "feedback": "detailed feedback string",
        "skillAreas": ["skill1", "skill2"] // skills demonstrated in this response
      }
    `;

    try {
      const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o', prompt, {
        temperature: 0.2,
        max_tokens: 1000
      });

      const evaluation = JSON.parse(response.content);
      return {
        score: Math.max(0, Math.min(100, evaluation.score || 0)),
        feedback: evaluation.feedback || 'No feedback provided',
        skillAreas: Array.isArray(evaluation.skillAreas) ? evaluation.skillAreas : []
      };
    } catch (error) {
      console.error('Error evaluating user response:', error);
      return {
        score: 50,
        feedback: 'Unable to evaluate response automatically. Manual review may be needed.',
        skillAreas: focusAreas
      };
    }
  }

  private async generateReassessmentResult(reassessmentCase: ReassessmentCase): Promise<CapabilityAssessment | null> {
    try {
      // Calculate overall performance from responses
      const totalScore = reassessmentCase.userResponses.reduce((sum, response) => sum + response.aiEvaluation.score, 0);
      const averageScore = totalScore / reassessmentCase.userResponses.length;

      // Analyze skill performance
      const skillPerformance: Record<SkillArea, number[]> = {} as Record<SkillArea, number[]>;
      
      reassessmentCase.userResponses.forEach(response => {
        response.aiEvaluation.skillAreas.forEach(skill => {
          if (!skillPerformance[skill]) {
            skillPerformance[skill] = [];
          }
          skillPerformance[skill].push(response.aiEvaluation.score);
        });
      });

      const skillScores: Record<SkillArea, number> = {} as Record<SkillArea, number>;
      Object.keys(skillPerformance).forEach(skill => {
        const scores = skillPerformance[skill as SkillArea];
        skillScores[skill as SkillArea] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      });

      // Create new assessment request
      const assessmentRequest: AssessmentRequest = {
        userId: reassessmentCase.userId,
        language: reassessmentCase.language,
        assessmentType: 'user_requested',
        dataSource: 'comprehensive_test',
        includeRecommendations: true
      };

      // Generate comprehensive assessment based on reassessment data
      const newAssessment = await this.userCapabilityService.performComprehensiveAssessment(assessmentRequest);

      if (newAssessment) {
        // Adjust assessment based on reassessment results
        newAssessment.overallScore = Math.round((newAssessment.overallScore + averageScore) / 2);
        
        // Update skill scores with reassessment results
        Object.keys(skillScores).forEach(skill => {
          if (newAssessment.skillScores[skill as SkillArea] !== undefined) {
            newAssessment.skillScores[skill as SkillArea] = Math.round(
              (newAssessment.skillScores[skill as SkillArea] + skillScores[skill as SkillArea]) / 2
            );
          }
        });

        // Add reassessment-specific recommendations
        newAssessment.recommendations.unshift(
          `Based on your reassessment request: ${reassessmentCase.reason}`,
          `Focused evaluation of ${reassessmentCase.focusAreas.join(', ')} areas completed`
        );
      }

      return newAssessment;

    } catch (error) {
      console.error('Error generating reassessment result:', error);
      return null;
    }
  }

  private async updateCapabilityFromReassessment(
    reassessmentCase: ReassessmentCase,
    newAssessment: CapabilityAssessment
  ): Promise<void> {
    try {
      // Update knowledge points based on reassessment results
      await this.updateKnowledgePoints(reassessmentCase, newAssessment);

      // Log the reassessment completion
      console.log(`Reassessment completed for user ${reassessmentCase.userId}, language ${reassessmentCase.language}`);
    } catch (error) {
      console.error('Error updating capability from reassessment:', error);
    }
  }

  private async updateKnowledgePoints(
    reassessmentCase: ReassessmentCase,
    newAssessment: CapabilityAssessment
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Update knowledge points mastery based on reassessment performance
      for (const response of reassessmentCase.userResponses) {
        for (const skillArea of response.aiEvaluation.skillAreas) {
          // Update or create knowledge point record
          await client.query(
            `INSERT INTO knowledge_points (user_id, language, skill_area, mastery_level, last_assessed_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, language, skill_area)
             DO UPDATE SET 
               mastery_level = $4,
               last_assessed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP`,
            [
              reassessmentCase.userId,
              reassessmentCase.language,
              skillArea,
              response.aiEvaluation.score
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating knowledge points:', error);
    } finally {
      client.release();
    }
  }

  private parseJsonField<T>(field: any, defaultValue: T): T {
    if (!field) return defaultValue;
    
    // 如果已经是对象类型，直接返回
    if (typeof field === 'object' && field !== null) {
      return field;
    }
    
    // 如果是字符串，尝试解析JSON
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (error) {
        console.warn('Failed to parse JSON field in ReassessmentService:', field, error);
        return defaultValue;
      }
    }
    
    // 其他类型直接返回默认值
    return defaultValue;
  }

  private mapRowToReassessmentCase(row: any): ReassessmentCase {
    return {
      id: row.id,
      userId: row.user_id,
      language: row.language,
      originalAssessmentId: row.original_assessment_id,
      reason: row.reason,
      focusAreas: this.parseJsonField(row.focus_areas, []),
      userObjections: this.parseJsonField(row.user_objections, []),
      status: row.status,
      targetedQuestions: this.parseJsonField(row.targeted_questions, []),
      userResponses: this.parseJsonField(row.user_responses, []),
      newAssessmentId: row.new_assessment_id,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at
    };
  }
}
