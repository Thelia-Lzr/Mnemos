import { TaskType, Language } from '../types/openrouter';

export interface PromptTemplate {
  id: string;
  taskType: TaskType;
  language?: Language;
  systemPrompt: string;
  userPromptTemplate: string;
  parameters: string[];
  description: string;
}

export interface PromptContext {
  userId?: string;
  language: Language;
  userLevel?: string;
  userCapabilities?: any;
  vocabulary?: string[];
  milestones?: any[];
  practiceHistory?: any[];
  [key: string]: any;
}

export class AIPromptService {
  private promptTemplates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializePromptTemplates();
  }

  private initializePromptTemplates(): void {
    // 材料分析提示词 - 用于分析上传的学习材料
    this.promptTemplates.set('material_analysis', {
      id: 'material_analysis',
      taskType: TaskType.MATERIAL_ANALYSIS,
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

    // 练习生成提示词 - 生成个性化练习题
    this.promptTemplates.set('exercise_generation', {
      id: 'exercise_generation',
      taskType: TaskType.EXERCISE_GENERATION,
      systemPrompt: `你是一个专业的语言学习练习生成器。你需要根据用户的水平和学习需求生成高质量的练习题。

CRITICAL LANGUAGE REQUIREMENTS:
1. 题目内容（content）必须严格使用用户正在学习的目标语言
2. 选项（options）必须严格使用用户正在学习的目标语言
3. 只有在AI认为用户需要理解题目含义时，才可以在题目后用括号添加中文提示
4. 解析（explanation）必须用中文详细说明，包含语法解释、词汇分析、语言点扩展

🚨🚨🚨 CRITICAL: ANSWER ACCURACY VERIFICATION 🚨🚨🚨
⚠️ MANDATORY VERIFICATION FOR EVERY QUESTION:
1. ✓ VERIFY the factual correctness of your answer before marking correctAnswer field
2. ✓ DOUBLE-CHECK that correctAnswer field (A/B/C/D) points to the option with factually correct information
3. ✓ ENSURE your explanation clearly states why that specific answer is correct
4. ✓ NO contradiction between correctAnswer and explanation - they MUST be consistent!
5. ✓ If unsure about factual accuracy, generate a different question instead

生成要求：
1. 每个练习组必须包含正好10个题目
2. 题目必须以选择题形式呈现，包含4个选项（A、B、C、D）
3. 题目难度要适合用户当前水平
4. 涵盖重要词汇、语法点和语言应用场景
5. 每题必须提供详细的答案解析和知识点扩展

LANGUAGE USAGE EXAMPLES:
- 学习法语：题目用法语 "Où est la bibliothèque?"，选项用法语，解析用中文详细说明
- 学习英语：题目用英语 "Where is the library?"，选项用英语，解析用中文详细说明
- 学习德语：题目用德语 "Wo ist die Bibliothek?"，选项用德语，解析用中文详细说明

DETAILED EXPLANATION REQUIREMENTS:
解析必须包含：
1. 正确答案的详细语法分析
2. 重点词汇的含义和用法
3. 语法结构的解释和例句
4. 错误选项的分析说明
5. 相关语言点的扩展知识
6. 实际应用场景和例句

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含title、description、questions数组
- 每个question包含：content（目标语言）、options（目标语言）、correctAnswer、explanation（中文详细解析）、vocabularyWords、grammarPoints`,
      userPromptTemplate: `请为{language}学习者生成一个练习组：

用户水平：{userLevel}
练习类型：{practiceType}
重点词汇：{focusVocabulary}
重点语法：{focusGrammar}
练习主题：{topic}

CRITICAL REQUIREMENTS:
1. 题目和选项必须严格使用{language}语言
2. 只有在初学者需要理解时才在题目后添加中文提示
3. 解析必须用中文详细说明，包含语法分析、词汇解释、语言点扩展
4. 每个解析至少包含100字的详细说明
5. ⚠️ 最重要：correctAnswer字段必须指向事实上正确的答案，解析必须明确说明为什么该答案正确
6. ⚠️ 严禁答案标记与解析说明相互矛盾！

请生成10个高质量选择题，确保语言使用正确且解析详细。`,
      parameters: ['language', 'userLevel', 'practiceType', 'focusVocabulary', 'focusGrammar', 'topic'],
      description: '生成个性化语言练习题组'
    });

    // 每日建议生成提示词
    this.promptTemplates.set('daily_recommendation', {
      id: 'daily_recommendation',
      taskType: TaskType.LEVEL_ASSESSMENT,
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

    // 能力评估提示词
    this.promptTemplates.set('capability_assessment', {
      id: 'capability_assessment',
      taskType: TaskType.LEVEL_ASSESSMENT,
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

    // 意图识别提示词 - 理解用户对话中的功能请求
    this.promptTemplates.set('intent_recognition', {
      id: 'intent_recognition',
      taskType: TaskType.INTENT_RECOGNITION,
      systemPrompt: `你是一个智能意图识别助手。你需要理解用户消息中的操作意图，并判断是否涉及隐私敏感操作。

意图类别：
- generate_practice: 生成练习（用户想要创建练习题）
- view_practice_history: 查看练习历史
- start_practice: 开始练习
- check_progress: 查看学习进度
- view_capabilities: 查看能力评估
- view_vocabulary: 查看生词表
- add_vocabulary: 添加生词
- start_pk_match: 开始PK匹配
- check_credits: 查看余额
- view_statistics: 查看统计信息
- language_learning: 语言学习对话
- material_analysis: 材料分析
- account_management: 账户管理（隐私敏感）
- payment_operations: 支付操作（隐私敏感）

练习生成参数提取：
当意图为generate_practice时，需要从用户消息中提取以下参数：
- type: 练习类型（vocabulary/grammar/comprehensive/general）
- difficulty: 难度（beginner/intermediate/advanced）
- language: 目标语言（en/fr/ja等）
- focusAreas: 重点领域数组
- vocabularyWords: 特定词汇数组
- grammarPoints: 语法点数组
- count: 题目数量
- topic: 练习主题

隐私保护原则：
- 涉及密码、账户信息、支付等操作必须标记为隐私敏感
- 隐私敏感操作应该拒绝执行

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 包含intent、confidence、parameters、isPrivacySensitive、requiresConfirmation字段
- parameters对象应包含从用户消息中提取的所有相关参数`,
      userPromptTemplate: `请分析用户消息的意图：

用户消息："{userMessage}"
用户语言：{language}
对话上下文：{context}

请识别用户的操作意图，提取相关参数，并判断是否涉及隐私敏感操作。

示例输出格式：
{
  "intent": "generate_practice",
  "confidence": 0.9,
  "parameters": {
    "type": "vocabulary",
    "difficulty": "intermediate",
    "language": "fr",
    "topic": "购物场景",
    "focusAreas": ["vocabulary", "conversation"],
    "count": 10
  },
  "isPrivacySensitive": false,
  "requiresConfirmation": false
}`,
      parameters: ['userMessage', 'language', 'context'],
      description: '识别用户对话中的功能操作意图'
    });

    // 词汇提取提示词
    this.promptTemplates.set('vocabulary_extraction', {
      id: 'vocabulary_extraction',
      taskType: TaskType.VOCABULARY_EXTRACTION,
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

    // 对话学习提示词
    this.promptTemplates.set('conversation_learning', {
      id: 'conversation_learning',
      taskType: TaskType.CONVERSATION,
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

    // 综合评估练习生成提示词
    this.promptTemplates.set('comprehensive_assessment', {
      id: 'comprehensive_assessment',
      taskType: TaskType.EXERCISE_GENERATION,
      systemPrompt: `你是一个专业的综合评估练习生成器。基于用户的所有学习数据生成全面的评估练习。

CRITICAL LANGUAGE REQUIREMENTS:
1. 题目内容（content）必须严格使用用户正在学习的目标语言
2. 选项（options）必须严格使用用户正在学习的目标语言
3. 只有在AI认为用户需要理解题目含义时，才可以在题目后用括号添加中文提示
4. 解析（explanation）必须用中文详细说明，包含深入的语法解释、词汇分析、语言点扩展

生成要求：
1. 综合考虑用户的能力评估、里程碑进度、生词表状态
2. 生成10个选择题，涵盖听说读写各项技能
3. 题目难度要有梯度，既有巩固性题目也有挑战性题目
4. 重点测试用户的薄弱环节
5. 包含词汇、语法、阅读理解等多种题型

DETAILED EXPLANATION REQUIREMENTS:
解析必须包含：
1. 正确答案的深入语法分析和语言学解释
2. 重点词汇的词源、变位、搭配用法
3. 语法结构的详细解释和多个例句
4. 错误选项的具体错误原因分析
5. 相关语言点的系统性扩展知识
6. 文化背景和实际应用场景
7. 学习建议和记忆技巧

输出格式要求：
- 必须返回纯JSON格式，不要使用markdown代码块（不要用\`\`\`json\`\`\`包围）
- 每题包含详细解析和知识点说明（解析必须用中文，至少150字）`,
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

  /**
   * 获取指定任务类型的提示词模板
   */
  public getPromptTemplate(taskType: TaskType, language?: Language): PromptTemplate | null {
    // 首先尝试获取特定语言的模板
    if (language) {
      const languageSpecificKey = `${taskType}_${language}`;
      const template = this.promptTemplates.get(languageSpecificKey);
      if (template) {
        return template;
      }
    }

    // 获取通用模板
    const taskTypeMap: Record<TaskType, string> = {
      [TaskType.CONVERSATION]: 'conversation_learning',
      [TaskType.MATERIAL_ANALYSIS]: 'material_analysis',
      [TaskType.EXERCISE_GENERATION]: 'exercise_generation',
      [TaskType.LEVEL_ASSESSMENT]: 'capability_assessment',
      [TaskType.VOCABULARY_EXTRACTION]: 'vocabulary_extraction',
      [TaskType.FUNCTION_CALLING]: 'comprehensive_assessment',
      [TaskType.INTENT_RECOGNITION]: 'intent_recognition'
    };

    const templateKey = taskTypeMap[taskType];
    return this.promptTemplates.get(templateKey) || null;
  }

  /**
   * 生成完整的提示词
   */
  public generatePrompt(
    taskType: TaskType, 
    context: PromptContext, 
    additionalParams: Record<string, any> = {}
  ): { systemPrompt: string; userPrompt: string } | null {
    const template = this.getPromptTemplate(taskType, context.language);
    if (!template) {
      return null;
    }

    // 合并上下文和额外参数
    const allParams = { ...context, ...additionalParams };

    // 替换用户提示词模板中的参数
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

  /**
   * 为每日建议生成提示词
   */
  public generateDailyRecommendationPrompt(context: PromptContext): { systemPrompt: string; userPrompt: string } | null {
    return this.generatePrompt(TaskType.LEVEL_ASSESSMENT, context, {
      // 使用每日建议专用模板
      templateOverride: 'daily_recommendation'
    });
  }

  /**
   * 为练习生成提示词
   */
  public generatePracticePrompt(
    context: PromptContext, 
    practiceType: string,
    topic?: string,
    focusVocabulary?: string[],
    focusGrammar?: string[]
  ): { systemPrompt: string; userPrompt: string } | null {
    return this.generatePrompt(TaskType.EXERCISE_GENERATION, context, {
      practiceType,
      topic: topic || '综合练习',
      focusVocabulary: focusVocabulary?.join(', ') || '无特定重点',
      focusGrammar: focusGrammar?.join(', ') || '无特定重点'
    });
  }

  /**
   * 为材料分析生成提示词
   */
  public generateMaterialAnalysisPrompt(
    context: PromptContext,
    content: string
  ): { systemPrompt: string; userPrompt: string } | null {
    return this.generatePrompt(TaskType.MATERIAL_ANALYSIS, context, {
      content,
      userLevel: context.userLevel || 'B1'
    });
  }

  /**
   * 为意图识别生成提示词
   */
  public generateIntentRecognitionPrompt(
    userMessage: string,
    language: Language,
    conversationContext?: string
  ): { systemPrompt: string; userPrompt: string } | null {
    return this.generatePrompt(TaskType.INTENT_RECOGNITION, { language }, {
      userMessage,
      context: conversationContext || '无上下文'
    });
  }

  /**
   * 为能力评估生成提示词
   */
  public generateCapabilityAssessmentPrompt(
    context: PromptContext,
    assessmentData: {
      chatAnalysis?: string;
      practicePerformance?: string;
      vocabularyMastery?: string;
      selfReportedLevel?: string;
      studyTime?: number;
    }
  ): { systemPrompt: string; userPrompt: string } | null {
    return this.generatePrompt(TaskType.LEVEL_ASSESSMENT, context, {
      chatAnalysis: assessmentData.chatAnalysis || '无聊天记录',
      practicePerformance: assessmentData.practicePerformance || '无练习记录',
      vocabularyMastery: assessmentData.vocabularyMastery || '无词汇数据',
      selfReportedLevel: assessmentData.selfReportedLevel || '未知',
      studyTime: assessmentData.studyTime || 0
    });
  }

  /**
   * 获取所有可用的提示词模板
   */
  public getAllTemplates(): PromptTemplate[] {
    return Array.from(this.promptTemplates.values());
  }

  /**
   * 添加或更新提示词模板
   */
  public setPromptTemplate(template: PromptTemplate): void {
    this.promptTemplates.set(template.id, template);
  }

  /**
   * 删除提示词模板
   */
  public removePromptTemplate(templateId: string): boolean {
    return this.promptTemplates.delete(templateId);
  }
}

// 导出单例实例
export const aiPromptService = new AIPromptService();