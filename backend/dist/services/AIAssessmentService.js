"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAssessmentService = void 0;
class AIAssessmentService {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async performComprehensiveAssessment(data, currentCapability, request) {
        try {
            switch (request.dataSource) {
                case 'chat_analysis':
                    return await this.assessFromChatAnalysis(data.chatHistory || [], currentCapability);
                case 'practice_performance':
                    return await this.assessFromPracticePerformance(data.practiceResults || [], currentCapability);
                case 'vocabulary_tracking':
                    return await this.assessFromVocabularyTracking(data.vocabularyData || [], currentCapability);
                case 'comprehensive_test':
                    return await this.assessFromAllData(data.allData || {}, currentCapability);
                case 'user_self_report':
                    return await this.assessFromSelfReport(data.userSelfReport || {}, currentCapability);
                default:
                    return await this.assessFromAllData(data.allData || {}, currentCapability);
            }
        }
        catch (error) {
            console.error('Error in AI assessment:', error);
            return this.generateFallbackAssessment(currentCapability);
        }
    }
    async assessFromChatAnalysis(chatHistory, currentCapability) {
        const prompt = `
      As an expert language assessment AI, analyze the following chat history to evaluate the user's language capabilities.

      User's Current Level: ${currentCapability.currentLevel}
      Language: ${currentCapability.language}
      
      Chat History Analysis:
      ${JSON.stringify(chatHistory.slice(0, 20), null, 2)}

      Analyze the user's:
      1. Vocabulary usage and complexity
      2. Grammar accuracy and sophistication
      3. Communication effectiveness
      4. Language fluency indicators
      5. Areas of strength and weakness

      Provide a detailed assessment in the following JSON format:
      {
        "overallScore": number (0-100),
        "skillScores": {
          "vocabulary": number (0-100),
          "grammar": number (0-100),
          "listening": number (0-100),
          "speaking": number (0-100),
          "reading": number (0-100),
          "writing": number (0-100)
        },
        "confidenceLevel": number (0-100),
        "improvementAreas": ["skill1", "skill2"],
        "regressionAreas": ["skill1"],
        "recommendations": ["specific recommendation 1", "specific recommendation 2"],
        "nextSteps": ["actionable step 1", "actionable step 2"],
        "vocabularyCapability": {
          "estimatedVocabularySize": number,
          "masteredWordsCount": number,
          "learningWordsCount": number,
          "basicVocabularyMastery": number (0-100),
          "intermediateVocabularyMastery": number (0-100),
          "advancedVocabularyMastery": number (0-100),
          "averageLearningSpeed": number,
          "retentionRate": number (0-100),
          "contextualUsageScore": number (0-100),
          "collocationsScore": number (0-100)
        },
        "grammarCapability": {
          "overallGrammarScore": number (0-100),
          "grammarPointsMastered": ["point1", "point2"],
          "grammarPointsLearning": ["point1", "point2"],
          "grammarPointsWeak": ["point1", "point2"],
          "sentenceStructureScore": number (0-100),
          "tenseUsageScore": number (0-100),
          "complexityHandlingScore": number (0-100)
        },
        "comprehensionCapability": {
          "readingComprehensionScore": number (0-100),
          "listeningComprehensionScore": number (0-100),
          "literalComprehension": number (0-100),
          "inferentialComprehension": number (0-100),
          "criticalComprehension": number (0-100),
          "maxTextComplexity": "beginner|intermediate|advanced",
          "processingSpeed": number (0-100)
        },
        "suggestedLearningStyle": "visual|auditory|kinesthetic|mixed"
      }
    `;
        const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'anthropic/claude-haiku-4.5', prompt, {
            temperature: 0.2,
            max_tokens: 3000
        });
        return this.parseAIResponse(response.content, currentCapability);
    }
    async assessFromPracticePerformance(practiceResults, currentCapability) {
        const prompt = `
      As an expert language assessment AI, analyze the following practice performance data to evaluate the user's language capabilities.

      User's Current Level: ${currentCapability.currentLevel}
      Language: ${currentCapability.language}
      
      Practice Performance Data:
      ${JSON.stringify(practiceResults, null, 2)}

      Analyze the user's:
      1. Accuracy trends across different skill areas
      2. Time efficiency and processing speed
      3. Consistency in performance
      4. Areas of improvement and regression
      5. Learning patterns and preferences

      Focus on quantitative analysis of the practice data to provide precise capability scores.

      Provide a detailed assessment in the same JSON format as specified in chat analysis.
    `;
        const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'anthropic/claude-haiku-4.5', prompt, {
            temperature: 0.2,
            max_tokens: 3000
        });
        return this.parseAIResponse(response.content, currentCapability);
    }
    async assessFromVocabularyTracking(vocabularyData, currentCapability) {
        const prompt = `
      As an expert language assessment AI, analyze the following vocabulary tracking data to evaluate the user's language capabilities.

      User's Current Level: ${currentCapability.currentLevel}
      Language: ${currentCapability.language}
      
      Vocabulary Tracking Data:
      ${JSON.stringify(vocabularyData, null, 2)}

      Analyze the user's:
      1. Vocabulary acquisition rate and retention
      2. Mastery levels across different word difficulties
      3. Learning patterns and forgetting curves
      4. Vocabulary usage in context
      5. Areas for vocabulary expansion

      Focus particularly on vocabulary and related language skills assessment.

      Provide a detailed assessment in the same JSON format as specified in chat analysis.
    `;
        const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'anthropic/claude-haiku-4.5', prompt, {
            temperature: 0.2,
            max_tokens: 3000
        });
        return this.parseAIResponse(response.content, currentCapability);
    }
    async assessFromAllData(allData, currentCapability) {
        const prompt = `
      As an expert language assessment AI, perform a comprehensive analysis of all available user data to evaluate language capabilities.

      User's Current Level: ${currentCapability.currentLevel}
      Language: ${currentCapability.language}
      
      Comprehensive Data:
      ${JSON.stringify(allData, null, 2)}

      Perform a holistic analysis considering:
      1. Chat interactions and communication patterns
      2. Practice performance and learning trends
      3. Vocabulary acquisition and retention
      4. Overall learning progress and consistency
      5. Strengths, weaknesses, and learning preferences

      This is a comprehensive assessment, so provide the most accurate and detailed evaluation possible.

      Provide a detailed assessment in the same JSON format as specified in chat analysis.
    `;
        const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'anthropic/claude-haiku-4.5', prompt, {
            temperature: 0.1,
            max_tokens: 4000
        });
        return this.parseAIResponse(response.content, currentCapability);
    }
    async assessFromSelfReport(selfReportData, currentCapability) {
        const prompt = `
      As an expert language assessment AI, analyze the user's self-reported capabilities and experiences.

      User's Current Level: ${currentCapability.currentLevel}
      Language: ${currentCapability.language}
      
      Self-Report Data:
      ${JSON.stringify(selfReportData, null, 2)}

      Consider:
      1. User's self-perception vs. objective measures
      2. Confidence levels in different skills
      3. Reported challenges and strengths
      4. Learning goals and preferences
      5. Self-assessment accuracy indicators

      Balance the self-reported data with objective capability indicators.

      Provide a detailed assessment in the same JSON format as specified in chat analysis.
    `;
        const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'anthropic/claude-haiku-4.5', prompt, {
            temperature: 0.3,
            max_tokens: 3000
        });
        return this.parseAIResponse(response.content, currentCapability);
    }
    async generateTargetedReassessment(focusAreas, currentCapability, reason) {
        const prompt = `
      Generate targeted assessment questions for a user who has requested reassessment.

      User's Current Level: ${currentCapability.currentLevel}
      Language: ${currentCapability.language}
      Focus Areas: ${focusAreas.join(', ')}
      Reason for Reassessment: ${reason}

      Generate 10 specific, actionable assessment questions that will help evaluate the user's capabilities in the focus areas.
      These questions should be designed to reveal the user's true proficiency level.

      Return as a JSON array of strings:
      ["question1", "question2", ...]
    `;
        try {
            const response = await this.aiService.callAI(process.env.ASSESSMENT_MODEL || process.env.DEFAULT_AI_MODEL || 'anthropic/claude-haiku-4.5', prompt, {
                temperature: 0.4,
                max_tokens: 1500
            });
            let cleanContent = response.content.trim();
            cleanContent = cleanContent.replace(/^```json\s*/i, '');
            cleanContent = cleanContent.replace(/\s*```$/, '');
            const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                cleanContent = jsonMatch[0];
            }
            const questions = JSON.parse(cleanContent);
            return Array.isArray(questions) ? questions : [];
        }
        catch (error) {
            console.error('Error generating targeted reassessment:', error);
            return this.generateFallbackQuestions(focusAreas);
        }
    }
    parseAIResponse(response, currentCapability) {
        try {
            let cleanResponse = response.trim();
            cleanResponse = cleanResponse.replace(/^```json\s*/i, '');
            cleanResponse = cleanResponse.replace(/\s*```$/i, '');
            let jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            let jsonStr = jsonMatch[0];
            const jsonEnd = this.findJsonEnd(jsonStr);
            if (jsonEnd !== -1) {
                jsonStr = jsonStr.substring(0, jsonEnd + 1);
            }
            const parsed = JSON.parse(jsonStr);
            return {
                overallScore: this.validateScore(parsed.overallScore),
                skillScores: this.validateSkillScores(parsed.skillScores),
                confidenceLevel: this.validateScore(parsed.confidenceLevel),
                improvementAreas: this.validateSkillAreas(parsed.improvementAreas),
                regressionAreas: this.validateSkillAreas(parsed.regressionAreas),
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
                nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
                vocabularyCapability: this.validateVocabularyCapability(parsed.vocabularyCapability),
                grammarCapability: this.validateGrammarCapability(parsed.grammarCapability),
                comprehensionCapability: this.validateComprehensionCapability(parsed.comprehensionCapability),
                suggestedLearningStyle: this.validateLearningStyle(parsed.suggestedLearningStyle)
            };
        }
        catch (error) {
            console.error('Error parsing AI response:', error);
            return this.generateFallbackAssessment(currentCapability);
        }
    }
    validateScore(score) {
        const num = Number(score);
        return isNaN(num) ? 50 : Math.max(0, Math.min(100, num));
    }
    validateSkillScores(scores) {
        const defaultScores = {
            vocabulary: 50,
            grammar: 50,
            listening: 50,
            speaking: 50,
            reading: 50,
            writing: 50,
            pronunciation: 50,
            fluency: 50
        };
        if (!scores || typeof scores !== 'object') {
            return defaultScores;
        }
        const validatedScores = { ...defaultScores };
        Object.keys(defaultScores).forEach(skill => {
            if (scores[skill] !== undefined) {
                validatedScores[skill] = this.validateScore(scores[skill]);
            }
        });
        return validatedScores;
    }
    validateSkillAreas(areas) {
        if (!Array.isArray(areas))
            return [];
        const validSkills = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing', 'pronunciation', 'fluency'];
        return areas.filter(area => validSkills.includes(area));
    }
    validateVocabularyCapability(capability) {
        return {
            estimatedVocabularySize: this.validateScore(capability?.estimatedVocabularySize) * 50,
            masteredWordsCount: Math.max(0, Number(capability?.masteredWordsCount) || 0),
            learningWordsCount: Math.max(0, Number(capability?.learningWordsCount) || 0),
            basicVocabularyMastery: this.validateScore(capability?.basicVocabularyMastery),
            intermediateVocabularyMastery: this.validateScore(capability?.intermediateVocabularyMastery),
            advancedVocabularyMastery: this.validateScore(capability?.advancedVocabularyMastery),
            averageLearningSpeed: Math.max(0, Number(capability?.averageLearningSpeed) || 0),
            retentionRate: this.validateScore(capability?.retentionRate),
            contextualUsageScore: this.validateScore(capability?.contextualUsageScore),
            collocationsScore: this.validateScore(capability?.collocationsScore)
        };
    }
    validateGrammarCapability(capability) {
        return {
            overallGrammarScore: this.validateScore(capability?.overallGrammarScore),
            grammarPointsMastered: Array.isArray(capability?.grammarPointsMastered) ? capability.grammarPointsMastered : [],
            grammarPointsLearning: Array.isArray(capability?.grammarPointsLearning) ? capability.grammarPointsLearning : [],
            grammarPointsWeak: Array.isArray(capability?.grammarPointsWeak) ? capability.grammarPointsWeak : [],
            sentenceStructureScore: this.validateScore(capability?.sentenceStructureScore),
            tenseUsageScore: this.validateScore(capability?.tenseUsageScore),
            complexityHandlingScore: this.validateScore(capability?.complexityHandlingScore)
        };
    }
    validateComprehensionCapability(capability) {
        const validComplexities = ['beginner', 'intermediate', 'advanced'];
        return {
            readingComprehensionScore: this.validateScore(capability?.readingComprehensionScore),
            listeningComprehensionScore: this.validateScore(capability?.listeningComprehensionScore),
            literalComprehension: this.validateScore(capability?.literalComprehension),
            inferentialComprehension: this.validateScore(capability?.inferentialComprehension),
            criticalComprehension: this.validateScore(capability?.criticalComprehension),
            maxTextComplexity: validComplexities.includes(capability?.maxTextComplexity) ? capability.maxTextComplexity : 'beginner',
            processingSpeed: this.validateScore(capability?.processingSpeed)
        };
    }
    validateLearningStyle(style) {
        const validStyles = ['visual', 'auditory', 'kinesthetic', 'mixed'];
        return validStyles.includes(style) ? style : 'mixed';
    }
    generateFallbackAssessment(currentCapability) {
        return {
            overallScore: currentCapability.confidenceScore || 50,
            skillScores: {
                vocabulary: currentCapability.estimatedVocabularySize ? Math.min(currentCapability.estimatedVocabularySize / 50, 100) : 50,
                grammar: 50,
                listening: currentCapability.listeningLevel || 50,
                speaking: currentCapability.speakingLevel || 50,
                reading: currentCapability.readingLevel || 50,
                writing: currentCapability.writingLevel || 50,
                pronunciation: 50,
                fluency: 50
            },
            confidenceLevel: 30,
            improvementAreas: ['vocabulary', 'grammar'],
            regressionAreas: [],
            recommendations: ['Continue regular practice', 'Focus on identified weak areas', 'Take more comprehensive assessments'],
            nextSteps: ['Complete practice exercises', 'Review assessment in 2 weeks', 'Focus on improvement areas'],
            vocabularyCapability: {
                estimatedVocabularySize: currentCapability.estimatedVocabularySize || 1000,
                masteredWordsCount: currentCapability.masteredWordsCount || 0,
                learningWordsCount: currentCapability.learningWordsCount || 0,
                basicVocabularyMastery: 50,
                intermediateVocabularyMastery: 30,
                advancedVocabularyMastery: 10,
                averageLearningSpeed: 5,
                retentionRate: 70,
                contextualUsageScore: 50,
                collocationsScore: 40
            },
            grammarCapability: {
                overallGrammarScore: 50,
                grammarPointsMastered: [],
                grammarPointsLearning: ['basic_tenses', 'sentence_structure'],
                grammarPointsWeak: ['complex_tenses', 'conditionals'],
                sentenceStructureScore: 50,
                tenseUsageScore: 45,
                complexityHandlingScore: 40
            },
            comprehensionCapability: {
                readingComprehensionScore: currentCapability.readingLevel || 50,
                listeningComprehensionScore: currentCapability.listeningLevel || 50,
                literalComprehension: 60,
                inferentialComprehension: 40,
                criticalComprehension: 30,
                maxTextComplexity: 'beginner',
                processingSpeed: 50
            },
            suggestedLearningStyle: 'mixed'
        };
    }
    findJsonEnd(jsonStr) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{') {
                    braceCount++;
                }
                else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        return i;
                    }
                }
            }
        }
        return -1;
    }
    generateFallbackQuestions(focusAreas) {
        const questionBank = {
            vocabulary: [
                "Define the following words in context",
                "Use these advanced vocabulary words in sentences",
                "Identify synonyms and antonyms for given words"
            ],
            grammar: [
                "Correct the grammatical errors in these sentences",
                "Transform sentences using different tenses",
                "Identify and explain grammatical structures"
            ],
            listening: [
                "Listen to audio clips and answer comprehension questions",
                "Identify main ideas and supporting details from audio",
                "Transcribe spoken passages accurately"
            ],
            speaking: [
                "Record yourself describing a complex topic",
                "Engage in a structured conversation",
                "Present arguments on a given topic"
            ],
            reading: [
                "Read passages and answer analytical questions",
                "Summarize main points from complex texts",
                "Analyze author's intent and tone"
            ],
            writing: [
                "Write essays on given topics",
                "Compose formal and informal communications",
                "Edit and improve provided text samples"
            ],
            pronunciation: [
                "Record pronunciation of challenging words",
                "Practice stress patterns in sentences",
                "Demonstrate intonation in different contexts"
            ],
            fluency: [
                "Speak continuously on a topic for 2 minutes",
                "Engage in rapid-fire question responses",
                "Demonstrate natural conversation flow"
            ]
        };
        const questions = [];
        focusAreas.forEach(area => {
            if (questionBank[area]) {
                questions.push(...questionBank[area]);
            }
        });
        return questions.slice(0, 10);
    }
}
exports.AIAssessmentService = AIAssessmentService;
//# sourceMappingURL=AIAssessmentService.js.map