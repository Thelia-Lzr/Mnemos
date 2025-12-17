import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { OpenRouterService } from './OpenRouterService';
import { CreditService } from './CreditService';
import { aiPromptService } from './AIPromptService';
import { TaskType } from '../types/openrouter';
import { PracticeResult, Question, Language } from '../models/PracticeGroup';

export interface PracticeAnalysisResult {
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
  createdAt: Date;
}

export interface AnalysisRequest {
  practiceResult: PracticeResult;
  questions: Question[];
  userAnswers: Record<string, string>;
  language: Language;
}

export class PracticeAnalysisService {
  constructor(
    private db: Pool,
    private openRouterService: OpenRouterService,
    private creditService: CreditService
  ) {}

  async generatePracticeAnalysis(request: AnalysisRequest): Promise<PracticeAnalysisResult> {
    // Check credit balance (AI analysis costs 2 credits)
    await this.creditService.consumeCredits(request.practiceResult.userId, 'ai_analysis', 0);

    // Generate AI analysis
    const analysisPrompt = this.buildAnalysisPrompt(request);
    const model = this.openRouterService.selectModel(TaskType.LEVEL_ASSESSMENT, request.language);
    
    const response = await this.openRouterService.callAI(
      model,
      analysisPrompt.userPrompt,
      {
        systemPrompt: analysisPrompt.systemPrompt,
        userId: request.practiceResult.userId,
        language: request.language,
        type: 'practice_analysis'
      },
      request.practiceResult.userId
    );

    // Parse AI response
    const analysisData = this.parseAnalysisResponse(response.content);

    // Save analysis to database
    const analysisResult = await this.saveAnalysisResult({
      practiceResultId: request.practiceResult.id,
      userId: request.practiceResult.userId,
      analysisContent: analysisData.analysisContent,
      learningAdvice: analysisData.learningAdvice,
      strengthsIdentified: analysisData.strengthsIdentified,
      weaknessesIdentified: analysisData.weaknessesIdentified,
      improvementSuggestions: analysisData.improvementSuggestions,
      confidenceScore: analysisData.confidenceScore,
      aiModel: model,
      tokensUsed: (response as any).usage?.totalTokens
    });

    // Update user capability based on analysis
    await this.updateUserCapabilityFromAnalysis(request.practiceResult.userId, request.language, analysisData);

    return analysisResult;
  }

  async getAnalysisForPracticeResult(practiceResultId: string): Promise<PracticeAnalysisResult | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM practice_ai_analysis WHERE practice_result_id = $1',
        [practiceResultId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAnalysisResult(result.rows[0]);
    } catch (error) {
      console.error('Error getting analysis for practice result:', error);
      return null;
    }
  }

  async getUserAnalysisHistory(userId: string, limit: number = 10): Promise<PracticeAnalysisResult[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM practice_ai_analysis 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => this.mapRowToAnalysisResult(row));
    } catch (error) {
      console.error('Error getting user analysis history:', error);
      return [];
    }
  }

  private buildAnalysisPrompt(request: AnalysisRequest): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `你是一个专业的语言学习分析师。你需要分析用户的练习表现，提供详细的学习建议和能力评估。

分析要求：
1. 深入分析用户的答题表现，识别强项和弱项
2. 提供具体可行的学习建议
3. 评估用户在各个技能领域的表现
4. 给出改进建议和下一步学习计划
5. 所有分析和建议都必须用中文输出

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块
- 包含analysisContent（详细分析）、learningAdvice（学习建议）、strengthsIdentified（识别的强项）、weaknessesIdentified（识别的弱项）、improvementSuggestions（改进建议）、confidenceScore（置信度评分0-100）`;

    const correctAnswers = request.questions.filter(q => 
      request.userAnswers[q.id] === q.correctAnswer
    ).length;

    const incorrectQuestions = request.questions.filter(q => 
      request.userAnswers[q.id] !== q.correctAnswer
    );

    const userPrompt = `请分析以下练习表现：

练习基本信息：
- 总题数：${request.questions.length}
- 正确题数：${correctAnswers}
- 准确率：${request.practiceResult.accuracy}%
- 总用时：${Math.round(request.practiceResult.totalTime / 1000)}秒
- 平均每题用时：${Math.round(request.practiceResult.averageTimePerQuestion / 1000)}秒

错误题目详情：
${incorrectQuestions.map((q, index) => `
题目${index + 1}：${q.content}
用户答案：${request.userAnswers[q.id] || '未作答'}
正确答案：${q.correctAnswer}
涉及词汇：${q.vocabularyWords.join(', ')}
语法要点：${q.grammarPoints.join(', ')}
`).join('\n')}

当前识别的弱项：${request.practiceResult.weakAreas.join(', ')}
当前识别的强项：${request.practiceResult.improvedAreas.join(', ')}

请提供详细的学习分析和建议，格式如下：
{
  "analysisContent": "详细的表现分析，包括答题模式、时间分配、知识掌握情况等。请使用换行符\\n来分段，让内容更易读。例如：\\n\\n第一段分析内容...\\n\\n第二段分析内容...",
  "learningAdvice": "具体的学习建议和下一步学习计划。请使用换行符\\n来分段，让建议更清晰。例如：\\n\\n建议一：...\\n\\n建议二：...",
  "strengthsIdentified": ["识别出的强项1", "强项2"],
  "weaknessesIdentified": ["识别出的弱项1", "弱项2"],
  "improvementSuggestions": ["具体改进建议1", "建议2", "建议3"],
  "confidenceScore": 85
}

重要提示：
1. analysisContent和learningAdvice字段中请使用\\n\\n来分段，让内容更有层次感
2. 每个段落应该专注于一个主要观点
3. 使用具体的数据和例子来支持你的分析
4. 提供可操作的建议，而不是泛泛而谈`;

    return { systemPrompt, userPrompt };
  }

  private parseAnalysisResponse(content: string): any {
    try {
      // Clean the content to handle markdown code blocks
      let cleanContent = content.trim();
      
      // Remove markdown code block markers if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON from the response if it's embedded in text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanContent);
      
      // Validate structure
      if (!parsed.analysisContent || !parsed.learningAdvice) {
        throw new Error('Invalid analysis response structure');
      }

      return {
        analysisContent: parsed.analysisContent,
        learningAdvice: parsed.learningAdvice,
        strengthsIdentified: Array.isArray(parsed.strengthsIdentified) ? parsed.strengthsIdentified : [],
        weaknessesIdentified: Array.isArray(parsed.weaknessesIdentified) ? parsed.weaknessesIdentified : [],
        improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
        confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 75
      };
    } catch (error) {
      console.error('Failed to parse AI analysis response:', error);
      console.error('Raw content:', content);
      
      // Return fallback analysis
      return {
        analysisContent: '分析生成过程中出现问题，请稍后重试。',
        learningAdvice: '建议继续练习，重点关注错误的题目类型。',
        strengthsIdentified: ['基础理解能力'],
        weaknessesIdentified: ['需要更多练习'],
        improvementSuggestions: ['多做类似练习', '复习相关知识点'],
        confidenceScore: 50
      };
    }
  }

  private async saveAnalysisResult(data: Omit<PracticeAnalysisResult, 'id' | 'createdAt'>): Promise<PracticeAnalysisResult> {
    const id = uuidv4();
    const createdAt = new Date();

    const result = await this.db.query(`
      INSERT INTO practice_ai_analysis (
        id, practice_result_id, user_id, analysis_content, learning_advice,
        strengths_identified, weaknesses_identified, improvement_suggestions,
        confidence_score, ai_model, tokens_used, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id, data.practiceResultId, data.userId, data.analysisContent, data.learningAdvice,
      data.strengthsIdentified, data.weaknessesIdentified, data.improvementSuggestions,
      data.confidenceScore, data.aiModel, data.tokensUsed, createdAt
    ]);

    return this.mapRowToAnalysisResult(result.rows[0]);
  }

  private async updateUserCapabilityFromAnalysis(userId: string, language: Language, analysisData: any): Promise<void> {
    try {
      // Import UserCapabilityService to avoid circular dependency
      const { UserCapabilityService } = await import('./UserCapabilityService');
      const { AIService } = await import('./AIService');
      
      const aiService = new AIService(this.db);
      const userCapabilityService = new UserCapabilityService(this.db, aiService);

      // Get current capability
      const currentCapability = await userCapabilityService.getUserCapability(userId, language);
      if (!currentCapability) {
        console.warn('No user capability found for analysis update');
        return;
      }

      // Update strengths and weaknesses based on analysis
      const updates = {
        strengths: analysisData.strengthsIdentified,
        weaknesses: analysisData.weaknessesIdentified
      };

      await userCapabilityService.updateLearningCharacteristics(userId, language, updates);
    } catch (error) {
      console.error('Error updating user capability from analysis:', error);
    }
  }

  private mapRowToAnalysisResult(row: any): PracticeAnalysisResult {
    return {
      id: row.id,
      practiceResultId: row.practice_result_id,
      userId: row.user_id,
      analysisContent: row.analysis_content,
      learningAdvice: row.learning_advice,
      strengthsIdentified: row.strengths_identified || [],
      weaknessesIdentified: row.weaknesses_identified || [],
      improvementSuggestions: row.improvement_suggestions || [],
      confidenceScore: row.confidence_score,
      aiModel: row.ai_model,
      tokensUsed: row.tokens_used,
      createdAt: row.created_at
    };
  }
}