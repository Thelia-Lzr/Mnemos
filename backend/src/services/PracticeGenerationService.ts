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

🚨 CRITICAL LANGUAGE REQUIREMENTS - MUST FOLLOW STRICTLY:
1. Question content (content) field: MUST be 100% in ${languageName} (${request.language.toUpperCase()})
2. All options (A, B, C, D): MUST be 100% in ${languageName} (${request.language.toUpperCase()})
3. correctAnswer field: MUST be in ${languageName} (${request.language.toUpperCase()})
4. Only add Chinese hints in parentheses if absolutely necessary for comprehension
5. Explanations (explanation) field: MUST be in detailed Chinese with at least 100-150 characters

⚠️ LANGUAGE VERIFICATION:
- Target language for questions and options: ${languageName} (${request.language.toUpperCase()})
- Explanation language: Chinese (zh)
- DO NOT mix languages in questions or options
- DO NOT use Chinese for question content or options

Requirements:
- Language: ${languageName}
- Difficulty: ${difficultyLevel}
- Type: ${request.type}
- Question format: Multiple choice with 4 options each
- Include vocabulary words and grammar points for each question
- Provide detailed explanations for correct answers

LANGUAGE USAGE EXAMPLES:
- Learning French: Question in French "Où est la bibliothèque?", options in French, explanation in detailed Chinese
- Learning English: Question in English "Where is the library?", options in English, explanation in detailed Chinese
- Learning German: Question in German "Wo ist die Bibliothek?", options in German, explanation in detailed Chinese

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

Return ONLY the JSON object, nothing else.

Ensure exactly 10 questions are generated. Questions and options MUST be in ${languageName}. All explanations MUST be in detailed Chinese. Return ONLY the JSON object, no additional text or formatting.`;

    return prompt;
  }

  private buildComprehensivePrompt(request: ComprehensivePracticeRequest, userData: any): string {
    const languageName = this.getLanguageName(request.language);
    
    let prompt = `Generate a comprehensive ${languageName} language assessment practice with exactly 10 questions.

CRITICAL LANGUAGE REQUIREMENTS:
1. Question content (content) must be STRICTLY in ${languageName} (the target language)
2. All options must be STRICTLY in ${languageName} (the target language)
3. Only add Chinese hints in parentheses if AI thinks the user needs to understand the question meaning
4. Explanations (explanation) must be in detailed Chinese, including deep grammar analysis, vocabulary explanation, and systematic language point expansion

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

Return ONLY the JSON object, nothing else.

Ensure exactly 10 questions are generated. Questions and options MUST be in ${languageName}. All explanations MUST be in detailed Chinese with comprehensive analysis. Return ONLY the JSON object, no additional text or formatting.`;

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

CRITICAL LANGUAGE REQUIREMENTS:
1. Question content (content) must be STRICTLY in ${languageName} (the target language)
2. All options must be STRICTLY in ${languageName} (the target language)
3. Only add Chinese hints in parentheses if AI thinks the user needs to understand the question meaning
4. Explanations (explanation) must be in detailed Chinese, including vocabulary analysis, usage explanation, and related knowledge expansion

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

Return ONLY the JSON object, nothing else.

Ensure exactly 10 questions are generated, focusing on the provided vocabulary words. Questions and options MUST be in ${languageName}. All explanations MUST be in detailed Chinese. Return ONLY the JSON object, no additional text or formatting.`;

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

🚨 CRITICAL LANGUAGE REQUIREMENTS - MUST FOLLOW STRICTLY:
1. Question content (content) field: MUST be 100% in ${languageName} (${request.language.toUpperCase()})
2. All options (A, B, C, D): MUST be 100% in ${languageName} (${request.language.toUpperCase()})
3. correctAnswer field: MUST be in ${languageName} (${request.language.toUpperCase()})
4. Only add Chinese hints in parentheses if absolutely necessary for comprehension
5. Explanations (explanation) field: MUST be in detailed Chinese with at least 100-150 characters

⚠️ LANGUAGE VERIFICATION:
- Target language for questions and options: ${languageName} (${request.language.toUpperCase()})
- Explanation language: Chinese (zh)
- DO NOT mix languages in questions or options
- DO NOT use Chinese for question content or options

Requirements:
- Language: ${languageName} (${request.language.toUpperCase()})
- Difficulty: ${difficultyLevel}
- Type: ${request.type}
- Question format: Multiple choice with 4 options each
- Include vocabulary words and grammar points for each question
- Provide detailed explanations for correct answers

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

Return ONLY the JSON object, nothing else.

Ensure exactly 10 questions are generated. Questions and options MUST be in ${languageName}. All explanations MUST be in detailed Chinese. ${request.additionalPrompt ? 'PRIORITIZE the user requirements specified above.' : ''} Return ONLY the JSON object, no additional text or formatting.`;

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
