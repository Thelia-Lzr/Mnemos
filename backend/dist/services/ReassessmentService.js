"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReassessmentService = void 0;
const uuid_1 = require("uuid");
const AIAssessmentService_1 = require("./AIAssessmentService");
class ReassessmentService {
    constructor(db, aiService, userCapabilityService) {
        this.db = db;
        this.aiService = aiService;
        this.userCapabilityService = userCapabilityService;
        this.aiAssessmentService = new AIAssessmentService_1.AIAssessmentService(aiService);
    }
    async initiateReassessment(request) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const capability = await this.userCapabilityService.getUserCapability(request.userId, request.language);
            if (!capability) {
                throw new Error('User capability not found');
            }
            const assessmentHistory = await this.userCapabilityService.getAssessmentHistory(request.userId, request.language, 1);
            if (assessmentHistory.length === 0) {
                throw new Error('No previous assessment found');
            }
            const originalAssessment = assessmentHistory[0];
            const focusAreas = request.focusAreas || originalAssessment.improvementAreas;
            const targetedQuestions = await this.aiAssessmentService.generateTargetedReassessment(focusAreas, capability, request.reason);
            const reassessmentId = (0, uuid_1.v4)();
            const reassessmentCase = {
                id: reassessmentId,
                userId: request.userId,
                language: request.language,
                originalAssessmentId: originalAssessment.id,
                reason: request.reason,
                focusAreas,
                userObjections: [request.reason],
                status: 'pending',
                targetedQuestions,
                userResponses: [],
                createdAt: new Date()
            };
            await client.query(`INSERT INTO reassessment_cases (
          id, user_id, language, original_assessment_id, reason, focus_areas,
          user_objections, status, targeted_questions, user_responses, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
                reassessmentId, request.userId, request.language, originalAssessment.id,
                request.reason, JSON.stringify(focusAreas), JSON.stringify([request.reason]),
                'pending', JSON.stringify(targetedQuestions), JSON.stringify([]),
                reassessmentCase.createdAt
            ]);
            await client.query('COMMIT');
            return reassessmentCase;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error initiating reassessment:', error);
            return null;
        }
        finally {
            client.release();
        }
    }
    async submitReassessmentResponse(reassessmentId, questionId, userAnswer) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const caseResult = await client.query('SELECT * FROM reassessment_cases WHERE id = $1', [reassessmentId]);
            if (caseResult.rows.length === 0) {
                throw new Error('Reassessment case not found');
            }
            const reassessmentCase = this.mapRowToReassessmentCase(caseResult.rows[0]);
            const question = reassessmentCase.targetedQuestions[parseInt(questionId)];
            if (!question) {
                throw new Error('Question not found');
            }
            const aiEvaluation = await this.evaluateUserResponse(question, userAnswer, reassessmentCase.focusAreas, reassessmentCase.language);
            const response = {
                questionId,
                question,
                userAnswer,
                aiEvaluation,
                submittedAt: new Date()
            };
            const updatedResponses = [...reassessmentCase.userResponses, response];
            await client.query(`UPDATE reassessment_cases 
         SET user_responses = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`, [
                JSON.stringify(updatedResponses),
                updatedResponses.length >= reassessmentCase.targetedQuestions.length ? 'completed' : 'in_progress',
                reassessmentId
            ]);
            if (updatedResponses.length >= reassessmentCase.targetedQuestions.length) {
                await this.completeReassessment(reassessmentId);
            }
            await client.query('COMMIT');
            return response;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error submitting reassessment response:', error);
            return null;
        }
        finally {
            client.release();
        }
    }
    async completeReassessment(reassessmentId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const caseResult = await client.query('SELECT * FROM reassessment_cases WHERE id = $1', [reassessmentId]);
            if (caseResult.rows.length === 0) {
                throw new Error('Reassessment case not found');
            }
            const reassessmentCase = this.mapRowToReassessmentCase(caseResult.rows[0]);
            const newAssessment = await this.generateReassessmentResult(reassessmentCase);
            if (newAssessment) {
                await client.query(`UPDATE reassessment_cases 
           SET status = 'completed', new_assessment_id = $1, resolved_at = CURRENT_TIMESTAMP
           WHERE id = $2`, [newAssessment.id, reassessmentId]);
                await this.updateCapabilityFromReassessment(reassessmentCase, newAssessment);
            }
            await client.query('COMMIT');
            return newAssessment;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error completing reassessment:', error);
            return null;
        }
        finally {
            client.release();
        }
    }
    async getReassessmentCase(reassessmentId) {
        try {
            const result = await this.db.query('SELECT * FROM reassessment_cases WHERE id = $1', [reassessmentId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToReassessmentCase(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting reassessment case:', error);
            return null;
        }
    }
    async getUserReassessmentHistory(userId, language) {
        try {
            const result = await this.db.query(`SELECT * FROM reassessment_cases 
         WHERE user_id = $1 AND language = $2 
         ORDER BY created_at DESC`, [userId, language]);
            return result.rows.map(row => this.mapRowToReassessmentCase(row));
        }
        catch (error) {
            console.error('Error getting user reassessment history:', error);
            return [];
        }
    }
    async cancelReassessment(reassessmentId, reason) {
        try {
            const result = await this.db.query(`UPDATE reassessment_cases 
         SET status = 'cancelled', resolution_notes = $1, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $2`, [reason, reassessmentId]);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error cancelling reassessment:', error);
            return false;
        }
    }
    async evaluateUserResponse(question, userAnswer, focusAreas, language) {
        const prompt = `
      As a language assessment expert, evaluate the following user response to a targeted assessment question.

      Language: ${language}
      Focus Areas: ${focusAreas.join(', ')}
      Question: ${question}
      User Answer: ${userAnswer}

      Evaluate the response considering:
      1. Accuracy and correctness
      2. Language proficiency demonstrated
      3. Specific skills shown in focus areas
      4. Areas for improvement

      Provide evaluation in JSON format:
      {
        "score": number (0-100),
        "feedback": "detailed feedback string",
        "skillAreas": ["skill1", "skill2"] // skills demonstrated in this response
      }
    `;
        try {
            const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'openai/gpt-4o', prompt, {
                temperature: 0.2,
                max_tokens: 1000
            });
            const evaluation = JSON.parse(response.content);
            return {
                score: Math.max(0, Math.min(100, evaluation.score || 0)),
                feedback: evaluation.feedback || 'No feedback provided',
                skillAreas: Array.isArray(evaluation.skillAreas) ? evaluation.skillAreas : []
            };
        }
        catch (error) {
            console.error('Error evaluating user response:', error);
            return {
                score: 50,
                feedback: 'Unable to evaluate response automatically. Manual review may be needed.',
                skillAreas: focusAreas
            };
        }
    }
    async generateReassessmentResult(reassessmentCase) {
        try {
            const totalScore = reassessmentCase.userResponses.reduce((sum, response) => sum + response.aiEvaluation.score, 0);
            const averageScore = totalScore / reassessmentCase.userResponses.length;
            const skillPerformance = {};
            reassessmentCase.userResponses.forEach(response => {
                response.aiEvaluation.skillAreas.forEach(skill => {
                    if (!skillPerformance[skill]) {
                        skillPerformance[skill] = [];
                    }
                    skillPerformance[skill].push(response.aiEvaluation.score);
                });
            });
            const skillScores = {};
            Object.keys(skillPerformance).forEach(skill => {
                const scores = skillPerformance[skill];
                skillScores[skill] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            });
            const assessmentRequest = {
                userId: reassessmentCase.userId,
                language: reassessmentCase.language,
                assessmentType: 'user_requested',
                dataSource: 'comprehensive_test',
                includeRecommendations: true
            };
            const newAssessment = await this.userCapabilityService.performComprehensiveAssessment(assessmentRequest);
            if (newAssessment) {
                newAssessment.overallScore = Math.round((newAssessment.overallScore + averageScore) / 2);
                Object.keys(skillScores).forEach(skill => {
                    if (newAssessment.skillScores[skill] !== undefined) {
                        newAssessment.skillScores[skill] = Math.round((newAssessment.skillScores[skill] + skillScores[skill]) / 2);
                    }
                });
                newAssessment.recommendations.unshift(`Based on your reassessment request: ${reassessmentCase.reason}`, `Focused evaluation of ${reassessmentCase.focusAreas.join(', ')} areas completed`);
            }
            return newAssessment;
        }
        catch (error) {
            console.error('Error generating reassessment result:', error);
            return null;
        }
    }
    async updateCapabilityFromReassessment(reassessmentCase, newAssessment) {
        try {
            await this.updateKnowledgePoints(reassessmentCase, newAssessment);
            console.log(`Reassessment completed for user ${reassessmentCase.userId}, language ${reassessmentCase.language}`);
        }
        catch (error) {
            console.error('Error updating capability from reassessment:', error);
        }
    }
    async updateKnowledgePoints(reassessmentCase, newAssessment) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            for (const response of reassessmentCase.userResponses) {
                for (const skillArea of response.aiEvaluation.skillAreas) {
                    await client.query(`INSERT INTO knowledge_points (user_id, language, skill_area, mastery_level, last_assessed_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, language, skill_area)
             DO UPDATE SET 
               mastery_level = $4,
               last_assessed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP`, [
                        reassessmentCase.userId,
                        reassessmentCase.language,
                        skillArea,
                        response.aiEvaluation.score
                    ]);
                }
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating knowledge points:', error);
        }
        finally {
            client.release();
        }
    }
    parseJsonField(field, defaultValue) {
        if (!field)
            return defaultValue;
        if (typeof field === 'object' && field !== null) {
            return field;
        }
        if (typeof field === 'string') {
            try {
                return JSON.parse(field);
            }
            catch (error) {
                console.warn('Failed to parse JSON field in ReassessmentService:', field, error);
                return defaultValue;
            }
        }
        return defaultValue;
    }
    mapRowToReassessmentCase(row) {
        return {
            id: row.id,
            userId: row.user_id,
            language: row.language,
            originalAssessmentId: row.original_assessment_id,
            reason: row.reason,
            focusAreas: this.parseJsonField(row.focus_areas, []),
            userObjections: this.parseJsonField(row.user_objections, []),
            status: row.status,
            targetedQuestions: this.parseJsonField(row.targeted_questions, []),
            userResponses: this.parseJsonField(row.user_responses, []),
            newAssessmentId: row.new_assessment_id,
            resolutionNotes: row.resolution_notes,
            createdAt: row.created_at,
            resolvedAt: row.resolved_at
        };
    }
}
exports.ReassessmentService = ReassessmentService;
//# sourceMappingURL=ReassessmentService.js.map