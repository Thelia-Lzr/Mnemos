import { Pool } from 'pg';
import { OpenRouterService } from './OpenRouterService';
import { UserCapabilityService } from './UserCapabilityService';
import { AsyncTaskManager } from './AsyncTaskManager';
import { CreditService } from './CreditService';
import { aiPromptService } from './AIPromptService';
import { AITaskType, TaskPriority } from '../types/task';
import { LanguageLevel } from '../models/UserCapability';
import { TaskType } from '../types/openrouter';
import { 
  PracticeGroup, 
  Question, 
  Language, 
  DifficultyLevel, 
  PracticeType, 
  QuestionType,
  SkillArea
} from '../models/PracticeGroup';
import { UserCapability } from '../models/UserCapability';

export interface PracticeGenerationRequest {
  userId: string;
  language: Language;
  difficulty?: DifficultyLevel;
  type: PracticeType;
  focusAreas?: SkillArea[];
  vocabularyWords?: string[];
  grammarPoints?: string[];
  count?: number;
  additionalPrompt?: string;
}

export interface ComprehensivePracticeRequest {
  userId: string;
  language: Language;
  includeCapabilityData?: boolean;
  includeMilestones?: boolean;
  includeVocabulary?: boolean;
}

export class PracticeGenerationService {
  constructor(
    private db: Pool,
    private userCapabilityService: UserCapabilityService,
    private creditService: CreditService,
    private asyncTaskManager: AsyncTaskManager,
    private openRouterService: OpenRouterService = new OpenRouterService()
  ) {}

  private convertLanguageLevelToDifficulty(languageLevel: LanguageLevel): DifficultyLevel {
    switch (languageLevel) {
      case 'A1':
      case 'A2':
        return DifficultyLevel.BEGINNER;
      case 'B1':
      case 'B2':
        return DifficultyLevel.INTERMEDIATE;
      case 'C1':
      case 'C2':
        return DifficultyLevel.ADVANCED;
      default:
        return DifficultyLevel.INTERMEDIATE;
    }
  }

  async generatePracticeGroup(request: PracticeGenerationRequest): Promise<PracticeGroup> {
    // Check credit balance
    const creditCost = this.calculateCreditCost(request.type);
    await this.creditService.consumeCredits(request.userId, 'practice_generation', 0);

    // Get user capability data
    const userCapability = await this.userCapabilityService.getUserCapability(request.userId, request.language);
    
    // Determine difficulty if not specified
    const difficulty = request.difficulty || this.determineDifficulty(userCapability);
    
    // Generate practice content using AI
    const practiceContent = await this.generatePracticeContent(request, userCapability, difficulty);
    
    // Create practice group data
    const practiceGroupData: Omit<PracticeGroup, 'id' | 'createdAt'> = {
      userId: request.userId,
      title: practiceContent.title,
      description: practiceContent.description,
      language: request.language,
      difficulty,
      type: request.type,
      questions: practiceContent.questions,
      estimatedDuration: this.calculateEstimatedDuration(practiceContent.questions),
      focusAreas: request.focusAreas || this.extractFocusAreas(practiceContent.questions)
    };

    // Save to database and return complete object
    const practiceGroupModel = new (await import('../models/PracticeGroup')).PracticeGroupModel(this.db);
    return await practiceGroupModel.create(practiceGroupData);
  }

  async generatePracticeGroupAsync(request: PracticeGenerationRequest): Promise<string> {
    // Check credit balance first
    const creditCost = this.calculateCreditCost(request.type);
    await this.creditService.checkSufficientCredits(request.userId, 'practice_generation', 0);

    // Create async task
    const taskId = await this.asyncTaskManager.createTask({
      userId: request.userId,
      type: AITaskType.PRACTICE_GENERATION,
      priority: TaskPriority.NORMAL,
      model: this.selectAIModel(request.type),
      prompt: this.buildGenerationPrompt(request),
      context: request,
      maxRetries: 3,
      timeout: 300000, // 5 minutes
      notifyUser: true
    });

    return taskId;
  }

  async generateComprehensivePractice(request: ComprehensivePracticeRequest): Promise<PracticeGroup> {
    const creditCost = 5; // Higher cost for comprehensive practice
    await this.creditService.consumeCredits(request.userId, 'comprehensive_assessment', 0);

    // Gather comprehensive user data
    const userData = await this.gatherComprehensiveUserData(request);
    
    // Generate comprehensive practice using AI
    const practiceContent = await this.generateComprehensivePracticeContent(request, userData);
    
    const practiceGroupData: Omit<PracticeGroup, 'id' | 'createdAt'> = {
      userId: request.userId,
      title: practiceContent.title,
      description: practiceContent.description,
      language: request.language,
      difficulty: userData.capability?.overallLevel ? this.convertLanguageLevelToDifficulty(userData.capability.overallLevel) : DifficultyLevel.INTERMEDIATE,
      type: PracticeType.COMPREHENSIVE,
      questions: practiceContent.questions,
      estimatedDuration: this.calculateEstimatedDuration(practiceContent.questions),
      focusAreas: this.extractFocusAreas(practiceContent.questions)
    };

    // Save to database and return complete object
    const practiceGroupModel = new (await import('../models/PracticeGroup')).PracticeGroupModel(this.db);
    return await practiceGroupModel.create(practiceGroupData);
  }

  async generateVocabularyPractice(userId: string, language: Language, vocabularyWords: string[]): Promise<PracticeGroup> {
    const creditCost = 3;
    await this.creditService.consumeCredits(userId, 'vocabulary_practice', 0);

    const userCapability = await this.userCapabilityService.getUserCapability(userId, language);
    
    const practiceContent = await this.generateVocabularyPracticeContent(
      userId, 
      language, 
      vocabularyWords, 
      userCapability
    );
    
    const practiceGroupData: Omit<PracticeGroup, 'id' | 'createdAt'> = {
      userId,
      title: `词汇练习 - ${vocabularyWords.length} 个单词`,
      description: `基于生词表的专项词汇练习`,
      language,
      difficulty: userCapability?.overallLevel ? this.convertLanguageLevelToDifficulty(userCapability.overallLevel) : DifficultyLevel.INTERMEDIATE,
      type: PracticeType.VOCABULARY,
      questions: practiceContent.questions,
      estimatedDuration: this.calculateEstimatedDuration(practiceContent.questions),
      focusAreas: [SkillArea.VOCABULARY]
    };

    // Save to database and return complete object
    const practiceGroupModel = new (await import('../models/PracticeGroup')).PracticeGroupModel(this.db);
    return await practiceGroupModel.create(practiceGroupData);
  }

  async generateEnhancedPracticeGroup(request: PracticeGenerationRequest): Promise<PracticeGroup> {
    // Check credit balance
    const creditCost = this.calculateCreditCost(request.type);
    await this.creditService.consumeCredits(request.userId, 'practice_generation', 0);

    // Get user capability data
    const userCapability = await this.userCapabilityService.getUserCapability(request.userId, request.language);
    
    // Determine difficulty if not specified
    const difficulty = request.difficulty || this.determineDifficulty(userCapability);
    
    // Generate practice content using enhanced AI with additional prompt
    const practiceContent = await this.generateEnhancedPracticeContent(request, userCapability, difficulty);
    
    // Create practice group data
    const practiceGroupData: Omit<PracticeGroup, 'id' | 'createdAt'> = {
      userId: request.userId,
      title: practiceContent.title,
      description: practiceContent.description,
      language: request.language,
      difficulty,
      type: request.type,
      questions: practiceContent.questions,
      estimatedDuration: this.calculateEstimatedDuration(practiceContent.questions),
      focusAreas: request.focusAreas || this.extractFocusAreas(practiceContent.questions)
    };

    // Save to database and return complete object
    const practiceGroupModel = new (await import('../models/PracticeGroup')).PracticeGroupModel(this.db);
    return await practiceGroupModel.create(practiceGroupData);
  }

  async generateEnhancedPracticeGroupAsync(request: PracticeGenerationRequest): Promise<string> {
    // Check credit balance first
    const creditCost = this.calculateCreditCost(request.type);
    await this.creditService.checkSufficientCredits(request.userId, 'practice_generation', 0);

    // Create async task
    const taskId = await this.asyncTaskManager.createTask({
      userId: request.userId,
      type: AITaskType.PRACTICE_GENERATION,
      priority: TaskPriority.NORMAL,
      model: this.selectAIModel(request.type),
      prompt: this.buildEnhancedGenerationPrompt(request),
      context: request,
      maxRetries: 3,
      timeout: 300000, // 5 minutes
      notifyUser: true
    });

    return taskId;
  }

  private async generatePracticeContent(
    request: PracticeGenerationRequest, 
    userCapability: UserCapability | null, 
    difficulty: DifficultyLevel
  ): Promise<{ title: string; description: string; questions: Question[] }> {
    // Use AI prompt service to generate practice prompt
    const practicePrompt = aiPromptService.generatePracticePrompt(
      {
        language: request.language,
        userLevel: userCapability?.overallLevel || 'B1',
        userCapabilities: userCapability
      },
      request.type,
      this.getPracticeTopicName(request.type),
      request.vocabularyWords,
      request.grammarPoints
    );

    if (!practicePrompt) {
      throw new Error('Failed to generate practice prompt');
    }

    // Select appropriate model
    const model = this.openRouterService.selectModel(TaskType.EXERCISE_GENERATION, request.language);
    
    const response = await this.openRouterService.callAI(
      model, 
      practicePrompt.userPrompt, 
      {
        systemPrompt: practicePrompt.systemPrompt,
        userId: request.userId,
        language: request.language,
        type: request.type
      },
      request.userId
    );

    return this.parsePracticeResponse(response.content);
  }

  private async generateComprehensivePracticeContent(
    request: ComprehensivePracticeRequest,
    userData: any
  ): Promise<{ title: string; description: string; questions: Question[] }> {
    // Use AI prompt service for comprehensive assessment
    const comprehensivePrompt = aiPromptService.generatePrompt(
      TaskType.EXERCISE_GENERATION,
      {
        language: request.language,
        userLevel: userData.capability?.overallLevel || 'B1',
        userCapabilities: userData.capability,
        milestones: userData.milestones,
        vocabulary: userData.vocabulary
      },
      {
        templateOverride: 'comprehensive_assessment',
        overallLevel: userData.capability?.overallLevel || 'B1',
        listeningLevel: userData.capability?.listeningLevel || 50,
        speakingLevel: userData.capability?.speakingLevel || 50,
        readingLevel: userData.capability?.readingLevel || 50,
        writingLevel: userData.capability?.writingLevel || 50,
        milestoneData: JSON.stringify(userData.milestones || []),
        vocabularyData: JSON.stringify(userData.vocabulary || []),
        weaknesses: userData.capability?.weaknesses?.join(', ') || '无',
        strengths: userData.capability?.strengths?.join(', ') || '无'
      }
    );

    if (!comprehensivePrompt) {
      throw new Error('Failed to generate comprehensive practice prompt');
    }

    const model = this.openRouterService.selectModel(TaskType.EXERCISE_GENERATION, request.language);
    
    const response = await this.openRouterService.callAI(
      model, 
      comprehensivePrompt.userPrompt, 
      {
        systemPrompt: comprehensivePrompt.systemPrompt,
        userId: request.userId,
        language: request.language,
        type: 'comprehensive'
      },
      request.userId
    );

    return this.parsePracticeResponse(response.content);
  }

  private async generateVocabularyPracticeContent(
    userId: string,
    language: Language,
    vocabularyWords: string[],
    userCapability: UserCapability | null
  ): Promise<{ questions: Question[] }> {
    // Use AI prompt service for vocabulary practice
    const vocabularyPrompt = aiPromptService.generatePracticePrompt(
      {
        language,
        userLevel: userCapability?.overallLevel || 'B1',
        userCapabilities: userCapability
      },
      'vocabulary',
      '词汇练习',
      vocabularyWords,
      []
    );

    if (!vocabularyPrompt) {
      throw new Error('Failed to generate vocabulary practice prompt');
    }

    const model = this.openRouterService.selectModel(TaskType.EXERCISE_GENERATION, language);
    
    const response = await this.openRouterService.callAI(
      model, 
      vocabularyPrompt.userPrompt, 
      {
        systemPrompt: vocabularyPrompt.systemPrompt,
        userId,
        language,
        type: 'vocabulary'
      },
      userId
    );

    const parsed = this.parsePracticeResponse(response.content);
    return { questions: parsed.questions };
  }

  private async generateEnhancedPracticeContent(
    request: PracticeGenerationRequest, 
    userCapability: UserCapability | null, 
    difficulty: DifficultyLevel
  ): Promise<{ title: string; description: string; questions: Question[] }> {
    // Use enhanced AI prompt service to generate practice prompt with additional prompt weighting
    const practicePrompt = aiPromptService.generatePracticePrompt(
      {
        language: request.language,
        userLevel: userCapability?.overallLevel || 'B1',
        userCapabilities: userCapability
      },
      request.type,
      this.getPracticeTopicName(request.type),
      request.vocabularyWords,
      request.grammarPoints
    );

    if (!practicePrompt) {
      throw new Error('Failed to generate enhanced practice prompt');
    }

    // Build enhanced prompt with additional user requirements
    const enhancedPrompt = this.buildEnhancedGenerationPrompt(
      request, 
      userCapability, 
      difficulty
    );

    // Select appropriate model
    const model = this.openRouterService.selectModel(TaskType.EXERCISE_GENERATION, request.language);
    
    const response = await this.openRouterService.callAI(
      model, 
      enhancedPrompt, 
      {
        systemPrompt: practicePrompt.systemPrompt,
        userId: request.userId,
        language: request.language,
        type: request.type
      },
      request.userId
    );

    return this.parsePracticeResponse(response.content);
  }

  private buildGenerationPrompt(
    request: PracticeGenerationRequest, 
    userCapability?: UserCapability | null, 
    difficulty?: DifficultyLevel
  ): string {
    const languageName = this.getLanguageName(request.language);
    const difficultyLevel = difficulty || request.difficulty || DifficultyLevel.INTERMEDIATE;
    
    let prompt = `Generate a ${languageName} language learning practice group with exactly 10 questions.

🚨🚨🚨 ABSOLUTE LANGUAGE REQUIREMENTS - ZERO TOLERANCE FOR VIOLATIONS 🚨🚨🚨

📝 QUESTION CONTENT RULES (ZERO EXCEPTIONS):
1. Question "content" field: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
2. All options A/B/C/D: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
3. "correctAnswer" field: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
4. 绝对禁止在题目和选项中使用中文
5. 绝对禁止混合语言

📖 EXPLANATION RULES (SMART BALANCE):
1. "explanation" field: 主要使用中文，确保中国人能看得懂
2. 解析必须详细，至少150-200个中文字符
3. 💡 可以适当插入${languageName}单词或短语进行解释，但必须用中文说明其含义
4. 📝 例如："动词 'avoir'（拥有）在这里表示..." 或 "短语 'il y a'（有）的用法是..."
5. 🎯 重点：整体解析让中国学习者容易理解，适当的目标语言内容有助于学习
6. 必须包含语法分析、词汇解释、错误选项分析

�🚨🚨 CRITICAL: ANSWER ACCURACY AND CONSISTENCY VERIFICATION 🚨🚨🚨
⚠️ BEFORE FINALIZING EACH QUESTION, YOU MUST:
1. ✓ VERIFY the factual correctness of your answer - if the question asks "Who invented X?", make sure you know the correct answer!
2. ✓ DOUBLE-CHECK that the "correctAnswer" field (A/B/C/D) matches the option containing the factually correct information
3. ✓ CROSS-VALIDATE that your explanation clearly states why the chosen answer is correct
4. ✓ ENSURE there is NO contradiction between the correctAnswer field and what you explain in the explanation field
5. ✓ If unsure about factual accuracy, DO NOT generate that question - create a different question instead

🔍 ANSWER CONSISTENCY SELF-CHECK (MANDATORY FOR EVERY QUESTION):
Before outputting each question, ask yourself:
- "Is my correctAnswer field (A/B/C/D) pointing to the option that contains the factually correct information?"
- "Does my explanation clearly support this choice as the correct answer?"
- "Would a knowledgeable teacher agree that this is the objectively correct answer?"
- If ANY answer is "No" or "Unsure" → REVISE the question immediately

💡 EXAMPLE OF CORRECT CONSISTENCY:
Question: "Who developed the periodic table of elements?"
Options: ["A. Dmitri Mendeleev", "B. Marie Curie", "C. John Dalton", "D. Niels Bohr"]
correctAnswer: "A"  ← MUST point to the factually correct answer
explanation: "正确答案是 A. Dmitri Mendeleev（德米特里·门捷列夫）。门捷列夫在1869年创建了元素周期表..."

❌ NEVER DO THIS (WRONG - Answer inconsistency):
correctAnswer: "C"  ← Points to wrong person
explanation: "正确答案是 C. John Dalton" ← This is factually INCORRECT!

🔍 LANGUAGE VERIFICATION CHECKLIST:
✅ 题目内容 = ${languageName} (${request.language.toUpperCase()}) ONLY
✅ 所有选项 = ${languageName} (${request.language.toUpperCase()}) ONLY  
✅ 正确答案 = ${languageName} (${request.language.toUpperCase()}) ONLY
✅ 详细解析 = 中文 ONLY
✅ correctAnswer字段必须指向事实上正确的选项
✅ 解析必须清楚说明为什么该选项是正确答案
❌ 不要在题目中使用中文
❌ 绝对不允许答案字段与解析内容矛盾

Requirements:
- Target Language: ${languageName} (${request.language.toUpperCase()})
- Explanation Language: 中文 (Chinese)
- Difficulty: ${difficultyLevel}
- Type: ${request.type}
- Question format: Multiple choice with 4 options each
- Include vocabulary words and grammar points for each question

🎯 ANSWER DISTRIBUTION REQUIREMENTS:
- 正确答案必须均匀分布在A、B、C、D四个选项中
- 避免答案过于集中（例如：不要出现10道题答案全是A的情况）
- 理想分布：每个选项（A/B/C/D）作为正确答案的次数应该相近
- 例如10道题：A出现2-3次，B出现2-3次，C出现2-3次，D出现2-3次

🧠 CONFUSION/DISTRACTOR STRATEGY:
- 当用户要求特定知识点的题目时，适当添加混淆项来检测理解深度
- 设计巧妙的干扰选项，测试用户是否对知识点有过于泛化的理解
- 包含相似但不同的语法结构、近义词、易混淆的用法等
- 例如：如果练习"过去时"，可以包含一些"现在完成时"的混淆选项，也可以包含一些正确答案为“现在完成时”的题目
- 目标：帮助用户精确掌握知识点，避免模糊理解

`;

    if (userCapability) {
      prompt += `User's current capability:
- Overall level: ${userCapability.overallLevel}
- Vocabulary capability: ${userCapability.vocabularyCapability?.estimatedVocabularySize || 'Unknown'} words
- Grammar score: ${userCapability.grammarCapability?.overallGrammarScore || 'Unknown'}
- Strengths: ${userCapability.strengths?.join(', ') || 'None specified'}
- Weaknesses: ${userCapability.weaknesses?.join(', ') || 'None specified'}

`;
    }

    if (request.focusAreas && request.focusAreas.length > 0) {
      prompt += `Focus areas: ${request.focusAreas.join(', ')}\n`;
    }

    if (request.vocabularyWords && request.vocabularyWords.length > 0) {
      prompt += `Include these vocabulary words: ${request.vocabularyWords.join(', ')}\n`;
    }

    if (request.grammarPoints && request.grammarPoints.length > 0) {
      prompt += `Include these grammar points: ${request.grammarPoints.join(', ')}\n`;
    }

    prompt += `
DETAILED EXPLANATION REQUIREMENTS:
Each explanation must include (in Chinese):
1. Detailed grammar analysis of the correct answer
2. Vocabulary meanings and usage
3. Grammar structure explanation with examples
4. Analysis of why wrong options are incorrect
5. Related language point extensions
6. Practical application scenarios and examples
7. At least 100 characters of detailed explanation

CRITICAL FORMATTING REQUIREMENTS - FOLLOW EXACTLY:
1. Return ONLY a valid JSON object - NO markdown, NO code blocks, NO extra text
2. Use EXACT field names and structure as shown below
3. "options" must be an ARRAY of strings in format ["A. text", "B. text", "C. text", "D. text"]
4. "correctAnswer" must be ONLY a single letter: "A", "B", "C", or "D"
5. "vocabularyWords" must be an ARRAY of strings, NOT objects
6. "grammarPoints" must be an ARRAY of strings
7. All explanations must be in detailed Chinese (中文) with at least 100 characters
8. DO NOT use object format for options like {"A": "text", "B": "text"}

REQUIRED JSON FORMAT (copy this structure EXACTLY - do not change anything):
{
  "title": "Practice group title",
  "description": "Brief description of the practice content",
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Question text in ${languageName}",
      "options": ["A. First option in ${languageName}", "B. Second option in ${languageName}", "C. Third option in ${languageName}", "D. Fourth option in ${languageName}"],
      "correctAnswer": "A",
      "explanation": "详细的中文解析，包含语法分析、词汇解释、语言点扩展等，至少100字",
      "vocabularyWords": ["word1", "word2", "word3"],
      "grammarPoints": ["grammar point 1", "grammar point 2"],
      "difficulty": 3
    }
  ]
}

STRICT VALIDATION CHECKLIST - MUST PASS ALL:
- ✓ JSON is valid and parseable
- ✓ Questions and options are in ${languageName} (target language)
- ✓ "options" is ARRAY (not object) with exactly 4 strings starting with "A.", "B.", "C.", "D."
- ✓ "correctAnswer" is single letter only (A, B, C, or D)
- ✓ "vocabularyWords" is array of strings (not objects with word/translation)
- ✓ "explanation" is in detailed Chinese with at least 100 characters
- ✓ NO markdown formatting anywhere
- ✓ NO object format for options
- ✓ CRITICAL: "correctAnswer" field MUST point to the option with factually correct information
- ✓ CRITICAL: "explanation" must clearly state why that specific option is the correct answer
- ✓ CRITICAL: NO contradiction between correctAnswer and explanation - they must be consistent!

Return ONLY the JSON object, nothing else.

🚨 FINAL CRITICAL REMINDER 🚨
- 题目和选项：必须100%使用${languageName}语言
- 解析说明：主要使用中文，可适当插入${languageName}单词或短语配中文解释
- 解析整体必须让中国学习者容易理解
- ⚠️ 最重要：correctAnswer字段必须指向事实上正确的答案选项，解析必须明确说明为什么该答案正确
- ⚠️ 严禁出现答案标记为A但解析说正确答案是C的矛盾情况！

Ensure exactly 10 questions are generated. Questions and options MUST be in ${languageName}. All explanations MUST be primarily in Chinese with appropriate ${languageName} terms explained in Chinese. IMPORTANT: Distribute correct answers evenly across A, B, C, D options. Return ONLY the JSON object, no additional text or formatting.`;

    return prompt;
  }

  private buildComprehensivePrompt(request: ComprehensivePracticeRequest, userData: any): string {
    const languageName = this.getLanguageName(request.language);
    
    let prompt = `Generate a comprehensive ${languageName} language assessment practice with exactly 10 questions.

🚨🚨🚨 ABSOLUTE LANGUAGE REQUIREMENTS - ZERO TOLERANCE FOR VIOLATIONS 🚨🚨🚨

📝 QUESTION CONTENT RULES (ZERO EXCEPTIONS):
1. Question "content" field: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
2. All options A/B/C/D: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
3. "correctAnswer" field: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
4. 绝对禁止在题目和选项中使用中文
5. 绝对禁止混合语言

📖 EXPLANATION RULES (SMART BALANCE):
1. "explanation" field: 主要使用中文，确保中国人能看得懂
2. 解析必须详细，至少150-200个中文字符
3. � 严可以适当插入${languageName}单词或短语进行解释，但必须用中文说明其含义
4. � 严例如："动词 'avoir'（拥有）在这里表示..." 或 "短语 'il y a'（有）的用法是..."
5. 🎯 重点：整体解析让中国学习者容易理解，适当的目标语言内容有助于学习
6. 必须包含语法分析、词汇解释、错误选项分析

🔍 LANGUAGE VERIFICATION CHECKLIST:
✅ 题目内容 = ${languageName} (${request.language.toUpperCase()}) ONLY
✅ 所有选项 = ${languageName} (${request.language.toUpperCase()}) ONLY  
✅ 正确答案 = ${languageName} (${request.language.toUpperCase()}) ONLY
✅ 详细解析 = 主要中文，可适当插入目标语言进行解释
❌ 绝对不允许在题目和选项中混合语言
❌ 绝对不允许在题目中使用中文
✅ 解析中可适当使用目标语言单词配中文解释

🎯 QUESTION TYPE DIVERSITY REQUIREMENTS:
- 题目形式必须多样化，不能全部是选择题
- 可以包含：填空题、判断题、四选一选择题、排序题等
- 每个练习组应该包含至少2-3种不同的题型
- 根据语言特点选择合适的题型组合

This should be a comprehensive evaluation covering multiple skill areas based on the user's complete learning profile.

User Data:
`;

    if (userData.capability) {
      prompt += `Current Capability:
- Overall level: ${userData.capability.overallLevel}
- Listening: ${userData.capability.listeningLevel}/100
- Speaking: ${userData.capability.speakingLevel}/100
- Reading: ${userData.capability.readingLevel}/100
- Writing: ${userData.capability.writingLevel}/100
- Vocabulary size: ${userData.capability.vocabularyCapability?.estimatedVocabularySize || 'Unknown'}
- Grammar score: ${userData.capability.grammarCapability?.overallGrammarScore || 'Unknown'}
- Strengths: ${userData.capability.strengths?.join(', ') || 'None'}
- Weaknesses: ${userData.capability.weaknesses?.join(', ') || 'None'}

`;
    }

    if (userData.milestones && userData.milestones.length > 0) {
      prompt += `Learning Milestones:
${userData.milestones.map((m: any) => `- ${m.title}: ${m.isCompleted ? 'Completed' : 'In Progress'}`).join('\n')}

`;
    }

    if (userData.vocabulary && userData.vocabulary.length > 0) {
      prompt += `Current Vocabulary (sample):
${userData.vocabulary.slice(0, 20).map((w: any) => `- ${w.word} (${w.masteryLevel})`).join('\n')}

`;
    }

    prompt += `
Generate questions that:
1. Test multiple skill areas (vocabulary, grammar, reading comprehension, etc.)
2. Are appropriate for the user's current level
3. Focus on identified weak areas for improvement
4. Include some challenging questions to assess growth potential
5. Cover both learned vocabulary and new words at appropriate difficulty

🎯 ANSWER DISTRIBUTION REQUIREMENTS:
- 正确答案必须均匀分布在A、B、C、D四个选项中
- 避免答案过于集中（例如：不要出现10道题答案全是A的情况）
- 理想分布：每个选项（A/B/C/D）作为正确答案的次数应该相近
- 例如10道题：A出现2-3次，B出现2-3次，C出现2-3次，D出现2-3次

🧠 CONFUSION/DISTRACTOR STRATEGY:
- 当用户要求特定知识点的题目时，适当添加混淆项来检测理解深度
- 设计巧妙的干扰选项，测试用户是否对知识点有过于泛化的理解
- 包含相似但不同的语法结构、近义词、易混淆的用法等
- 例如：如果练习"过去时"，可以包含一些"现在完成时"的混淆选项，也可以包含一些正确答案为“现在完成时”的题目
- 目标：帮助用户精确掌握知识点，避免模糊理解

DETAILED EXPLANATION REQUIREMENTS:
Each explanation must include (in Chinese):
1. Deep grammar analysis and linguistic explanation of the correct answer
2. Etymology, conjugation, and collocation usage of key vocabulary
3. Detailed grammar structure explanation with multiple examples
4. Specific error analysis of wrong options
5. Systematic expansion of related language points
6. Cultural background and practical application scenarios
7. Learning suggestions and memory techniques
8. At least 150 characters of detailed explanation

CRITICAL FORMATTING REQUIREMENTS - FOLLOW EXACTLY:
1. Return ONLY a valid JSON object - NO markdown, NO code blocks, NO extra text
2. Use EXACT field names and structure as shown below
3. "options" must be an ARRAY of strings in format ["A. text", "B. text", "C. text", "D. text"]
4. "correctAnswer" must be ONLY a single letter: "A", "B", "C", or "D"
5. "vocabularyWords" must be an ARRAY of strings, NOT objects
6. "grammarPoints" must be an ARRAY of strings
7. All explanations must be in detailed Chinese (中文) with at least 150 characters
8. DO NOT use object format for options like {"A": "text", "B": "text"}

REQUIRED JSON FORMAT (copy this structure EXACTLY - do not change anything):
{
  "title": "Comprehensive Language Assessment",
  "description": "Multi-skill evaluation based on your learning profile",
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Question text in ${languageName}",
      "options": ["A. First option in ${languageName}", "B. Second option in ${languageName}", "C. Third option in ${languageName}", "D. Fourth option in ${languageName}"],
      "correctAnswer": "A",
      "explanation": "详细的中文解析，包含深入语法分析、词汇解释、语言点扩展等，至少150字",
      "vocabularyWords": ["word1", "word2", "word3"],
      "grammarPoints": ["grammar point 1", "grammar point 2"],
      "difficulty": 3
    }
  ]
}

STRICT VALIDATION CHECKLIST - MUST PASS ALL:
- ✓ JSON is valid and parseable
- ✓ Questions and options are in ${languageName} (target language)
- ✓ "options" is ARRAY (not object) with exactly 4 strings starting with "A.", "B.", "C.", "D."
- ✓ "correctAnswer" is single letter only (A, B, C, or D)
- ✓ "vocabularyWords" is array of strings (not objects with word/translation)
- ✓ "explanation" is in detailed Chinese with at least 150 characters
- ✓ NO markdown formatting anywhere
- ✓ NO object format for options
- ✓ CRITICAL: "correctAnswer" field MUST point to the option with factually correct information
- ✓ CRITICAL: "explanation" must clearly state why that specific option is the correct answer
- ✓ CRITICAL: NO contradiction between correctAnswer and explanation - they must be consistent!

Return ONLY the JSON object, nothing else.

🚨 FINAL CRITICAL REMINDER 🚨
- 题目和选项：必须100%使用${languageName}语言
- 解析说明：主要使用中文，可适当插入${languageName}单词或短语配中文解释
- 解析整体必须让中国学习者容易理解
- ⚠️ 最重要：correctAnswer字段必须指向事实上正确的答案选项，解析必须明确说明为什么该答案正确
- ⚠️ 严禁出现答案标记为A但解析说正确答案是C的矛盾情况！

Ensure exactly 10 questions are generated. Questions and options MUST be in ${languageName}. All explanations MUST be primarily in Chinese with comprehensive analysis and appropriate ${languageName} terms explained in Chinese. IMPORTANT: Distribute correct answers evenly across A, B, C, D options. Return ONLY the JSON object, no additional text or formatting.`;

    return prompt;
  }

  private buildVocabularyPrompt(
    language: Language, 
    vocabularyWords: string[], 
    userCapability: UserCapability | null
  ): string {
    const languageName = this.getLanguageName(language);
    
    let prompt = `Generate a ${languageName} vocabulary practice with exactly 10 questions focusing on these words:
${vocabularyWords.join(', ')}

🚨🚨🚨 ABSOLUTE LANGUAGE REQUIREMENTS - ZERO TOLERANCE FOR VIOLATIONS 🚨🚨🚨

📝 QUESTION CONTENT RULES (ZERO EXCEPTIONS):
1. Question "content" field: 必须100%使用${languageName}语言 (${language.toUpperCase()})
2. All options A/B/C/D: 必须100%使用${languageName}语言 (${language.toUpperCase()})
3. "correctAnswer" field: 必须100%使用${languageName}语言 (${language.toUpperCase()})
4. 绝对禁止在题目和选项中使用中文
5. 绝对禁止混合语言

📖 EXPLANATION RULES (SMART BALANCE):
1. "explanation" field: 主要使用中文，确保中国人能看得懂
2. 解析必须详细，至少150-200个中文字符
3. � 严可以适当插入${languageName}单词或短语进行解释，但必须用中文说明其含义
4. � 例如："动词 '出avoir'（拥有）在这里表示..." 或 "短语 'il y a'（有）的用法是..."
5. 🎯 重点：整体解析让中国学习者容易理解，适当的目标语言内容有助于学习
6. 必须包含语法分析、词汇解释、错误选项分析

🔍 LANGUAGE VERIFICATION CHECKLIST:
✅ 题目内容 = ${languageName} (${language.toUpperCase()}) ONLY
✅ 所有选项 = ${languageName} (${language.toUpperCase()}) ONLY  
✅ 正确答案 = ${languageName} (${language.toUpperCase()}) ONLY
✅ 详细解析 = 主要中文，可适当插入目标语言进行解释
❌ 绝对不允许在题目和选项中混合语言
❌ 绝对不允许在题目中使用中文
✅ 解析中可适当使用目标语言单词配中文解释

🎯 QUESTION TYPE DIVERSITY REQUIREMENTS:
- 题目形式必须多样化，不能全部是选择题
- 可以包含：填空题、判断题、四选一选择题、排序题等
- 每个练习组应该包含至少2-3种不同的题型
- 根据语言特点选择合适的题型组合

`;

    if (userCapability) {
      prompt += `User's vocabulary capability:
- Estimated vocabulary size: ${userCapability.vocabularyCapability?.estimatedVocabularySize || 'Unknown'}
- Basic vocabulary mastery: ${userCapability.vocabularyCapability?.basicVocabularyMastery || 'Unknown'}%
- Overall level: ${userCapability.overallLevel}

`;
    }

    prompt += `
Create questions that test:
1. Word meanings and definitions
2. Usage in context
3. Synonyms and antonyms
4. Collocations and common phrases
5. Different forms of the words

🎯 ANSWER DISTRIBUTION REQUIREMENTS:
- 正确答案必须均匀分布在A、B、C、D四个选项中
- 避免答案过于集中（例如：不要出现10道题答案全是A的情况）
- 理想分布：每个选项（A/B/C/D）作为正确答案的次数应该相近
- 例如10道题：A出现2-3次，B出现2-3次，C出现2-3次，D出现2-3次

🧠 CONFUSION/DISTRACTOR STRATEGY:
- 当用户要求特定知识点的题目时，适当添加混淆项来检测理解深度
- 设计巧妙的干扰选项，测试用户是否对知识点有过于泛化的理解
- 包含相似但不同的语法结构、近义词、易混淆的用法等
- 例如：如果练习"过去时"，可以包含一些"现在完成时"的混淆选项，也可以包含一些正确答案为“现在完成时”的题目
- 目标：帮助用户精确掌握知识点，避免模糊理解

DETAILED EXPLANATION REQUIREMENTS:
Each explanation must include (in Chinese):
1. Detailed vocabulary meaning and etymology
2. Usage patterns and collocations
3. Synonyms, antonyms, and related words
4. Grammar patterns and sentence structures
5. Cultural context and practical examples
6. Memory techniques and learning tips
7. At least 100 characters of detailed explanation

CRITICAL FORMATTING REQUIREMENTS - FOLLOW EXACTLY:
1. Return ONLY a valid JSON object - NO markdown, NO code blocks, NO extra text
2. Use EXACT field names and structure as shown below
3. "options" must be an ARRAY of strings in format ["A. text", "B. text", "C. text", "D. text"]
4. "correctAnswer" must be ONLY a single letter: "A", "B", "C", or "D"
5. "vocabularyWords" must be an ARRAY of strings, NOT objects
6. "grammarPoints" must be an ARRAY of strings
7. All explanations must be in detailed Chinese (中文) with at least 100 characters
8. DO NOT use object format for options like {"A": "text", "B": "text"}

REQUIRED JSON FORMAT (copy this structure EXACTLY - do not change anything):
{
  "title": "Vocabulary Practice",
  "description": "Practice with your vocabulary words",
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Question text in ${languageName}",
      "options": ["A. First option in ${languageName}", "B. Second option in ${languageName}", "C. Third option in ${languageName}", "D. Fourth option in ${languageName}"],
      "correctAnswer": "A",
      "explanation": "详细的中文解析，包含词汇分析、用法说明、相关知识扩展等，至少100字",
      "vocabularyWords": ["word1", "word2"],
      "grammarPoints": [],
      "difficulty": 3
    }
  ]
}

STRICT VALIDATION CHECKLIST - MUST PASS ALL:
- ✓ JSON is valid and parseable
- ✓ Questions and options are in ${languageName} (target language)
- ✓ "options" is ARRAY (not object) with exactly 4 strings starting with "A.", "B.", "C.", "D."
- ✓ "correctAnswer" is single letter only (A, B, C, or D)
- ✓ "vocabularyWords" is array of strings (not objects with word/translation)
- ✓ "explanation" is in detailed Chinese with at least 100 characters
- ✓ NO markdown formatting anywhere
- ✓ NO object format for options
- ✓ CRITICAL: "correctAnswer" field MUST point to the option with factually correct vocabulary information
- ✓ CRITICAL: "explanation" must clearly state why that specific option is the correct answer
- ✓ CRITICAL: NO contradiction between correctAnswer and explanation - they must be consistent!

Return ONLY the JSON object, nothing else.

🚨 FINAL CRITICAL REMINDER 🚨
- 题目和选项：必须100%使用${languageName}语言
- 解析说明：主要使用中文，可适当插入${languageName}单词或短语配中文解释
- 解析整体必须让中国学习者容易理解
- ⚠️ 最重要：correctAnswer字段必须指向事实上正确的答案选项，解析必须明确说明为什么该答案正确
- ⚠️ 严禁出现答案标记为A但解析说正确答案是C的矛盾情况！

Ensure exactly 10 questions are generated, focusing on the provided vocabulary words. Questions and options MUST be in ${languageName}. All explanations MUST be primarily in Chinese with appropriate ${languageName} terms explained in Chinese. IMPORTANT: Distribute correct answers evenly across A, B, C, D options. Return ONLY the JSON object, no additional text or formatting.`;

    return prompt;
  }

  private parsePracticeResponse(content: string): { title: string; description: string; questions: Question[] } {
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
      
      // Log the parsed structure for debugging
      console.log('Parsed AI response structure:', {
        hasTitle: !!parsed.title,
        hasDescription: !!parsed.description,
        questionsIsArray: Array.isArray(parsed.questions),
        questionsCount: parsed.questions?.length || 0,
        firstQuestionStructure: parsed.questions?.[0] ? {
          hasContent: !!parsed.questions[0].content,
          optionsType: typeof parsed.questions[0].options,
          optionsIsArray: Array.isArray(parsed.questions[0].options),
          optionsLength: parsed.questions[0].options?.length || 0,
          hasCorrectAnswer: !!parsed.questions[0].correctAnswer,
          hasExplanation: !!parsed.questions[0].explanation
        } : null
      });
      
      // Validate structure
      if (!parsed.title || !parsed.description || !Array.isArray(parsed.questions)) {
        throw new Error(`Invalid response structure: title=${!!parsed.title}, description=${!!parsed.description}, questionsIsArray=${Array.isArray(parsed.questions)}`);
      }

      // Ensure at least 1 question (be more flexible than requiring exactly 10)
      if (parsed.questions.length === 0) {
        throw new Error('No questions found in response');
      }

      // Validate each question
      const questions: Question[] = parsed.questions.map((q: any, index: number) => {
        // Handle different AI response formats
        let options: string[] = [];
        let normalizedCorrectAnswer = q.correctAnswer;

        // Check if options is an object (new format) or array (old format)
        if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
          // New format: {"A": "option text", "B": "option text", ...}
          const optionKeys = ['A', 'B', 'C', 'D'];
          options = optionKeys.map(key => {
            const optionText = q.options[key];
            return optionText ? `${key}. ${optionText}` : `${key}. `;
          }).filter(option => option.trim().length > 3); // Filter out empty options
          
          // Ensure we have at least 4 options, pad with empty ones if needed
          while (options.length < 4) {
            const nextLetter = String.fromCharCode(65 + options.length);
            options.push(`${nextLetter}. `);
          }
          
          // Correct answer should already be the letter
          if (q.options[normalizedCorrectAnswer]) {
            // Correct answer is valid
          } else {
            console.warn(`Invalid correct answer "${normalizedCorrectAnswer}" for question ${index + 1}`);
            // Find the first valid option as fallback
            const validKeys = optionKeys.filter(key => q.options[key]);
            normalizedCorrectAnswer = validKeys.length > 0 ? validKeys[0] : 'A';
          }
        } else if (Array.isArray(q.options)) {
          // Old format: ["A. option text", "B. option text", ...]
          options = q.options.filter((option: string) => option && option.trim().length > 0);
          
          // Ensure we have at least 4 options
          while (options.length < 4) {
            const nextLetter = String.fromCharCode(65 + options.length);
            options.push(`${nextLetter}. `);
          }
          
          // Normalize correct answer if it's full text
          if (normalizedCorrectAnswer.length > 1) {
            const optionIndex = options.findIndex((option: string) => option === normalizedCorrectAnswer);
            if (optionIndex !== -1) {
              normalizedCorrectAnswer = String.fromCharCode(65 + optionIndex);
            } else {
              const letterMatch = normalizedCorrectAnswer.match(/^([A-D])/);
              if (letterMatch) {
                normalizedCorrectAnswer = letterMatch[1];
              } else {
                console.warn(`Could not normalize correct answer for question ${index + 1}: "${q.correctAnswer}"`);
                normalizedCorrectAnswer = 'A';
              }
            }
          }
        } else {
          throw new Error(`Invalid options format at index ${index}: expected object or array, got ${typeof q.options}`);
        }

        // Validate basic structure with detailed error messages
        if (!q.content) {
          throw new Error(`Invalid question structure at index ${index}: missing content`);
        }
        if (options.length !== 4) {
          throw new Error(`Invalid question structure at index ${index}: expected 4 options, got ${options.length}. Options: ${JSON.stringify(options)}`);
        }
        if (!normalizedCorrectAnswer) {
          throw new Error(`Invalid question structure at index ${index}: missing correctAnswer`);
        }
        if (!q.explanation) {
          throw new Error(`Invalid question structure at index ${index}: missing explanation`);
        }

        // Validate that the normalized answer is a valid option identifier
        if (!['A', 'B', 'C', 'D'].includes(normalizedCorrectAnswer)) {
          console.warn(`Invalid correct answer identifier for question ${index + 1}: "${normalizedCorrectAnswer}", defaulting to A`);
          normalizedCorrectAnswer = 'A';
        }

        // Handle vocabulary words - support both object array and string array formats
        let vocabularyWords: string[] = [];
        if (Array.isArray(q.vocabularyWords)) {
          vocabularyWords = q.vocabularyWords.map((item: any) => {
            if (typeof item === 'string') {
              return item;
            } else if (item && typeof item === 'object' && item.word) {
              return item.word; // Extract word from object format
            }
            return '';
          }).filter((word: string) => word);
        }

        return {
          id: '', // Will be set when saving to database
          practiceGroupId: '', // Will be set when saving to database
          type: q.type as QuestionType || QuestionType.MULTIPLE_CHOICE,
          content: q.content,
          options: options,
          correctAnswer: normalizedCorrectAnswer,
          explanation: q.explanation,
          vocabularyWords: vocabularyWords,
          grammarPoints: Array.isArray(q.grammarPoints) ? q.grammarPoints : [],
          difficulty: typeof q.difficulty === 'number' ? q.difficulty : 3,
          orderIndex: index
        };
      });

      return {
        title: parsed.title,
        description: parsed.description,
        questions
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private selectAIModel(type: PracticeType): string {
    // Use configured model for practice generation tasks
    return process.env.PRACTICE_GENERATION_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o';
  }

  private determineDifficulty(userCapability: UserCapability | null): DifficultyLevel {
    if (!userCapability) {
      return DifficultyLevel.INTERMEDIATE;
    }

    const overallScore = this.calculateOverallScore(userCapability);
    
    if (overallScore < 40) {
      return DifficultyLevel.BEGINNER;
    } else if (overallScore < 70) {
      return DifficultyLevel.INTERMEDIATE;
    } else {
      return DifficultyLevel.ADVANCED;
    }
  }

  private calculateOverallScore(userCapability: UserCapability): number {
    const scores = [
      userCapability.listeningLevel,
      userCapability.speakingLevel,
      userCapability.readingLevel,
      userCapability.writingLevel
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateEstimatedDuration(questions: Question[]): number {
    // Estimate 2 minutes per question on average
    return questions.length * 2;
  }

  private extractFocusAreas(questions: Question[]): string[] {
    const areas = new Set<string>();
    
    questions.forEach(question => {
      if (question.vocabularyWords.length > 0) {
        areas.add('vocabulary');
      }
      if (question.grammarPoints.length > 0) {
        areas.add('grammar');
      }
      // Add more logic based on question content analysis
    });
    
    return Array.from(areas);
  }

  private calculateCreditCost(type: PracticeType): number {
    switch (type) {
      case PracticeType.COMPREHENSIVE:
        return 5;
      case PracticeType.VOCABULARY:
        return 3;
      case PracticeType.GRAMMAR:
        return 3;
      default:
        return 3;
    }
  }

  private getLanguageName(language: Language): string {
    switch (language) {
      case Language.ENGLISH:
        return 'English';
      case Language.JAPANESE:
        return 'Japanese';
      case Language.FRENCH:
        return 'French';
      default:
        return 'English';
    }
  }

  private getPracticeTopicName(type: PracticeType): string {
    switch (type) {
      case PracticeType.VOCABULARY:
        return '词汇练习';
      case PracticeType.GRAMMAR:
        return '语法练习';
      case PracticeType.COMPREHENSIVE:
        return '综合评估';
      case PracticeType.MATERIAL_BASED:
        return '材料练习';
      case PracticeType.REVIEW:
        return '复习练习';
      default:
        return '综合练习';
    }
  }

  private buildEnhancedGenerationPrompt(
    request: PracticeGenerationRequest, 
    userCapability?: UserCapability | null, 
    difficulty?: DifficultyLevel
  ): string {
    const languageName = this.getLanguageName(request.language);
    const difficultyLevel = difficulty || request.difficulty || DifficultyLevel.INTERMEDIATE;
    
    let prompt = `Generate a ${languageName} language learning practice group with exactly 10 questions.

🚨🚨🚨 ABSOLUTE LANGUAGE REQUIREMENTS - ZERO TOLERANCE FOR VIOLATIONS 🚨🚨🚨

📝 QUESTION CONTENT RULES (ZERO EXCEPTIONS):
1. Question "content" field: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
2. All options A/B/C/D: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
3. "correctAnswer" field: 必须100%使用${languageName}语言 (${request.language.toUpperCase()})
4. 绝对禁止在题目和选项中使用中文
5. 绝对禁止混合语言

📖 EXPLANATION RULES (SMART BALANCE):
1. "explanation" field: 主要使用中文，确保中国人能看得懂
2. 解析必须详细，至少150-200个中文字符
3. 💡 可以适当插入${languageName}单词或短语进行解释，但必须用中文说明其含义
4. 📝 例如："动词 'avoir'（拥有）在这里表示..." 或 "短语 'il y a'（有）的用法是..."
5. 🎯 重点：整体解析让中国学习者容易理解，适当的目标语言内容有助于学习
6. 必须包含语法分析、词汇解释、错误选项分析

�🚨🚨 CRITICAL: ANSWER ACCURACY AND CONSISTENCY VERIFICATION 🚨🚨🚨
⚠️ BEFORE FINALIZING EACH QUESTION, YOU MUST:
1. ✓ VERIFY the factual correctness of your answer - ensure you know the right answer with certainty
2. ✓ DOUBLE-CHECK that the "correctAnswer" field (A/B/C/D) matches the option containing the factually correct information
3. ✓ CROSS-VALIDATE that your explanation clearly states why the chosen answer is correct
4. ✓ ENSURE there is NO contradiction between the correctAnswer field and what you explain in the explanation field
5. ✓ If unsure about factual accuracy, DO NOT generate that question - create a different question instead

🔍 ANSWER CONSISTENCY SELF-CHECK (MANDATORY FOR EVERY QUESTION):
Before outputting each question, verify:
- "Is my correctAnswer field pointing to the factually correct option?"
- "Does my explanation support this choice as the correct answer?"
- "Are there any contradictions between my answer marking and my explanation?"
- If ANY concern exists → REVISE immediately before generating the question

🔍 LANGUAGE VERIFICATION CHECKLIST:
✅ 题目内容 = ${languageName} (${request.language.toUpperCase()}) ONLY
✅ 所有选项 = ${languageName} (${request.language.toUpperCase()}) ONLY  
✅ 正确答案 = ${languageName} (${request.language.toUpperCase()}) ONLY
✅ 详细解析 = 主要中文，可适当插入目标语言进行解释
✅ correctAnswer字段必须指向事实上正确的选项
✅ 解析必须清楚说明为什么该选项是正确答案
❌ 绝对不允许在题目和选项中混合语言
❌ 绝对不允许在题目中使用中文
✅ 解析中可适当使用目标语言单词配中文解释
❌ 绝对不允许答案字段与解析内容矛盾

🎯 QUESTION TYPE DIVERSITY REQUIREMENTS:
- 题目形式必须多样化，不能全部是选择题
- 可以包含：填空题、判断题、四选一选择题、排序题等
- 每个练习组应该包含至少2-3种不同的题型
- 根据语言特点选择合适的题型组合

Requirements:
- Target Language: ${languageName} (${request.language.toUpperCase()})
- Explanation Language: 主要中文，可适当插入目标语言进行解释
- Difficulty: ${difficultyLevel}
- Type: ${request.type}
- Question formats: 多样化题型 (填空题、判断题、选择题等)
- Include vocabulary words and grammar points for each question

🎯 ANSWER DISTRIBUTION REQUIREMENTS:
- 正确答案必须均匀分布在A、B、C、D四个选项中
- 避免答案过于集中（例如：不要出现10道题答案全是A的情况）
- 理想分布：每个选项（A/B/C/D）作为正确答案的次数应该相近
- 例如10道题：A出现2-3次，B出现2-3次，C出现2-3次，D出现2-3次

🧠 CONFUSION/DISTRACTOR STRATEGY:
- 当用户要求特定知识点的题目时，适当添加混淆项来检测理解深度
- 设计巧妙的干扰选项，测试用户是否对知识点有过于泛化的理解
- 包含相似但不同的语法结构、近义词、易混淆的用法等
- 例如：如果练习"过去时"，可以包含一些"现在完成时"的混淆选项
- 目标：帮助用户精确掌握知识点，避免模糊理解

`;

    if (userCapability) {
      prompt += `User's current capability:
- Overall level: ${userCapability.overallLevel}
- Vocabulary capability: ${userCapability.vocabularyCapability?.estimatedVocabularySize || 'Unknown'} words
- Grammar score: ${userCapability.grammarCapability?.overallGrammarScore || 'Unknown'}
- Strengths: ${userCapability.strengths?.join(', ') || 'None specified'}
- Weaknesses: ${userCapability.weaknesses?.join(', ') || 'None specified'}

`;
    }

    if (request.focusAreas && request.focusAreas.length > 0) {
      prompt += `Focus areas: ${request.focusAreas.join(', ')}\n`;
    }

    if (request.vocabularyWords && request.vocabularyWords.length > 0) {
      prompt += `Include these vocabulary words: ${request.vocabularyWords.join(', ')}\n`;
    }

    if (request.grammarPoints && request.grammarPoints.length > 0) {
      prompt += `Include these grammar points: ${request.grammarPoints.join(', ')}\n`;
    }

    // Add enhanced user requirements with high priority
    if (request.additionalPrompt) {
      prompt += `
🔥 PRIORITY USER REQUIREMENTS (WEIGHT: HIGH):
${request.additionalPrompt}

IMPORTANT: The above user requirements should be given HIGH PRIORITY in question generation. 
Ensure the generated questions strongly reflect these specific requirements while maintaining 
the language and difficulty standards.

`;
    }

    prompt += `
DETAILED EXPLANATION REQUIREMENTS:
Each explanation must include (in Chinese):
1. Detailed grammar analysis of the correct answer
2. Vocabulary meanings and usage
3. Grammar structure explanation with examples
4. Analysis of why wrong options are incorrect
5. Related language point extensions
6. Practical application scenarios and examples
7. At least 100 characters of detailed explanation

CRITICAL FORMATTING REQUIREMENTS - FOLLOW EXACTLY:
1. Return ONLY a valid JSON object - NO markdown, NO code blocks, NO extra text
2. Use EXACT field names and structure as shown below
3. "options" must be an ARRAY of strings in format ["A. text", "B. text", "C. text", "D. text"]
4. "correctAnswer" must be ONLY a single letter: "A", "B", "C", or "D"
5. "vocabularyWords" must be an ARRAY of strings, NOT objects
6. "grammarPoints" must be an ARRAY of strings
7. All explanations must be in detailed Chinese (中文) with at least 100 characters
8. DO NOT use object format for options like {"A": "text", "B": "text"}

REQUIRED JSON FORMAT (copy this structure EXACTLY - do not change anything):
{
  "title": "Practice group title",
  "description": "Brief description of the practice content",
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Question text in ${languageName}",
      "options": ["A. First option in ${languageName}", "B. Second option in ${languageName}", "C. Third option in ${languageName}", "D. Fourth option in ${languageName}"],
      "correctAnswer": "A",
      "explanation": "详细的中文解析，包含语法分析、词汇解释、语言点扩展等，至少100字",
      "vocabularyWords": ["word1", "word2", "word3"],
      "grammarPoints": ["grammar point 1", "grammar point 2"],
      "difficulty": 3
    }
  ]
}

STRICT VALIDATION CHECKLIST - MUST PASS ALL:
- ✓ JSON is valid and parseable
- ✓ Questions and options are in ${languageName} (target language)
- ✓ "options" is ARRAY (not object) with exactly 4 strings starting with "A.", "B.", "C.", "D."
- ✓ "correctAnswer" is single letter only (A, B, C, or D)
- ✓ "vocabularyWords" is array of strings (not objects with word/translation)
- ✓ "explanation" is in detailed Chinese with at least 100 characters
- ✓ NO markdown formatting anywhere
- ✓ NO object format for options
- ✓ CRITICAL: "correctAnswer" field MUST point to the option with factually correct information
- ✓ CRITICAL: "explanation" must clearly state why that specific option is the correct answer
- ✓ CRITICAL: NO contradiction between correctAnswer and explanation - they must be consistent!

Return ONLY the JSON object, nothing else.

🚨 FINAL CRITICAL REMINDER 🚨
- 题目和选项：必须100%使用${languageName}语言
- 解析说明：主要使用中文，可适当插入${languageName}单词或短语配中文解释
- 解析整体必须让中国学习者容易理解
- ⚠️ 最重要：correctAnswer字段必须指向事实上正确的答案选项，解析必须明确说明为什么该答案正确
- ⚠️ 严禁出现答案标记为A但解析说正确答案是C的矛盾情况！

Ensure exactly 10 questions are generated. Questions and options MUST be in ${languageName}. All explanations MUST be primarily in Chinese with appropriate ${languageName} terms explained in Chinese. IMPORTANT: Distribute correct answers evenly across A, B, C, D options. ${request.additionalPrompt ? 'PRIORITIZE the user requirements specified above.' : ''} Return ONLY the JSON object, no additional text or formatting.`;

    return prompt;
  }

  private async gatherComprehensiveUserData(request: ComprehensivePracticeRequest): Promise<any> {
    const data: any = {};
    
    if (request.includeCapabilityData !== false) {
      data.capability = await this.userCapabilityService.getUserCapability(request.userId, request.language);
    }
    
    // TODO: Add milestone and vocabulary data gathering when those services are implemented
    if (request.includeMilestones) {
      data.milestones = []; // Placeholder
    }
    
    if (request.includeVocabulary) {
      data.vocabulary = []; // Placeholder
    }
    
    return data;
  }
}
