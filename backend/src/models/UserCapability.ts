export type Language = 'en' | 'ja' | 'fr';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type SkillArea = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing' | 'pronunciation' | 'fluency';
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'mixed';

export interface UserCapability {
  id: string;
  userId: string;
  language: Language;
  currentLevel: LanguageLevel;
  learningGoal: LanguageLevel;
  isActiveLearning: boolean;
  overallLevel: LanguageLevel;
  confidenceScore: number; // 0-100
  listeningLevel: number; // 0-100
  speakingLevel: number; // 0-100
  readingLevel: number; // 0-100
  writingLevel: number; // 0-100
  estimatedVocabularySize: number;
  masteredWordsCount: number;
  learningWordsCount: number;
  lastAssessedAt: Date;
  nextAssessmentDue: Date | null;
  
  // Enhanced capability details
  vocabularyCapability: VocabularyCapability;
  grammarCapability: GrammarCapability;
  comprehensionCapability: ComprehensionCapability;
  
  // Assessment history and trends
  assessmentHistory: CapabilityAssessment[];
  
  // Learning characteristics
  learningStyle: LearningStyle;
  strengths: SkillArea[];
  weaknesses: SkillArea[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabularyCapability {
  estimatedVocabularySize: number;
  masteredWordsCount: number;
  learningWordsCount: number;
  basicVocabularyMastery: number;
  intermediateVocabularyMastery: number;
  advancedVocabularyMastery: number;
  averageLearningSpeed: number;
  retentionRate: number;
  contextualUsageScore: number;
  collocationsScore: number;
}

export interface GrammarCapability {
  overallGrammarScore: number;
  grammarPointsMastered: string[];
  grammarPointsLearning: string[];
  grammarPointsWeak: string[];
  sentenceStructureScore: number;
  tenseUsageScore: number;
  complexityHandlingScore: number;
}

export interface ComprehensionCapability {
  readingComprehensionScore: number;
  listeningComprehensionScore: number;
  literalComprehension: number;
  inferentialComprehension: number;
  criticalComprehension: number;
  maxTextComplexity: DifficultyLevel;
  processingSpeed: number;
}

export interface LearningProgress {
  id: string;
  userId: string;
  language: Language;
  totalStudyTime: number; // in minutes
  streakDays: number;
  lastStudyDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  userId: string;
  language: Language;
  title: string;
  description: string;
  targetLevel: number;
  estimatedDuration: number; // in days
  priority: number;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserCapabilityRequest {
  language: Language;
  currentLevel: LanguageLevel;
  learningGoal: LanguageLevel;
}

export interface CapabilityAssessment {
  id: string;
  userId: string;
  language: Language;
  assessmentDate: Date;
  assessmentType: AssessmentType;
  
  // Assessment results
  overallScore: number;
  skillScores: Record<SkillArea, number>;
  
  // Assessment basis
  dataSource: AssessmentDataSource;
  confidenceLevel: number;
  
  // Change analysis
  improvementAreas: SkillArea[];
  regressionAreas: SkillArea[];
  
  // Recommendations
  recommendations: string[];
  nextSteps: string[];
  
  createdAt: Date;
}

export type AssessmentType = 'initial' | 'periodic' | 'user_requested' | 'performance_triggered';
export type AssessmentDataSource = 'chat_analysis' | 'practice_performance' | 'vocabulary_tracking' | 'user_self_report' | 'comprehensive_test';

export interface UpdateUserCapabilityRequest {
  currentLevel?: LanguageLevel;
  learningGoal?: LanguageLevel;
  isActiveLearning?: boolean;
  overallLevel?: LanguageLevel;
  confidenceScore?: number;
  listeningLevel?: number;
  speakingLevel?: number;
  readingLevel?: number;
  writingLevel?: number;
  vocabularyCapability?: Partial<VocabularyCapability>;
  grammarCapability?: Partial<GrammarCapability>;
  comprehensionCapability?: Partial<ComprehensionCapability>;
  learningStyle?: LearningStyle;
  strengths?: SkillArea[];
  weaknesses?: SkillArea[];
}

export interface AssessmentRequest {
  userId: string;
  language: Language;
  assessmentType: AssessmentType;
  dataSource: AssessmentDataSource;
  includeRecommendations?: boolean;
}

export interface ReassessmentRequest {
  userId: string;
  language: Language;
  reason: string;
  focusAreas?: SkillArea[];
}
