"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityUpdateService = void 0;
const PracticeGroup_1 = require("../models/PracticeGroup");
class CapabilityUpdateService {
    constructor(userCapabilityService) {
        this.userCapabilityService = userCapabilityService;
    }
    async applyPracticeResults(practiceResult) {
        if (practiceResult.capabilityUpdates.length > 0) {
            await this.applyCapabilityUpdates(practiceResult.userId, practiceResult.capabilityUpdates);
        }
        if (practiceResult.vocabularyUpdates.length > 0) {
            await this.applyVocabularyUpdates(practiceResult.userId, practiceResult.vocabularyUpdates);
        }
        if (practiceResult.milestoneProgress.length > 0) {
            await this.applyMilestoneUpdates(practiceResult.userId, practiceResult.milestoneProgress);
        }
        await this.updateOverallCapability(practiceResult);
    }
    async applyCapabilityUpdates(userId, updates) {
        const updatesByLanguage = new Map();
        const language = PracticeGroup_1.Language.ENGLISH;
        updatesByLanguage.set(language, updates);
        for (const [lang, langUpdates] of updatesByLanguage) {
            const currentCapability = await this.userCapabilityService.getUserCapability(userId, lang);
            if (!currentCapability) {
                console.warn(`No capability found for user ${userId} and language ${lang}`);
                continue;
            }
            const updatedCapability = this.mergeCapabilityUpdates(currentCapability, langUpdates);
            await this.userCapabilityService.updateUserCapability(userId, lang, updatedCapability);
        }
    }
    mergeCapabilityUpdates(currentCapability, updates) {
        const updatedCapability = { ...currentCapability };
        updates.forEach(update => {
            switch (update.skillArea) {
                case PracticeGroup_1.SkillArea.LISTENING:
                    updatedCapability.listeningLevel = update.newScore;
                    break;
                case PracticeGroup_1.SkillArea.SPEAKING:
                    updatedCapability.speakingLevel = update.newScore;
                    break;
                case PracticeGroup_1.SkillArea.READING:
                    updatedCapability.readingLevel = update.newScore;
                    break;
                case PracticeGroup_1.SkillArea.WRITING:
                    updatedCapability.writingLevel = update.newScore;
                    break;
                case PracticeGroup_1.SkillArea.VOCABULARY:
                    if (updatedCapability.vocabularyCapability) {
                        updatedCapability.vocabularyCapability.basicVocabularyMastery = update.newScore;
                    }
                    break;
                case PracticeGroup_1.SkillArea.GRAMMAR:
                    if (updatedCapability.grammarCapability) {
                        updatedCapability.grammarCapability.overallGrammarScore = update.newScore;
                    }
                    break;
            }
        });
        updatedCapability.overallLevel = this.calculateOverallLevel(updatedCapability);
        updatedCapability.updatedAt = new Date();
        return updatedCapability;
    }
    calculateOverallLevel(capability) {
        const scores = [
            capability.listeningLevel || 0,
            capability.speakingLevel || 0,
            capability.readingLevel || 0,
            capability.writingLevel || 0
        ];
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        if (averageScore < 30)
            return 'A1';
        if (averageScore < 45)
            return 'A2';
        if (averageScore < 60)
            return 'B1';
        if (averageScore < 75)
            return 'B2';
        if (averageScore < 90)
            return 'C1';
        return 'C2';
    }
    async applyVocabularyUpdates(userId, updates) {
        console.log(`Applying vocabulary updates for user ${userId}:`, updates);
    }
    async applyMilestoneUpdates(userId, updates) {
        console.log(`Applying milestone updates for user ${userId}:`, updates);
    }
    async updateOverallCapability(practiceResult) {
        const userId = practiceResult.userId;
        console.log(`Updating overall capability assessment for user ${userId} based on practice result ${practiceResult.id}`);
    }
    async analyzePerformanceTrends(userId, language) {
        return {
            improvingAreas: [PracticeGroup_1.SkillArea.VOCABULARY],
            decliningAreas: [],
            stableAreas: [PracticeGroup_1.SkillArea.GRAMMAR, PracticeGroup_1.SkillArea.READING],
            recommendations: [
                'Continue vocabulary practice to maintain improvement',
                'Focus on listening skills for balanced development'
            ]
        };
    }
    async generateLearningInsights(userId, language) {
        const currentCapability = await this.userCapabilityService.getUserCapability(userId, language);
        if (!currentCapability) {
            return {
                strengths: [],
                weaknesses: [],
                nextSteps: ['Complete initial assessment'],
                estimatedTimeToNextLevel: 0
            };
        }
        const strengths = this.identifyStrengths(currentCapability);
        const weaknesses = this.identifyWeaknesses(currentCapability);
        const nextSteps = this.generateNextSteps(currentCapability, weaknesses);
        const estimatedTime = this.estimateTimeToNextLevel(currentCapability);
        return {
            strengths,
            weaknesses,
            nextSteps,
            estimatedTimeToNextLevel: estimatedTime
        };
    }
    identifyStrengths(capability) {
        const strengths = [];
        const threshold = 70;
        if (capability.listeningLevel >= threshold) {
            strengths.push('Listening comprehension');
        }
        if (capability.speakingLevel >= threshold) {
            strengths.push('Speaking fluency');
        }
        if (capability.readingLevel >= threshold) {
            strengths.push('Reading comprehension');
        }
        if (capability.writingLevel >= threshold) {
            strengths.push('Writing skills');
        }
        if (capability.vocabularyCapability?.basicVocabularyMastery && capability.vocabularyCapability.basicVocabularyMastery >= threshold) {
            strengths.push('Vocabulary knowledge');
        }
        if (capability.grammarCapability?.overallGrammarScore && capability.grammarCapability.overallGrammarScore >= threshold) {
            strengths.push('Grammar understanding');
        }
        return strengths;
    }
    identifyWeaknesses(capability) {
        const weaknesses = [];
        const threshold = 50;
        if (capability.listeningLevel < threshold) {
            weaknesses.push('Listening comprehension');
        }
        if (capability.speakingLevel < threshold) {
            weaknesses.push('Speaking fluency');
        }
        if (capability.readingLevel < threshold) {
            weaknesses.push('Reading comprehension');
        }
        if (capability.writingLevel < threshold) {
            weaknesses.push('Writing skills');
        }
        if (capability.vocabularyCapability?.basicVocabularyMastery && capability.vocabularyCapability.basicVocabularyMastery < threshold) {
            weaknesses.push('Vocabulary knowledge');
        }
        if (capability.grammarCapability?.overallGrammarScore && capability.grammarCapability.overallGrammarScore < threshold) {
            weaknesses.push('Grammar understanding');
        }
        return weaknesses;
    }
    generateNextSteps(capability, weaknesses) {
        const nextSteps = [];
        if (weaknesses.includes('Vocabulary knowledge')) {
            nextSteps.push('Focus on expanding vocabulary through reading and flashcard practice');
        }
        if (weaknesses.includes('Grammar understanding')) {
            nextSteps.push('Practice grammar exercises and sentence construction');
        }
        if (weaknesses.includes('Listening comprehension')) {
            nextSteps.push('Increase exposure to audio content and listening exercises');
        }
        if (weaknesses.includes('Speaking fluency')) {
            nextSteps.push('Practice speaking through conversation exercises and pronunciation drills');
        }
        if (weaknesses.includes('Reading comprehension')) {
            nextSteps.push('Read more texts at your level and practice comprehension questions');
        }
        if (weaknesses.includes('Writing skills')) {
            nextSteps.push('Practice writing exercises and get feedback on your compositions');
        }
        if (nextSteps.length === 0) {
            nextSteps.push('Continue balanced practice across all skill areas');
        }
        return nextSteps;
    }
    estimateTimeToNextLevel(capability) {
        const currentAverage = (capability.listeningLevel +
            capability.speakingLevel +
            capability.readingLevel +
            capability.writingLevel) / 4;
        const pointsToNextLevel = Math.ceil(currentAverage / 15) * 15 - currentAverage;
        const estimatedWeeksPerPoint = 2;
        return Math.max(pointsToNextLevel * estimatedWeeksPerPoint, 4);
    }
}
exports.CapabilityUpdateService = CapabilityUpdateService;
//# sourceMappingURL=CapabilityUpdateService.js.map