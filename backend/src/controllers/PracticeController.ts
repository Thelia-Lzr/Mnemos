import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PracticeGenerationService } from '../services/PracticeGenerationService';
import { PracticeGroupModel } from '../models/PracticeGroup';
import { PracticeEvaluationService } from '../services/PracticeEvaluationService';
import { PracticeAnalysisService } from '../services/PracticeAnalysisService';
import { PracticeQuestionService } from '../services/PracticeQuestionService';
import { OpenRouterService } from '../services/OpenRouterService';
import { CreditService } from '../services/CreditService';
import { Language, DifficultyLevel, PracticeType, SkillArea } from '../models/PracticeGroup';
import { Pool } from 'pg';

export class PracticeController {
  private practiceGenerationService: PracticeGenerationService;
  private practiceGroupModel: PracticeGroupModel;
  private practiceEvaluationService: PracticeEvaluationService;
  private practiceAnalysisService: PracticeAnalysisService;
  private practiceQuestionService: PracticeQuestionService;
  private db: Pool;

  constructor(
    practiceGenerationService: PracticeGenerationService,
    practiceGroupModel: PracticeGroupModel,
    practiceEvaluationService: PracticeEvaluationService,
    db: Pool
  ) {
    this.practiceGenerationService = practiceGenerationService;
    this.practiceGroupModel = practiceGroupModel;
    this.practiceEvaluationService = practiceEvaluationService;
    this.db = db;
    
    // Initialize services
    const openRouterService = new OpenRouterService();
    const creditService = new CreditService(db);
    this.practiceAnalysisService = new PracticeAnalysisService(db, openRouterService, creditService);
    this.practiceQuestionService = new PracticeQuestionService(db, openRouterService, creditService);
  }

  async generatePracticeGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, difficulty, type, focusAreas, vocabularyWords, grammarPoints, count } = req.body;
      
      if (!language || !type) {
        res.status(400).json({ 
          success: false, 
          error: 'Language and type are required' 
        });
        return;
      }

      const practiceGroup = await this.practiceGenerationService.generatePracticeGroup({
        userId: req.user!.id,
        language: language as Language,
        difficulty: difficulty as DifficultyLevel,
        type: type as PracticeType,
        focusAreas: focusAreas as SkillArea[],
        vocabularyWords,
        grammarPoints,
        count
      });

      res.status(200).json({ 
        success: true, 
        data: practiceGroup 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generateComprehensivePractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language } = req.body;
      
      if (!language) {
        res.status(400).json({ 
          success: false, 
          error: 'Language is required' 
        });
        return;
      }

      const practiceGroup = await this.practiceGenerationService.generateComprehensivePractice({
        userId: req.user!.id,
        language: language as Language,
        includeCapabilityData: true,
        includeMilestones: true,
        includeVocabulary: true
      });

      res.status(200).json({ 
        success: true, 
        data: practiceGroup 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getPracticeGroups(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const practiceGroups = await this.practiceGroupModel.findByUserId(req.user!.id, limit, offset);

      res.status(200).json({ 
        success: true, 
        data: practiceGroups,
        pagination: {
          limit,
          offset,
          total: practiceGroups.length
        }
      });
    } catch (error) { 
      next(error); 
    }
  }

  async getPracticeGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const practiceGroup = await this.practiceGroupModel.findById(id);
      
      if (!practiceGroup) {
        res.status(404).json({ 
          success: false, 
          error: 'Practice group not found' 
        });
        return;
      }

      // Check if user owns this practice group
      if (practiceGroup.userId !== req.user!.id) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        data: practiceGroup 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async submitPracticeGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { answers, totalTime } = req.body;
      
      if (!answers || !Array.isArray(answers)) {
        res.status(400).json({ 
          success: false, 
          error: 'Answers array is required' 
        });
        return;
      }

      const practiceGroup = await this.practiceGroupModel.findById(id);
      
      if (!practiceGroup) {
        res.status(404).json({ 
          success: false, 
          error: 'Practice group not found' 
        });
        return;
      }

      if (practiceGroup.userId !== req.user!.id) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
        return;
      }

      const result = await this.practiceEvaluationService.evaluatePracticeGroup(
        req.user!.id,
        practiceGroup,
        answers,
        totalTime || 0
      );

      const savedResult = await this.practiceGroupModel.createResult(result);

      res.status(200).json({ 
        success: true, 
        data: savedResult 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generatePracticeGroupAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, difficulty, type, focusAreas, vocabularyWords, grammarPoints, count } = req.body;
      
      if (!language || !type) {
        res.status(400).json({ 
          success: false, 
          error: 'Language and type are required' 
        });
        return;
      }

      const taskId = await this.practiceGenerationService.generatePracticeGroupAsync({
        userId: req.user!.id,
        language: language as Language,
        difficulty: difficulty as DifficultyLevel,
        type: type as PracticeType,
        focusAreas: focusAreas as SkillArea[],
        vocabularyWords,
        grammarPoints,
        count
      });

      res.status(202).json({ 
        success: true, 
        taskId,
        message: 'Practice generation started. Check task status for completion.' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generateComprehensivePracticeAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, includeCapabilityData, includeMilestones, includeVocabulary } = req.body;
      
      if (!language) {
        res.status(400).json({ 
          success: false, 
          error: 'Language is required' 
        });
        return;
      }

      const taskId = await this.practiceGenerationService.generatePracticeGroupAsync({
        userId: req.user!.id,
        language: language as Language,
        type: PracticeType.COMPREHENSIVE,
        focusAreas: []
      });

      res.status(202).json({ 
        success: true, 
        taskId,
        message: 'Comprehensive practice generation started. Check task status for completion.' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generateVocabularyPracticeAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, vocabularyWords } = req.body;
      
      if (!language || !vocabularyWords || !Array.isArray(vocabularyWords)) {
        res.status(400).json({ 
          success: false, 
          error: 'Language and vocabularyWords array are required' 
        });
        return;
      }

      const taskId = await this.practiceGenerationService.generatePracticeGroupAsync({
        userId: req.user!.id,
        language: language as Language,
        type: PracticeType.VOCABULARY,
        vocabularyWords,
        focusAreas: [SkillArea.VOCABULARY]
      });

      res.status(202).json({ 
        success: true, 
        taskId,
        message: 'Vocabulary practice generation started. Check task status for completion.' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generateVocabularyPractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, vocabularyWords } = req.body;
      
      if (!language || !vocabularyWords || !Array.isArray(vocabularyWords)) {
        res.status(400).json({ 
          success: false, 
          error: 'Language and vocabularyWords array are required' 
        });
        return;
      }

      const practiceGroup = await this.practiceGenerationService.generateVocabularyPractice(
        req.user!.id,
        language as Language,
        vocabularyWords
      );

      res.status(200).json({ 
        success: true, 
        data: practiceGroup 
      });
    } catch (error) { 
      next(error); 
    }
  }



  async updateCapabilities(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceResultId } = req.body;
      
      if (!practiceResultId) {
        res.status(400).json({ 
          success: false, 
          error: 'Practice result ID is required' 
        });
        return;
      }

      await this.practiceEvaluationService.updateUserCapabilities(req.user!.id, practiceResultId);

      res.status(200).json({ 
        success: true, 
        message: 'User capabilities updated successfully' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async generateAIPractice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        message, 
        language = 'en', 
        type = 'general', 
        difficulty, 
        focusAreas = [], 
        vocabularyWords = [], 
        grammarPoints = [],
        count = 10 
      } = req.body;
      
      if (!message) {
        res.status(400).json({ 
          success: false, 
          error: 'Message is required for AI practice generation' 
        });
        return;
      }

      // Use AI to analyze the message and determine practice parameters
      const { AIFunctionService } = await import('../services/AIFunctionService');
      const aiFunctionService = new AIFunctionService(this.db, false);
      
      // Parse intent from message
      const intentResponse = await aiFunctionService.parseIntent(req.user!.id, {
        message,
        language,
        context: { currentPage: 'practice' }
      });

      if (!intentResponse.success || !intentResponse.result) {
        res.status(400).json({ 
          success: false, 
          error: 'Failed to understand your request' 
        });
        return;
      }

      // Generate practice based on AI analysis
      let practiceParams = {
        userId: req.user!.id,
        language: language as Language,
        difficulty: difficulty as DifficultyLevel || DifficultyLevel.INTERMEDIATE,
        type: type as PracticeType,
        focusAreas: focusAreas as SkillArea[],
        vocabularyWords,
        grammarPoints,
        count
      };

      // Override with AI-detected parameters
      const aiParams = intentResponse.result.parameters;
      if (aiParams.type) practiceParams.type = aiParams.type as PracticeType;
      if (aiParams.difficulty) practiceParams.difficulty = aiParams.difficulty as DifficultyLevel;
      if (aiParams.focusAreas) practiceParams.focusAreas = aiParams.focusAreas as SkillArea[];
      if (aiParams.vocabularyWords) practiceParams.vocabularyWords = aiParams.vocabularyWords;
      if (aiParams.grammarPoints) practiceParams.grammarPoints = aiParams.grammarPoints;
      if (aiParams.count) practiceParams.count = aiParams.count;

      const practiceGroup = await this.practiceGenerationService.generatePracticeGroup(practiceParams);

      res.status(200).json({ 
        success: true, 
        data: {
          practiceGroup: practiceGroup,
          aiAnalysis: {
            detectedIntent: intentResponse.result.intent,
            confidence: intentResponse.result.confidence,
            parameters: aiParams
          }
        },
        message: `基于您的要求"${message}"，成功生成了${practiceGroup.questions.length}道练习题！`
      });
    } catch (error) { 
      next(error); 
    }
  }

  async deletePracticeGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // First check if the practice group exists and belongs to the user
      const practiceGroup = await this.practiceGroupModel.findById(id);
      
      if (!practiceGroup) {
        res.status(404).json({ 
          success: false, 
          error: 'Practice group not found' 
        });
        return;
      }

      // Check if user owns this practice group
      if (practiceGroup.userId !== req.user!.id) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
        return;
      }

      // Delete the practice group (cascade delete will handle questions and results)
      await this.practiceGroupModel.delete(id);

      res.status(200).json({ 
        success: true, 
        message: 'Practice group deleted successfully' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  async batchDeletePracticeGroups(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceGroupIds } = req.body;
      
      if (!practiceGroupIds || !Array.isArray(practiceGroupIds) || practiceGroupIds.length === 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Practice group IDs array is required and cannot be empty' 
        });
        return;
      }

      // Validate that all practice groups belong to the user
      const practiceGroups = await Promise.all(
        practiceGroupIds.map(id => this.practiceGroupModel.findById(id))
      );

      const notFoundIds: string[] = [];
      const unauthorizedIds: string[] = [];
      const validIds: string[] = [];

      practiceGroups.forEach((group, index) => {
        const id = practiceGroupIds[index];
        if (!group) {
          notFoundIds.push(id);
        } else if (group.userId !== req.user!.id) {
          unauthorizedIds.push(id);
        } else {
          validIds.push(id);
        }
      });

      if (notFoundIds.length > 0 || unauthorizedIds.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Some practice groups could not be deleted',
          details: {
            notFound: notFoundIds,
            unauthorized: unauthorizedIds,
            validCount: validIds.length
          }
        });
        return;
      }

      // Delete all valid practice groups
      const deletePromises = validIds.map(id => this.practiceGroupModel.delete(id));
      await Promise.all(deletePromises);

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${validIds.length} practice groups`,
        deletedCount: validIds.length
      });

    } catch (error) {
      next(error);
    }
  }

  async batchDeletePracticeHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceGroupIds } = req.body;
      
      if (!practiceGroupIds || !Array.isArray(practiceGroupIds) || practiceGroupIds.length === 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Practice group IDs array is required and cannot be empty' 
        });
        return;
      }

      // Validate that all practice groups belong to the user
      const practiceGroups = await Promise.all(
        practiceGroupIds.map(id => this.practiceGroupModel.findById(id))
      );

      const notFoundIds: string[] = [];
      const unauthorizedIds: string[] = [];
      const validIds: string[] = [];

      practiceGroups.forEach((group, index) => {
        const id = practiceGroupIds[index];
        if (!group) {
          notFoundIds.push(id);
        } else if (group.userId !== req.user!.id) {
          unauthorizedIds.push(id);
        } else {
          validIds.push(id);
        }
      });

      if (notFoundIds.length > 0 || unauthorizedIds.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Some practice history records could not be deleted',
          details: {
            notFound: notFoundIds,
            unauthorized: unauthorizedIds,
            validCount: validIds.length
          }
        });
        return;
      }

      // Delete practice results (history records) only, keep the practice groups
      const deletedCount = await this.practiceGroupModel.deletePracticeResults(validIds, req.user!.id);

      res.status(200).json({
        success: true,
        message: `成功删除了 ${deletedCount} 条练习历史记录`,
        deletedCount: deletedCount
      });

    } catch (error) {
      next(error);
    }
  }

  async generatePracticeAnalysis(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceResultId } = req.params;
      const { userAnswers } = req.body;

      if (!userAnswers || typeof userAnswers !== 'object') {
        res.status(400).json({
          success: false,
          error: 'User answers are required'
        });
        return;
      }

      // Get practice result
      const practiceResultQuery = await this.db.query(
        'SELECT * FROM practice_results WHERE id = $1 AND user_id = $2',
        [practiceResultId, req.user!.id]
      );

      if (practiceResultQuery.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Practice result not found'
        });
        return;
      }

      const practiceResultRow = practiceResultQuery.rows[0];
      // Helper function to safely parse JSON
      const safeJsonParse = (jsonString: any, fallback: any = []) => {
        if (!jsonString) return fallback;
        if (typeof jsonString === 'object') return jsonString; // Already parsed
        try {
          return JSON.parse(jsonString);
        } catch (error) {
          console.warn('Failed to parse JSON:', jsonString, error);
          return fallback;
        }
      };

      const practiceResult = {
        id: practiceResultRow.id,
        userId: practiceResultRow.user_id,
        practiceGroupId: practiceResultRow.practice_group_id,
        answers: safeJsonParse(practiceResultRow.answers, []),
        totalQuestions: practiceResultRow.total_questions,
        correctAnswers: practiceResultRow.correct_answers,
        accuracy: practiceResultRow.accuracy,
        totalTime: practiceResultRow.total_time,
        averageTimePerQuestion: practiceResultRow.average_time_per_question,
        weakAreas: practiceResultRow.weak_areas || [],
        improvedAreas: practiceResultRow.improved_areas || [],
        recommendedFocus: practiceResultRow.recommended_focus || [],
        capabilityUpdates: safeJsonParse(practiceResultRow.capability_updates, []),
        vocabularyUpdates: safeJsonParse(practiceResultRow.vocabulary_updates, []),
        milestoneProgress: safeJsonParse(practiceResultRow.milestone_progress, []),
        completedAt: practiceResultRow.completed_at
      };

      // Get practice group and questions
      const practiceGroup = await this.practiceGroupModel.findById(practiceResult.practiceGroupId);
      if (!practiceGroup) {
        res.status(404).json({
          success: false,
          error: 'Practice group not found'
        });
        return;
      }

      // Check if analysis already exists
      const existingAnalysis = await this.practiceAnalysisService.getAnalysisForPracticeResult(practiceResultId);
      if (existingAnalysis) {
        res.status(200).json({
          success: true,
          data: existingAnalysis,
          message: '已存在的分析结果'
        });
        return;
      }

      // Generate new analysis
      const analysis = await this.practiceAnalysisService.generatePracticeAnalysis({
        practiceResult,
        questions: practiceGroup.questions,
        userAnswers,
        language: practiceGroup.language
      });

      res.status(200).json({
        success: true,
        data: analysis,
        message: 'AI分析生成成功'
      });

    } catch (error) {
      next(error);
    }
  }

  async getPracticeAnalysis(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceResultId } = req.params;

      // Verify the practice result belongs to the user
      const practiceResultQuery = await this.db.query(
        'SELECT id FROM practice_results WHERE id = $1 AND user_id = $2',
        [practiceResultId, req.user!.id]
      );

      if (practiceResultQuery.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Practice result not found'
        });
        return;
      }

      const analysis = await this.practiceAnalysisService.getAnalysisForPracticeResult(practiceResultId);
      
      if (!analysis) {
        res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: analysis
      });

    } catch (error) {
      next(error);
    }
  }

  async getPracticeHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get practice history with results and analysis
      const historyQuery = await this.db.query(`
        SELECT 
          pg.id as practice_group_id,
          pg.title,
          pg.description,
          pg.language,
          pg.difficulty,
          pg.type,
          pg.created_at as practice_created_at,
          pr.id as result_id,
          pr.accuracy,
          pr.total_time,
          pr.completed_at,
          pai.id as analysis_id,
          pai.analysis_content,
          pai.learning_advice,
          pai.created_at as analysis_created_at
        FROM practice_groups pg
        LEFT JOIN practice_results pr ON pg.id = pr.practice_group_id
        LEFT JOIN practice_ai_analysis pai ON pr.id = pai.practice_result_id
        WHERE pg.user_id = $1
        ORDER BY pg.created_at DESC
        LIMIT $2 OFFSET $3
      `, [req.user!.id, limit, offset]);

      const practiceHistory = historyQuery.rows.map(row => ({
        practiceGroupId: row.practice_group_id,
        title: row.title,
        description: row.description,
        language: row.language,
        difficulty: row.difficulty,
        type: row.type,
        practiceCreatedAt: row.practice_created_at,
        result: row.result_id ? {
          id: row.result_id,
          accuracy: row.accuracy,
          totalTime: row.total_time,
          completedAt: row.completed_at
        } : null,
        analysis: row.analysis_id ? {
          id: row.analysis_id,
          analysisContent: row.analysis_content,
          learningAdvice: row.learning_advice,
          createdAt: row.analysis_created_at
        } : null
      }));

      res.status(200).json({
        success: true,
        data: practiceHistory,
        pagination: {
          limit,
          offset,
          total: practiceHistory.length
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async getPracticeResultDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceResultId } = req.params;

      // Get practice result with user answers
      const resultQuery = await this.db.query(`
        SELECT pr.*, pg.title, pg.description, pg.language, pg.difficulty, pg.type
        FROM practice_results pr
        JOIN practice_groups pg ON pr.practice_group_id = pg.id
        WHERE pr.id = $1 AND pr.user_id = $2
      `, [practiceResultId, req.user!.id]);

      if (resultQuery.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Practice result not found'
        });
        return;
      }

      const resultRow = resultQuery.rows[0];
      
      // Helper function to safely parse JSON
      const safeJsonParse = (jsonString: any, fallback: any = []) => {
        if (!jsonString) return fallback;
        if (typeof jsonString === 'object') return jsonString; // Already parsed
        try {
          return JSON.parse(jsonString);
        } catch (error) {
          console.warn('Failed to parse JSON:', jsonString, error);
          return fallback;
        }
      };

      const practiceResult = {
        id: resultRow.id,
        userId: resultRow.user_id,
        practiceGroupId: resultRow.practice_group_id,
        answers: safeJsonParse(resultRow.answers, []),
        totalQuestions: resultRow.total_questions,
        correctAnswers: resultRow.correct_answers,
        accuracy: resultRow.accuracy,
        totalTime: resultRow.total_time,
        averageTimePerQuestion: resultRow.average_time_per_question,
        weakAreas: resultRow.weak_areas || [],
        improvedAreas: resultRow.improved_areas || [],
        recommendedFocus: resultRow.recommended_focus || [],
        capabilityUpdates: safeJsonParse(resultRow.capability_updates, []),
        vocabularyUpdates: safeJsonParse(resultRow.vocabulary_updates, []),
        milestoneProgress: safeJsonParse(resultRow.milestone_progress, []),
        completedAt: resultRow.completed_at
      };

      // Get practice group with questions
      const practiceGroup = await this.practiceGroupModel.findById(practiceResult.practiceGroupId);
      if (!practiceGroup) {
        res.status(404).json({
          success: false,
          error: 'Practice group not found'
        });
        return;
      }

      // Extract user answers from the answers array
      const userAnswers: Record<string, string> = {};
      if (Array.isArray(practiceResult.answers)) {
        practiceResult.answers.forEach((answer: any) => {
          if (answer.questionId && answer.userAnswer) {
            userAnswers[answer.questionId] = answer.userAnswer;
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          result: practiceResult,
          practiceGroup,
          userAnswers
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async askQuestionFollowUp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        questionId, 
        questionContent, 
        correctAnswer, 
        userAnswer, 
        explanation, 
        followUpQuestion, 
        language,
        // Enhanced context
        options,
        userAnswerText,
        correctAnswerText,
        vocabularyWords,
        grammarPoints
      } = req.body;

      if (!questionId || !questionContent || !followUpQuestion || !language) {
        res.status(400).json({
          success: false,
          error: 'Question ID, content, follow-up question, and language are required'
        });
        return;
      }

      const response = await this.practiceQuestionService.askQuestionFollowUp({
        userId: req.user!.id,
        questionId,
        questionContent,
        correctAnswer: correctAnswer || '',
        userAnswer: userAnswer || '',
        explanation: explanation || '',
        followUpQuestion,
        language,
        // Pass enhanced context
        options: options || [],
        userAnswerText: userAnswerText || '',
        correctAnswerText: correctAnswerText || '',
        vocabularyWords: vocabularyWords || [],
        grammarPoints: grammarPoints || []
      });

      res.status(200).json({
        success: true,
        data: response,
        message: 'Follow-up question answered successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async askPracticeGroupFollowUp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        practiceGroupId,
        practiceGroupTitle,
        practiceGroupDescription,
        totalQuestions,
        correctAnswers,
        accuracy,
        followUpQuestion,
        language,
        practiceResultId // Add this to get detailed wrong answers
      } = req.body;

      if (!practiceGroupId || !followUpQuestion || !language) {
        res.status(400).json({
          success: false,
          error: 'Practice group ID, follow-up question, and language are required'
        });
        return;
      }

      // Get detailed wrong answers and existing analysis if practiceResultId is provided
      let wrongAnswers: any[] = [];
      let existingAnalysis: string | undefined;

      if (practiceResultId) {
        try {
          // Get practice result with detailed answers
          const resultQuery = await this.db.query(`
            SELECT pr.answers, pr.wrong_answers_summary, pg.questions
            FROM practice_results pr
            JOIN practice_groups pg ON pr.practice_group_id = pg.id
            WHERE pr.id = $1 AND pr.user_id = $2
          `, [practiceResultId, req.user!.id]);

          if (resultQuery.rows.length > 0) {
            const resultRow = resultQuery.rows[0];
            const wrongAnswersSummary = resultRow.wrong_answers_summary || [];
            
            // Get practice group to get full question details
            const practiceGroup = await this.practiceGroupModel.findById(practiceGroupId);
            
            if (practiceGroup && Array.isArray(wrongAnswersSummary)) {
              wrongAnswers = wrongAnswersSummary.map((wrongAnswer: any) => {
                const question = practiceGroup.questions.find(q => q.id === wrongAnswer.questionId);
                return {
                  questionId: wrongAnswer.questionId,
                  questionContent: wrongAnswer.questionContent,
                  userChoice: wrongAnswer.userChoice,
                  userChoiceText: wrongAnswer.userChoiceText,
                  correctChoice: wrongAnswer.correctChoice,
                  correctChoiceText: wrongAnswer.correctChoiceText,
                  options: question?.options || [],
                  explanation: question?.explanation || '',
                  vocabularyWords: question?.vocabularyWords || [],
                  grammarPoints: question?.grammarPoints || []
                };
              });
            }
          }

          // Get existing AI analysis if available
          const analysisQuery = await this.db.query(`
            SELECT analysis_content, learning_advice
            FROM practice_ai_analysis
            WHERE practice_result_id = $1
          `, [practiceResultId]);

          if (analysisQuery.rows.length > 0) {
            const analysis = analysisQuery.rows[0];
            existingAnalysis = `${analysis.analysis_content}\n\n学习建议：\n${analysis.learning_advice}`;
          }
        } catch (error) {
          console.warn('Failed to get detailed context for practice group follow-up:', error);
          // Continue without detailed context
        }
      }

      const response = await this.practiceQuestionService.askPracticeGroupFollowUp({
        userId: req.user!.id,
        practiceGroupId,
        practiceGroupTitle: practiceGroupTitle || '',
        practiceGroupDescription: practiceGroupDescription || '',
        totalQuestions: totalQuestions || 0,
        correctAnswers: correctAnswers || 0,
        accuracy: accuracy || 0,
        followUpQuestion,
        language,
        wrongAnswers,
        existingAnalysis
      });

      res.status(200).json({
        success: true,
        data: response,
        message: 'Practice group follow-up question answered successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async askQuestionFollowUpStream(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        questionId, 
        questionContent, 
        correctAnswer, 
        userAnswer, 
        explanation, 
        followUpQuestion, 
        language,
        // Enhanced context
        options,
        userAnswerText,
        correctAnswerText,
        vocabularyWords,
        grammarPoints
      } = req.body;

      if (!questionId || !questionContent || !followUpQuestion || !language) {
        res.status(400).json({
          success: false,
          error: 'Question ID, content, follow-up question, and language are required'
        });
        return;
      }

      const response = await this.practiceQuestionService.askQuestionFollowUpStream({
        userId: req.user!.id,
        questionId,
        questionContent,
        correctAnswer: correctAnswer || '',
        userAnswer: userAnswer || '',
        explanation: explanation || '',
        followUpQuestion,
        language,
        // Pass enhanced context
        options: options || [],
        userAnswerText: userAnswerText || '',
        correctAnswerText: correctAnswerText || '',
        vocabularyWords: vocabularyWords || [],
        grammarPoints: grammarPoints || []
      });

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send credit cost first
      res.write(`data: ${JSON.stringify({ type: 'credit_cost', creditCost: response.creditCost })}\n\n`);

      // Handle Node.js stream (from axios) with proper buffering
      let buffer = '';
      
      response.stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
              res.end();
              return;
            }
            
            if (data) { // Only process non-empty data
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                  const content = parsed.choices[0].delta.content;
                  res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
                }
              } catch (parseError) {
                // Ignore parsing errors for non-JSON lines
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }
      });

      response.stream.on('end', () => {
        res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        res.end();
      });

      response.stream.on('error', (error: Error) => {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      });

    } catch (error) {
      next(error);
    }
  }

  async askPracticeGroupFollowUpStream(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        practiceGroupId,
        practiceGroupTitle,
        practiceGroupDescription,
        totalQuestions,
        correctAnswers,
        accuracy,
        followUpQuestion,
        language,
        practiceResultId
      } = req.body;

      if (!practiceGroupId || !followUpQuestion || !language) {
        res.status(400).json({
          success: false,
          error: 'Practice group ID, follow-up question, and language are required'
        });
        return;
      }

      // Get detailed wrong answers and existing analysis (same logic as non-streaming version)
      let wrongAnswers: any[] = [];
      let existingAnalysis: string | undefined;

      if (practiceResultId) {
        try {
          const resultQuery = await this.db.query(`
            SELECT pr.answers, pr.wrong_answers_summary, pg.questions
            FROM practice_results pr
            JOIN practice_groups pg ON pr.practice_group_id = pg.id
            WHERE pr.id = $1 AND pr.user_id = $2
          `, [practiceResultId, req.user!.id]);

          if (resultQuery.rows.length > 0) {
            const resultRow = resultQuery.rows[0];
            const wrongAnswersSummary = resultRow.wrong_answers_summary || [];
            
            const practiceGroup = await this.practiceGroupModel.findById(practiceGroupId);
            
            if (practiceGroup && Array.isArray(wrongAnswersSummary)) {
              wrongAnswers = wrongAnswersSummary.map((wrongAnswer: any) => {
                const question = practiceGroup.questions.find(q => q.id === wrongAnswer.questionId);
                return {
                  questionId: wrongAnswer.questionId,
                  questionContent: wrongAnswer.questionContent,
                  userChoice: wrongAnswer.userChoice,
                  userChoiceText: wrongAnswer.userChoiceText,
                  correctChoice: wrongAnswer.correctChoice,
                  correctChoiceText: wrongAnswer.correctChoiceText,
                  options: question?.options || [],
                  explanation: question?.explanation || '',
                  vocabularyWords: question?.vocabularyWords || [],
                  grammarPoints: question?.grammarPoints || []
                };
              });
            }
          }

          const analysisQuery = await this.db.query(`
            SELECT analysis_content, learning_advice
            FROM practice_ai_analysis
            WHERE practice_result_id = $1
          `, [practiceResultId]);

          if (analysisQuery.rows.length > 0) {
            const analysis = analysisQuery.rows[0];
            existingAnalysis = `${analysis.analysis_content}\n\n学习建议：\n${analysis.learning_advice}`;
          }
        } catch (error) {
          console.warn('Failed to get detailed context for practice group follow-up:', error);
        }
      }

      const response = await this.practiceQuestionService.askPracticeGroupFollowUpStream({
        userId: req.user!.id,
        practiceGroupId,
        practiceGroupTitle: practiceGroupTitle || '',
        practiceGroupDescription: practiceGroupDescription || '',
        totalQuestions: totalQuestions || 0,
        correctAnswers: correctAnswers || 0,
        accuracy: accuracy || 0,
        followUpQuestion,
        language,
        wrongAnswers,
        existingAnalysis
      });

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send credit cost first
      res.write(`data: ${JSON.stringify({ type: 'credit_cost', creditCost: response.creditCost })}\n\n`);

      // Handle Node.js stream (from axios) with proper buffering
      let buffer = '';
      
      response.stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
              res.end();
              return;
            }
            
            if (data) { // Only process non-empty data
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                  const content = parsed.choices[0].delta.content;
                  res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
                }
              } catch (parseError) {
                // Ignore parsing errors for non-JSON lines
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }
      });

      response.stream.on('end', () => {
        res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        res.end();
      });

      response.stream.on('error', (error: Error) => {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      });

    } catch (error) {
      next(error);
    }
  }

  async deletePracticeAnalysis(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceResultId } = req.params;

      // Verify the practice result belongs to the user
      const practiceResultQuery = await this.db.query(
        'SELECT id FROM practice_results WHERE id = $1 AND user_id = $2',
        [practiceResultId, req.user!.id]
      );

      if (practiceResultQuery.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Practice result not found'
        });
        return;
      }

      // Delete the AI analysis (not the practice result or practice group)
      const deleteResult = await this.db.query(
        'DELETE FROM practice_ai_analysis WHERE practice_result_id = $1 RETURNING id',
        [practiceResultId]
      );

      if (deleteResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'AI analysis not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'AI分析报告已删除'
      });

    } catch (error) {
      next(error);
    }
  }

  async batchDeletePracticeAnalyses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { practiceResultIds } = req.body;

      if (!practiceResultIds || !Array.isArray(practiceResultIds) || practiceResultIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Practice result IDs array is required and cannot be empty'
        });
        return;
      }

      // Verify that all practice results belong to the user
      const practiceResultsQuery = await this.db.query(
        'SELECT id FROM practice_results WHERE id = ANY($1) AND user_id = $2',
        [practiceResultIds, req.user!.id]
      );

      const validResultIds = practiceResultsQuery.rows.map(row => row.id);
      const invalidIds = practiceResultIds.filter(id => !validResultIds.includes(id));

      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Some practice results do not exist or do not belong to you',
          details: {
            invalidIds,
            validCount: validResultIds.length
          }
        });
        return;
      }

      // Delete AI analyses for the valid practice results
      const deleteResult = await this.db.query(
        'DELETE FROM practice_ai_analysis WHERE practice_result_id = ANY($1) RETURNING id',
        [validResultIds]
      );

      res.status(200).json({
        success: true,
        message: `成功删除了 ${deleteResult.rows.length} 个AI分析报告`,
        deletedCount: deleteResult.rows.length
      });

    } catch (error) {
      next(error);
    }
  }
}
