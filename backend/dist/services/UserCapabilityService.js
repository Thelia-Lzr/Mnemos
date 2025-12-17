"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCapabilityService = void 0;
const uuid_1 = require("uuid");
const AIAssessmentService_1 = require("./AIAssessmentService");
class UserCapabilityService {
    constructor(db, aiService) {
        this.db = db;
        this.aiService = aiService;
        this.aiAssessmentService = new AIAssessmentService_1.AIAssessmentService(aiService);
    }
    async createUserCapability(userId, data) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const capabilityId = (0, uuid_1.v4)();
            const capabilityResult = await client.query(`INSERT INTO user_capabilities (
          id, user_id, language, current_level, learning_goal, overall_level,
          confidence_score, listening_level, speaking_level, reading_level, writing_level,
          estimated_vocabulary_size, mastered_words_count, learning_words_count,
          last_assessed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $4, 50, 50, 50, 50, 50, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`, [capabilityId, userId, data.language, data.currentLevel, data.learningGoal]);
            const progressId = (0, uuid_1.v4)();
            await client.query(`INSERT INTO learning_progress (id, user_id, language, total_study_time, streak_days, created_at, updated_at)
         VALUES ($1, $2, $3, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [progressId, userId, data.language]);
            const mmrId = (0, uuid_1.v4)();
            await client.query(`INSERT INTO user_mmr (id, user_id, language, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`, [mmrId, userId, data.language]);
            await client.query('COMMIT');
            if (capabilityResult.rows.length === 0) {
                console.error('Failed to create capability:', capabilityId);
                return null;
            }
            return this.mapRowToUserCapability(capabilityResult.rows[0]);
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating user capability:', error);
            return null;
        }
        finally {
            client.release();
        }
    }
    async getUserCapability(userId, language) {
        try {
            const result = await this.db.query('SELECT * FROM user_capabilities WHERE user_id = $1 AND language = $2', [userId, language]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToUserCapability(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting user capability:', error);
            return null;
        }
    }
    async getAllUserCapabilities(userId) {
        try {
            const result = await this.db.query('SELECT * FROM user_capabilities WHERE user_id = $1 ORDER BY created_at', [userId]);
            return result.rows.map(row => this.mapRowToUserCapability(row));
        }
        catch (error) {
            console.error('Error getting all user capabilities:', error);
            return [];
        }
    }
    async updateUserCapability(userId, language, updates) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined) {
                    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    updateFields.push(`${dbKey} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });
            if (updateFields.length === 0) {
                return false;
            }
            values.push(userId, language);
            const query = `
        UPDATE user_capabilities 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $${paramIndex} AND language = $${paramIndex + 1}
      `;
            const result = await this.db.query(query, values);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error updating user capability:', error);
            return false;
        }
    }
    async getLearningProgress(userId, language) {
        try {
            const result = await this.db.query('SELECT * FROM learning_progress WHERE user_id = $1 AND language = $2', [userId, language]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToLearningProgress(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting learning progress:', error);
            return null;
        }
    }
    async updateLearningProgress(userId, language, studyTimeMinutes) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const currentResult = await client.query('SELECT total_study_time, last_study_date, streak_days FROM learning_progress WHERE user_id = $1 AND language = $2', [userId, language]);
            if (currentResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            const current = currentResult.rows[0];
            const today = new Date().toDateString();
            const lastStudyDate = current.last_study_date ? new Date(current.last_study_date).toDateString() : null;
            let newStreakDays = current.streak_days;
            if (lastStudyDate !== today) {
                if (lastStudyDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()) {
                    newStreakDays += 1;
                }
                else if (lastStudyDate !== today) {
                    newStreakDays = 1;
                }
            }
            await client.query(`UPDATE learning_progress 
         SET total_study_time = total_study_time + $1, 
             streak_days = $2, 
             last_study_date = CURRENT_DATE,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND language = $4`, [studyTimeMinutes, newStreakDays, userId, language]);
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating learning progress:', error);
            return false;
        }
        finally {
            client.release();
        }
    }
    async getUserMilestones(userId, language) {
        try {
            const result = await this.db.query('SELECT * FROM milestones WHERE user_id = $1 AND language = $2 ORDER BY priority, created_at', [userId, language]);
            return result.rows.map(row => this.mapRowToMilestone(row));
        }
        catch (error) {
            console.error('Error getting user milestones:', error);
            return [];
        }
    }
    async createMilestone(userId, language, milestone) {
        try {
            const milestoneId = (0, uuid_1.v4)();
            const result = await this.db.query(`INSERT INTO milestones (
          id, user_id, language, title, description, target_level, 
          estimated_duration, priority, is_completed, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`, [
                milestoneId, userId, language, milestone.title, milestone.description,
                milestone.targetLevel, milestone.estimatedDuration, milestone.priority,
                milestone.isCompleted
            ]);
            return this.mapRowToMilestone(result.rows[0]);
        }
        catch (error) {
            console.error('Error creating milestone:', error);
            return null;
        }
    }
    async completeMilestone(milestoneId) {
        try {
            const result = await this.db.query(`UPDATE milestones 
         SET is_completed = true, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [milestoneId]);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error completing milestone:', error);
            return false;
        }
    }
    mapRowToUserCapability(row) {
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
            vocabularyCapability: this.parseJsonField(row.vocabulary_capability, {
                estimatedVocabularySize: row.estimated_vocabulary_size || 0,
                masteredWordsCount: row.mastered_words_count || 0,
                learningWordsCount: row.learning_words_count || 0,
                basicVocabularyMastery: 0,
                intermediateVocabularyMastery: 0,
                advancedVocabularyMastery: 0,
                averageLearningSpeed: 0,
                retentionRate: 0,
                contextualUsageScore: 0,
                collocationsScore: 0
            }),
            grammarCapability: this.parseJsonField(row.grammar_capability, {
                overallGrammarScore: 0,
                grammarPointsMastered: [],
                grammarPointsLearning: [],
                grammarPointsWeak: [],
                sentenceStructureScore: 0,
                tenseUsageScore: 0,
                complexityHandlingScore: 0
            }),
            comprehensionCapability: this.parseJsonField(row.comprehension_capability, {
                readingComprehensionScore: row.reading_level || 0,
                listeningComprehensionScore: row.listening_level || 0,
                literalComprehension: 0,
                inferentialComprehension: 0,
                criticalComprehension: 0,
                maxTextComplexity: 'beginner',
                processingSpeed: 0
            }),
            assessmentHistory: [],
            learningStyle: row.learning_style || 'mixed',
            strengths: this.parseJsonField(row.strengths, []),
            weaknesses: this.parseJsonField(row.weaknesses, []),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    parseJsonField(field, defaultValue) {
        if (!field)
            return defaultValue;
        try {
            return typeof field === 'string' ? JSON.parse(field) : field;
        }
        catch {
            return defaultValue;
        }
    }
    mapRowToLearningProgress(row) {
        return {
            id: row.id,
            userId: row.user_id,
            language: row.language,
            totalStudyTime: row.total_study_time,
            streakDays: row.streak_days,
            lastStudyDate: row.last_study_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    async performComprehensiveAssessment(request) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const capability = await this.getUserCapability(request.userId, request.language);
            if (!capability) {
                throw new Error('User capability not found');
            }
            const assessmentData = await this.gatherAssessmentData(request);
            const aiAssessment = await this.generateAIAssessment(assessmentData, capability, request);
            const assessmentId = (0, uuid_1.v4)();
            const assessment = {
                id: assessmentId,
                userId: request.userId,
                language: request.language,
                assessmentDate: new Date(),
                assessmentType: request.assessmentType,
                overallScore: aiAssessment.overallScore,
                skillScores: aiAssessment.skillScores,
                dataSource: request.dataSource,
                confidenceLevel: aiAssessment.confidenceLevel,
                improvementAreas: aiAssessment.improvementAreas,
                regressionAreas: aiAssessment.regressionAreas,
                recommendations: aiAssessment.recommendations,
                nextSteps: aiAssessment.nextSteps,
                createdAt: new Date()
            };
            await client.query(`INSERT INTO capability_assessments (
          id, user_id, language, assessment_date, assessment_type, overall_score,
          skill_scores, data_source, confidence_level, improvement_areas,
          regression_areas, recommendations, next_steps, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
                assessmentId, request.userId, request.language, assessment.assessmentDate,
                assessment.assessmentType, assessment.overallScore, JSON.stringify(assessment.skillScores),
                assessment.dataSource, assessment.confidenceLevel, JSON.stringify(assessment.improvementAreas),
                JSON.stringify(assessment.regressionAreas), JSON.stringify(assessment.recommendations),
                JSON.stringify(assessment.nextSteps), assessment.createdAt
            ]);
            await this.updateCapabilityFromAssessment(request.userId, request.language, assessment);
            await client.query('COMMIT');
            return assessment;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error performing comprehensive assessment:', error);
            return null;
        }
        finally {
            client.release();
        }
    }
    async getAssessmentHistory(userId, language, limit = 10) {
        try {
            const result = await this.db.query(`SELECT * FROM capability_assessments 
         WHERE user_id = $1 AND language = $2 
         ORDER BY assessment_date DESC 
         LIMIT $3`, [userId, language, limit]);
            return result.rows.map(row => this.mapRowToAssessment(row));
        }
        catch (error) {
            console.error('Error getting assessment history:', error);
            return [];
        }
    }
    async requestReassessment(request) {
        const { ReassessmentService } = await Promise.resolve().then(() => __importStar(require('./ReassessmentService')));
        const reassessmentService = new ReassessmentService(this.db, this.aiService, this);
        return reassessmentService.initiateReassessment(request);
    }
    async analyzeCapabilityTrends(userId, language, days = 30) {
        try {
            const result = await this.db.query(`SELECT * FROM capability_assessments 
         WHERE user_id = $1 AND language = $2 
         AND assessment_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY assessment_date ASC`, [userId, language]);
            const assessments = result.rows.map(row => this.mapRowToAssessment(row));
            if (assessments.length < 2) {
                return { trend: 'insufficient_data', assessments };
            }
            const trends = {};
            const skillAreas = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
            skillAreas.forEach(skill => {
                const scores = assessments.map(a => a.skillScores[skill]).filter(s => s !== undefined);
                if (scores.length >= 2) {
                    trends[skill] = scores[scores.length - 1] - scores[0];
                }
            });
            return {
                trend: 'calculated',
                assessments,
                skillTrends: trends,
                overallTrend: assessments[assessments.length - 1].overallScore - assessments[0].overallScore
            };
        }
        catch (error) {
            console.error('Error analyzing capability trends:', error);
            return { trend: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async updateLearningCharacteristics(userId, language, characteristics) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (characteristics.learningStyle) {
                updateFields.push(`learning_style = $${paramIndex++}`);
                values.push(characteristics.learningStyle);
            }
            if (characteristics.strengths) {
                updateFields.push(`strengths = $${paramIndex++}`);
                values.push(JSON.stringify(characteristics.strengths));
            }
            if (characteristics.weaknesses) {
                updateFields.push(`weaknesses = $${paramIndex++}`);
                values.push(JSON.stringify(characteristics.weaknesses));
            }
            if (updateFields.length === 0) {
                return false;
            }
            values.push(userId, language);
            const query = `
        UPDATE user_capabilities 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $${paramIndex++} AND language = $${paramIndex++}
      `;
            const result = await this.db.query(query, values);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error updating learning characteristics:', error);
            return false;
        }
    }
    async gatherAssessmentData(request) {
        const data = {};
        switch (request.dataSource) {
            case 'chat_analysis':
                data.chatHistory = await this.getChatAnalysisData(request.userId, request.language);
                break;
            case 'practice_performance':
                data.practiceResults = await this.getPracticePerformanceData(request.userId, request.language);
                break;
            case 'vocabulary_tracking':
                data.vocabularyData = await this.getVocabularyTrackingData(request.userId, request.language);
                break;
            case 'comprehensive_test':
                data.allData = await this.getAllAssessmentData(request.userId, request.language);
                break;
        }
        return data;
    }
    async getChatAnalysisData(userId, language) {
        try {
            const result = await this.db.query(`SELECT content, ai_response, created_at FROM chat_messages 
         WHERE user_id = $1 AND language = $2 
         ORDER BY created_at DESC LIMIT 50`, [userId, language]);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting chat analysis data:', error);
            return [];
        }
    }
    async getPracticePerformanceData(userId, language) {
        try {
            const result = await this.db.query(`SELECT accuracy, total_time, weak_areas, completed_at 
         FROM practice_results 
         WHERE user_id = $1 AND language = $2 
         ORDER BY completed_at DESC LIMIT 20`, [userId, language]);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting practice performance data:', error);
            return [];
        }
    }
    async getVocabularyTrackingData(userId, language) {
        try {
            const result = await this.db.query(`SELECT mastery_level, mastery_score, practice_history 
         FROM vocabulary_words 
         WHERE user_id = $1 AND language = $2`, [userId, language]);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting vocabulary tracking data:', error);
            return [];
        }
    }
    async getAllAssessmentData(userId, language) {
        const [chatData, practiceData, vocabularyData] = await Promise.all([
            this.getChatAnalysisData(userId, language),
            this.getPracticePerformanceData(userId, language),
            this.getVocabularyTrackingData(userId, language)
        ]);
        return {
            chatHistory: chatData,
            practiceResults: practiceData,
            vocabularyData: vocabularyData
        };
    }
    async generateAIAssessment(data, currentCapability, request) {
        try {
            const aiResult = await this.aiAssessmentService.performComprehensiveAssessment(data, currentCapability, request);
            return {
                overallScore: aiResult.overallScore,
                skillScores: aiResult.skillScores,
                confidenceLevel: aiResult.confidenceLevel,
                improvementAreas: aiResult.improvementAreas,
                regressionAreas: aiResult.regressionAreas,
                recommendations: aiResult.recommendations,
                nextSteps: aiResult.nextSteps,
                vocabularyCapability: aiResult.vocabularyCapability,
                grammarCapability: aiResult.grammarCapability,
                comprehensionCapability: aiResult.comprehensionCapability,
                suggestedLearningStyle: aiResult.suggestedLearningStyle
            };
        }
        catch (error) {
            console.error('Error generating AI assessment:', error);
            return this.generateFallbackAssessment(currentCapability);
        }
    }
    generateFallbackAssessment(capability) {
        return {
            overallScore: capability?.confidenceScore || 50,
            skillScores: {
                vocabulary: capability?.estimatedVocabularySize ? Math.min(capability.estimatedVocabularySize / 50, 100) : 50,
                grammar: 50,
                listening: capability?.listeningLevel || 50,
                speaking: capability?.speakingLevel || 50,
                reading: capability?.readingLevel || 50,
                writing: capability?.writingLevel || 50
            },
            confidenceLevel: 30,
            improvementAreas: ['vocabulary', 'grammar'],
            regressionAreas: [],
            recommendations: ['Continue regular practice', 'Focus on weak areas'],
            nextSteps: ['Take more practice tests', 'Review assessment in 2 weeks']
        };
    }
    async updateCapabilityFromAssessment(userId, language, assessment) {
        const aiResult = await this.aiAssessmentService.performComprehensiveAssessment({}, await this.getUserCapability(userId, language), { userId, language, assessmentType: assessment.assessmentType, dataSource: assessment.dataSource });
        const updates = {
            overallLevel: this.scoreToLevel(assessment.overallScore),
            confidenceScore: assessment.confidenceLevel,
            listeningLevel: assessment.skillScores.listening,
            speakingLevel: assessment.skillScores.speaking,
            readingLevel: assessment.skillScores.reading,
            writingLevel: assessment.skillScores.writing,
            vocabularyCapability: aiResult.vocabularyCapability,
            grammarCapability: aiResult.grammarCapability,
            comprehensionCapability: aiResult.comprehensionCapability,
            learningStyle: aiResult.suggestedLearningStyle,
            strengths: Object.keys(assessment.skillScores).filter(skill => assessment.skillScores[skill] > 70),
            weaknesses: assessment.improvementAreas
        };
        await this.updateUserCapability(userId, language, updates);
    }
    scoreToLevel(score) {
        if (score >= 90)
            return 'C2';
        if (score >= 80)
            return 'C1';
        if (score >= 70)
            return 'B2';
        if (score >= 60)
            return 'B1';
        if (score >= 50)
            return 'A2';
        return 'A1';
    }
    mapRowToAssessment(row) {
        return {
            id: row.id,
            userId: row.user_id,
            language: row.language,
            assessmentDate: row.assessment_date,
            assessmentType: row.assessment_type,
            overallScore: row.overall_score,
            skillScores: JSON.parse(row.skill_scores || '{}'),
            dataSource: row.data_source,
            confidenceLevel: row.confidence_level,
            improvementAreas: JSON.parse(row.improvement_areas || '[]'),
            regressionAreas: JSON.parse(row.regression_areas || '[]'),
            recommendations: JSON.parse(row.recommendations || '[]'),
            nextSteps: JSON.parse(row.next_steps || '[]'),
            createdAt: row.created_at
        };
    }
    mapRowToMilestone(row) {
        return {
            id: row.id,
            userId: row.user_id,
            language: row.language,
            title: row.title,
            description: row.description,
            targetLevel: row.target_level,
            estimatedDuration: row.estimated_duration,
            priority: row.priority,
            isCompleted: row.is_completed,
            completedAt: row.completed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.UserCapabilityService = UserCapabilityService;
//# sourceMappingURL=UserCapabilityService.js.map