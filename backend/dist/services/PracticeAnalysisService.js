"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeAnalysisService = void 0;
const uuid_1 = require("uuid");
const openrouter_1 = require("../types/openrouter");
class PracticeAnalysisService {
    constructor(db, openRouterService, creditService) {
        this.db = db;
        this.openRouterService = openRouterService;
        this.creditService = creditService;
    }
    async generatePracticeAnalysis(request) {
        await this.creditService.consumeCredits(request.practiceResult.userId, 'ai_analysis', 0);
        const analysisPrompt = this.buildAnalysisPrompt(request);
        const model = this.openRouterService.selectModel(openrouter_1.TaskType.LEVEL_ASSESSMENT, request.language);
        const response = await this.openRouterService.callAI(model, analysisPrompt.userPrompt, {
            systemPrompt: analysisPrompt.systemPrompt,
            userId: request.practiceResult.userId,
            language: request.language,
            type: 'practice_analysis'
        }, request.practiceResult.userId);
        const analysisData = this.parseAnalysisResponse(response.content);
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
            tokensUsed: response.usage?.totalTokens
        });
        await this.updateUserCapabilityFromAnalysis(request.practiceResult.userId, request.language, analysisData);
        return analysisResult;
    }
    async getAnalysisForPracticeResult(practiceResultId) {
        try {
            const result = await this.db.query('SELECT * FROM practice_ai_analysis WHERE practice_result_id = $1', [practiceResultId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToAnalysisResult(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting analysis for practice result:', error);
            return null;
        }
    }
    async getUserAnalysisHistory(userId, limit = 10) {
        try {
            const result = await this.db.query(`SELECT * FROM practice_ai_analysis 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`, [userId, limit]);
            return result.rows.map(row => this.mapRowToAnalysisResult(row));
        }
        catch (error) {
            console.error('Error getting user analysis history:', error);
            return [];
        }
    }
    buildAnalysisPrompt(request) {
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
        const correctAnswers = request.questions.filter(q => request.userAnswers[q.id] === q.correctAnswer).length;
        const incorrectQuestions = request.questions.filter(q => request.userAnswers[q.id] !== q.correctAnswer);
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
    parseAnalysisResponse(content) {
        try {
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            }
            else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanContent = jsonMatch[0];
            }
            const parsed = JSON.parse(cleanContent);
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
        }
        catch (error) {
            console.error('Failed to parse AI analysis response:', error);
            console.error('Raw content:', content);
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
    async saveAnalysisResult(data) {
        const id = (0, uuid_1.v4)();
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
    async updateUserCapabilityFromAnalysis(userId, language, analysisData) {
        try {
            const { UserCapabilityService } = await Promise.resolve().then(() => __importStar(require('./UserCapabilityService')));
            const { AIService } = await Promise.resolve().then(() => __importStar(require('./AIService')));
            const aiService = new AIService(this.db);
            const userCapabilityService = new UserCapabilityService(this.db, aiService);
            const currentCapability = await userCapabilityService.getUserCapability(userId, language);
            if (!currentCapability) {
                console.warn('No user capability found for analysis update');
                return;
            }
            const updates = {
                strengths: analysisData.strengthsIdentified,
                weaknesses: analysisData.weaknessesIdentified
            };
            await userCapabilityService.updateLearningCharacteristics(userId, language, updates);
        }
        catch (error) {
            console.error('Error updating user capability from analysis:', error);
        }
    }
    mapRowToAnalysisResult(row) {
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
exports.PracticeAnalysisService = PracticeAnalysisService;
//# sourceMappingURL=PracticeAnalysisService.js.map