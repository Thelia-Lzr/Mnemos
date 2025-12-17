"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeQuestionService = void 0;
class PracticeQuestionService {
    constructor(db, openRouterService, creditService) {
        this.db = db;
        this.openRouterService = openRouterService;
        this.creditService = creditService;
    }
    async askQuestionFollowUp(request) {
        const creditCost = 1;
        await this.creditService.consumeCredits(request.userId, 'question_followup', creditCost);
        const prompt = this.generateQuestionFollowUpPrompt(request);
        try {
            const aiResponse = await this.openRouterService.callAI(process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o', prompt, {
                temperature: 0.7,
                max_tokens: 1000
            });
            const response = this.parseAIResponse(aiResponse.content);
            return {
                ...response,
                creditCost
            };
        }
        catch (error) {
            console.error('Error generating question follow-up:', error);
            throw new Error('Failed to generate AI response for question follow-up');
        }
    }
    async askQuestionFollowUpStream(request) {
        const creditCost = 1;
        await this.creditService.consumeCredits(request.userId, 'question_followup', creditCost);
        const prompt = this.generateQuestionFollowUpPrompt(request);
        try {
            const stream = await this.openRouterService.callAIStream(process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o', prompt, {
                temperature: 0.7,
                max_tokens: 1000
            });
            return {
                stream,
                creditCost
            };
        }
        catch (error) {
            console.error('Error generating question follow-up stream:', error);
            throw new Error('Failed to generate AI response for question follow-up');
        }
    }
    async askPracticeGroupFollowUp(request) {
        const creditCost = 1;
        await this.creditService.consumeCredits(request.userId, 'practice_followup', creditCost);
        const prompt = this.generatePracticeGroupFollowUpPrompt(request);
        try {
            const aiResponse = await this.openRouterService.callAI(process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o', prompt, {
                temperature: 0.7,
                max_tokens: 1200
            });
            const response = this.parseAIResponse(aiResponse.content);
            return {
                ...response,
                creditCost
            };
        }
        catch (error) {
            console.error('Error generating practice group follow-up:', error);
            throw new Error('Failed to generate AI response for practice group follow-up');
        }
    }
    async askPracticeGroupFollowUpStream(request) {
        const creditCost = 1;
        await this.creditService.consumeCredits(request.userId, 'practice_followup', creditCost);
        const prompt = this.generatePracticeGroupFollowUpPrompt(request);
        try {
            const stream = await this.openRouterService.callAIStream(process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o', prompt, {
                temperature: 0.7,
                max_tokens: 1200
            });
            return {
                stream,
                creditCost
            };
        }
        catch (error) {
            console.error('Error generating practice group follow-up stream:', error);
            throw new Error('Failed to generate AI response for practice group follow-up');
        }
    }
    generateQuestionFollowUpPrompt(request) {
        const languageName = this.getLanguageName(request.language);
        let contextInfo = `题目内容：${request.questionContent}\n`;
        if (request.options && request.options.length > 0) {
            contextInfo += `选项：\n${request.options.map((opt, idx) => `  ${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}\n`;
        }
        contextInfo += `正确答案：${request.correctAnswer}`;
        if (request.correctAnswerText) {
            contextInfo += ` (${request.correctAnswerText})`;
        }
        contextInfo += '\n';
        contextInfo += `学生答案：${request.userAnswer}`;
        if (request.userAnswerText && request.userAnswerText !== request.userAnswer) {
            contextInfo += ` (${request.userAnswerText})`;
        }
        contextInfo += '\n';
        if (request.explanation) {
            contextInfo += `题目解析：${request.explanation}\n`;
        }
        if (request.vocabularyWords && request.vocabularyWords.length > 0) {
            contextInfo += `涉及词汇：${request.vocabularyWords.join(', ')}\n`;
        }
        if (request.grammarPoints && request.grammarPoints.length > 0) {
            contextInfo += `语法要点：${request.grammarPoints.join(', ')}\n`;
        }
        return `作为一名专业的${languageName}语言学习导师，请回答学生关于以下练习题的追问。

题目详细信息：
${contextInfo}

学生的追问：${request.followUpQuestion}

请提供详细、有帮助的回答，包括：
1. 直接回答学生的问题
2. 分析学生的错误选择（如果答错了）
3. 相关的语言概念或知识点
4. 学习建议和技巧

请用中文回答，语言要通俗易懂，适合语言学习者理解。

回答格式要求：
- 主要回答：直接回答学生的问题
- 错误分析：如果学生答错，分析为什么会选择错误答案
- 相关概念：列出相关的语言知识点（如果有）
- 学习建议：提供具体的学习建议（如果适用）

请确保回答准确、有用，并且能够帮助学生更好地理解这个知识点。`;
    }
    generatePracticeGroupFollowUpPrompt(request) {
        const languageName = this.getLanguageName(request.language);
        let contextInfo = `练习标题：${request.practiceGroupTitle}\n`;
        contextInfo += `练习描述：${request.practiceGroupDescription}\n`;
        contextInfo += `总题数：${request.totalQuestions}\n`;
        contextInfo += `正确题数：${request.correctAnswers}\n`;
        contextInfo += `准确率：${request.accuracy}%\n`;
        if (request.wrongAnswers && request.wrongAnswers.length > 0) {
            contextInfo += `\n错题详情：\n`;
            request.wrongAnswers.forEach((wrongAnswer, index) => {
                contextInfo += `${index + 1}. ${wrongAnswer.questionContent}\n`;
                contextInfo += `   学生选择：${wrongAnswer.userChoice} (${wrongAnswer.userChoiceText})\n`;
                contextInfo += `   正确答案：${wrongAnswer.correctChoice} (${wrongAnswer.correctChoiceText})\n`;
                if (wrongAnswer.vocabularyWords && wrongAnswer.vocabularyWords.length > 0) {
                    contextInfo += `   涉及词汇：${wrongAnswer.vocabularyWords.join(', ')}\n`;
                }
                if (wrongAnswer.grammarPoints && wrongAnswer.grammarPoints.length > 0) {
                    contextInfo += `   语法要点：${wrongAnswer.grammarPoints.join(', ')}\n`;
                }
                if (wrongAnswer.explanation) {
                    contextInfo += `   解析：${wrongAnswer.explanation}\n`;
                }
                contextInfo += '\n';
            });
        }
        if (request.existingAnalysis) {
            contextInfo += `\n已有AI分析：\n${request.existingAnalysis}\n`;
        }
        return `作为一名专业的${languageName}语言学习导师，请回答学生关于整个练习组的追问。

练习组详细信息：
${contextInfo}

学生的追问：${request.followUpQuestion}

请提供全面、有针对性的回答，包括：
1. 直接回答学生的问题
2. 基于具体错题的详细分析
3. 针对错误模式的学习建议
4. 相关的学习资源或方法推荐

请用中文回答，语言要专业但易懂，适合语言学习者理解。

回答格式要求：
- 主要回答：直接回答学生的问题
- 错题分析：基于具体错题的详细分析（如果有错题）
- 学习建议：提供具体的改进建议和学习方法
- 推荐资源：相关的学习资源或练习方法（如果适用）

请确保回答有针对性，能够帮助学生提高语言学习效果。`;
    }
    parseAIResponse(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    answer: parsed.answer || content,
                    relatedConcepts: parsed.relatedConcepts || [],
                    additionalTips: parsed.additionalTips || []
                };
            }
        }
        catch (error) {
        }
        const sections = this.extractSections(content);
        return {
            answer: sections.mainAnswer || content,
            relatedConcepts: sections.concepts || [],
            additionalTips: sections.tips || []
        };
    }
    extractSections(content) {
        const sections = {};
        const mainAnswerMatch = content.match(/主要回答[：:]\s*([\s\S]*?)(?=相关概念|学习建议|$)/);
        if (mainAnswerMatch) {
            sections.mainAnswer = mainAnswerMatch[1].trim();
        }
        const conceptsMatch = content.match(/相关概念[：:]\s*([\s\S]*?)(?=学习建议|$)/);
        if (conceptsMatch) {
            sections.concepts = conceptsMatch[1]
                .split(/[,，\n]/)
                .map(c => c.trim())
                .filter(c => c.length > 0);
        }
        const tipsMatch = content.match(/学习建议[：:]\s*([\s\S]*?)$/);
        if (tipsMatch) {
            sections.tips = tipsMatch[1]
                .split(/[,，\n]/)
                .map(t => t.trim())
                .filter(t => t.length > 0);
        }
        return sections;
    }
    getLanguageName(language) {
        const languageNames = {
            'en': '英语',
            'ja': '日语',
            'fr': '法语',
            'de': '德语',
            'es': '西班牙语',
            'ko': '韩语'
        };
        return languageNames[language] || '外语';
    }
}
exports.PracticeQuestionService = PracticeQuestionService;
//# sourceMappingURL=PracticeQuestionService.js.map