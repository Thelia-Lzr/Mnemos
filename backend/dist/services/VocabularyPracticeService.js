"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocabularyPracticeService = exports.VocabularyQuestionType = void 0;
const VocabularyService_1 = require("./VocabularyService");
const PracticeGenerationService_1 = require("./PracticeGenerationService");
const VocabularyWord_1 = require("../models/VocabularyWord");
var VocabularyQuestionType;
(function (VocabularyQuestionType) {
    VocabularyQuestionType["DEFINITION_TO_WORD"] = "definition_to_word";
    VocabularyQuestionType["WORD_TO_DEFINITION"] = "word_to_definition";
    VocabularyQuestionType["FILL_IN_BLANK"] = "fill_in_blank";
    VocabularyQuestionType["SYNONYM_ANTONYM"] = "synonym_antonym";
    VocabularyQuestionType["USAGE_IN_CONTEXT"] = "usage_in_context";
})(VocabularyQuestionType = exports.VocabularyQuestionType || (exports.VocabularyQuestionType = {}));
class VocabularyPracticeService {
    constructor(db) {
        this.db = db;
        this.vocabularyService = new VocabularyService_1.VocabularyService(db);
        const aiService = new (require('./AIService')).AIService(db);
        const creditService = new (require('./CreditService')).CreditService(db);
        const asyncTaskManager = (require('./AsyncTaskManager')).AsyncTaskManager.getInstance();
        const userCapabilityService = new (require('./UserCapabilityService')).UserCapabilityService(db, aiService);
        const openRouterService = new (require('./OpenRouterService')).OpenRouterService();
        this.practiceGenerationService = new PracticeGenerationService_1.PracticeGenerationService(db, userCapabilityService, creditService, asyncTaskManager, openRouterService);
    }
    async generateVocabularyPracticeGroup(options) {
        const { userId, language, wordIds, masteryLevels, maxWords = 10, focusOnWeakWords = true, includeReviewWords = true } = options;
        let targetWords;
        if (wordIds && wordIds.length > 0) {
            targetWords = await this.getWordsByIds(wordIds, userId);
        }
        else {
            targetWords = await this.selectWordsForPractice(userId, language, {
                masteryLevels,
                maxWords,
                focusOnWeakWords,
                includeReviewWords
            });
        }
        if (targetWords.length === 0) {
            throw new Error('No vocabulary words available for practice');
        }
        const questions = await this.generateQuestionsForWords(targetWords);
        const practiceGroup = {
            id: this.generateId(),
            title: `Vocabulary Practice - ${language.toUpperCase()}`,
            description: `Practice session with ${targetWords.length} vocabulary words`,
            words: targetWords,
            questions,
            estimatedDuration: Math.ceil(questions.length * 1.5),
            focusAreas: this.determineFocusAreas(targetWords)
        };
        return practiceGroup;
    }
    async processPracticeResults(userId, results) {
        for (const result of results) {
            const practiceScore = this.calculatePracticeScore(result);
            const updateResult = await this.vocabularyService.updateMasteryFromPractice(userId, result.wordId, practiceScore, result.responseTime);
            if (updateResult.shouldRemove) {
                console.log(`Word ${updateResult.word.word} automatically removed from vocabulary (mastered)`);
            }
        }
        await this.updateLearningEfficiencyMetrics(userId, results);
    }
    async getWordsForReview(userId, language, limit = 20) {
        return this.vocabularyService.getWordsNeedingReview(userId, language, limit);
    }
    async getLearningEfficiencyMetrics(userId, language, days = 30) {
        const query = `
      WITH recent_practice AS (
        SELECT 
          vw.id,
          vw.word,
          vw.mastery_level,
          vw.mastery_score,
          vw.added_at,
          vw.last_reviewed_at,
          vw.review_count
        FROM vocabulary_words vw
        WHERE vw.user_id = $1 
          AND vw.language = $2 
          AND vw.last_reviewed_at >= NOW() - INTERVAL '$3 days'
      ),
      mastery_changes AS (
        SELECT 
          COUNT(*) as words_practiced,
          AVG(EXTRACT(EPOCH FROM (last_reviewed_at - added_at)) / 86400) as avg_learning_days,
          COUNT(CASE WHEN mastery_level IN ('long_term', 'mastered') THEN 1 END) as retained_words,
          COUNT(CASE WHEN mastery_score < 50 THEN 1 END) as struggling_words
        FROM recent_practice
      )
      SELECT * FROM mastery_changes
    `;
        const result = await this.db.query(query, [userId, language, days]);
        const row = result.rows[0];
        const wordsPracticed = parseInt(row.words_practiced) || 0;
        const retainedWords = parseInt(row.retained_words) || 0;
        const strugglingWords = parseInt(row.struggling_words) || 0;
        return {
            wordsLearned: wordsPracticed,
            averageLearningTime: parseFloat(row.avg_learning_days) || 0,
            retentionRate: wordsPracticed > 0 ? (retainedWords / wordsPracticed) * 100 : 0,
            masteryProgression: this.calculateMasteryProgression(wordsPracticed, retainedWords),
            weaknessAreas: await this.identifyWeaknessAreas(userId, language)
        };
    }
    async generateAdaptivePractice(userId, language) {
        const metrics = await this.getLearningEfficiencyMetrics(userId, language);
        const targetWords = await this.selectAdaptiveWords(userId, language, metrics);
        const questions = await this.generateAdaptiveQuestions(targetWords, metrics);
        return {
            id: this.generateId(),
            title: `Adaptive Vocabulary Practice - ${language.toUpperCase()}`,
            description: `Personalized practice based on your learning patterns`,
            words: targetWords,
            questions,
            estimatedDuration: Math.ceil(questions.length * 1.2),
            focusAreas: metrics.weaknessAreas
        };
    }
    async selectWordsForPractice(userId, language, options) {
        let query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2
    `;
        const params = [userId, language];
        let paramIndex = 3;
        if (options.masteryLevels && options.masteryLevels.length > 0) {
            query += ` AND mastery_level = ANY($${paramIndex++})`;
            params.push(options.masteryLevels);
        }
        if (options.includeReviewWords) {
            query += ` AND (next_review_at IS NULL OR next_review_at <= NOW())`;
        }
        if (options.focusOnWeakWords) {
            query += ` ORDER BY mastery_score ASC, last_reviewed_at ASC NULLS FIRST`;
        }
        else {
            query += ` ORDER BY RANDOM()`;
        }
        query += ` LIMIT $${paramIndex}`;
        params.push(options.maxWords);
        const result = await this.db.query(query, params);
        return result.rows.map(row => this.mapRowToVocabularyWord(row));
    }
    async generateQuestionsForWords(words) {
        const questions = [];
        for (const word of words) {
            const questionCount = word.masteryLevel === VocabularyWord_1.MasteryLevel.NEW ? 2 : 1;
            for (let i = 0; i < questionCount; i++) {
                const questionType = this.selectQuestionType(word, i);
                const question = await this.generateQuestion(word, questionType);
                questions.push(question);
            }
        }
        return this.shuffleArray(questions);
    }
    selectQuestionType(word, questionIndex) {
        const types = [
            VocabularyQuestionType.DEFINITION_TO_WORD,
            VocabularyQuestionType.WORD_TO_DEFINITION,
            VocabularyQuestionType.FILL_IN_BLANK,
            VocabularyQuestionType.USAGE_IN_CONTEXT
        ];
        if (word.masteryLevel === VocabularyWord_1.MasteryLevel.NEW) {
            return questionIndex === 0
                ? VocabularyQuestionType.WORD_TO_DEFINITION
                : VocabularyQuestionType.DEFINITION_TO_WORD;
        }
        return types[Math.floor(Math.random() * types.length)];
    }
    async generateQuestion(word, type) {
        const questionId = this.generateId();
        switch (type) {
            case VocabularyQuestionType.WORD_TO_DEFINITION:
                return this.generateWordToDefinitionQuestion(questionId, word);
            case VocabularyQuestionType.DEFINITION_TO_WORD:
                return this.generateDefinitionToWordQuestion(questionId, word);
            case VocabularyQuestionType.FILL_IN_BLANK:
                return this.generateFillInBlankQuestion(questionId, word);
            case VocabularyQuestionType.USAGE_IN_CONTEXT:
                return this.generateUsageInContextQuestion(questionId, word);
            default:
                return this.generateWordToDefinitionQuestion(questionId, word);
        }
    }
    generateWordToDefinitionQuestion(id, word) {
        const distractors = this.generateDefinitionDistractors(word);
        const options = this.shuffleArray([word.definition || `Definition of ${word.word}`, ...distractors]);
        return {
            id,
            type: VocabularyQuestionType.WORD_TO_DEFINITION,
            targetWord: word,
            question: `What is the definition of "${word.word}"?`,
            options,
            correctAnswer: word.definition || `Definition of ${word.word}`,
            explanation: `"${word.word}" means: ${word.definition}`,
            difficulty: word.difficulty
        };
    }
    generateDefinitionToWordQuestion(id, word) {
        const distractors = this.generateWordDistractors(word);
        const options = this.shuffleArray([word.word, ...distractors]);
        return {
            id,
            type: VocabularyQuestionType.DEFINITION_TO_WORD,
            targetWord: word,
            question: `Which word matches this definition: "${word.definition}"?`,
            options,
            correctAnswer: word.word,
            explanation: `The word "${word.word}" matches the given definition.`,
            difficulty: word.difficulty
        };
    }
    generateFillInBlankQuestion(id, word) {
        const sentence = this.generateSentenceWithWord(word);
        const blankedSentence = sentence.replace(new RegExp(word.word, 'gi'), '______');
        const distractors = this.generateWordDistractors(word);
        const options = this.shuffleArray([word.word, ...distractors]);
        return {
            id,
            type: VocabularyQuestionType.FILL_IN_BLANK,
            targetWord: word,
            question: `Fill in the blank: ${blankedSentence}`,
            options,
            correctAnswer: word.word,
            explanation: `The correct word is "${word.word}" which fits the context of the sentence.`,
            difficulty: word.difficulty + 1
        };
    }
    generateUsageInContextQuestion(id, word) {
        const correctSentence = this.generateSentenceWithWord(word);
        const incorrectSentences = this.generateIncorrectSentences(word);
        const options = this.shuffleArray([correctSentence, ...incorrectSentences]);
        return {
            id,
            type: VocabularyQuestionType.USAGE_IN_CONTEXT,
            targetWord: word,
            question: `Which sentence uses "${word.word}" correctly?`,
            options,
            correctAnswer: correctSentence,
            explanation: `This sentence demonstrates the proper usage of "${word.word}" in context.`,
            difficulty: word.difficulty + 2
        };
    }
    calculatePracticeScore(result) {
        if (!result.isCorrect) {
            return 0;
        }
        let score = 100;
        const optimalTime = 10000;
        if (result.responseTime <= optimalTime) {
            score += Math.round((optimalTime - result.responseTime) / 1000);
        }
        else {
            score -= Math.round((result.responseTime - optimalTime) / 2000);
        }
        return Math.max(0, Math.min(100, score));
    }
    generateDefinitionDistractors(word) {
        return [
            `A type of ${word.partOfSpeech || 'word'}`,
            `Something related to ${word.word.substring(0, 3)}...`,
            `An alternative meaning of ${word.word}`
        ];
    }
    generateWordDistractors(word) {
        const baseWord = word.word;
        return [
            baseWord + 's',
            baseWord.substring(0, -1) + 'ing',
            baseWord + 'ed'
        ].filter(w => w !== baseWord).slice(0, 3);
    }
    generateSentenceWithWord(word) {
        const templates = [
            `The ${word.word} was very important in the discussion.`,
            `She decided to ${word.word} before making a decision.`,
            `The concept of ${word.word} is fundamental to understanding.`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
    generateIncorrectSentences(word) {
        return [
            `The ${word.word} flew over the mountain.`,
            `He ate the ${word.word} for breakfast.`,
            `The ${word.word} was painted blue.`
        ];
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    generateId() {
        return Math.random().toString(36).substring(2, 15);
    }
    determineFocusAreas(words) {
        const areas = new Set();
        words.forEach(word => {
            if (word.partOfSpeech)
                areas.add(word.partOfSpeech);
            if (word.difficulty > 7)
                areas.add('advanced_vocabulary');
            if (word.masteryLevel === VocabularyWord_1.MasteryLevel.NEW)
                areas.add('new_words');
        });
        return Array.from(areas);
    }
    calculateMasteryProgression(wordsPracticed, retainedWords) {
        if (wordsPracticed === 0)
            return 0;
        return (retainedWords / wordsPracticed) * 100;
    }
    async identifyWeaknessAreas(userId, language) {
        const query = `
      SELECT part_of_speech, AVG(mastery_score) as avg_score
      FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2 AND part_of_speech IS NOT NULL
      GROUP BY part_of_speech
      HAVING AVG(mastery_score) < 60
      ORDER BY avg_score ASC
    `;
        const result = await this.db.query(query, [userId, language]);
        return result.rows.map(row => row.part_of_speech);
    }
    async selectAdaptiveWords(userId, language, metrics) {
        let query = `
      SELECT * FROM vocabulary_words 
      WHERE user_id = $1 AND language = $2
    `;
        if (metrics.retentionRate < 70) {
            query += ` AND difficulty <= 5 AND mastery_level IN ('new', 'learning')`;
        }
        else {
            query += ` AND (difficulty > 5 OR mastery_level IN ('short_term', 'long_term'))`;
        }
        query += ` ORDER BY mastery_score ASC LIMIT 10`;
        const result = await this.db.query(query, [userId, language]);
        return result.rows.map(row => this.mapRowToVocabularyWord(row));
    }
    async generateAdaptiveQuestions(words, metrics) {
        const questions = [];
        for (const word of words) {
            const questionType = metrics.retentionRate > 80
                ? VocabularyQuestionType.USAGE_IN_CONTEXT
                : VocabularyQuestionType.WORD_TO_DEFINITION;
            const question = await this.generateQuestion(word, questionType);
            questions.push(question);
        }
        return questions;
    }
    async updateLearningEfficiencyMetrics(userId, results) {
        const correctAnswers = results.filter(r => r.isCorrect).length;
        const accuracy = (correctAnswers / results.length) * 100;
        console.log(`User ${userId} practice session: ${accuracy}% accuracy, ${results.length} questions`);
    }
    async getWordsByIds(wordIds, userId) {
        const query = `
      SELECT * FROM vocabulary_words 
      WHERE id = ANY($1) AND user_id = $2
    `;
        const result = await this.db.query(query, [wordIds, userId]);
        return result.rows.map(row => this.mapRowToVocabularyWord(row));
    }
    mapRowToVocabularyWord(row) {
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
exports.VocabularyPracticeService = VocabularyPracticeService;
//# sourceMappingURL=VocabularyPracticeService.js.map