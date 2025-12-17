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
        const analysisPrompt = await this.buildAnalysisPrompt(request);
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
            capabilityChanges: analysisData.capabilityChanges,
            overallProgressDirection: analysisData.overallProgressDirection,
            progressMessage: analysisData.progressMessage,
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
    async buildAnalysisPrompt(request) {
        const currentCapability = await this.getUserCurrentCapability(request.practiceResult.userId, request.language);
        const systemPrompt = `你是一个专业的语言学习分析师。你需要分析用户的练习表现，评估能力变化，并提供学习建议。

CRITICAL JSON FORMAT REQUIREMENTS:
1. 你必须只返回一个有效的JSON对象，不要包含任何其他文本
2. 不要使用markdown代码块标记
3. 字符串值中不能包含未转义的换行符、引号或特殊字符
4. 所有字符串必须在一行内，使用空格代替换行
5. 数组元素必须是简短的字符串，不超过20个字符

CAPABILITY ASSESSMENT RULES:
- 根据练习表现评估用户在各技能领域的能力变化
- capabilityChanges中每个技能的变化值范围：-10到+10
- 正值表示进步，负值表示退步，0表示维持
- 综合评估overallProgressDirection：improved/maintained/declined
- progressMessage要给用户明确的成就感或改进提示

JSON SCHEMA:
{
  "analysisContent": "string - 详细分析，不超过200字",
  "learningAdvice": "string - 学习建议，不超过200字", 
  "strengthsIdentified": ["string1", "string2"] - 最多3个元素，每个不超过10字,
  "weaknessesIdentified": ["string1", "string2"] - 最多3个元素，每个不超过10字,
  "improvementSuggestions": ["string1", "string2", "string3"] - 最多3个元素，每个不超过15字,
  "confidenceScore": number - 0到100之间的整数,
  "capabilityChanges": {
    "vocabulary": number - -10到+10的变化值,
    "grammar": number - -10到+10的变化值,
    "listening": number - -10到+10的变化值,
    "speaking": number - -10到+10的变化值,
    "reading": number - -10到+10的变化值,
    "writing": number - -10到+10的变化值
  },
  "overallProgressDirection": "improved/maintained/declined",
  "progressMessage": "string - 给用户的进步/退步提示，不超过100字"
}`;
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

用户当前能力水平参考：
- 词汇能力：${currentCapability?.vocabularyLevel || 50}分
- 语法能力：${currentCapability?.grammarLevel || 50}分  
- 听力能力：${currentCapability?.listeningLevel || 50}分
- 口语能力：${currentCapability?.speakingLevel || 50}分
- 阅读能力：${currentCapability?.readingLevel || 50}分
- 写作能力：${currentCapability?.writingLevel || 50}分

请严格按照JSON格式返回分析结果，包含能力变化评估：

{"analysisContent":"用户准确率${request.practiceResult.accuracy}%，基于当前表现分析能力变化","learningAdvice":"根据练习结果提供针对性建议","strengthsIdentified":["识别强项"],"weaknessesIdentified":["识别弱项"],"improvementSuggestions":["改进建议"],"confidenceScore":75,"capabilityChanges":{"vocabulary":2,"grammar":-1,"listening":0,"speaking":1,"reading":1,"writing":0},"overallProgressDirection":"improved","progressMessage":"恭喜！您在词汇和阅读方面有明显进步，继续保持！"}

CRITICAL RULES:
1. 只返回JSON对象，不要任何解释文字
2. 根据练习表现合理评估能力变化（-10到+10）
3. progressMessage要给用户明确的激励或改进提示
4. overallProgressDirection要准确反映整体趋势
5. 确保JSON语法完全正确`;
        return { systemPrompt, userPrompt };
    }
    async getUserCurrentCapability(userId, language) {
        try {
            const result = await this.db.query(`SELECT listening_level, speaking_level, reading_level, writing_level,
                estimated_vocabulary_size, confidence_score
         FROM user_capabilities 
         WHERE user_id = $1 AND language = $2`, [userId, language]);
            if (result.rows.length === 0) {
                return {
                    vocabularyLevel: 50,
                    grammarLevel: 50,
                    listeningLevel: 50,
                    speakingLevel: 50,
                    readingLevel: 50,
                    writingLevel: 50
                };
            }
            const row = result.rows[0];
            return {
                vocabularyLevel: Math.min(row.estimated_vocabulary_size / 10, 100) || 50,
                grammarLevel: row.confidence_score || 50,
                listeningLevel: row.listening_level || 50,
                speakingLevel: row.speaking_level || 50,
                readingLevel: row.reading_level || 50,
                writingLevel: row.writing_level || 50
            };
        }
        catch (error) {
            console.error('Error getting user current capability:', error);
            return {
                vocabularyLevel: 50,
                grammarLevel: 50,
                listeningLevel: 50,
                speakingLevel: 50,
                readingLevel: 50,
                writingLevel: 50
            };
        }
    }
    cleanJsonString(jsonStr) {
        let cleaned = jsonStr.trim();
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }
        cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
        cleaned = cleaned.replace(/"([^"]*)\r([^"]*)"/g, '"$1 $2"');
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        cleaned = cleaned.replace(/\\\\n/g, ' ');
        return cleaned;
    }
    parseAnalysisResponse(content) {
        console.log('Raw AI response length:', content.length);
        console.log('Raw AI response preview:', content.substring(0, 300));
        try {
            let cleanContent = this.cleanJsonString(content);
            console.log('Cleaned JSON:', cleanContent);
            const parsed = JSON.parse(cleanContent);
            const result = {
                analysisContent: this.sanitizeString(parsed.analysisContent) || '练习表现分析生成中遇到问题',
                learningAdvice: this.sanitizeString(parsed.learningAdvice) || '建议继续练习，重点关注错误的题目类型',
                strengthsIdentified: this.sanitizeArray(parsed.strengthsIdentified, ['基础理解']),
                weaknessesIdentified: this.sanitizeArray(parsed.weaknessesIdentified, ['需要练习']),
                improvementSuggestions: this.sanitizeArray(parsed.improvementSuggestions, ['多做练习', '复习知识点']),
                confidenceScore: this.sanitizeScore(parsed.confidenceScore),
                capabilityChanges: this.sanitizeCapabilityChanges(parsed.capabilityChanges),
                overallProgressDirection: this.sanitizeProgressDirection(parsed.overallProgressDirection),
                progressMessage: this.sanitizeString(parsed.progressMessage) || '继续努力，保持学习热情！'
            };
            console.log('Successfully parsed and sanitized AI analysis');
            return result;
        }
        catch (error) {
            console.error('JSON parsing failed:', error);
            console.error('Attempted to parse:', content.substring(0, 500));
            return this.getFallbackAnalysis();
        }
    }
    sanitizeString(value) {
        if (typeof value !== 'string')
            return '';
        return value.replace(/[\r\n\t]/g, ' ').replace(/"/g, '\\"').substring(0, 500);
    }
    sanitizeArray(value, fallback) {
        if (!Array.isArray(value))
            return fallback;
        return value
            .filter(item => typeof item === 'string')
            .map(item => this.sanitizeString(item).substring(0, 50))
            .slice(0, 5)
            .filter(item => item.length > 0);
    }
    sanitizeScore(value) {
        const score = Number(value);
        if (isNaN(score))
            return 75;
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    sanitizeCapabilityChanges(value) {
        const defaultChanges = {
            vocabulary: 0,
            grammar: 0,
            listening: 0,
            speaking: 0,
            reading: 0,
            writing: 0
        };
        if (!value || typeof value !== 'object')
            return defaultChanges;
        const result = { ...defaultChanges };
        Object.keys(defaultChanges).forEach(skill => {
            if (typeof value[skill] === 'number') {
                result[skill] = Math.max(-10, Math.min(10, Math.round(value[skill])));
            }
        });
        return result;
    }
    sanitizeProgressDirection(value) {
        if (value === 'improved' || value === 'maintained' || value === 'declined') {
            return value;
        }
        return 'maintained';
    }
    getFallbackAnalysis() {
        return {
            analysisContent: '系统正在优化AI分析功能，暂时无法提供详细分析',
            learningAdvice: '建议继续练习，重点关注错误的题目类型，系统将持续改进',
            strengthsIdentified: ['基础理解'],
            weaknessesIdentified: ['需要练习'],
            improvementSuggestions: ['多做练习', '复习知识点'],
            confidenceScore: 75,
            capabilityChanges: {
                vocabulary: 0,
                grammar: 0,
                listening: 0,
                speaking: 0,
                reading: 0,
                writing: 0
            },
            overallProgressDirection: 'maintained',
            progressMessage: '继续努力，保持学习热情！'
        };
    }
    async saveAnalysisResult(data) {
        const id = (0, uuid_1.v4)();
        const createdAt = new Date();
        const result = await this.db.query(`
      INSERT INTO practice_ai_analysis (
        id, practice_result_id, user_id, analysis_content, learning_advice,
        strengths_identified, weaknesses_identified, improvement_suggestions,
        confidence_score, capability_changes, overall_progress_direction, 
        progress_message, ai_model, tokens_used, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
            id, data.practiceResultId, data.userId, data.analysisContent, data.learningAdvice,
            data.strengthsIdentified, data.weaknessesIdentified, data.improvementSuggestions,
            data.confidenceScore, JSON.stringify(data.capabilityChanges), data.overallProgressDirection,
            data.progressMessage, data.aiModel, data.tokensUsed, createdAt
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
            const capabilityChanges = analysisData.capabilityChanges || {};
            const updates = {};
            if (capabilityChanges.vocabulary !== 0) {
                const currentVocabScore = Math.min(currentCapability.estimatedVocabularySize / 10, 100) || 50;
                updates.estimatedVocabularySize = Math.max(0, Math.min(1000, (currentVocabScore + capabilityChanges.vocabulary) * 10));
            }
            if (capabilityChanges.grammar !== 0) {
                updates.confidenceScore = Math.max(0, Math.min(100, (currentCapability.confidenceScore || 50) + capabilityChanges.grammar));
            }
            if (capabilityChanges.listening !== 0) {
                updates.listeningLevel = Math.max(0, Math.min(100, (currentCapability.listeningLevel || 50) + capabilityChanges.listening));
            }
            if (capabilityChanges.speaking !== 0) {
                updates.speakingLevel = Math.max(0, Math.min(100, (currentCapability.speakingLevel || 50) + capabilityChanges.speaking));
            }
            if (capabilityChanges.reading !== 0) {
                updates.readingLevel = Math.max(0, Math.min(100, (currentCapability.readingLevel || 50) + capabilityChanges.reading));
            }
            if (capabilityChanges.writing !== 0) {
                updates.writingLevel = Math.max(0, Math.min(100, (currentCapability.writingLevel || 50) + capabilityChanges.writing));
            }
            updates.strengths = analysisData.strengthsIdentified;
            updates.weaknesses = analysisData.weaknessesIdentified;
            if (Object.keys(updates).length > 0) {
                await userCapabilityService.updateUserCapability(userId, language, updates);
                console.log('Successfully applied capability changes:', capabilityChanges);
            }
            await userCapabilityService.updateLearningCharacteristics(userId, language, {
                strengths: Array.isArray(analysisData.strengthsIdentified) ? analysisData.strengthsIdentified : [],
                weaknesses: Array.isArray(analysisData.weaknessesIdentified) ? analysisData.weaknessesIdentified : []
            });
            console.log('Successfully updated user capability from analysis');
        }
        catch (error) {
            console.error('Error updating user capability from analysis:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
                console.warn('Database schema issue detected. Skipping capability update but analysis will still be saved.');
            }
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
            capabilityChanges: this.parseJsonField(row.capability_changes, {
                vocabulary: 0,
                grammar: 0,
                listening: 0,
                speaking: 0,
                reading: 0,
                writing: 0
            }),
            overallProgressDirection: row.overall_progress_direction || 'maintained',
            progressMessage: row.progress_message || '继续努力！',
            aiModel: row.ai_model,
            tokensUsed: row.tokens_used,
            createdAt: row.created_at
        };
    }
    parseJsonField(field, defaultValue) {
        if (!field)
            return defaultValue;
        if (typeof field === 'object' && field !== null) {
            return field;
        }
        if (typeof field === 'string') {
            try {
                return JSON.parse(field);
            }
            catch (error) {
                console.warn('Failed to parse JSON field:', field, error);
                return defaultValue;
            }
        }
        return defaultValue;
    }
}
exports.PracticeAnalysisService = PracticeAnalysisService;
//# sourceMappingURL=PracticeAnalysisService.js.map