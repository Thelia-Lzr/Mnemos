"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocabularyFactory = void 0;
const uuid_1 = require("uuid");
const VocabularyWord_1 = require("../../models/VocabularyWord");
class VocabularyFactory {
    static create(options = {}) {
        const id = (0, uuid_1.v4)();
        const userId = options.userId || (0, uuid_1.v4)();
        const word = options.word || `word_${Date.now()}`;
        const language = options.language || VocabularyWord_1.Language.ENGLISH;
        const definition = options.definition || `Definition of ${word}`;
        const masteryLevel = options.masteryLevel || VocabularyWord_1.MasteryLevel.NEW;
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
    static createMany(count, options = {}) {
        const words = [];
        for (let i = 0; i < count; i++) {
            const word = this.create({
                ...options,
                word: options.word ? `${options.word}_${i}` : `word_${i}_${Date.now()}`
            });
            words.push(word);
        }
        return words;
    }
    static createWithMasteryLevel(masteryLevel, options = {}) {
        const masteryScores = {
            [VocabularyWord_1.MasteryLevel.NEW]: 0,
            [VocabularyWord_1.MasteryLevel.LEARNING]: 25,
            [VocabularyWord_1.MasteryLevel.SHORT_TERM]: 50,
            [VocabularyWord_1.MasteryLevel.LONG_TERM]: 75,
            [VocabularyWord_1.MasteryLevel.MASTERED]: 95
        };
        return this.create({
            ...options,
            masteryLevel,
            masteryScore: masteryScores[masteryLevel]
        });
    }
    static createEnglishWords(count, options = {}) {
        const commonWords = ['hello', 'world', 'learning', 'language', 'artificial', 'intelligence', 'practice', 'vocabulary', 'grammar', 'fluent'];
        const words = [];
        for (let i = 0; i < count; i++) {
            const word = commonWords[i % commonWords.length];
            words.push(this.create({
                ...options,
                word: `${word}_${i}`,
                language: VocabularyWord_1.Language.ENGLISH,
                definition: `Definition of ${word}`
            }));
        }
        return words;
    }
}
exports.VocabularyFactory = VocabularyFactory;
//# sourceMappingURL=vocabularyFactory.js.map