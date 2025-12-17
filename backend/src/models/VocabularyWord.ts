import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export enum MasteryLevel {
  NEW = 'new',
  LEARNING = 'learning',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  MASTERED = 'mastered'
}

export enum Language {
  ENGLISH = 'en',
  JAPANESE = 'ja',
  FRENCH = 'fr'
}

export interface ForgettingCurveParams {
  initialStrength: number;
  decayRate: number;
  reviewCount: number;
  lastReviewScore: number;
}

export interface VocabularyWord {
  id: string;
  userId: string;
  word: string;
  language: Language;
  definition?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  difficulty: number;
  frequency: number;
  masteryLevel: MasteryLevel;
  masteryScore: number;
  lastReviewedAt?: Date;
  nextReviewAt?: Date;
  addedAt: Date;
  firstEncounteredAt: Date;
  forgettingCurveParams: ForgettingCurveParams;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVocabularyWordData {
  userId: string;
  word: string;
  language: Language;
  definition?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  difficulty?: number;
  frequency?: number;
}

export interface UpdateVocabularyWordData {
  definition?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  difficulty?: number;
  frequency?: number;
  masteryLevel?: MasteryLevel;
  masteryScore?: number;
  lastReviewedAt?: Date;
  nextReviewAt?: Date;
  forgettingCurveParams?: Partial<ForgettingCurveParams>;
}

export interface VocabularyPracticeRecord {
  practiceId: string;
  score: number;
  timeSpent: number;
  practiceType: string;
  practiceDate: Date;
}

export interface MasteryStats {
  totalWords: number;
  newWords: number;
  learningWords: number;
  shortTermWords: number;
  longTermWords: number;
  masteredWords: number;
  averageMasteryScore: number;
  wordsNeedingReview: number;
  dailyReviewTarget: number;
}

export class VocabularyWordModel {
  constructor(private db: Pool) {}

  async create(data: CreateVocabularyWordData): Promise<VocabularyWord> {
    const id = uuidv4();
    const now = new Date();
    
    const forgettingCurveParams: ForgettingCurveParams = {
      initialStrength: 1.0,
      decayRate: 0.1,
      reviewCount: 0,
      lastReviewScore: 0
    };

    const query = `
      INSERT INTO vocabulary_words (
        id, user_id, word, language, definition, pronunciation, part_of_speech,
        difficulty, frequency, mastery_level, mastery_score, added_at, first_encountered_at,
        initial_strength, decay_rate, review_count, last_review_score, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      id,
      data.userId,
      data.word,
      data.language,
      data.definition || null,
      data.pronunciation || null,
      data.partOfSpeech || null,
      data.difficulty || 1,
      data.frequency || 1,
      MasteryLevel.NEW,
      0, // initial mastery score
      now, // added_at
      now, // first_encountered_at
      forgettingCurveParams.initialStrength,
      forgettingCurveParams.decayRate,
      forgettingCurveParams.reviewCount,
      forgettingCurveParams.lastReviewScore,
      now, // created_at
      now  // updated_at
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToVocabularyWord(result.rows[0]);
  }

  async findByUserAndLanguage(userId: string, language: Language): Promise<VocabularyWord[]> {
    const query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 
      ORDER BY added_at DESC
    `;
    
    const result = await this.db.query(query, [userId, language]);
    return result.rows.map(row => this.mapRowToVocabularyWord(row));
  }

  async findById(id: string): Promise<VocabularyWord | null> {
    const query = 'SELECT * FROM vocabulary_words WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToVocabularyWord(result.rows[0]);
  }

  async findByUserWordAndLanguage(userId: string, word: string, language: Language): Promise<VocabularyWord | null> {
    const query = 'SELECT * FROM vocabulary_words WHERE user_id = $1 AND word = $2 AND language = $3';
    const result = await this.db.query(query, [userId, word, language]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToVocabularyWord(result.rows[0]);
  }

  async update(id: string, data: UpdateVocabularyWordData): Promise<VocabularyWord | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'forgettingCurveParams') {
          // Handle forgetting curve params separately
          const params = value as Partial<ForgettingCurveParams>;
          if (params.initialStrength !== undefined) {
            setClause.push(`initial_strength = $${paramIndex++}`);
            values.push(params.initialStrength);
          }
          if (params.decayRate !== undefined) {
            setClause.push(`decay_rate = $${paramIndex++}`);
            values.push(params.decayRate);
          }
          if (params.reviewCount !== undefined) {
            setClause.push(`review_count = $${paramIndex++}`);
            values.push(params.reviewCount);
          }
          if (params.lastReviewScore !== undefined) {
            setClause.push(`last_review_score = $${paramIndex++}`);
            values.push(params.lastReviewScore);
          }
        } else {
          // Map camelCase to snake_case
          const columnName = this.camelToSnakeCase(key);
          setClause.push(`${columnName} = $${paramIndex++}`);
          values.push(value);
        }
      }
    });

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE vocabulary_words 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToVocabularyWord(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM vocabulary_words WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async findWordsNeedingReview(userId: string, language: Language, limit: number = 50): Promise<VocabularyWord[]> {
    const query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 
        AND next_review_at IS NOT NULL 
        AND next_review_at <= NOW()
        AND mastery_level != 'mastered'
      ORDER BY next_review_at ASC
      LIMIT $3
    `;
    
    const result = await this.db.query(query, [userId, language, limit]);
    return result.rows.map(row => this.mapRowToVocabularyWord(row));
  }

  async getMasteryStats(userId: string, language: Language): Promise<MasteryStats> {
    const query = `
      SELECT 
        COUNT(*) as total_words,
        COUNT(CASE WHEN mastery_level = 'new' THEN 1 END) as new_words,
        COUNT(CASE WHEN mastery_level = 'learning' THEN 1 END) as learning_words,
        COUNT(CASE WHEN mastery_level = 'short_term' THEN 1 END) as short_term_words,
        COUNT(CASE WHEN mastery_level = 'long_term' THEN 1 END) as long_term_words,
        COUNT(CASE WHEN mastery_level = 'mastered' THEN 1 END) as mastered_words,
        AVG(mastery_score) as average_mastery_score,
        COUNT(CASE WHEN next_review_at IS NOT NULL AND next_review_at <= NOW() THEN 1 END) as words_needing_review
      FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2
    `;
    
    const result = await this.db.query(query, [userId, language]);
    const row = result.rows[0];
    
    return {
      totalWords: parseInt(row.total_words) || 0,
      newWords: parseInt(row.new_words) || 0,
      learningWords: parseInt(row.learning_words) || 0,
      shortTermWords: parseInt(row.short_term_words) || 0,
      longTermWords: parseInt(row.long_term_words) || 0,
      masteredWords: parseInt(row.mastered_words) || 0,
      averageMasteryScore: parseFloat(row.average_mastery_score) || 0,
      wordsNeedingReview: parseInt(row.words_needing_review) || 0,
      dailyReviewTarget: Math.min(20, parseInt(row.words_needing_review) || 0) // Target 20 words per day
    };
  }

  async bulkCreate(words: CreateVocabularyWordData[]): Promise<VocabularyWord[]> {
    if (words.length === 0) {
      return [];
    }

    const now = new Date();
    const forgettingCurveParams: ForgettingCurveParams = {
      initialStrength: 1.0,
      decayRate: 0.1,
      reviewCount: 0,
      lastReviewScore: 0
    };

    // Build bulk insert query
    const valuesClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    words.forEach((word) => {
      const id = uuidv4();
      valuesClauses.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      
      values.push(
        id,
        word.userId,
        word.word,
        word.language,
        word.definition || null,
        word.pronunciation || null,
        word.partOfSpeech || null,
        word.difficulty || 1,
        word.frequency || 1,
        MasteryLevel.NEW,
        0, // initial mastery score
        now, // added_at
        now, // first_encountered_at
        forgettingCurveParams.initialStrength,
        forgettingCurveParams.decayRate,
        forgettingCurveParams.reviewCount,
        forgettingCurveParams.lastReviewScore,
        now, // created_at
        now  // updated_at
      );
    });

    const query = `
      INSERT INTO vocabulary_words (
        id, user_id, word, language, definition, pronunciation, part_of_speech,
        difficulty, frequency, mastery_level, mastery_score, added_at, first_encountered_at,
        initial_strength, decay_rate, review_count, last_review_score, created_at, updated_at
      ) VALUES ${valuesClauses.join(', ')}
      ON CONFLICT (user_id, word, language) DO NOTHING
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToVocabularyWord(row));
  }

  private mapRowToVocabularyWord(row: any): VocabularyWord {
    return {
      id: row.id,
      userId: row.user_id,
      word: row.word,
      language: row.language as Language,
      definition: row.definition,
      pronunciation: row.pronunciation,
      partOfSpeech: row.part_of_speech,
      difficulty: row.difficulty,
      frequency: row.frequency,
      masteryLevel: row.mastery_level as MasteryLevel,
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

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
