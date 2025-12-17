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
exports.PracticeEvaluationService = void 0;
const PracticeGroup_1 = require("../models/PracticeGroup");
class PracticeEvaluationService {
    constructor(userCapabilityService) {
        this.userCapabilityService = userCapabilityService;
    }
    async evaluatePracticeGroup(userId, practiceGroup, submittedAnswers, totalTime) {
        const questionAnswers = this.evaluateAnswers(practiceGroup, submittedAnswers);
        const totalQuestions = practiceGroup.questions.length;
        const correctAnswers = questionAnswers.filter(qa => qa.isCorrect).length;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const averageTimePerQuestion = totalTime > 0 ? totalTime / totalQuestions : 0;
        const wrongAnswersSummary = questionAnswers
            .filter(qa => !qa.isCorrect)
            .map(qa => ({
            questionId: qa.questionId,
            userChoice: qa.userAnswerLetter || qa.userAnswer || '',
            userChoiceText: qa.userAnswerText || qa.userAnswer || '',
            correctChoice: qa.correctAnswer || '',
            correctChoiceText: qa.correctAnswerText || '',
            questionContent: qa.questionContent || ''
        }));
        const performanceAnalysis = this.analyzePerformance(practiceGroup, questionAnswers);
        const capabilityUpdates = await this.generateCapabilityUpdates(userId, practiceGroup, questionAnswers, accuracy);
        const vocabularyUpdates = this.generateVocabularyUpdates(practiceGroup, questionAnswers);
        const milestoneProgress = await this.generateMilestoneProgress(userId, practiceGroup, accuracy);
        return {
            userId,
            practiceGroupId: practiceGroup.id,
            answers: questionAnswers,
            wrongAnswersSummary,
            totalQuestions,
            correctAnswers,
            accuracy,
            totalTime,
            averageTimePerQuestion,
            weakAreas: performanceAnalysis.weakAreas,
            improvedAreas: performanceAnalysis.improvedAreas,
            recommendedFocus: performanceAnalysis.recommendedFocus,
            capabilityUpdates,
            vocabularyUpdates,
            milestoneProgress
        };
    }
    async updateUserCapabilities(userId, practiceResultId) {
        console.log(`Updating capabilities for user ${userId} based on practice result ${practiceResultId}`);
    }
    evaluateAnswers(practiceGroup, submittedAnswers) {
        const answerMap = new Map(submittedAnswers.map(sa => [sa.questionId, sa]));
        return practiceGroup.questions.map(question => {
            const submitted = answerMap.get(question.id);
            const userAnswer = submitted?.userAnswer || '';
            let normalizedUserAnswer = userAnswer;
            let userAnswerText = userAnswer;
            if (userAnswer.length > 1) {
                const optionIndex = question.options.findIndex(option => option === userAnswer);
                if (optionIndex !== -1) {
                    normalizedUserAnswer = String.fromCharCode(65 + optionIndex);
                    userAnswerText = userAnswer;
                }
                else {
                    const letterMatch = userAnswer.match(/^([A-D])/);
                    if (letterMatch) {
                        normalizedUserAnswer = letterMatch[1];
                        const letterIndex = letterMatch[1].charCodeAt(0) - 65;
                        if (letterIndex >= 0 && letterIndex < question.options.length) {
                            userAnswerText = question.options[letterIndex];
                        }
                    }
                    else {
                        normalizedUserAnswer = userAnswer;
                        userAnswerText = userAnswer;
                    }
                }
            }
            else {
                const letterIndex = userAnswer.charCodeAt(0) - 65;
                if (letterIndex >= 0 && letterIndex < question.options.length) {
                    userAnswerText = question.options[letterIndex];
                }
            }
            const correctAnswerIndex = question.correctAnswer.charCodeAt(0) - 65;
            const correctAnswerText = correctAnswerIndex >= 0 && correctAnswerIndex < question.options.length
                ? question.options[correctAnswerIndex]
                : question.correctAnswer;
            const isCorrect = normalizedUserAnswer === question.correctAnswer;
            const timeSpent = submitted?.timeSpent || 0;
            const attempts = submitted?.attempts || 1;
            if (userAnswer && !isCorrect) {
                console.log(`Answer evaluation for question ${question.id}:`);
                console.log(`  Original user answer: "${userAnswer}"`);
                console.log(`  Normalized user answer: "${normalizedUserAnswer}"`);
                console.log(`  Correct answer: "${question.correctAnswer}"`);
                console.log(`  Is correct: ${isCorrect}`);
            }
            return {
                questionId: question.id,
                userAnswer: normalizedUserAnswer,
                userAnswerText: userAnswerText,
                userAnswerLetter: normalizedUserAnswer,
                correctAnswer: question.correctAnswer,
                correctAnswerText: correctAnswerText,
                isCorrect,
                timeSpent,
                attempts,
                questionContent: question.content,
                options: question.options,
                explanation: question.explanation || '',
                vocabularyWords: question.vocabularyWords || [],
                grammarPoints: question.grammarPoints || []
            };
        });
    }
    analyzePerformance(practiceGroup, questionAnswers) {
        const skillPerformance = new Map();
        const vocabularyPerformance = new Map();
        const grammarPerformance = new Map();
        practiceGroup.questions.forEach((question, index) => {
            const answer = questionAnswers[index];
            question.vocabularyWords.forEach(word => {
                vocabularyPerformance.set(word, answer.isCorrect);
            });
            question.grammarPoints.forEach(point => {
                grammarPerformance.set(point, answer.isCorrect);
            });
            const skillAreas = this.identifySkillAreas(question);
            skillAreas.forEach(skill => {
                const current = skillPerformance.get(skill) || { correct: 0, total: 0 };
                current.total++;
                if (answer.isCorrect) {
                    current.correct++;
                }
                skillPerformance.set(skill, current);
            });
        });
        const weakAreas = [];
        const improvedAreas = [];
        skillPerformance.forEach((performance, skill) => {
            const accuracy = performance.total > 0 ? (performance.correct / performance.total) * 100 : 0;
            if (accuracy < 60) {
                weakAreas.push(skill);
            }
            else if (accuracy >= 80) {
                improvedAreas.push(skill);
            }
        });
        const recommendedFocus = this.generateRecommendations(weakAreas, vocabularyPerformance, grammarPerformance);
        return {
            weakAreas,
            improvedAreas,
            recommendedFocus
        };
    }
    identifySkillAreas(question) {
        const areas = [];
        if (question.vocabularyWords && question.vocabularyWords.length > 0) {
            areas.push(PracticeGroup_1.SkillArea.VOCABULARY);
        }
        if (question.grammarPoints && question.grammarPoints.length > 0) {
            areas.push(PracticeGroup_1.SkillArea.GRAMMAR);
        }
        const content = question.content.toLowerCase();
        if (content.includes('read') || content.includes('passage') || content.includes('text')) {
            areas.push(PracticeGroup_1.SkillArea.READING);
        }
        if (content.includes('listen') || content.includes('audio') || content.includes('hear')) {
            areas.push(PracticeGroup_1.SkillArea.LISTENING);
        }
        if (content.includes('write') || content.includes('compose') || content.includes('essay')) {
            areas.push(PracticeGroup_1.SkillArea.WRITING);
        }
        if (content.includes('speak') || content.includes('pronounce') || content.includes('say')) {
            areas.push(PracticeGroup_1.SkillArea.SPEAKING);
        }
        if (areas.length === 0) {
            areas.push(PracticeGroup_1.SkillArea.READING);
        }
        return areas;
    }
    generateRecommendations(weakAreas, vocabularyPerformance, grammarPerformance) {
        const recommendations = [];
        if (weakAreas.includes(PracticeGroup_1.SkillArea.VOCABULARY)) {
            const incorrectWords = Array.from(vocabularyPerformance.entries())
                .filter(([_, correct]) => !correct)
                .map(([word, _]) => word);
            if (incorrectWords.length > 0) {
                recommendations.push(`Review vocabulary: ${incorrectWords.slice(0, 5).join(', ')}`);
            }
        }
        if (weakAreas.includes(PracticeGroup_1.SkillArea.GRAMMAR)) {
            const incorrectGrammar = Array.from(grammarPerformance.entries())
                .filter(([_, correct]) => !correct)
                .map(([point, _]) => point);
            if (incorrectGrammar.length > 0) {
                recommendations.push(`Focus on grammar: ${incorrectGrammar.slice(0, 3).join(', ')}`);
            }
        }
        if (weakAreas.includes(PracticeGroup_1.SkillArea.READING)) {
            recommendations.push('Practice reading comprehension exercises');
        }
        if (weakAreas.includes(PracticeGroup_1.SkillArea.LISTENING)) {
            recommendations.push('Increase listening practice with audio materials');
        }
        return recommendations;
    }
    async generateCapabilityUpdates(userId, practiceGroup, questionAnswers, accuracy) {
        const updates = [];
        const currentCapability = await this.userCapabilityService.getUserCapability(userId, practiceGroup.language);
        if (!currentCapability) {
            return updates;
        }
        const aiAnalysis = await this.generateAICapabilityAnalysis(practiceGroup, questionAnswers, currentCapability);
        const skillPerformance = this.calculateSkillPerformance(practiceGroup, questionAnswers);
        skillPerformance.forEach((performance, skillArea) => {
            const currentScore = this.getCurrentSkillScore(currentCapability, skillArea);
            const performanceScore = (performance.correct / performance.total) * 100;
            const aiAdjustment = aiAnalysis.skillAdjustments[skillArea] || 0;
            const adjustedPerformanceScore = Math.max(0, Math.min(100, performanceScore + aiAdjustment));
            const baseWeight = Math.min(performance.total / 10, 1);
            const aiConfidenceWeight = aiAnalysis.confidence * 0.3;
            const totalWeight = Math.min(baseWeight + aiConfidenceWeight, 1);
            const newScore = currentScore * (1 - totalWeight * 0.15) + adjustedPerformanceScore * (totalWeight * 0.15);
            if (Math.abs(newScore - currentScore) > 1) {
                updates.push({
                    skillArea: skillArea,
                    previousScore: currentScore,
                    newScore: Math.round(newScore),
                    changeReason: `AI-enhanced analysis: ${performance.correct}/${performance.total} correct, AI adjustment: ${aiAdjustment.toFixed(1)}`,
                    confidence: Math.min(totalWeight * 0.9, 0.85)
                });
            }
        });
        return updates;
    }
    async generateAICapabilityAnalysis(practiceGroup, questionAnswers, currentCapability) {
        try {
            const { aiPromptService } = await Promise.resolve().then(() => __importStar(require('./AIPromptService')));
            const { openRouterService } = await Promise.resolve().then(() => __importStar(require('./OpenRouterService')));
            if (!openRouterService) {
                return {
                    skillAdjustments: {},
                    confidence: 0.5,
                    reasoning: 'AI analysis not available, using basic performance metrics'
                };
            }
            const analysisData = {
                practiceType: practiceGroup.type,
                difficulty: practiceGroup.difficulty,
                totalQuestions: practiceGroup.questions.length,
                correctAnswers: questionAnswers.filter(qa => qa.isCorrect).length,
                averageTimePerQuestion: questionAnswers.reduce((sum, qa) => sum + qa.timeSpent, 0) / questionAnswers.length,
                questionDetails: practiceGroup.questions.map((q, i) => ({
                    difficulty: q.difficulty,
                    vocabularyWords: q.vocabularyWords,
                    grammarPoints: q.grammarPoints,
                    isCorrect: questionAnswers[i].isCorrect,
                    timeSpent: questionAnswers[i].timeSpent,
                    attempts: questionAnswers[i].attempts
                })),
                currentCapability: {
                    overallLevel: currentCapability.overallLevel,
                    listeningLevel: currentCapability.listeningLevel,
                    speakingLevel: currentCapability.speakingLevel,
                    readingLevel: currentCapability.readingLevel,
                    writingLevel: currentCapability.writingLevel,
                    vocabularySize: currentCapability.vocabularyCapability?.estimatedVocabularySize,
                    grammarScore: currentCapability.grammarCapability?.overallGrammarScore
                }
            };
            const analysisPrompt = `Analyze this language learning practice performance and provide capability adjustments:

Practice Data:
- Type: ${analysisData.practiceType}
- Difficulty: ${analysisData.difficulty}
- Performance: ${analysisData.correctAnswers}/${analysisData.totalQuestions} correct
- Average time per question: ${analysisData.averageTimePerQuestion.toFixed(1)}s

Current User Capability:
- Overall Level: ${analysisData.currentCapability.overallLevel}
- Listening: ${analysisData.currentCapability.listeningLevel}/100
- Speaking: ${analysisData.currentCapability.speakingLevel}/100
- Reading: ${analysisData.currentCapability.readingLevel}/100
- Writing: ${analysisData.currentCapability.writingLevel}/100
- Vocabulary Size: ${analysisData.currentCapability.vocabularySize || 'Unknown'}
- Grammar Score: ${analysisData.currentCapability.grammarScore || 'Unknown'}

Question Analysis:
${analysisData.questionDetails.map((q, i) => `Q${i + 1}: Difficulty ${q.difficulty}, ${q.isCorrect ? 'Correct' : 'Incorrect'}, ${q.timeSpent}s, ${q.attempts} attempts`).join('\n')}

Please provide a JSON response with:
{
  "skillAdjustments": {
    "vocabulary": number (-10 to +10),
    "grammar": number (-10 to +10),
    "reading": number (-10 to +10),
    "listening": number (-10 to +10),
    "speaking": number (-10 to +10),
    "writing": number (-10 to +10)
  },
  "confidence": number (0.0 to 1.0),
  "reasoning": "Brief explanation of the analysis"
}

Consider factors like:
- Question difficulty vs user performance
- Time spent vs expected time
- Error patterns in vocabulary/grammar
- Consistency of performance across skill areas`;
            const model = openRouterService.selectModel('assessment', practiceGroup.language);
            const response = await openRouterService.callAI(model, analysisPrompt, {
                systemPrompt: 'You are an expert language learning assessment AI. Analyze practice performance and provide precise capability adjustments.'
            });
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiAnalysis = JSON.parse(jsonMatch[0]);
                return {
                    skillAdjustments: aiAnalysis.skillAdjustments || {},
                    confidence: Math.min(Math.max(aiAnalysis.confidence || 0.5, 0), 1),
                    reasoning: aiAnalysis.reasoning || 'AI analysis completed'
                };
            }
        }
        catch (error) {
            console.warn('AI capability analysis failed, using fallback:', error);
        }
        return {
            skillAdjustments: {},
            confidence: 0.5,
            reasoning: 'Using basic performance analysis due to AI unavailability'
        };
    }
    calculateSkillPerformance(practiceGroup, questionAnswers) {
        const skillPerformance = new Map();
        practiceGroup.questions.forEach((question, index) => {
            const answer = questionAnswers[index];
            const skillAreas = this.identifySkillAreas(question);
            skillAreas.forEach(skill => {
                const current = skillPerformance.get(skill) || { correct: 0, total: 0 };
                current.total++;
                if (answer.isCorrect) {
                    current.correct++;
                }
                skillPerformance.set(skill, current);
            });
        });
        return skillPerformance;
    }
    getCurrentSkillScore(capability, skillArea) {
        switch (skillArea) {
            case PracticeGroup_1.SkillArea.VOCABULARY:
                return capability.vocabularyCapability?.basicVocabularyMastery || 50;
            case PracticeGroup_1.SkillArea.GRAMMAR:
                return capability.grammarCapability?.overallGrammarScore || 50;
            case PracticeGroup_1.SkillArea.LISTENING:
                return capability.listeningLevel || 50;
            case PracticeGroup_1.SkillArea.SPEAKING:
                return capability.speakingLevel || 50;
            case PracticeGroup_1.SkillArea.READING:
                return capability.readingLevel || 50;
            case PracticeGroup_1.SkillArea.WRITING:
                return capability.writingLevel || 50;
            default:
                return 50;
        }
    }
    generateVocabularyUpdates(practiceGroup, questionAnswers) {
        const updates = [];
        const vocabularyPerformance = new Map();
        practiceGroup.questions.forEach((question, index) => {
            const answer = questionAnswers[index];
            question.vocabularyWords.forEach(word => {
                const performances = vocabularyPerformance.get(word) || [];
                performances.push(answer.isCorrect);
                vocabularyPerformance.set(word, performances);
            });
        });
        vocabularyPerformance.forEach((performances, word) => {
            const correctCount = performances.filter(p => p).length;
            const accuracy = correctCount / performances.length;
            let newMasteryLevel;
            let masteryScoreChange;
            if (accuracy >= 0.8) {
                newMasteryLevel = PracticeGroup_1.MasteryLevel.SHORT_TERM;
                masteryScoreChange = 10;
            }
            else if (accuracy >= 0.6) {
                newMasteryLevel = PracticeGroup_1.MasteryLevel.LEARNING;
                masteryScoreChange = 5;
            }
            else {
                newMasteryLevel = PracticeGroup_1.MasteryLevel.NEW;
                masteryScoreChange = -5;
            }
            updates.push({
                wordId: '',
                word,
                previousMasteryLevel: PracticeGroup_1.MasteryLevel.LEARNING,
                newMasteryLevel,
                masteryScoreChange
            });
        });
        return updates;
    }
    async generateMilestoneProgress(userId, practiceGroup, accuracy) {
        const updates = [];
        const progressAmount = Math.round(accuracy / 10);
        if (progressAmount > 0) {
            updates.push({
                milestoneId: 'practice-milestone',
                progressChange: progressAmount,
                isCompleted: accuracy >= 90
            });
        }
        return updates;
    }
}
exports.PracticeEvaluationService = PracticeEvaluationService;
//# sourceMappingURL=PracticeEvaluationService.js.map