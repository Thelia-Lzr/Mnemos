"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUserCapability = exports.createTestUser = exports.UserFactory = void 0;
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserFactory {
    static async create(options = {}) {
        const id = (0, uuid_1.v4)();
        const username = options.username || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const email = options.email || `${username}@example.com`;
        const password = options.password || 'password123';
        const role = options.role || 'user';
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        return {
            id,
            username,
            email,
            password,
            passwordHash,
            role
        };
    }
    static async createMany(count, options = {}) {
        const users = [];
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
    static createAdmin(options = {}) {
        return this.create({ ...options, role: 'admin' });
    }
}
exports.UserFactory = UserFactory;
async function createTestUser(db, options = {}) {
    const user = await UserFactory.create(options);
    await db.query(`INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET 
       username = EXCLUDED.username,
       email = EXCLUDED.email,
       updated_at = CURRENT_TIMESTAMP`, [user.id, user.username, user.email, user.passwordHash, user.role]);
    return user;
}
exports.createTestUser = createTestUser;
async function createTestUserCapability(db, userId, options) {
    const capabilityId = (0, uuid_1.v4)();
    await db.query(`INSERT INTO user_capabilities (
      id, user_id, language, current_level, learning_goal, is_active_learning,
      overall_level, confidence_score, listening_level, speaking_level, 
      reading_level, writing_level, estimated_vocabulary_size, 
      mastered_words_count, learning_words_count, last_assessed_at,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $4, 50, 50, 50, 50, 50, 1000, 0, 0, 
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
        capabilityId, userId, options.language, options.currentLevel,
        options.learningGoal, options.isActiveLearning ?? true
    ]);
    const result = await db.query('SELECT * FROM user_capabilities WHERE id = $1', [capabilityId]);
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
exports.createTestUserCapability = createTestUserCapability;
//# sourceMappingURL=userFactory.js.map