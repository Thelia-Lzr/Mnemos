import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { Language, LanguageLevel, UserCapability } from '../../models/UserCapability';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  passwordHash: string;
  role: 'user' | 'admin';
}

export interface CreateUserOptions {
  username?: string;
  email?: string;
  password?: string;
  role?: 'user' | 'admin';
}

export interface CreateUserCapabilityOptions {
  language: Language;
  currentLevel: LanguageLevel;
  learningGoal: LanguageLevel;
  isActiveLearning?: boolean;
}

export class UserFactory {
  static async create(options: CreateUserOptions = {}): Promise<TestUser> {
    const id = uuidv4();
    const username = options.username || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const email = options.email || `${username}@example.com`;
    const password = options.password || 'password123';
    const role = options.role || 'user';
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    return {
      id,
      username,
      email,
      password,
      passwordHash,
      role
    };
  }

  static async createMany(count: number, options: CreateUserOptions = {}): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = await this.create({
        ...options,
        username: options.username ? `${options.username}_${i}` : undefined,
        email: options.email ? `${options.username || 'user'}_${i}@example.com` : undefined
      });
      users.push(user);
    }
    
    return users;
  }

  static createAdmin(options: CreateUserOptions = {}): Promise<TestUser> {
    return this.create({ ...options, role: 'admin' });
  }
}

// Helper functions for creating test users and capabilities
export async function createTestUser(db: Pool, options: CreateUserOptions = {}): Promise<TestUser> {
  const user = await UserFactory.create(options);
  
  // Insert user into database with conflict handling
  await db.query(
    `INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET 
       username = EXCLUDED.username,
       email = EXCLUDED.email,
       updated_at = CURRENT_TIMESTAMP`,
    [user.id, user.username, user.email, user.passwordHash, user.role]
  );
  
  return user;
}

export async function createTestUserCapability(
  db: Pool, 
  userId: string, 
  options: CreateUserCapabilityOptions
): Promise<UserCapability> {
  const capabilityId = uuidv4();
  
  // Insert user capability into database
  await db.query(
    `INSERT INTO user_capabilities (
      id, user_id, language, current_level, learning_goal, is_active_learning,
      overall_level, confidence_score, listening_level, speaking_level, 
      reading_level, writing_level, estimated_vocabulary_size, 
      mastered_words_count, learning_words_count, last_assessed_at,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $4, 50, 50, 50, 50, 50, 1000, 0, 0, 
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      capabilityId, userId, options.language, options.currentLevel, 
      options.learningGoal, options.isActiveLearning ?? true
    ]
  );
  
  // Return the created capability
  const result = await db.query(
    'SELECT * FROM user_capabilities WHERE id = $1',
    [capabilityId]
  );
  
  if (!result || result.rows.length === 0) {
    throw new Error('Failed to create user capability');
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    currentLevel: row.current_level,
    learningGoal: row.learning_goal,
    isActiveLearning: row.is_active_learning,
    overallLevel: row.overall_level,
    confidenceScore: row.confidence_score,
    listeningLevel: row.listening_level,
    speakingLevel: row.speaking_level,
    readingLevel: row.reading_level,
    writingLevel: row.writing_level,
    estimatedVocabularySize: row.estimated_vocabulary_size,
    masteredWordsCount: row.mastered_words_count,
    learningWordsCount: row.learning_words_count,
    lastAssessedAt: row.last_assessed_at,
    nextAssessmentDue: row.next_assessment_due,
    vocabularyCapability: {
      estimatedVocabularySize: row.estimated_vocabulary_size || 1000,
      masteredWordsCount: row.mastered_words_count || 0,
      learningWordsCount: row.learning_words_count || 0,
      basicVocabularyMastery: 50,
      intermediateVocabularyMastery: 30,
      advancedVocabularyMastery: 10,
      averageLearningSpeed: 5,
      retentionRate: 70,
      contextualUsageScore: 50,
      collocationsScore: 40
    },
    grammarCapability: {
      overallGrammarScore: 50,
      grammarPointsMastered: [],
      grammarPointsLearning: [],
      grammarPointsWeak: [],
      sentenceStructureScore: 50,
      tenseUsageScore: 45,
      complexityHandlingScore: 40
    },
    comprehensionCapability: {
      readingComprehensionScore: row.reading_level || 50,
      listeningComprehensionScore: row.listening_level || 50,
      literalComprehension: 60,
      inferentialComprehension: 40,
      criticalComprehension: 30,
      maxTextComplexity: 'beginner',
      processingSpeed: 50
    },
    assessmentHistory: [],
    learningStyle: 'mixed',
    strengths: [],
    weaknesses: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


