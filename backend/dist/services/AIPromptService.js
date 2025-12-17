"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiPromptService = exports.AIPromptService = void 0;
const openrouter_1 = require("../types/openrouter");
class AIPromptService {
    constructor() {
        this.promptTemplates = new Map();
        this.initializePromptTemplates();
    }
    initializePromptTemplates() {
        this.promptTemplates.set('material_analysis', {
            id: 'material_analysis',
            taskType: openrouter_1.TaskType.MATERIAL_ANALYSIS,
            systemPrompt: `你是一个专业的语言学习材料分析助手。你的任务是分析用户上传的学习材料，提取其中的词汇、语法点和学习要点。

分析要求：
1. 识别并提取所有重要词汇，包括单词、短语和习语
2. 识别语法结构和语法点
3. 评估材料的难度级别（A1-C2）
4. 提供学习建议和重点

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含vocabulary（词汇列表）、grammar（语法点）、difficulty（难度）、suggestions（学习建议）字段`,
            userPromptTemplate: `请分析以下{language}学习材料：

材料内容：
{content}

用户当前水平：{userLevel}

请提取词汇、语法点，评估难度，并提供个性化学习建议。`,
            parameters: ['language', 'content', 'userLevel'],
            description: '分析学习材料，提取词汇和语法点'
        });
        this.promptTemplates.set('exercise_generation', {
            id: 'exercise_generation',
            taskType: openrouter_1.TaskType.EXERCISE_GENERATION,
            systemPrompt: `你是一个专业的语言学习练习生成器。你需要根据用户的水平和学习需求生成高质量的练习题。

生成要求：
1. 每个练习组必须包含正好10个题目
2. 题目必须以选择题形式呈现，包含4个选项（A、B、C、D）
3. 题目难度要适合用户当前水平
4. 涵盖重要词汇、语法点和语言应用场景
5. 每题必须提供详细的答案解析和知识点扩展

重要：无论学习什么语言，所有的题目解析（explanation字段）都必须用中文输出，以便中国用户理解。

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含title、description、questions数组
- 每个question包含：content、options、correctAnswer、explanation（必须用中文）、vocabularyWords、grammarPoints`,
            userPromptTemplate: `请为{language}学习者生成一个练习组：

用户水平：{userLevel}
练习类型：{practiceType}
重点词汇：{focusVocabulary}
重点语法：{focusGrammar}
练习主题：{topic}

请生成10个选择题，确保题目质量高且适合用户水平。`,
            parameters: ['language', 'userLevel', 'practiceType', 'focusVocabulary', 'focusGrammar', 'topic'],
            description: '生成个性化语言练习题组'
        });
        this.promptTemplates.set('daily_recommendation', {
            id: 'daily_recommendation',
            taskType: openrouter_1.TaskType.LEVEL_ASSESSMENT,
            systemPrompt: `你是一个专业的语言学习顾问。基于用户的学习数据，为用户生成个性化的每日学习建议。

建议生成要求：
1. 分析用户的能力评估、里程碑进度、生词表状态
2. 识别用户的强项和弱项
3. 提供具体可行的学习建议
4. 推荐合适的快捷练习选项
5. 建议要个性化且具有可操作性

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含recommendations数组和quickPracticeOptions数组
- 每个recommendation包含：type、title、description、priority、focusAreas、suggestedActivities、estimatedTime
- 每个quickPracticeOption包含：title、description、type、estimatedQuestions、estimatedTime、focusAreas`,
            userPromptTemplate: `请为{language}学习者生成今日学习建议：

用户能力评估：
- 听力水平：{listeningLevel}/100
- 口语水平：{speakingLevel}/100  
- 阅读水平：{readingLevel}/100
- 写作水平：{writingLevel}/100
- 词汇掌握：{vocabularySize}个单词
- 语法掌握：{grammarScore}/100

里程碑进度：{milestoneProgress}

生词表状态：
- 学习中单词：{learningWords}个
- 需要复习单词：{reviewWords}个

最近练习表现：{recentPerformance}

请生成3-5个个性化学习建议和2-3个快捷练习选项。`,
            parameters: ['language', 'listeningLevel', 'speakingLevel', 'readingLevel', 'writingLevel',
                'vocabularySize', 'grammarScore', 'milestoneProgress', 'learningWords',
                'reviewWords', 'recentPerformance'],
            description: '生成个性化每日学习建议'
        });
        this.promptTemplates.set('capability_assessment', {
            id: 'capability_assessment',
            taskType: openrouter_1.TaskType.LEVEL_ASSESSMENT,
            systemPrompt: `你是一个专业的语言能力评估专家。基于用户的学习数据和表现，对其语言能力进行综合评估。

评估要求：
1. 基于聊天记录、练习表现、词汇掌握等数据进行综合分析
2. 评估听说读写四项技能（0-100分制）
3. 确定整体语言水平（A1-C2）
4. 识别强项和弱项
5. 提供具体的改进建议

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含overallLevel、confidenceScore、skillScores、strengths、weaknesses、recommendations`,
            userPromptTemplate: `请评估{language}学习者的语言能力：

聊天记录分析：{chatAnalysis}
练习表现数据：{practicePerformance}
词汇掌握情况：{vocabularyMastery}
用户自述水平：{selfReportedLevel}
学习时长：{studyTime}天

请提供详细的能力评估报告，包含四项技能评分和改进建议。`,
            parameters: ['language', 'chatAnalysis', 'practicePerformance', 'vocabularyMastery',
                'selfReportedLevel', 'studyTime'],
            description: '综合评估用户语言能力'
        });
        this.promptTemplates.set('intent_recognition', {
            id: 'intent_recognition',
            taskType: openrouter_1.TaskType.INTENT_RECOGNITION,
            systemPrompt: `你是一个智能意图识别助手。你需要理解用户消息中的操作意图，并判断是否涉及隐私敏感操作。

意图类别：
- generate_practice: 生成练习
- check_progress: 查看学习进度
- view_vocabulary: 查看生词表
- check_credits: 查看余额
- view_statistics: 查看统计信息
- start_pk_match: 开始PK匹配
- language_learning: 语言学习对话
- account_management: 账户管理（隐私敏感）
- payment_operations: 支付操作（隐私敏感）

隐私保护原则：
- 涉及密码、账户信息、支付等操作必须标记为隐私敏感
- 隐私敏感操作应该拒绝执行

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含intent、confidence、parameters、isPrivacySensitive、requiresConfirmation字段`,
            userPromptTemplate: `请分析用户消息的意图：

用户消息："{userMessage}"
用户语言：{language}
对话上下文：{context}

请识别用户的操作意图，提取相关参数，并判断是否涉及隐私敏感操作。`,
            parameters: ['userMessage', 'language', 'context'],
            description: '识别用户对话中的功能操作意图'
        });
        this.promptTemplates.set('vocabulary_extraction', {
            id: 'vocabulary_extraction',
            taskType: openrouter_1.TaskType.VOCABULARY_EXTRACTION,
            systemPrompt: `你是一个专业的词汇提取助手。从用户上传的内容中识别并提取所有有价值的学习词汇。

提取要求：
1. 识别所有单词、短语和习语
2. 过滤掉过于简单的基础词汇（如a、the、is等）
3. 为每个词汇提供定义、词性和难度评级
4. 按重要性和学习价值排序

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含vocabulary数组
- 每个词汇包含：word、definition、partOfSpeech、difficulty、frequency、examples`,
            userPromptTemplate: `请从以下{language}内容中提取学习词汇：

内容：{content}
用户水平：{userLevel}

请提取所有有学习价值的词汇，并提供详细信息。`,
            parameters: ['language', 'content', 'userLevel'],
            description: '从内容中提取学习词汇'
        });
        this.promptTemplates.set('conversation_learning', {
            id: 'conversation_learning',
            taskType: openrouter_1.TaskType.CONVERSATION,
            systemPrompt: `你是一个专业的语言学习助手。通过自然对话帮助用户练习和提高语言能力。

对话原则：
1. 根据用户水平调整语言复杂度
2. 在对话中自然地纠正用户的错误
3. 鼓励用户多说多练
4. 提供实用的语言表达和文化背景
5. 保持对话的趣味性和教育性

回复要求：
- 使用目标语言进行对话
- 适当时提供语法解释和词汇扩展
- 鼓励用户继续对话`,
            userPromptTemplate: `用户信息：
- 学习语言：{language}
- 当前水平：{userLevel}
- 学习重点：{focusAreas}

用户消息：{userMessage}

请用{language}回复，并在适当时提供学习指导。`,
            parameters: ['language', 'userLevel', 'focusAreas', 'userMessage'],
            description: '进行语言学习对话'
        });
        this.promptTemplates.set('comprehensive_assessment', {
            id: 'comprehensive_assessment',
            taskType: openrouter_1.TaskType.EXERCISE_GENERATION,
            systemPrompt: `你是一个专业的综合评估练习生成器。基于用户的所有学习数据生成全面的评估练习。

生成要求：
1. 综合考虑用户的能力评估、里程碑进度、生词表状态
2. 生成10个选择题，涵盖听说读写各项技能
3. 题目难度要有梯度，既有巩固性题目也有挑战性题目
4. 重点测试用户的薄弱环节
5. 包含词汇、语法、阅读理解等多种题型

重要：无论学习什么语言，所有的题目解析（explanation字段）都必须用中文输出，以便中国用户理解。

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 每题包含详细解析和知识点说明（解析必须用中文）`,
            userPromptTemplate: `请为{language}学习者生成综合评估练习：

用户能力数据：
- 整体水平：{overallLevel}
- 听力：{listeningLevel}/100
- 口语：{speakingLevel}/100
- 阅读：{readingLevel}/100
- 写作：{writingLevel}/100

里程碑进度：{milestoneData}
生词表状态：{vocabularyData}
薄弱环节：{weaknesses}
强项：{strengths}

请生成一个全面的评估练习组，重点测试薄弱环节。`,
            parameters: ['language', 'overallLevel', 'listeningLevel', 'speakingLevel', 'readingLevel',
                'writingLevel', 'milestoneData', 'vocabularyData', 'weaknesses', 'strengths'],
            description: '生成基于用户全面数据的综合评估练习'
        });
    }
    getPromptTemplate(taskType, language) {
        if (language) {
            const languageSpecificKey = `${taskType}_${language}`;
            const template = this.promptTemplates.get(languageSpecificKey);
            if (template) {
                return template;
            }
        }
        const taskTypeMap = {
            [openrouter_1.TaskType.CONVERSATION]: 'conversation_learning',
            [openrouter_1.TaskType.MATERIAL_ANALYSIS]: 'material_analysis',
            [openrouter_1.TaskType.EXERCISE_GENERATION]: 'exercise_generation',
            [openrouter_1.TaskType.LEVEL_ASSESSMENT]: 'capability_assessment',
            [openrouter_1.TaskType.VOCABULARY_EXTRACTION]: 'vocabulary_extraction',
            [openrouter_1.TaskType.FUNCTION_CALLING]: 'comprehensive_assessment',
            [openrouter_1.TaskType.INTENT_RECOGNITION]: 'intent_recognition'
        };
        const templateKey = taskTypeMap[taskType];
        return this.promptTemplates.get(templateKey) || null;
    }
    generatePrompt(taskType, context, additionalParams = {}) {
        const template = this.getPromptTemplate(taskType, context.language);
        if (!template) {
            return null;
        }
        const allParams = { ...context, ...additionalParams };
        let userPrompt = template.userPromptTemplate;
        for (const param of template.parameters) {
            const value = allParams[param];
            if (value !== undefined) {
                const placeholder = `{${param}}`;
                userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), String(value));
            }
        }
        return {
            systemPrompt: template.systemPrompt,
            userPrompt
        };
    }
    generateDailyRecommendationPrompt(context) {
        return this.generatePrompt(openrouter_1.TaskType.LEVEL_ASSESSMENT, context, {
            templateOverride: 'daily_recommendation'
        });
    }
    generatePracticePrompt(context, practiceType, topic, focusVocabulary, focusGrammar) {
        return this.generatePrompt(openrouter_1.TaskType.EXERCISE_GENERATION, context, {
            practiceType,
            topic: topic || '综合练习',
            focusVocabulary: focusVocabulary?.join(', ') || '无特定重点',
            focusGrammar: focusGrammar?.join(', ') || '无特定重点'
        });
    }
    generateMaterialAnalysisPrompt(context, content) {
        return this.generatePrompt(openrouter_1.TaskType.MATERIAL_ANALYSIS, context, {
            content,
            userLevel: context.userLevel || 'B1'
        });
    }
    generateIntentRecognitionPrompt(userMessage, language, conversationContext) {
        return this.generatePrompt(openrouter_1.TaskType.INTENT_RECOGNITION, { language }, {
            userMessage,
            context: conversationContext || '无上下文'
        });
    }
    generateCapabilityAssessmentPrompt(context, assessmentData) {
        return this.generatePrompt(openrouter_1.TaskType.LEVEL_ASSESSMENT, context, {
            chatAnalysis: assessmentData.chatAnalysis || '无聊天记录',
            practicePerformance: assessmentData.practicePerformance || '无练习记录',
            vocabularyMastery: assessmentData.vocabularyMastery || '无词汇数据',
            selfReportedLevel: assessmentData.selfReportedLevel || '未知',
            studyTime: assessmentData.studyTime || 0
        });
    }
    getAllTemplates() {
        return Array.from(this.promptTemplates.values());
    }
    setPromptTemplate(template) {
        this.promptTemplates.set(template.id, template);
    }
    removePromptTemplate(templateId) {
        return this.promptTemplates.delete(templateId);
    }
}
exports.AIPromptService = AIPromptService;
exports.aiPromptService = new AIPromptService();
//# sourceMappingURL=AIPromptService.js.map