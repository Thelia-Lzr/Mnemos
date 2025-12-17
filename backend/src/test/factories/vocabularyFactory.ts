import { v4 as uuidv4 } from 'uuid';
import { Language, MasteryLevel } from '../../models/VocabularyWord';

export interface TestVocabularyWord {
  id: string;
  userId: string;
  word: string;
  language: Language;
  definition: string;
  masteryLevel: MasteryLevel;
  masteryScore: number;
  addedAt: Date;
  lastReviewedAt?: Date;
  difficulty: number;
  frequency: number;
  firstEncounteredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  forgettingCurveParams: {
    initialStrength: number;
    decayRate: number;
    reviewCount: number;
    lastReviewScore: number;
  };
}

export interface CreateVocabularyWordOptions {
  userId?: string;
  word?: string;
  language?: Language;
  definition?: string;
  masteryLevel?: MasteryLevel;
  masteryScore?: number;
}

export class VocabularyFactory {
  static create(options: CreateVocabularyWordOptions = {}): TestVocabularyWord {
    const id = uuidv4();
    const userId = options.userId || uuidv4();
    const word = options.word || `word_${Date.now()}`;
    const language = options.language || Language.ENGLISH;
    const definition = options.definition || `Definition of ${word}`;
    const masteryLevel = options.masteryLevel || MasteryLevel.NEW;
    const masteryScore = options.masteryScore || 0;
    const addedAt = new Date();
    
    const now = new Date();
    
    return {
      id,
      userId,
      word,
      language,
      definition,
      masteryLevel,
      masteryScore,
      addedAt,
      difficulty: 1,
      frequency: 1,
      firstEncounteredAt: now,
      createdAt: now,
      updatedAt: now,
      forgettingCurveParams: {
        initialStrength: 1.0,
        decayRate: 0.1,
        reviewCount: 0,
        lastReviewScore: 0
      }
    };
  }

  static createMany(count: number, options: CreateVocabularyWordOptions = {}): TestVocabularyWord[] {
    const words: TestVocabularyWord[] = [];
    
    for (let i = 0; i < count; i++) {
      const word = this.create({
        ...options,
        word: options.word ? `${options.word}_${i}` : `word_${i}_${Date.now()}`
      });
      words.push(word);
    }
    
    return words;
  }

  static createWithMasteryLevel(
    masteryLevel: MasteryLevel,
    options: CreateVocabularyWordOptions = {}
  ): TestVocabularyWord {
    const masteryScores = {
      [MasteryLevel.NEW]: 0,
      [MasteryLevel.LEARNING]: 25,
      [MasteryLevel.SHORT_TERM]: 50,
      [MasteryLevel.LONG_TERM]: 75,
      [MasteryLevel.MASTERED]: 95
    };
    
    return this.create({
      ...options,
      masteryLevel,
      masteryScore: masteryScores[masteryLevel]
    });
  }

  static createEnglishWords(count: number, options: CreateVocabularyWordOptions = {}): TestVocabularyWord[] {
    const commonWords = ['hello', 'world', 'learning', 'language', 'artificial', 'intelligence', 'practice', 'vocabulary', 'grammar', 'fluent'];
    const words: TestVocabularyWord[] = [];
    
    for (let i = 0; i < count; i++) {
      const word = commonWords[i % commonWords.length];
      words.push(this.create({
        ...options,
        word: `${word}_${i}`,
        language: Language.ENGLISH,
        definition: `Definition of ${word}`
      }));
    }
    
    return words;
  }
}


