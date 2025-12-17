"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeGroupModel = exports.MasteryLevel = exports.SkillArea = exports.QuestionType = exports.PracticeType = exports.DifficultyLevel = exports.Language = void 0;
const uuid_1 = require("uuid");
var Language;
(function (Language) {
    Language["ENGLISH"] = "en";
    Language["JAPANESE"] = "ja";
    Language["FRENCH"] = "fr";
})(Language = exports.Language || (exports.Language = {}));
var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["BEGINNER"] = "beginner";
    DifficultyLevel["INTERMEDIATE"] = "intermediate";
    DifficultyLevel["ADVANCED"] = "advanced";
})(DifficultyLevel = exports.DifficultyLevel || (exports.DifficultyLevel = {}));
var PracticeType;
(function (PracticeType) {
    PracticeType["GENERAL"] = "general";
    PracticeType["VOCABULARY"] = "vocabulary";
    PracticeType["GRAMMAR"] = "grammar";
    PracticeType["MATERIAL_BASED"] = "material_based";
    PracticeType["REVIEW"] = "review";
    PracticeType["COMPREHENSIVE"] = "comprehensive";
})(PracticeType = exports.PracticeType || (exports.PracticeType = {}));
var QuestionType;
(function (QuestionType) {
    QuestionType["MULTIPLE_CHOICE"] = "multiple_choice";
    QuestionType["FILL_BLANK"] = "fill_blank";
    QuestionType["TRANSLATION"] = "translation";
    QuestionType["VOCABULARY"] = "vocabulary";
})(QuestionType = exports.QuestionType || (exports.QuestionType = {}));
var SkillArea;
(function (SkillArea) {
    SkillArea["VOCABULARY"] = "vocabulary";
    SkillArea["GRAMMAR"] = "grammar";
    SkillArea["LISTENING"] = "listening";
    SkillArea["SPEAKING"] = "speaking";
    SkillArea["READING"] = "reading";
    SkillArea["WRITING"] = "writing";
    SkillArea["PRONUNCIATION"] = "pronunciation";
    SkillArea["FLUENCY"] = "fluency";
})(SkillArea = exports.SkillArea || (exports.SkillArea = {}));
var MasteryLevel;
(function (MasteryLevel) {
    MasteryLevel["NEW"] = "new";
    MasteryLevel["LEARNING"] = "learning";
    MasteryLevel["SHORT_TERM"] = "short_term";
    MasteryLevel["LONG_TERM"] = "long_term";
    MasteryLevel["MASTERED"] = "mastered";
})(MasteryLevel = exports.MasteryLevel || (exports.MasteryLevel = {}));
class PracticeGroupModel {
    constructor(db) {
        this.db = db;
    }
    async create(practiceGroup) {
        const id = (0, uuid_1.v4)();
        const createdAt = new Date();
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            await client.query(`
        INSERT INTO practice_groups (
          id, user_id, title, description, language, difficulty, type,
          estimated_duration, focus_areas, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
                id, practiceGroup.userId, practiceGroup.title, practiceGroup.description,
                practiceGroup.language, practiceGroup.difficulty, practiceGroup.type,
                practiceGroup.estimatedDuration, practiceGroup.focusAreas, createdAt
            ]);
            for (let i = 0; i < practiceGroup.questions.length; i++) {
                const question = practiceGroup.questions[i];
                const questionId = (0, uuid_1.v4)();
                await client.query(`
          INSERT INTO questions (
            id, practice_group_id, type, content, options, correct_answer,
            explanation, vocabulary_words, grammar_points, difficulty, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
                    questionId, id, question.type, question.content, question.options,
                    question.correctAnswer, question.explanation, question.vocabularyWords,
                    question.grammarPoints, question.difficulty, i
                ]);
                practiceGroup.questions[i].id = questionId;
                practiceGroup.questions[i].practiceGroupId = id;
                practiceGroup.questions[i].orderIndex = i;
            }
            await client.query('COMMIT');
            return {
                ...practiceGroup,
                id,
                createdAt
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async findById(id) {
        const result = await this.db.query(`
      SELECT pg.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pq.id,
                   'practiceGroupId', pq.practice_group_id,
                   'type', pq.type,
                   'content', pq.content,
                   'options', pq.options,
                   'correctAnswer', pq.correct_answer,
                   'explanation', pq.explanation,
                   'vocabularyWords', pq.vocabulary_words,
                   'grammarPoints', pq.grammar_points,
                   'difficulty', pq.difficulty,
                   'orderIndex', pq.order_index
                 ) ORDER BY pq.order_index
               ) FILTER (WHERE pq.id IS NOT NULL),
               '[]'::json
             ) as questions
      FROM practice_groups pg
      LEFT JOIN questions pq ON pg.id = pq.practice_group_id
      WHERE pg.id = $1
      GROUP BY pg.id
    `, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        let questions = row.questions || [];
        if (Array.isArray(questions) && questions.length === 1 && questions[0] === null) {
            questions = [];
        }
        return {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            description: row.description,
            language: row.language,
            difficulty: row.difficulty,
            type: row.type,
            questions: questions,
            createdAt: row.created_at,
            estimatedDuration: row.estimated_duration,
            focusAreas: row.focus_areas || []
        };
    }
    async findByUserId(userId, limit = 20, offset = 0) {
        const result = await this.db.query(`
      SELECT pg.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pq.id,
                   'practiceGroupId', pq.practice_group_id,
                   'type', pq.type,
                   'content', pq.content,
                   'options', pq.options,
                   'correctAnswer', pq.correct_answer,
                   'explanation', pq.explanation,
                   'vocabularyWords', pq.vocabulary_words,
                   'grammarPoints', pq.grammar_points,
                   'difficulty', pq.difficulty,
                   'orderIndex', pq.order_index
                 ) ORDER BY pq.order_index
               ) FILTER (WHERE pq.id IS NOT NULL),
               '[]'::json
             ) as questions
      FROM practice_groups pg
      LEFT JOIN questions pq ON pg.id = pq.practice_group_id
      WHERE pg.user_id = $1
      GROUP BY pg.id
      ORDER BY pg.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
        return result.rows.map(row => {
            let questions = row.questions || [];
            if (Array.isArray(questions) && questions.length === 1 && questions[0] === null) {
                questions = [];
            }
            return {
                id: row.id,
                userId: row.user_id,
                title: row.title,
                description: row.description,
                language: row.language,
                difficulty: row.difficulty,
                type: row.type,
                questions: questions,
                createdAt: row.created_at,
                estimatedDuration: row.estimated_duration,
                focusAreas: row.focus_areas || []
            };
        });
    }
    async createResult(result) {
        const id = (0, uuid_1.v4)();
        const completedAt = new Date();
        const insertResult = await this.db.query(`
      INSERT INTO practice_results (
        id, user_id, practice_group_id, answers, wrong_answers_summary, total_questions, correct_answers,
        accuracy, total_time, average_time_per_question, weak_areas, improved_areas,
        recommended_focus, capability_updates, vocabulary_updates, milestone_progress,
        completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
            id, result.userId, result.practiceGroupId, JSON.stringify(result.answers),
            JSON.stringify(result.wrongAnswersSummary || []),
            result.totalQuestions, result.correctAnswers, result.accuracy, result.totalTime,
            result.averageTimePerQuestion, result.weakAreas,
            result.improvedAreas, result.recommendedFocus,
            JSON.stringify(result.capabilityUpdates), JSON.stringify(result.vocabularyUpdates),
            JSON.stringify(result.milestoneProgress), completedAt
        ]);
        return {
            ...result,
            id,
            completedAt
        };
    }
    async delete(id) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM practice_results WHERE practice_group_id = $1', [id]);
            await client.query('DELETE FROM questions WHERE practice_group_id = $1', [id]);
            await client.query('DELETE FROM practice_groups WHERE id = $1', [id]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async deletePracticeResults(practiceGroupIds, userId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            await client.query(`
        DELETE FROM practice_ai_analysis 
        WHERE practice_result_id IN (
          SELECT pr.id FROM practice_results pr 
          WHERE pr.practice_group_id = ANY($1) AND pr.user_id = $2
        )
      `, [practiceGroupIds, userId]);
            const deleteResult = await client.query(`
        DELETE FROM practice_results 
        WHERE practice_group_id = ANY($1) AND user_id = $2
        RETURNING id
      `, [practiceGroupIds, userId]);
            await client.query('COMMIT');
            return deleteResult.rows.length;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.PracticeGroupModel = PracticeGroupModel;
//# sourceMappingURL=PracticeGroup.js.map