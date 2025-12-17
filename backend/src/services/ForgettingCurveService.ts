import { Pool } from 'pg';
import { VocabularyWord, MasteryLevel, ForgettingCurveParams } from '../models/VocabularyWord';

export interface ReviewSchedule {
  wordId: string;
  nextReviewAt: Date;
  priority: number; // 1-10, higher = more urgent
  estimatedDifficulty: number;
}

export interface ForgettingCurveMetrics {
  retentionRate: number;
  averageInterval: number;
  successRate: number;
  totalReviews: number;
}

export interface ReviewReminder {
  userId: string;
  language: string;
  wordsCount: number;
  urgentWordsCount: number;
  scheduledFor: Date;
}

/**
 * Service implementing Ebbinghaus forgetting curve algorithm for spaced repetition
 * Implements requirements 10.1-10.5: 遗忘曲线算法和复习时间计�?
 */
export class ForgettingCurveService {
  constructor(private db: Pool) {}

  /**
   * Calculate next review time based on forgetting curve
   * Uses modified SM-2 algorithm (SuperMemo 2) with performance adjustments
   */
  calculateNextReview(word: VocabularyWord, practiceScore: number, responseTime: number): ReviewSchedule {
    const { initialStrength, decayRate, reviewCount, lastReviewScore } = word.forgettingCurveParams;
    
    // Performance factor: 0.0 to 2.0 based on score and response time
    const performanceFactor = this.calculatePerformanceFactor(practiceScore, responseTime);
    
    // Calculate new easiness factor (similar to SM-2)
    let easinessFactor = Math.max(1.3, initialStrength + (0.1 - (5 - performanceFactor) * (0.08 + (5 - performanceFactor) * 0.02)));
    
    // Calculate interval based on review count and performance
    let interval: number;
    
    if (reviewCount === 0) {
      interval = 1; // First review: 1 day
    } else if (reviewCount === 1) {
      interval = Math.round(6 * performanceFactor); // Second review: ~6 days if perfect
    } else {
      // Subsequent reviews: exponential growth with easiness factor
      const previousInterval = this.getPreviousInterval(word);
      interval = Math.round(previousInterval * easinessFactor * performanceFactor);
    }

    // Apply bounds and adjustments
    interval = this.applyIntervalBounds(interval, word.masteryLevel, reviewCount);
    
    // Calculate priority (1-10, higher = more urgent)
    const priority = this.calculateReviewPriority(word, interval, practiceScore);
    
    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);
    
    return {
      wordId: word.id,
      nextReviewAt,
      priority,
      estimatedDifficulty: this.estimateReviewDifficulty(word, interval)
    };
  }

  /**
   * Apply daily decay to vocabulary words based on forgetting curve
   * Implements natural forgetting process
   */
  async applyForgettingCurveDecay(words: VocabularyWord[]): Promise<VocabularyWord[]> {
    const updatedWords: VocabularyWord[] = [];
    
    for (const word of words) {
      if (word.masteryLevel === MasteryLevel.MASTERED) {
        updatedWords.push(word); // Don't decay mastered words
        continue;
      }

      const daysSinceLastReview = this.getDaysSinceLastReview(word);
      
      if (daysSinceLastReview > 0) {
        const decayedScore = this.calculateDecayedScore(word, daysSinceLastReview);
        const newMasteryLevel = this.determineMasteryLevelFromScore(decayedScore);
        
        // Update word with decayed values
        const updatedWord: VocabularyWord = {
          ...word,
          masteryScore: decayedScore,
          masteryLevel: newMasteryLevel
        };
        
        updatedWords.push(updatedWord);
      } else {
        updatedWords.push(word);
      }
    }
    
    return updatedWords;
  }

  /**
   * Get words that need review based on forgetting curve schedule
   */
  async getScheduledReviews(userId: string, language: string, limit: number = 50): Promise<ReviewSchedule[]> {
    const query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 
        AND next_review_at IS NOT NULL 
        AND next_review_at <= NOW()
        AND mastery_level != 'mastered'
      ORDER BY next_review_at ASC, mastery_score ASC
      LIMIT $3
    `;
    
    const result = await this.db.query(query, [userId, language, limit]);
    
    return result.rows.map(row => {
      const word = this.mapRowToVocabularyWord(row);
      return {
        wordId: word.id,
        nextReviewAt: word.nextReviewAt!,
        priority: this.calculateCurrentPriority(word),
        estimatedDifficulty: word.difficulty
      };
    });
  }

  /**
   * Generate review reminders for users
   */
  async generateReviewReminders(userId: string): Promise<ReviewReminder[]> {
    const languages = ['en', 'ja', 'fr'];
    const reminders: ReviewReminder[] = [];
    
    for (const language of languages) {
      const schedules = await this.getScheduledReviews(userId, language, 100);
      
      if (schedules.length > 0) {
        const urgentCount = schedules.filter(s => s.priority >= 8).length;
        
        reminders.push({
          userId,
          language,
          wordsCount: schedules.length,
          urgentWordsCount: urgentCount,
          scheduledFor: new Date()
        });
      }
    }
    
    return reminders;
  }

  /**
   * Get forgetting curve metrics for analysis
   */
  async getForgettingCurveMetrics(userId: string, language: string): Promise<ForgettingCurveMetrics> {
    const query = `
      SELECT 
        AVG(mastery_score) as avg_retention,
        AVG(EXTRACT(EPOCH FROM (next_review_at - last_reviewed_at)) / 86400) as avg_interval_days,
        AVG(last_review_score) as avg_success_rate,
        SUM(review_count) as total_reviews
      FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 AND review_count > 0
    `;
    
    const result = await this.db.query(query, [userId, language]);
    const row = result.rows[0];
    
    return {
      retentionRate: parseFloat(row.avg_retention) || 0,
      averageInterval: parseFloat(row.avg_interval_days) || 0,
      successRate: parseFloat(row.avg_success_rate) || 0,
      totalReviews: parseInt(row.total_reviews) || 0
    };
  }

  /**
   * Optimize review schedule based on user performance patterns
   */
  async optimizeReviewSchedule(userId: string, language: string): Promise<void> {
    // Get user's historical performance
    const metrics = await this.getForgettingCurveMetrics(userId, language);
    
    // Adjust forgetting curve parameters based on performance
    const adjustmentFactor = this.calculateScheduleAdjustment(metrics);
    
    // Update forgetting curve parameters for all words
    const updateQuery = `
      UPDATE vocabulary_words 
      SET 
        decay_rate = GREATEST(0.05, LEAST(0.3, decay_rate * $3)),
        initial_strength = GREATEST(1.0, LEAST(3.0, initial_strength * $4))
      WHERE user_id = $1 AND language = $2
    `;
    
    await this.db.query(updateQuery, [
      userId, 
      language, 
      adjustmentFactor.decayRateMultiplier,
      adjustmentFactor.strengthMultiplier
    ]);
  }

  /**
   * Calculate performance factor from practice results
   */
  private calculatePerformanceFactor(practiceScore: number, responseTime: number): number {
    // Base performance on score (0-100 -> 0-2.0)
    let performance = (practiceScore / 100) * 2.0;
    
    // Adjust for response time (faster = better, up to 5 seconds optimal)
    const timeBonus = Math.max(0, Math.min(0.5, (5000 - responseTime) / 10000));
    performance += timeBonus;
    
    // Ensure bounds
    return Math.max(0.0, Math.min(2.0, performance));
  }

  /**
   * Calculate decayed mastery score based on time elapsed
   */
  private calculateDecayedScore(word: VocabularyWord, daysSinceReview: number): number {
    const { decayRate } = word.forgettingCurveParams;
    
    // Exponential decay: R(t) = R(0) * e^(-t/S)
    // Where R(t) is retention at time t, S is strength parameter
    const strength = 1 / decayRate; // Convert decay rate to strength
    const retentionFactor = Math.exp(-daysSinceReview / strength);
    
    const decayedScore = word.masteryScore * retentionFactor;
    
    return Math.max(0, Math.round(decayedScore));
  }

  /**
   * Calculate review priority based on various factors
   */
  private calculateReviewPriority(word: VocabularyWord, interval: number, practiceScore: number): number {
    let priority = 5; // Base priority
    
    // Higher priority for lower mastery levels
    switch (word.masteryLevel) {
      case MasteryLevel.NEW:
        priority += 3;
        break;
      case MasteryLevel.LEARNING:
        priority += 2;
        break;
      case MasteryLevel.SHORT_TERM:
        priority += 1;
        break;
    }
    
    // Higher priority for difficult words
    priority += Math.min(2, word.difficulty / 5);
    
    // Higher priority for poor recent performance
    if (practiceScore < 60) {
      priority += 2;
    } else if (practiceScore < 80) {
      priority += 1;
    }
    
    // Lower priority for longer intervals (well-learned words)
    if (interval > 30) {
      priority -= 2;
    } else if (interval > 14) {
      priority -= 1;
    }
    
    return Math.max(1, Math.min(10, Math.round(priority)));
  }

  /**
   * Apply bounds to review intervals
   */
  private applyIntervalBounds(interval: number, masteryLevel: MasteryLevel, reviewCount: number): number {
    // Minimum intervals by mastery level
    const minIntervals = {
      [MasteryLevel.NEW]: 1,
      [MasteryLevel.LEARNING]: 1,
      [MasteryLevel.SHORT_TERM]: 2,
      [MasteryLevel.LONG_TERM]: 7,
      [MasteryLevel.MASTERED]: 30
    };
    
    // Maximum intervals by review count
    const maxInterval = Math.min(365, Math.pow(2, reviewCount + 3)); // Exponential cap
    
    const minInterval = minIntervals[masteryLevel];
    
    return Math.max(minInterval, Math.min(maxInterval, interval));
  }

  /**
   * Estimate difficulty of upcoming review
   */
  private estimateReviewDifficulty(word: VocabularyWord, interval: number): number {
    let difficulty = word.difficulty;
    
    // Longer intervals = potentially more difficult due to forgetting
    difficulty += Math.min(3, interval / 10);
    
    // Lower mastery = more difficult
    switch (word.masteryLevel) {
      case MasteryLevel.NEW:
        difficulty += 2;
        break;
      case MasteryLevel.LEARNING:
        difficulty += 1;
        break;
    }
    
    return Math.max(1, Math.min(10, Math.round(difficulty)));
  }

  /**
   * Get days since last review
   */
  private getDaysSinceLastReview(word: VocabularyWord): number {
    if (!word.lastReviewedAt) {
      return Math.floor((Date.now() - word.addedAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return Math.floor((Date.now() - word.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get previous interval for a word (estimated)
   */
  private getPreviousInterval(word: VocabularyWord): number {
    if (!word.lastReviewedAt || !word.nextReviewAt) {
      return 1; // Default for first review
    }
    
    const intervalMs = word.nextReviewAt.getTime() - word.lastReviewedAt.getTime();
    return Math.max(1, Math.round(intervalMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calculate current priority for existing scheduled review
   */
  private calculateCurrentPriority(word: VocabularyWord): number {
    const daysOverdue = word.nextReviewAt 
      ? Math.max(0, Math.floor((Date.now() - word.nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    
    let priority = 5;
    
    // Higher priority for overdue reviews
    priority += Math.min(3, daysOverdue);
    
    // Higher priority for lower mastery
    if (word.masteryScore < 30) priority += 2;
    else if (word.masteryScore < 60) priority += 1;
    
    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Determine mastery level from score
   */
  private determineMasteryLevelFromScore(score: number): MasteryLevel {
    if (score >= 90) return MasteryLevel.MASTERED;
    if (score >= 70) return MasteryLevel.LONG_TERM;
    if (score >= 50) return MasteryLevel.SHORT_TERM;
    if (score >= 25) return MasteryLevel.LEARNING;
    return MasteryLevel.NEW;
  }

  /**
   * Calculate schedule adjustment factors based on performance metrics
   */
  private calculateScheduleAdjustment(metrics: ForgettingCurveMetrics): { decayRateMultiplier: number; strengthMultiplier: number } {
    let decayRateMultiplier = 1.0;
    let strengthMultiplier = 1.0;
    
    // Adjust based on success rate
    if (metrics.successRate > 85) {
      // User is doing very well, can increase intervals
      decayRateMultiplier = 0.9; // Slower decay
      strengthMultiplier = 1.1;   // Higher strength
    } else if (metrics.successRate < 65) {
      // User struggling, decrease intervals
      decayRateMultiplier = 1.1; // Faster decay
      strengthMultiplier = 0.9;   // Lower strength
    }
    
    // Adjust based on retention rate
    if (metrics.retentionRate > 80) {
      strengthMultiplier *= 1.05;
    } else if (metrics.retentionRate < 60) {
      strengthMultiplier *= 0.95;
    }
    
    return { decayRateMultiplier, strengthMultiplier };
  }

  /**
   * Map database row to VocabularyWord object
   */
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
