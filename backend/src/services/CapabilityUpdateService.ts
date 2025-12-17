import { UserCapabilityService } from './UserCapabilityService';
import { 
  PracticeResult, 
  CapabilityUpdate, 
  VocabularyUpdate, 
  MilestoneProgressUpdate,
  SkillArea,
  Language
} from '../models/PracticeGroup';
import { UserCapability } from '../models/UserCapability';

export class CapabilityUpdateService {
  constructor(
    private userCapabilityService: UserCapabilityService
  ) {}

  async applyPracticeResults(practiceResult: PracticeResult): Promise<void> {
    // Apply capability updates
    if (practiceResult.capabilityUpdates.length > 0) {
      await this.applyCapabilityUpdates(practiceResult.userId, practiceResult.capabilityUpdates);
    }

    // Apply vocabulary updates
    if (practiceResult.vocabularyUpdates.length > 0) {
      await this.applyVocabularyUpdates(practiceResult.userId, practiceResult.vocabularyUpdates);
    }

    // Apply milestone progress updates
    if (practiceResult.milestoneProgress.length > 0) {
      await this.applyMilestoneUpdates(practiceResult.userId, practiceResult.milestoneProgress);
    }

    // Update overall capability assessment
    await this.updateOverallCapability(practiceResult);
  }

  private async applyCapabilityUpdates(
    userId: string, 
    updates: CapabilityUpdate[]
  ): Promise<void> {
    // Group updates by language (assuming we can derive language from context)
    const updatesByLanguage = new Map<Language, CapabilityUpdate[]>();
    
    // For now, we'll assume all updates are for the same language
    // In a real implementation, we'd need to track language per update
    const language = Language.ENGLISH; // This should be derived from practice context
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

  private mergeCapabilityUpdates(
    currentCapability: UserCapability, 
    updates: CapabilityUpdate[]
  ): Partial<UserCapability> {
    const updatedCapability: Partial<UserCapability> = { ...currentCapability };

    updates.forEach(update => {
      switch (update.skillArea) {
        case SkillArea.LISTENING:
          updatedCapability.listeningLevel = update.newScore;
          break;
        case SkillArea.SPEAKING:
          updatedCapability.speakingLevel = update.newScore;
          break;
        case SkillArea.READING:
          updatedCapability.readingLevel = update.newScore;
          break;
        case SkillArea.WRITING:
          updatedCapability.writingLevel = update.newScore;
          break;
        case SkillArea.VOCABULARY:
          if (updatedCapability.vocabularyCapability) {
            updatedCapability.vocabularyCapability.basicVocabularyMastery = update.newScore;
          }
          break;
        case SkillArea.GRAMMAR:
          if (updatedCapability.grammarCapability) {
            updatedCapability.grammarCapability.overallGrammarScore = update.newScore;
          }
          break;
      }
    });

    // Recalculate overall level based on updated scores
    updatedCapability.overallLevel = this.calculateOverallLevel(updatedCapability);
    updatedCapability.updatedAt = new Date();

    return updatedCapability;
  }

  private calculateOverallLevel(capability: Partial<UserCapability>): any {
    const scores = [
      capability.listeningLevel || 0,
      capability.speakingLevel || 0,
      capability.readingLevel || 0,
      capability.writingLevel || 0
    ];

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Convert numeric score to level
    if (averageScore < 30) return 'A1';
    if (averageScore < 45) return 'A2';
    if (averageScore < 60) return 'B1';
    if (averageScore < 75) return 'B2';
    if (averageScore < 90) return 'C1';
    return 'C2';
  }

  private async applyVocabularyUpdates(
    userId: string, 
    updates: VocabularyUpdate[]
  ): Promise<void> {
    // This would integrate with the vocabulary management system
    // For now, we'll log the updates that should be applied
    console.log(`Applying vocabulary updates for user ${userId}:`, updates);
    
    // TODO: Implement actual vocabulary update logic when VocabularyService is available
    // This would typically:
    // 1. Update mastery levels for specific words
    // 2. Adjust forgetting curve parameters
    // 3. Update next review dates
    // 4. Move words between mastery categories
  }

  private async applyMilestoneUpdates(
    userId: string, 
    updates: MilestoneProgressUpdate[]
  ): Promise<void> {
    // This would integrate with the milestone/progress tracking system
    // For now, we'll log the updates that should be applied
    console.log(`Applying milestone updates for user ${userId}:`, updates);
    
    // TODO: Implement actual milestone update logic when MilestoneService is available
    // This would typically:
    // 1. Update progress on specific milestones
    // 2. Mark milestones as completed
    // 3. Unlock new milestones
    // 4. Update learning path progression
  }

  private async updateOverallCapability(practiceResult: PracticeResult): Promise<void> {
    // Update confidence scores and assessment history based on practice performance
    const userId = practiceResult.userId;
    
    // This is a simplified implementation
    // In practice, this would involve more sophisticated analysis
    
    console.log(`Updating overall capability assessment for user ${userId} based on practice result ${practiceResult.id}`);
    
    // TODO: Implement comprehensive capability reassessment
    // This could include:
    // 1. Updating confidence scores based on consistency of performance
    // 2. Identifying new strengths and weaknesses
    // 3. Adjusting learning style preferences
    // 4. Updating next assessment due dates
    // 5. Generating new learning recommendations
  }

  async analyzePerformanceTrends(userId: string, language: Language): Promise<{
    improvingAreas: SkillArea[];
    decliningAreas: SkillArea[];
    stableAreas: SkillArea[];
    recommendations: string[];
  }> {
    // This would analyze historical practice results to identify trends
    // For now, we'll return a placeholder implementation
    
    return {
      improvingAreas: [SkillArea.VOCABULARY],
      decliningAreas: [],
      stableAreas: [SkillArea.GRAMMAR, SkillArea.READING],
      recommendations: [
        'Continue vocabulary practice to maintain improvement',
        'Focus on listening skills for balanced development'
      ]
    };
  }

  async generateLearningInsights(userId: string, language: Language): Promise<{
    strengths: string[];
    weaknesses: string[];
    nextSteps: string[];
    estimatedTimeToNextLevel: number;
  }> {
    const currentCapability = await this.userCapabilityService.getUserCapability(userId, language);
    
    if (!currentCapability) {
      return {
        strengths: [],
        weaknesses: [],
        nextSteps: ['Complete initial assessment'],
        estimatedTimeToNextLevel: 0
      };
    }

    // Analyze current capability to generate insights
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

  private identifyStrengths(capability: UserCapability): string[] {
    const strengths: string[] = [];
    const threshold = 70; // Consider scores above 70 as strengths

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

  private identifyWeaknesses(capability: UserCapability): string[] {
    const weaknesses: string[] = [];
    const threshold = 50; // Consider scores below 50 as weaknesses

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

  private generateNextSteps(capability: UserCapability, weaknesses: string[]): string[] {
    const nextSteps: string[] = [];

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

  private estimateTimeToNextLevel(capability: UserCapability): number {
    // Simple estimation based on current level and typical progression rates
    const currentAverage = (
      capability.listeningLevel + 
      capability.speakingLevel + 
      capability.readingLevel + 
      capability.writingLevel
    ) / 4;

    const pointsToNextLevel = Math.ceil(currentAverage / 15) * 15 - currentAverage;
    const estimatedWeeksPerPoint = 2; // Assume 2 weeks per point improvement on average

    return Math.max(pointsToNextLevel * estimatedWeeksPerPoint, 4); // Minimum 4 weeks
  }
}
