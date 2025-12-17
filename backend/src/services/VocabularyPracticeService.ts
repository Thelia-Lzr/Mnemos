import { Pool } from 'pg';
import { VocabularyService } from './VocabularyService';
import { PracticeGenerationService } from './PracticeGenerationService';
import { VocabularyWord, Language, MasteryLevel } from '../models/VocabularyWord';

export interface VocabularyPracticeOptions {
  userId: string;
  language: Language;
  wordIds?: string[];
  masteryLevels?: MasteryLevel[];
  maxWords?: number;
  focusOnWeakWords?: boolean;
  includeReviewWords?: boolean;
}

export interface VocabularyPracticeGroup {
  id: string;
  title: string;
  description: string;
  words: VocabularyWord[];
  questions: VocabularyQuestion[];
  estimatedDuration: number;
  focusAreas: string[];
}

export interface VocabularyQuestion {
  id: string;
  type: VocabularyQuestionType;
  targetWord: VocabularyWord;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
}

export enum VocabularyQuestionType {
  DEFINITION_TO_WORD = 'definition_to_word',
  WORD_TO_DEFINITION = 'word_to_definition',
  FILL_IN_BLANK = 'fill_in_blank',
  SYNONYM_ANTONYM = 'synonym_antonym',
  USAGE_IN_CONTEXT = 'usage_in_context'
}

export interface PracticeResult {
  wordId: string;
  questionType: VocabularyQuestionType;
  isCorrect: boolean;
  responseTime: number;
  score: number;
}

export interface LearningEfficiencyMetrics {
  wordsLearned: number;
  averageLearningTime: number;
  retentionRate: number;
  masteryProgression: number;
  weaknessAreas: string[];
}

/**
 * Service for generating vocabulary-based practice exercises
 * Implements requirements 14.4, 14.5, 14.8, 14.9
 */
export class VocabularyPracticeService {
  private vocabularyService: VocabularyService;
  private practiceGenerationService: PracticeGenerationService;

  constructor(private db: Pool) {
    this.vocabularyService = new VocabularyService(db);
    // Initialize dependencies for PracticeGenerationService
    const aiService = new (require('./AIService')).AIService(db);
    const creditService = new (require('./CreditService')).CreditService(db);
    const asyncTaskManager = (require('./AsyncTaskManager')).AsyncTaskManager.getInstance();
    const userCapabilityService = new (require('./UserCapabilityService')).UserCapabilityService(db, aiService);
    const openRouterService = new (require('./OpenRouterService')).OpenRouterService();
    
    this.practiceGenerationService = new PracticeGenerationService(
      db,
      userCapabilityService,
      creditService,
      asyncTaskManager,
      openRouterService
    );
  }

  /**
   * Generate practice group based on user's vocabulary
   * Implements requirement 14.4: 创建基于生词表的练习生成
   */
  async generateVocabularyPracticeGroup(options: VocabularyPracticeOptions): Promise<VocabularyPracticeGroup> {
    const { userId, language, wordIds, masteryLevels, maxWords = 10, focusOnWeakWords = true, includeReviewWords = true } = options;

    // Get target words for practice
    let targetWords: VocabularyWord[];
    
    if (wordIds && wordIds.length > 0) {
      // Use specific words if provided
      targetWords = await this.getWordsByIds(wordIds, userId);
    } else {
      // Select words based on criteria
      targetWords = await this.selectWordsForPractice(userId, language, {
        masteryLevels,
        maxWords,
        focusOnWeakWords,
        includeReviewWords
      });
    }

    if (targetWords.length === 0) {
      throw new Error('No vocabulary words available for practice');
    }

    // Generate questions for selected words
    const questions = await this.generateQuestionsForWords(targetWords);

    // Create practice group
    const practiceGroup: VocabularyPracticeGroup = {
      id: this.generateId(),
      title: `Vocabulary Practice - ${language.toUpperCase()}`,
      description: `Practice session with ${targetWords.length} vocabulary words`,
      words: targetWords,
      questions,
      estimatedDuration: Math.ceil(questions.length * 1.5), // 1.5 minutes per question
      focusAreas: this.determineFocusAreas(targetWords)
    };

    return practiceGroup;
  }

  /**
   * Process practice results and update word mastery
   * Implements requirement 14.5: 实现练习结果反馈到掌握度
   */
  async processPracticeResults(userId: string, results: PracticeResult[]): Promise<void> {
    for (const result of results) {
      // Calculate practice score based on correctness and response time
      const practiceScore = this.calculatePracticeScore(result);
      
      // Update word mastery using vocabulary service
      const updateResult = await this.vocabularyService.updateMasteryFromPractice(
        userId,
        result.wordId,
        practiceScore,
        result.responseTime
      );

      // Check if word should be automatically removed
      if (updateResult.shouldRemove) {
        console.log(`Word ${updateResult.word.word} automatically removed from vocabulary (mastered)`);
      }
    }

    // Update learning efficiency metrics
    await this.updateLearningEfficiencyMetrics(userId, results);
  }

  /**
   * Get words that need review based on forgetting curve
   */
  async getWordsForReview(userId: string, language: Language, limit: number = 20): Promise<VocabularyWord[]> {
    return this.vocabularyService.getWordsNeedingReview(userId, language, limit);
  }

  /**
   * Track learning efficiency metrics
   * Implements requirement 14.9: 建立词汇学习效率跟踪
   */
  async getLearningEfficiencyMetrics(userId: string, language: Language, days: number = 30): Promise<LearningEfficiencyMetrics> {
    const query = `
      WITH recent_practice AS (
        SELECT 
          vw.id,
          vw.word,
          vw.mastery_level,
          vw.mastery_score,
          vw.added_at,
          vw.last_reviewed_at,
          vw.review_count
        FROM vocabulary_words vw
        WHERE vw.user_id = $1 
          AND vw.language = $2 
          AND vw.last_reviewed_at >= NOW() - INTERVAL '$3 days'
      ),
      mastery_changes AS (
        SELECT 
          COUNT(*) as words_practiced,
          AVG(EXTRACT(EPOCH FROM (last_reviewed_at - added_at)) / 86400) as avg_learning_days,
          COUNT(CASE WHEN mastery_level IN ('long_term', 'mastered') THEN 1 END) as retained_words,
          COUNT(CASE WHEN mastery_score < 50 THEN 1 END) as struggling_words
        FROM recent_practice
      )
      SELECT * FROM mastery_changes
    `;

    const result = await this.db.query(query, [userId, language, days]);
    const row = result.rows[0];

    const wordsPracticed = parseInt(row.words_practiced) || 0;
    const retainedWords = parseInt(row.retained_words) || 0;
    const strugglingWords = parseInt(row.struggling_words) || 0;

    return {
      wordsLearned: wordsPracticed,
      averageLearningTime: parseFloat(row.avg_learning_days) || 0,
      retentionRate: wordsPracticed > 0 ? (retainedWords / wordsPracticed) * 100 : 0,
      masteryProgression: this.calculateMasteryProgression(wordsPracticed, retainedWords),
      weaknessAreas: await this.identifyWeaknessAreas(userId, language)
    };
  }

  /**
   * Generate adaptive practice based on user performance
   */
  async generateAdaptivePractice(userId: string, language: Language): Promise<VocabularyPracticeGroup> {
    // Get user's learning efficiency metrics
    const metrics = await this.getLearningEfficiencyMetrics(userId, language);
    
    // Select words based on performance patterns
    const targetWords = await this.selectAdaptiveWords(userId, language, metrics);
    
    // Generate questions with adaptive difficulty
    const questions = await this.generateAdaptiveQuestions(targetWords, metrics);

    return {
      id: this.generateId(),
      title: `Adaptive Vocabulary Practice - ${language.toUpperCase()}`,
      description: `Personalized practice based on your learning patterns`,
      words: targetWords,
      questions,
      estimatedDuration: Math.ceil(questions.length * 1.2), // Adaptive timing
      focusAreas: metrics.weaknessAreas
    };
  }

  /**
   * Select words for practice based on various criteria
   */
  private async selectWordsForPractice(
    userId: string, 
    language: Language, 
    options: {
      masteryLevels?: MasteryLevel[];
      maxWords: number;
      focusOnWeakWords: boolean;
      includeReviewWords: boolean;
    }
  ): Promise<VocabularyWord[]> {
    let query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2
    `;
    const params: any[] = [userId, language];
    let paramIndex = 3;

    // Filter by mastery levels if specified
    if (options.masteryLevels && options.masteryLevels.length > 0) {
      query += ` AND mastery_level = ANY($${paramIndex++})`;
      params.push(options.masteryLevels);
    }

    // Include review words if specified
    if (options.includeReviewWords) {
      query += ` AND (next_review_at IS NULL OR next_review_at <= NOW())`;
    }

    // Order by priority
    if (options.focusOnWeakWords) {
      query += ` ORDER BY mastery_score ASC, last_reviewed_at ASC NULLS FIRST`;
    } else {
      query += ` ORDER BY RANDOM()`;
    }

    query += ` LIMIT $${paramIndex}`;
    params.push(options.maxWords);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToVocabularyWord(row));
  }

  /**
   * Generate questions for vocabulary words
   */
  private async generateQuestionsForWords(words: VocabularyWord[]): Promise<VocabularyQuestion[]> {
    const questions: VocabularyQuestion[] = [];

    for (const word of words) {
      // Generate 1-2 questions per word based on mastery level
      const questionCount = word.masteryLevel === MasteryLevel.NEW ? 2 : 1;
      
      for (let i = 0; i < questionCount; i++) {
        const questionType = this.selectQuestionType(word, i);
        const question = await this.generateQuestion(word, questionType);
        questions.push(question);
      }
    }

    // Shuffle questions for variety
    return this.shuffleArray(questions);
  }

  /**
   * Select appropriate question type based on word and mastery level
   */
  private selectQuestionType(word: VocabularyWord, questionIndex: number): VocabularyQuestionType {
    const types = [
      VocabularyQuestionType.DEFINITION_TO_WORD,
      VocabularyQuestionType.WORD_TO_DEFINITION,
      VocabularyQuestionType.FILL_IN_BLANK,
      VocabularyQuestionType.USAGE_IN_CONTEXT
    ];

    // For new words, start with basic definition questions
    if (word.masteryLevel === MasteryLevel.NEW) {
      return questionIndex === 0 
        ? VocabularyQuestionType.WORD_TO_DEFINITION 
        : VocabularyQuestionType.DEFINITION_TO_WORD;
    }

    // For more advanced words, use varied question types
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Generate a specific question for a word
   */
  private async generateQuestion(word: VocabularyWord, type: VocabularyQuestionType): Promise<VocabularyQuestion> {
    const questionId = this.generateId();
    
    switch (type) {
      case VocabularyQuestionType.WORD_TO_DEFINITION:
        return this.generateWordToDefinitionQuestion(questionId, word);
      
      case VocabularyQuestionType.DEFINITION_TO_WORD:
        return this.generateDefinitionToWordQuestion(questionId, word);
      
      case VocabularyQuestionType.FILL_IN_BLANK:
        return this.generateFillInBlankQuestion(questionId, word);
      
      case VocabularyQuestionType.USAGE_IN_CONTEXT:
        return this.generateUsageInContextQuestion(questionId, word);
      
      default:
        return this.generateWordToDefinitionQuestion(questionId, word);
    }
  }

  /**
   * Generate word-to-definition question
   */
  private generateWordToDefinitionQuestion(id: string, word: VocabularyWord): VocabularyQuestion {
    const distractors = this.generateDefinitionDistractors(word);
    const options = this.shuffleArray([word.definition || `Definition of ${word.word}`, ...distractors]);
    
    return {
      id,
      type: VocabularyQuestionType.WORD_TO_DEFINITION,
      targetWord: word,
      question: `What is the definition of "${word.word}"?`,
      options,
      correctAnswer: word.definition || `Definition of ${word.word}`,
      explanation: `"${word.word}" means: ${word.definition}`,
      difficulty: word.difficulty
    };
  }

  /**
   * Generate definition-to-word question
   */
  private generateDefinitionToWordQuestion(id: string, word: VocabularyWord): VocabularyQuestion {
    const distractors = this.generateWordDistractors(word);
    const options = this.shuffleArray([word.word, ...distractors]);
    
    return {
      id,
      type: VocabularyQuestionType.DEFINITION_TO_WORD,
      targetWord: word,
      question: `Which word matches this definition: "${word.definition}"?`,
      options,
      correctAnswer: word.word,
      explanation: `The word "${word.word}" matches the given definition.`,
      difficulty: word.difficulty
    };
  }

  /**
   * Generate fill-in-the-blank question
   */
  private generateFillInBlankQuestion(id: string, word: VocabularyWord): VocabularyQuestion {
    const sentence = this.generateSentenceWithWord(word);
    const blankedSentence = sentence.replace(new RegExp(word.word, 'gi'), '______');
    const distractors = this.generateWordDistractors(word);
    const options = this.shuffleArray([word.word, ...distractors]);
    
    return {
      id,
      type: VocabularyQuestionType.FILL_IN_BLANK,
      targetWord: word,
      question: `Fill in the blank: ${blankedSentence}`,
      options,
      correctAnswer: word.word,
      explanation: `The correct word is "${word.word}" which fits the context of the sentence.`,
      difficulty: word.difficulty + 1
    };
  }

  /**
   * Generate usage-in-context question
   */
  private generateUsageInContextQuestion(id: string, word: VocabularyWord): VocabularyQuestion {
    const correctSentence = this.generateSentenceWithWord(word);
    const incorrectSentences = this.generateIncorrectSentences(word);
    const options = this.shuffleArray([correctSentence, ...incorrectSentences]);
    
    return {
      id,
      type: VocabularyQuestionType.USAGE_IN_CONTEXT,
      targetWord: word,
      question: `Which sentence uses "${word.word}" correctly?`,
      options,
      correctAnswer: correctSentence,
      explanation: `This sentence demonstrates the proper usage of "${word.word}" in context.`,
      difficulty: word.difficulty + 2
    };
  }

  /**
   * Calculate practice score based on correctness and response time
   */
  private calculatePracticeScore(result: PracticeResult): number {
    if (!result.isCorrect) {
      return 0;
    }

    let score = 100; // Base score for correct answer
    
    // Adjust for response time (faster = better, up to 10 seconds optimal)
    const optimalTime = 10000; // 10 seconds
    if (result.responseTime <= optimalTime) {
      score += Math.round((optimalTime - result.responseTime) / 1000); // Bonus for speed
    } else {
      score -= Math.round((result.responseTime - optimalTime) / 2000); // Penalty for slowness
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Helper methods for question generation
   */
  private generateDefinitionDistractors(word: VocabularyWord): string[] {
    // In production, this would use a more sophisticated approach
    return [
      `A type of ${word.partOfSpeech || 'word'}`,
      `Something related to ${word.word.substring(0, 3)}...`,
      `An alternative meaning of ${word.word}`
    ];
  }

  private generateWordDistractors(word: VocabularyWord): string[] {
    // In production, this would use semantic similarity
    const baseWord = word.word;
    return [
      baseWord + 's',
      baseWord.substring(0, -1) + 'ing',
      baseWord + 'ed'
    ].filter(w => w !== baseWord).slice(0, 3);
  }

  private generateSentenceWithWord(word: VocabularyWord): string {
    // Simple sentence generation - in production would use more sophisticated NLP
    const templates = [
      `The ${word.word} was very important in the discussion.`,
      `She decided to ${word.word} before making a decision.`,
      `The concept of ${word.word} is fundamental to understanding.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateIncorrectSentences(word: VocabularyWord): string[] {
    return [
      `The ${word.word} flew over the mountain.`,
      `He ate the ${word.word} for breakfast.`,
      `The ${word.word} was painted blue.`
    ];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private determineFocusAreas(words: VocabularyWord[]): string[] {
    const areas = new Set<string>();
    
    words.forEach(word => {
      if (word.partOfSpeech) areas.add(word.partOfSpeech);
      if (word.difficulty > 7) areas.add('advanced_vocabulary');
      if (word.masteryLevel === MasteryLevel.NEW) areas.add('new_words');
    });
    
    return Array.from(areas);
  }

  private calculateMasteryProgression(wordsPracticed: number, retainedWords: number): number {
    if (wordsPracticed === 0) return 0;
    return (retainedWords / wordsPracticed) * 100;
  }

  private async identifyWeaknessAreas(userId: string, language: string): Promise<string[]> {
    const query = `
      SELECT part_of_speech, AVG(mastery_score) as avg_score
      FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 AND part_of_speech IS NOT NULL
      GROUP BY part_of_speech
      HAVING AVG(mastery_score) < 60
      ORDER BY avg_score ASC
    `;
    
    const result = await this.db.query(query, [userId, language]);
    return result.rows.map(row => row.part_of_speech);
  }

  private async selectAdaptiveWords(userId: string, language: Language, metrics: LearningEfficiencyMetrics): Promise<VocabularyWord[]> {
    // Select words based on learning efficiency patterns
    let query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2
    `;
    
    if (metrics.retentionRate < 70) {
      // Focus on easier words if retention is low
      query += ` AND difficulty <= 5 AND mastery_level IN ('new', 'learning')`;
    } else {
      // Include more challenging words if doing well
      query += ` AND (difficulty > 5 OR mastery_level IN ('short_term', 'long_term'))`;
    }
    
    query += ` ORDER BY mastery_score ASC LIMIT 10`;
    
    const result = await this.db.query(query, [userId, language]);
    return result.rows.map(row => this.mapRowToVocabularyWord(row));
  }

  private async generateAdaptiveQuestions(words: VocabularyWord[], metrics: LearningEfficiencyMetrics): Promise<VocabularyQuestion[]> {
    const questions: VocabularyQuestion[] = [];
    
    for (const word of words) {
      // Adjust question difficulty based on user performance
      const questionType = metrics.retentionRate > 80 
        ? VocabularyQuestionType.USAGE_IN_CONTEXT 
        : VocabularyQuestionType.WORD_TO_DEFINITION;
      
      const question = await this.generateQuestion(word, questionType);
      questions.push(question);
    }
    
    return questions;
  }

  private async updateLearningEfficiencyMetrics(userId: string, results: PracticeResult[]): Promise<void> {
    // This would update learning analytics in the database
    // For now, we'll just log the metrics
    const correctAnswers = results.filter(r => r.isCorrect).length;
    const accuracy = (correctAnswers / results.length) * 100;
    
    console.log(`User ${userId} practice session: ${accuracy}% accuracy, ${results.length} questions`);
  }

  private async getWordsByIds(wordIds: string[], userId: string): Promise<VocabularyWord[]> {
    const query = `
      SELECT * FROM vocabulary_words 
      WHERE id = ANY($1) AND user_id = $2
    `;
    
    const result = await this.db.query(query, [wordIds, userId]);
    return result.rows.map(row => this.mapRowToVocabularyWord(row));
  }

  private mapRowToVocabularyWord(row: any): VocabularyWord {
    return {
      id: row.id,
      userId: row.user_id,
      word: row.word,
      language: row.language,
      definition: row.definition,
      pronunciation: row.pronunciation,
      partOfSpeech: row.part_of_speech,
      difficulty: row.difficulty,
      frequency: row.frequency,
      masteryLevel: row.mastery_level,
      masteryScore: row.mastery_score,
      lastReviewedAt: row.last_reviewed_at,
      nextReviewAt: row.next_review_at,
      addedAt: row.added_at,
      firstEncounteredAt: row.first_encountered_at,
      forgettingCurveParams: {
        initialStrength: row.initial_strength,
        decayRate: row.decay_rate,
        reviewCount: row.review_count,
        lastReviewScore: row.last_review_score
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
