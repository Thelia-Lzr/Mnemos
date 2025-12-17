"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeFactory = void 0;
const uuid_1 = require("uuid");
class PracticeFactory {
    static create(options = {}) {
        const id = (0, uuid_1.v4)();
        const userId = options.userId || (0, uuid_1.v4)();
        const title = options.title || `Practice Group ${Date.now()}`;
        const description = options.description || 'Test practice group description';
        const language = options.language || 'en';
        const difficulty = options.difficulty || 'intermediate';
        const type = options.type || 'general';
        const questionCount = options.questionCount || 10;
        const questions = this.createQuestions(id, questionCount);
        return {
            id,
            userId,
            title,
            description,
            language,
            difficulty,
            type,
            questions
        };
    }
    static createQuestions(practiceGroupId, count) {
        const questions = [];
        for (let i = 0; i < count; i++) {
            questions.push({
                id: (0, uuid_1.v4)(),
                practiceGroupId,
                type: 'multiple_choice',
                content: `Test question ${i + 1}: What is the correct answer?`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A',
                explanation: `This is the explanation for question ${i + 1}`,
                difficulty: Math.floor(Math.random() * 5) + 1
            });
        }
        return questions;
    }
    static createVocabularyPractice(options = {}) {
        return this.create({
            ...options,
            type: 'vocabulary',
            title: options.title || 'Vocabulary Practice'
        });
    }
    static createGrammarPractice(options = {}) {
        return this.create({
            ...options,
            type: 'grammar',
            title: options.title || 'Grammar Practice'
        });
    }
}
exports.PracticeFactory = PracticeFactory;
//# sourceMappingURL=practiceFactory.js.map