import { UserCapabilityService } from './UserCapabilityService';
import { 
  PracticeGroup, 
  PracticeResult, 
  QuestionAnswer, 
  CapabilityUpdate, 
  VocabularyUpdate, 
  MilestoneProgressUpdate,
  SkillArea,
  MasteryLevel
} from '../models/PracticeGroup';

export interface SubmittedAnswer {
  questionId: string;
  userAnswer: string;
  timeSpent?: number;
  attempts?: number;
}

export class PracticeEvaluationService {
  constructor(
    private userCapabilityService: UserCapabilityService
  ) {}

  async evaluatePracticeGroup(
    userId: string,
    practiceGroup: PracticeGroup,
    submittedAnswers: SubmittedAnswer[],
    totalTime: number
  ): Promise<Omit<PracticeResult, 'id' | 'completedAt'>> {
    // Evaluate answers
    const questionAnswers = this.evaluateAnswers(practiceGroup, submittedAnswers);
    
    // Calculate basic statistics
    const totalQuestions = practiceGroup.questions.length;
    const correctAnswers = questionAnswers.filter(qa => qa.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const averageTimePerQuestion = totalTime > 0 ? totalTime / totalQuestions : 0;
    
    // Generate wrong answers summary for quick access
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
    
    // Analyze performance
    const performanceAnalysis = this.analyzePerformance(practiceGroup, questionAnswers);
    
    // Generate capability updates (basic analysis first, AI analysis async)
    const capabilityUpdates = await this.generateCapabilityUpdates(
      userId, 
      practiceGroup, 
      questionAnswers, 
      accuracy,
      false // Skip AI analysis for immediate response
    );
    
    // Schedule AI analysis to run asynchronously after response is sent
    this.scheduleAsyncAIAnalysis(userId, practiceGroup, questionAnswers, accuracy);
    
    // Generate vocabulary updates
    const vocabularyUpdates = this.generateVocabularyUpdates(practiceGroup, questionAnswers);
    
    // Generate milestone progress updates
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

  async updateUserCapabilities(userId: string, practiceResultId: string): Promise<void> {
    // This would typically fetch the practice result and apply the capability updates
    // For now, we'll implement a placeholder that updates based on recent practice performance
    
    // TODO: Implement actual capability update logic based on practice results
    console.log(`Updating capabilities for user ${userId} based on practice result ${practiceResultId}`);
  }

  private evaluateAnswers(
    practiceGroup: PracticeGroup, 
    submittedAnswers: SubmittedAnswer[]
  ): QuestionAnswer[] {
    const answerMap = new Map(submittedAnswers.map(sa => [sa.questionId, sa]));
    
    return practiceGroup.questions.map(question => {
      const submitted = answerMap.get(question.id);
      const userAnswer = submitted?.userAnswer || '';
      
      // Normalize user answer to option identifier (A, B, C, D)
      let normalizedUserAnswer = userAnswer;
      let userAnswerText = userAnswer;
      
      if (userAnswer.length > 1) {
        // If user answer is a full option text, find the corresponding identifier
        const optionIndex = question.options.findIndex(option => option === userAnswer);
        if (optionIndex !== -1) {
          // Convert index to letter (0->A, 1->B, 2->C, 3->D)
          normalizedUserAnswer = String.fromCharCode(65 + optionIndex);
          userAnswerText = userAnswer; // Keep the full text
        } else {
          // Try to extract the letter from the beginning of the answer
          const letterMatch = userAnswer.match(/^([A-D])/);
          if (letterMatch) {
            normalizedUserAnswer = letterMatch[1];
            // Find the full text for this letter
            const letterIndex = letterMatch[1].charCodeAt(0) - 65; // A=0, B=1, etc.
            if (letterIndex >= 0 && letterIndex < question.options.length) {
              userAnswerText = question.options[letterIndex];
            }
          } else {
            // If we can't normalize, keep the original answer
            normalizedUserAnswer = userAnswer;
            userAnswerText = userAnswer;
          }
        }
      } else {
        // Single letter answer, find the full text
        const letterIndex = userAnswer.charCodeAt(0) - 65; // A=0, B=1, etc.
        if (letterIndex >= 0 && letterIndex < question.options.length) {
          userAnswerText = question.options[letterIndex];
        }
      }
      
      // Get correct answer text
      const correctAnswerIndex = question.correctAnswer.charCodeAt(0) - 65;
      const correctAnswerText = correctAnswerIndex >= 0 && correctAnswerIndex < question.options.length 
        ? question.options[correctAnswerIndex] 
        : question.correctAnswer;
      
      // Compare normalized answers
      const isCorrect = normalizedUserAnswer === question.correctAnswer;
      const timeSpent = submitted?.timeSpent || 0;
      const attempts = submitted?.attempts || 1;
      
      // Log for debugging
      if (userAnswer && !isCorrect) {
        console.log(`Answer evaluation for question ${question.id}:`);
        console.log(`  Original user answer: "${userAnswer}"`);
        console.log(`  Normalized user answer: "${normalizedUserAnswer}"`);
        console.log(`  Correct answer: "${question.correctAnswer}"`);
        console.log(`  Is correct: ${isCorrect}`);
      }
      
      // Return enhanced answer structure with detailed information
      return {
        questionId: question.id,
        userAnswer: normalizedUserAnswer, // Store the normalized letter
        userAnswerText: userAnswerText, // Store the full option text
        userAnswerLetter: normalizedUserAnswer,
        correctAnswer: question.correctAnswer,
        correctAnswerText: correctAnswerText,
        isCorrect,
        timeSpent,
        attempts,
        // Include question details for better context
        questionContent: question.content,
        options: question.options,
        explanation: question.explanation || '',
        vocabularyWords: question.vocabularyWords || [],
        grammarPoints: question.grammarPoints || []
      };
    });
  }

  private analyzePerformance(
    practiceGroup: PracticeGroup, 
    questionAnswers: QuestionAnswer[]
  ): {
    weakAreas: string[];
    improvedAreas: string[];
    recommendedFocus: string[];
  } {
    const skillPerformance = new Map<string, { correct: number; total: number }>();
    const vocabularyPerformance = new Map<string, boolean>();
    const grammarPerformance = new Map<string, boolean>();
    
    // Analyze performance by skill area and content type
    practiceGroup.questions.forEach((question, index) => {
      const answer = questionAnswers[index];
      
      // Track vocabulary performance
      question.vocabularyWords.forEach(word => {
        vocabularyPerformance.set(word, answer.isCorrect);
      });
      
      // Track grammar performance
      question.grammarPoints.forEach(point => {
        grammarPerformance.set(point, answer.isCorrect);
      });
      
      // Track skill area performance based on question type and content
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
    
    // Identify weak areas (< 60% accuracy)
    const weakAreas: string[] = [];
    const improvedAreas: string[] = [];
    
    skillPerformance.forEach((performance, skill) => {
      const accuracy = performance.total > 0 ? (performance.correct / performance.total) * 100 : 0;
      if (accuracy < 60) {
        weakAreas.push(skill);
      } else if (accuracy >= 80) {
        improvedAreas.push(skill);
      }
    });
    
    // Generate recommendations
    const recommendedFocus = this.generateRecommendations(
      weakAreas, 
      vocabularyPerformance, 
      grammarPerformance
    );
    
    return {
      weakAreas,
      improvedAreas,
      recommendedFocus
    };
  }

  private identifySkillAreas(question: any): string[] {
    const areas: string[] = [];
    
    if (question.vocabularyWords && question.vocabularyWords.length > 0) {
      areas.push(SkillArea.VOCABULARY);
    }
    
    if (question.grammarPoints && question.grammarPoints.length > 0) {
      areas.push(SkillArea.GRAMMAR);
    }
    
    // Analyze question content to identify other skill areas
    const content = question.content.toLowerCase();
    
    if (content.includes('read') || content.includes('passage') || content.includes('text')) {
      areas.push(SkillArea.READING);
    }
    
    if (content.includes('listen') || content.includes('audio') || content.includes('hear')) {
      areas.push(SkillArea.LISTENING);
    }
    
    if (content.includes('write') || content.includes('compose') || content.includes('essay')) {
      areas.push(SkillArea.WRITING);
    }
    
    if (content.includes('speak') || content.includes('pronounce') || content.includes('say')) {
      areas.push(SkillArea.SPEAKING);
    }
    
    // Default to reading if no specific skill area identified
    if (areas.length === 0) {
      areas.push(SkillArea.READING);
    }
    
    return areas;
  }

  private generateRecommendations(
    weakAreas: string[], 
    vocabularyPerformance: Map<string, boolean>, 
    grammarPerformance: Map<string, boolean>
  ): string[] {
    const recommendations: string[] = [];
    
    if (weakAreas.includes(SkillArea.VOCABULARY)) {
      const incorrectWords = Array.from(vocabularyPerformance.entries())
        .filter(([_, correct]) => !correct)
        .map(([word, _]) => word);
      
      if (incorrectWords.length > 0) {
        recommendations.push(`Review vocabulary: ${incorrectWords.slice(0, 5).join(', ')}`);
      }
    }
    
    if (weakAreas.includes(SkillArea.GRAMMAR)) {
      const incorrectGrammar = Array.from(grammarPerformance.entries())
        .filter(([_, correct]) => !correct)
        .map(([point, _]) => point);
      
      if (incorrectGrammar.length > 0) {
        recommendations.push(`Focus on grammar: ${incorrectGrammar.slice(0, 3).join(', ')}`);
      }
    }
    
    if (weakAreas.includes(SkillArea.READING)) {
      recommendations.push('Practice reading comprehension exercises');
    }
    
    if (weakAreas.includes(SkillArea.LISTENING)) {
      recommendations.push('Increase listening practice with audio materials');
    }
    
    return recommendations;
  }

  private async generateCapabilityUpdates(
    userId: string,
    practiceGroup: PracticeGroup,
    questionAnswers: QuestionAnswer[],
    accuracy: number,
    useAIAnalysis: boolean = true
  ): Promise<CapabilityUpdate[]> {
    const updates: CapabilityUpdate[] = [];
    
    // Get current user capability
    const currentCapability = await this.userCapabilityService.getUserCapability(
      userId, 
      practiceGroup.language
    );
    
    if (!currentCapability) {
      return updates;
    }
    
    // Use AI to analyze performance and generate more intelligent capability updates
    let aiAnalysis: {
      skillAdjustments: Record<string, number>;
      confidence: number;
      reasoning: string;
    };
    
    if (useAIAnalysis) {
      aiAnalysis = await this.generateAICapabilityAnalysis(
        practiceGroup, 
        questionAnswers, 
        currentCapability
      );
    } else {
      // Use basic analysis for immediate response
      aiAnalysis = {
        skillAdjustments: {},
        confidence: 0.5,
        reasoning: 'Basic analysis - AI analysis scheduled for background processing'
      };
    }
    
    // Calculate skill-specific updates based on AI analysis and performance
    const skillPerformance = this.calculateSkillPerformance(practiceGroup, questionAnswers);
    
    skillPerformance.forEach((performance, skillArea) => {
      const currentScore = this.getCurrentSkillScore(currentCapability, skillArea);
      const performanceScore = (performance.correct / performance.total) * 100;
      
      // Apply AI-enhanced scoring adjustments
      const aiAdjustment = aiAnalysis.skillAdjustments[skillArea] || 0;
      const adjustedPerformanceScore = Math.max(0, Math.min(100, performanceScore + aiAdjustment));
      
      // Calculate new score with AI-informed weighting
      const baseWeight = Math.min(performance.total / 10, 1);
      const aiConfidenceWeight = aiAnalysis.confidence * 0.3; // AI can influence up to 30% of the weight
      const totalWeight = Math.min(baseWeight + aiConfidenceWeight, 1);
      
      const newScore = currentScore * (1 - totalWeight * 0.15) + adjustedPerformanceScore * (totalWeight * 0.15);
      
      if (Math.abs(newScore - currentScore) > 1) {
        updates.push({
          skillArea: skillArea as SkillArea,
          previousScore: currentScore,
          newScore: Math.round(newScore),
          changeReason: `AI-enhanced analysis: ${performance.correct}/${performance.total} correct, AI adjustment: ${aiAdjustment.toFixed(1)}`,
          confidence: Math.min(totalWeight * 0.9, 0.85) // Max confidence of 0.85 for AI-enhanced updates
        });
      }
    });
    
    return updates;
  }

  private scheduleAsyncAIAnalysis(
    userId: string,
    practiceGroup: PracticeGroup,
    questionAnswers: QuestionAnswer[],
    accuracy: number
  ): void {
    // Schedule AI analysis to run in background without blocking the response
    setTimeout(async () => {
      try {
        console.log(`Starting background AI analysis for user ${userId}, practice group ${practiceGroup.id}`);
        
        // Get current capability
        const currentCapability = await this.userCapabilityService.getUserCapability(
          userId, 
          practiceGroup.language
        );
        
        if (currentCapability) {
          // Generate AI-enhanced capability updates
          const aiEnhancedUpdates = await this.generateCapabilityUpdates(
            userId,
            practiceGroup,
            questionAnswers,
            accuracy,
            true // Use AI analysis
          );
          
          // Apply the AI-enhanced updates to user capabilities
          // This could update the database with more accurate capability scores
          console.log(`Background AI analysis completed for user ${userId}:`, {
            updatesCount: aiEnhancedUpdates.length,
            practiceGroupId: practiceGroup.id
          });
          
          // TODO: Optionally update the practice result with AI-enhanced analysis
          // or store the AI analysis for future reference
        }
      } catch (error) {
        console.warn(`Background AI analysis failed for user ${userId}:`, error);
      }
    }, 100); // Start after 100ms to ensure response is sent first
  }

  private async generateAICapabilityAnalysis(
    practiceGroup: PracticeGroup,
    questionAnswers: QuestionAnswer[],
    currentCapability: any
  ): Promise<{
    skillAdjustments: Record<string, number>;
    confidence: number;
    reasoning: string;
  }> {
    try {
      // Import AI services
      const { aiPromptService } = await import('./AIPromptService');
      const { openRouterService } = await import('./OpenRouterService');
      
      if (!openRouterService) {
        // Fallback to basic analysis if AI is not available
        return {
          skillAdjustments: {},
          confidence: 0.5,
          reasoning: 'AI analysis not available, using basic performance metrics'
        };
      }

      // Prepare analysis data
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

      // Generate AI analysis prompt
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
${analysisData.questionDetails.map((q, i) => 
  `Q${i+1}: Difficulty ${q.difficulty}, ${q.isCorrect ? 'Correct' : 'Incorrect'}, ${q.timeSpent}s, ${q.attempts} attempts`
).join('\n')}

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

      const model = openRouterService.selectModel('assessment' as any, practiceGroup.language as any);
      const response = await openRouterService.callAI(
        model,
        analysisPrompt,
        {
          systemPrompt: 'You are an expert language learning assessment AI. Analyze practice performance and provide precise capability adjustments.'
        }
      );

      // Parse AI response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiAnalysis = JSON.parse(jsonMatch[0]);
        return {
          skillAdjustments: aiAnalysis.skillAdjustments || {},
          confidence: Math.min(Math.max(aiAnalysis.confidence || 0.5, 0), 1),
          reasoning: aiAnalysis.reasoning || 'AI analysis completed'
        };
      }
    } catch (error) {
      console.warn('AI capability analysis failed, using fallback:', error);
    }

    // Fallback analysis
    return {
      skillAdjustments: {},
      confidence: 0.5,
      reasoning: 'Using basic performance analysis due to AI unavailability'
    };
  }

  private calculateSkillPerformance(
    practiceGroup: PracticeGroup,
    questionAnswers: QuestionAnswer[]
  ): Map<string, { correct: number; total: number }> {
    const skillPerformance = new Map<string, { correct: number; total: number }>();
    
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

  private getCurrentSkillScore(capability: any, skillArea: string): number {
    switch (skillArea) {
      case SkillArea.VOCABULARY:
        return capability.vocabularyCapability?.basicVocabularyMastery || 50;
      case SkillArea.GRAMMAR:
        return capability.grammarCapability?.overallGrammarScore || 50;
      case SkillArea.LISTENING:
        return capability.listeningLevel || 50;
      case SkillArea.SPEAKING:
        return capability.speakingLevel || 50;
      case SkillArea.READING:
        return capability.readingLevel || 50;
      case SkillArea.WRITING:
        return capability.writingLevel || 50;
      default:
        return 50;
    }
  }

  private generateVocabularyUpdates(
    practiceGroup: PracticeGroup,
    questionAnswers: QuestionAnswer[]
  ): VocabularyUpdate[] {
    const updates: VocabularyUpdate[] = [];
    const vocabularyPerformance = new Map<string, boolean[]>();
    
    // Collect vocabulary performance data
    practiceGroup.questions.forEach((question, index) => {
      const answer = questionAnswers[index];
      question.vocabularyWords.forEach(word => {
        const performances = vocabularyPerformance.get(word) || [];
        performances.push(answer.isCorrect);
        vocabularyPerformance.set(word, performances);
      });
    });
    
    // Generate updates based on performance
    vocabularyPerformance.forEach((performances, word) => {
      const correctCount = performances.filter(p => p).length;
      const accuracy = correctCount / performances.length;
      
      let newMasteryLevel: MasteryLevel;
      let masteryScoreChange: number;
      
      if (accuracy >= 0.8) {
        newMasteryLevel = MasteryLevel.SHORT_TERM;
        masteryScoreChange = 10;
      } else if (accuracy >= 0.6) {
        newMasteryLevel = MasteryLevel.LEARNING;
        masteryScoreChange = 5;
      } else {
        newMasteryLevel = MasteryLevel.NEW;
        masteryScoreChange = -5;
      }
      
      updates.push({
        wordId: '', // Would be populated from vocabulary service
        word,
        previousMasteryLevel: MasteryLevel.LEARNING, // Would be fetched from current state
        newMasteryLevel,
        masteryScoreChange
      });
    });
    
    return updates;
  }

  private async generateMilestoneProgress(
    userId: string,
    practiceGroup: PracticeGroup,
    accuracy: number
  ): Promise<MilestoneProgressUpdate[]> {
    const updates: MilestoneProgressUpdate[] = [];
    
    // Calculate progress based on practice performance
    const progressAmount = Math.round(accuracy / 10); // 1 point per 10% accuracy
    
    // This would typically check against actual milestones
    // For now, we'll create a placeholder update
    if (progressAmount > 0) {
      updates.push({
        milestoneId: 'practice-milestone', // Placeholder
        progressChange: progressAmount,
        isCompleted: accuracy >= 90 // Complete milestone if 90%+ accuracy
      });
    }
    
    return updates;
  }
}
