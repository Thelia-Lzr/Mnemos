import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface PracticeGroup {
  id: string;
  userId: string;
  title: string;
  description: string;
  language: Language;
  difficulty: DifficultyLevel;
  type: PracticeType;
  questions: Question[];
  createdAt: Date;
  estimatedDuration: number;
  focusAreas: string[];
}

export interface Question {
  id: string;
  practiceGroupId: string;
  type: QuestionType;
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
  userId: string;
  practiceGroupId: string;
  answers: QuestionAnswer[];
  wrongAnswersSummary?: WrongAnswerSummary[];
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  totalTime: number;
  averageTimePerQuestion: number;
  weakAreas: string[];
  improvedAreas: string[];
  recommendedFocus: string[];
  capabilityUpdates: CapabilityUpdate[];
  vocabularyUpdates: VocabularyUpdate[];
  milestoneProgress: MilestoneProgressUpdate[];
  completedAt: Date;
}

export interface QuestionAnswer {
  questionId: string;
  userAnswer: string;
  userAnswerText?: string;
  userAnswerLetter?: string;
  correctAnswer?: string;
  correctAnswerText?: string;
  isCorrect: boolean;
  timeSpent: number;
  attempts: number;
  // Enhanced fields for better context
  questionContent?: string;
  options?: string[];
  explanation?: string;
  vocabularyWords?: string[];
  grammarPoints?: string[];
}

export interface WrongAnswerSummary {
  questionId: string;
  userChoice: string;
  userChoiceText: string;
  correctChoice: string;
  correctChoiceText: string;
  questionContent: string;
}

export interface CapabilityUpdate {
  skillArea: SkillArea;
  previousScore: number;
  newScore: number;
  changeReason: string;
  confidence: number;
}

export interface VocabularyUpdate {
  wordId: string;
  word: string;
  previousMasteryLevel: MasteryLevel;
  newMasteryLevel: MasteryLevel;
  masteryScoreChange: number;
}

export interface MilestoneProgressUpdate {
  milestoneId: string;
  taskId?: string;
  progressChange: number;
  isCompleted: boolean;
}

export enum Language {
  ENGLISH = "en",
  JAPANESE = "ja",
  FRENCH = "fr"
}

export enum DifficultyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced"
}

export enum PracticeType {
  GENERAL = "general",
  VOCABULARY = "vocabulary",
  GRAMMAR = "grammar",
  MATERIAL_BASED = "material_based",
  REVIEW = "review",
  COMPREHENSIVE = "comprehensive"
}

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  FILL_BLANK = "fill_blank",
  TRANSLATION = "translation",
  VOCABULARY = "vocabulary"
}

export enum SkillArea {
  VOCABULARY = "vocabulary",
  GRAMMAR = "grammar",
  LISTENING = "listening",
  SPEAKING = "speaking",
  READING = "reading",
  WRITING = "writing",
  PRONUNCIATION = "pronunciation",
  FLUENCY = "fluency"
}

export enum MasteryLevel {
  NEW = "new",
  LEARNING = "learning",
  SHORT_TERM = "short_term",
  LONG_TERM = "long_term",
  MASTERED = "mastered"
}

export class PracticeGroupModel {
  constructor(private db: Pool) {}

  async create(practiceGroup: Omit<PracticeGroup, 'id' | 'createdAt'>): Promise<PracticeGroup> {
    const id = uuidv4();
    const createdAt = new Date();
    
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Insert practice group
      await client.query(`
        INSERT INTO practice_groups (
          id, user_id, title, description, language, difficulty, type,
          estimated_duration, focus_areas, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        id, practiceGroup.userId, practiceGroup.title, practiceGroup.description,
        practiceGroup.language, practiceGroup.difficulty, practiceGroup.type,
        practiceGroup.estimatedDuration, practiceGroup.focusAreas, createdAt
      ]);
      
      // Insert questions
      for (let i = 0; i < practiceGroup.questions.length; i++) {
        const question = practiceGroup.questions[i];
        const questionId = uuidv4();
        
        await client.query(`
          INSERT INTO questions (
            id, practice_group_id, type, content, options, correct_answer,
            explanation, vocabulary_words, grammar_points, difficulty, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          questionId, id, question.type, question.content, question.options,
          question.correctAnswer, question.explanation, question.vocabularyWords,
          question.grammarPoints, question.difficulty, i
        ]);
        
        practiceGroup.questions[i].id = questionId;
        practiceGroup.questions[i].practiceGroupId = id;
        practiceGroup.questions[i].orderIndex = i;
      }
      
      await client.query('COMMIT');
      
      return {
        ...practiceGroup,
        id,
        createdAt
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<PracticeGroup | null> {
    const result = await this.db.query(`
      SELECT pg.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pq.id,
                   'practiceGroupId', pq.practice_group_id,
                   'type', pq.type,
                   'content', pq.content,
                   'options', pq.options,
                   'correctAnswer', pq.correct_answer,
                   'explanation', pq.explanation,
                   'vocabularyWords', pq.vocabulary_words,
                   'grammarPoints', pq.grammar_points,
                   'difficulty', pq.difficulty,
                   'orderIndex', pq.order_index
                 ) ORDER BY pq.order_index
               ) FILTER (WHERE pq.id IS NOT NULL),
               '[]'::json
             ) as questions
      FROM practice_groups pg
      LEFT JOIN questions pq ON pg.id = pq.practice_group_id
      WHERE pg.id = $1
      GROUP BY pg.id
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Ensure questions is always an array
    let questions = row.questions || [];
    if (Array.isArray(questions) && questions.length === 1 && questions[0] === null) {
      questions = [];
    }
    
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      language: row.language as Language,
      difficulty: row.difficulty as DifficultyLevel,
      type: row.type as PracticeType,
      questions: questions,
      createdAt: row.created_at,
      estimatedDuration: row.estimated_duration,
      focusAreas: row.focus_areas || []
    };
  }

  async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<PracticeGroup[]> {
    const result = await this.db.query(`
      SELECT pg.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pq.id,
                   'practiceGroupId', pq.practice_group_id,
                   'type', pq.type,
                   'content', pq.content,
                   'options', pq.options,
                   'correctAnswer', pq.correct_answer,
                   'explanation', pq.explanation,
                   'vocabularyWords', pq.vocabulary_words,
                   'grammarPoints', pq.grammar_points,
                   'difficulty', pq.difficulty,
                   'orderIndex', pq.order_index
                 ) ORDER BY pq.order_index
               ) FILTER (WHERE pq.id IS NOT NULL),
               '[]'::json
             ) as questions
      FROM practice_groups pg
      LEFT JOIN questions pq ON pg.id = pq.practice_group_id
      WHERE pg.user_id = $1
      GROUP BY pg.id
      ORDER BY pg.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows.map(row => {
      // Ensure questions is always an array
      let questions = row.questions || [];
      if (Array.isArray(questions) && questions.length === 1 && questions[0] === null) {
        questions = [];
      }
      
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        language: row.language as Language,
        difficulty: row.difficulty as DifficultyLevel,
        type: row.type as PracticeType,
        questions: questions,
        createdAt: row.created_at,
        estimatedDuration: row.estimated_duration,
        focusAreas: row.focus_areas || []
      };
    });
  }

  async createResult(result: Omit<PracticeResult, 'id' | 'completedAt'>): Promise<PracticeResult> {
    const id = uuidv4();
    const completedAt = new Date();
    
    const insertResult = await this.db.query(`
      INSERT INTO practice_results (
        id, user_id, practice_group_id, answers, wrong_answers_summary, total_questions, correct_answers,
        accuracy, total_time, average_time_per_question, weak_areas, improved_areas,
        recommended_focus, capability_updates, vocabulary_updates, milestone_progress,
        completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      id, result.userId, result.practiceGroupId, JSON.stringify(result.answers),
      JSON.stringify(result.wrongAnswersSummary || []),
      result.totalQuestions, result.correctAnswers, result.accuracy, result.totalTime,
      result.averageTimePerQuestion, result.weakAreas,
      result.improvedAreas, result.recommendedFocus,
      JSON.stringify(result.capabilityUpdates), JSON.stringify(result.vocabularyUpdates),
      JSON.stringify(result.milestoneProgress), completedAt
    ]);

    return {
      ...result,
      id,
      completedAt
    };
  }

  async delete(id: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Delete practice results first (if any)
      await client.query('DELETE FROM practice_results WHERE practice_group_id = $1', [id]);
      
      // Delete questions
      await client.query('DELETE FROM questions WHERE practice_group_id = $1', [id]);
      
      // Delete practice group
      await client.query('DELETE FROM practice_groups WHERE id = $1', [id]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePracticeResults(practiceGroupIds: string[], userId: string): Promise<number> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Delete AI analysis first (due to foreign key constraints)
      await client.query(`
        DELETE FROM practice_ai_analysis 
        WHERE practice_result_id IN (
          SELECT pr.id FROM practice_results pr 
          WHERE pr.practice_group_id = ANY($1) AND pr.user_id = $2
        )
      `, [practiceGroupIds, userId]);
      
      // Delete practice results (history records)
      const deleteResult = await client.query(`
        DELETE FROM practice_results 
        WHERE practice_group_id = ANY($1) AND user_id = $2
        RETURNING id
      `, [practiceGroupIds, userId]);
      
      await client.query('COMMIT');
      return deleteResult.rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
