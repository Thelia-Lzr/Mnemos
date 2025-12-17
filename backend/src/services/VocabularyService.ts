import { Pool } from 'pg';
import { VocabularyWordModel, VocabularyWord, CreateVocabularyWordData, UpdateVocabularyWordData, MasteryLevel, Language, MasteryStats, ForgettingCurveParams } from '../models/VocabularyWord';
import { UserCapabilityService } from './UserCapabilityService';
import { ForgettingCurveService, ReviewSchedule } from './ForgettingCurveService';

export interface WordExtractionResult {
  words: string[];
  extractedCount: number;
  duplicateCount: number;
  newWordsAdded: VocabularyWord[];
}

export interface MasteryUpdateResult {
  word: VocabularyWord;
  previousLevel: MasteryLevel;
  newLevel: MasteryLevel;
  scoreChange: number;
  shouldRemove: boolean;
}

export interface ForgettingCurveCalculation {
  nextReviewAt: Date;
  masteryScore: number;
  forgettingCurveParams: ForgettingCurveParams;
}

export class VocabularyService {
  private vocabularyModel: VocabularyWordModel;
  private userCapabilityService: UserCapabilityService;
  private forgettingCurveService: ForgettingCurveService;

  constructor(private db: Pool) {
    this.vocabularyModel = new VocabularyWordModel(db);
    const aiService = new (require('./AIService')).AIService();
    this.userCapabilityService = new UserCapabilityService(db, aiService);
    this.forgettingCurveService = new ForgettingCurveService(db);
  }

  /**
   * Extract vocabulary words from text content and add to user's vocabulary list
   * Implements requirement 14.1: 自动识别并将所有单词添加到用户生词�?
   */
  async extractAndAddWordsFromText(userId: string, text: string, language: Language): Promise<WordExtractionResult> {
    // Simple word extraction - in production, this would use more sophisticated NLP
    const words = this.extractWordsFromText(text, language);
    const uniqueWords = [...new Set(words)];
    
    const newWordsData: CreateVocabularyWordData[] = uniqueWords.map(word => ({
      userId,
      word: word.toLowerCase(),
      language,
      definition: `Definition for ${word}`, // In production, would fetch from dictionary API
      difficulty: this.estimateWordDifficulty(word),
      frequency: this.estimateWordFrequency(word)
    }));

    const newWordsAdded = await this.vocabularyModel.bulkCreate(newWordsData);
    
    // Update user capability vocabulary count
    await this.updateUserVocabularyStats(userId, language);

    return {
      words: uniqueWords,
      extractedCount: uniqueWords.length,
      duplicateCount: uniqueWords.length - newWordsAdded.length,
      newWordsAdded
    };
  }

  /**
   * Get user's vocabulary words with filtering and pagination
   */
  async getUserVocabulary(userId: string, language: Language, masteryLevel?: MasteryLevel): Promise<VocabularyWord[]> {
    let words = await this.vocabularyModel.findByUserAndLanguage(userId, language);
    
    if (masteryLevel) {
      words = words.filter(word => word.masteryLevel === masteryLevel);
    }
    
    return words;
  }

  /**
   * Update word mastery based on practice performance
   * Implements requirement 14.4: 根据答题表现更新相关单词的掌握程度评�?
   */
  async updateMasteryFromPractice(userId: string, wordId: string, practiceScore: number, responseTime: number): Promise<MasteryUpdateResult> {
    const word = await this.vocabularyModel.findById(wordId);
    if (!word || word.userId !== userId) {
      throw new Error('Word not found or access denied');
    }

    const previousLevel = word.masteryLevel;
    const previousScore = word.masteryScore;

    // Calculate new mastery score based on practice performance
    const scoreChange = this.calculateMasteryScoreChange(practiceScore, responseTime, word.masteryScore);
    const newScore = Math.max(0, Math.min(100, word.masteryScore + scoreChange));
    
    // Determine new mastery level
    const newLevel = this.determineMasteryLevel(newScore, word.masteryLevel);
    
    // Calculate next review time using forgetting curve
    const forgettingCurveCalc = this.calculateForgettingCurve(word, practiceScore, responseTime);
    
    // Update forgetting curve parameters
    const updatedParams: ForgettingCurveParams = {
      ...word.forgettingCurveParams,
      reviewCount: word.forgettingCurveParams.reviewCount + 1,
      lastReviewScore: practiceScore
    };

    const updateData: UpdateVocabularyWordData = {
      masteryScore: newScore,
      masteryLevel: newLevel,
      lastReviewedAt: new Date(),
      nextReviewAt: forgettingCurveCalc.nextReviewAt,
      forgettingCurveParams: updatedParams
    };

    const updatedWord = await this.vocabularyModel.update(wordId, updateData);
    if (!updatedWord) {
      throw new Error('Failed to update word');
    }

    // Check if word should be automatically removed (mastered for long time)
    const shouldRemove = this.shouldAutoRemoveWord(updatedWord);
    if (shouldRemove) {
      await this.vocabularyModel.delete(wordId);
    }

    // Update user capability stats
    await this.updateUserVocabularyStats(userId, word.language);

    return {
      word: updatedWord,
      previousLevel,
      newLevel,
      scoreChange,
      shouldRemove
    };
  }

  /**
   * Apply daily decay to all user's vocabulary words
   * Implements requirement 14.3: 自动降低生词表中单词的预估掌握程度，模拟自然遗忘过程
   */
  async applyDailyDecay(userId: string, language: Language): Promise<void> {
    const words = await this.vocabularyModel.findByUserAndLanguage(userId, language);
    
    // Use forgetting curve service for more accurate decay calculation
    const decayedWords = await this.forgettingCurveService.applyForgettingCurveDecay(words);
    
    // Update words that have changed
    for (let i = 0; i < words.length; i++) {
      const originalWord = words[i];
      const decayedWord = decayedWords[i];
      
      if (originalWord.masteryScore !== decayedWord.masteryScore || 
          originalWord.masteryLevel !== decayedWord.masteryLevel) {
        
        await this.vocabularyModel.update(originalWord.id, {
          masteryScore: decayedWord.masteryScore,
          masteryLevel: decayedWord.masteryLevel
        });
      }
    }

    await this.updateUserVocabularyStats(userId, language);
  }

  /**
   * Get words that need review based on forgetting curve
   */
  async getWordsNeedingReview(userId: string, language: Language, limit: number = 20): Promise<VocabularyWord[]> {
    return this.vocabularyModel.findWordsNeedingReview(userId, language, limit);
  }

  /**
   * Get mastery statistics for user's vocabulary
   */
  async getMasteryStats(userId: string, language: Language): Promise<MasteryStats> {
    return this.vocabularyModel.getMasteryStats(userId, language);
  }

  /**
   * Remove a word from user's vocabulary
   */
  async removeWord(userId: string, wordId: string): Promise<boolean> {
    const word = await this.vocabularyModel.findById(wordId);
    if (!word || word.userId !== userId) {
      return false;
    }

    const success = await this.vocabularyModel.delete(wordId);
    if (success) {
      await this.updateUserVocabularyStats(userId, word.language);
    }
    
    return success;
  }

  /**
   * Calculate forgetting curve for next review time using dedicated service
   */
  private calculateForgettingCurve(word: VocabularyWord, practiceScore: number, responseTime: number = 3000): ForgettingCurveCalculation {
    const reviewSchedule = this.forgettingCurveService.calculateNextReview(word, practiceScore, responseTime);
    
    // Update mastery score based on successful review
    const masteryBoost = Math.min(10, practiceScore / 10);
    const newMasteryScore = Math.min(100, word.masteryScore + masteryBoost);

    return {
      nextReviewAt: reviewSchedule.nextReviewAt,
      masteryScore: newMasteryScore,
      forgettingCurveParams: {
        ...word.forgettingCurveParams,
        reviewCount: word.forgettingCurveParams.reviewCount + 1,
        lastReviewScore: practiceScore
      }
    };
  }

  /**
   * Calculate mastery score change based on practice performance
   */
  private calculateMasteryScoreChange(practiceScore: number, responseTime: number, currentScore: number): number {
    // Base score change on practice performance (0-100)
    let scoreChange = (practiceScore - 50) / 5; // -10 to +10 range
    
    // Adjust for response time (faster = better, up to 5 seconds optimal)
    const timeBonus = Math.max(0, (5000 - responseTime) / 1000); // 0-5 bonus
    scoreChange += timeBonus;
    
    // Diminishing returns for high scores
    if (currentScore > 80) {
      scoreChange *= 0.5;
    } else if (currentScore > 60) {
      scoreChange *= 0.7;
    }
    
    return Math.round(scoreChange);
  }

  /**
   * Determine mastery level based on score
   */
  private determineMasteryLevel(score: number, currentLevel: MasteryLevel): MasteryLevel {
    if (score >= 90) return MasteryLevel.MASTERED;
    if (score >= 70) return MasteryLevel.LONG_TERM;
    if (score >= 50) return MasteryLevel.SHORT_TERM;
    if (score >= 25) return MasteryLevel.LEARNING;
    return MasteryLevel.NEW;
  }

  /**
   * Calculate daily decay amount based on forgetting curve
   */
  private calculateDecayAmount(word: VocabularyWord, daysSinceReview: number): number {
    const { decayRate } = word.forgettingCurveParams;
    
    // Exponential decay: score * (1 - decayRate)^days
    const decayFactor = Math.pow(1 - decayRate, daysSinceReview);
    const retainedScore = word.masteryScore * decayFactor;
    
    return word.masteryScore - retainedScore;
  }

  /**
   * Check if word should be automatically removed
   * Implements requirement 14.5: 自动将该单词从生词表中移�?
   */
  private shouldAutoRemoveWord(word: VocabularyWord): boolean {
    // Remove if mastered for more than 30 days and score > 95
    if (word.masteryLevel === MasteryLevel.MASTERED && word.masteryScore > 95) {
      const daysSinceMastery = word.lastReviewedAt 
        ? Math.floor((Date.now() - word.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return daysSinceMastery > 30;
    }
    
    return false;
  }

  /**
   * Extract words from text based on language
   */
  private extractWordsFromText(text: string, language: Language): string[] {
    // Simple word extraction - in production would use language-specific tokenizers
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleanText.split(/\s+/).filter(word => word.length > 2);
    
    // Filter out common stop words (simplified)
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return words.filter(word => !stopWords.has(word));
  }

  /**
   * Estimate word difficulty (1-10 scale)
   */
  private estimateWordDifficulty(word: string): number {
    // Simple heuristic based on word length and common patterns
    if (word.length <= 4) return 1;
    if (word.length <= 6) return 3;
    if (word.length <= 8) return 5;
    if (word.length <= 10) return 7;
    return 9;
  }

  /**
   * Estimate word frequency (1-10 scale)
   */
  private estimateWordFrequency(word: string): number {
    // Simple heuristic - in production would use frequency databases
    const commonWords = new Set(['time', 'person', 'year', 'way', 'day', 'thing', 'man', 'world', 'life', 'hand']);
    
    if (commonWords.has(word)) return 10;
    if (word.length <= 4) return 7;
    if (word.length <= 6) return 5;
    return 3;
  }

  /**
   * Get scheduled reviews using forgetting curve algorithm
   */
  async getScheduledReviews(userId: string, language: Language, limit: number = 50): Promise<ReviewSchedule[]> {
    return this.forgettingCurveService.getScheduledReviews(userId, language, limit);
  }

  /**
   * Generate review reminders for user
   */
  async generateReviewReminders(userId: string) {
    return this.forgettingCurveService.generateReviewReminders(userId);
  }

  /**
   * Get forgetting curve metrics for analysis
   */
  async getForgettingCurveMetrics(userId: string, language: Language) {
    return this.forgettingCurveService.getForgettingCurveMetrics(userId, language);
  }

  /**
   * Optimize review schedule based on user performance
   */
  async optimizeReviewSchedule(userId: string, language: Language): Promise<void> {
    await this.forgettingCurveService.optimizeReviewSchedule(userId, language);
  }

  /**
   * Update user capability vocabulary statistics
   */
  private async updateUserVocabularyStats(userId: string, language: Language): Promise<void> {
    const stats = await this.getMasteryStats(userId, language);
    
    // For now, just log the stats update - in production this would update user capabilities
    console.log(`Updated vocabulary stats for user ${userId} in ${language}:`, {
      estimatedVocabularySize: stats.totalWords,
      masteredWordsCount: stats.masteredWords,
      learningWordsCount: stats.learningWords + stats.shortTermWords + stats.longTermWords
    });
  }
}
