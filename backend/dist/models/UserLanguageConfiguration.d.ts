export type Language = 'en' | 'ja' | 'fr';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export interface UserLanguageConfiguration {
    id: string;
    userId: string;
    language: Language;
    currentLevel: LanguageLevel;
    targetLevel?: LanguageLevel;
    isPrimary: boolean;
    isActive: boolean;
    learningIntensity: LearningIntensity;
    preferredPracticeTypes: PracticeType[];
    dailyGoalMinutes: number;
    weeklyGoalSessions: number;
    difficultyPreference: DifficultyPreference;
    visualLearningEnabled: boolean;
    auditoryLearningEnabled: boolean;
    kinestheticLearningEnabled: boolean;
    practiceReminders: boolean;
    milestoneNotifications: boolean;
    weeklyProgressReports: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastModifiedBy: string;
}
export type LearningIntensity = 'casual' | 'regular' | 'intensive' | 'immersive';
export type PracticeType = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing' | 'mixed';
export type DifficultyPreference = 'adaptive' | 'challenging' | 'comfortable' | 'easy';
export interface UserLanguageConfigurationHistory {
    id: string;
    userId: string;
    language: Language;
    changeType: ConfigurationChangeType;
    fieldChanged: string;
    previousValue: any;
    newValue: any;
    changeReason?: string;
    changedBy: string;
    changeSource: ChangeSource;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
export type ConfigurationChangeType = 'level_update' | 'target_change' | 'primary_switch' | 'activation_toggle' | 'preference_update' | 'goal_adjustment' | 'notification_change' | 'learning_style_update';
export type ChangeSource = 'user_profile' | 'onboarding' | 'assessment_result' | 'admin_action' | 'system_migration';
export interface GlobalLearningPreferences {
    id: string;
    userId: string;
    preferredStudyTime: StudyTimePreference;
    sessionDurationPreference: number;
    breakIntervalPreference: number;
    competitiveMode: boolean;
    achievementNotifications: boolean;
    leaderboardParticipation: boolean;
    streakTracking: boolean;
    aiPersonality: AIPersonalityType;
    explanationDetail: ExplanationDetailLevel;
    feedbackFrequency: FeedbackFrequency;
    dataAnalyticsOptIn: boolean;
    performanceTrackingOptIn: boolean;
    personalizedRecommendations: boolean;
    fontSize: FontSize;
    colorScheme: ColorScheme;
    reducedMotion: boolean;
    screenReaderOptimized: boolean;
    cloudSyncEnabled: boolean;
    offlineModeEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type StudyTimePreference = 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
export type AIPersonalityType = 'encouraging' | 'neutral' | 'challenging' | 'friendly' | 'professional';
export type ExplanationDetailLevel = 'minimal' | 'standard' | 'detailed' | 'comprehensive';
export type FeedbackFrequency = 'immediate' | 'after_session' | 'daily' | 'weekly';
export type FontSize = 'small' | 'medium' | 'large' | 'extra_large';
export type ColorScheme = 'light' | 'dark' | 'auto' | 'high_contrast';
export interface LanguageConfigurationConstraints {
    maxActiveLanguages: number;
    minDailyGoalMinutes: number;
    maxDailyGoalMinutes: number;
    minWeeklyGoalSessions: number;
    maxWeeklyGoalSessions: number;
    allowedLevelProgression: Record<LanguageLevel, LanguageLevel[]>;
}
export declare const DEFAULT_CONFIGURATION_CONSTRAINTS: LanguageConfigurationConstraints;
export interface CreateLanguageConfigurationRequest {
    language: Language;
    currentLevel: LanguageLevel;
    targetLevel?: LanguageLevel;
    isPrimary?: boolean;
    learningIntensity?: LearningIntensity;
    preferredPracticeTypes?: PracticeType[];
    dailyGoalMinutes?: number;
    weeklyGoalSessions?: number;
    difficultyPreference?: DifficultyPreference;
    visualLearningEnabled?: boolean;
    auditoryLearningEnabled?: boolean;
    kinestheticLearningEnabled?: boolean;
    practiceReminders?: boolean;
    milestoneNotifications?: boolean;
    weeklyProgressReports?: boolean;
}
export interface UpdateLanguageConfigurationRequest {
    currentLevel?: LanguageLevel;
    targetLevel?: LanguageLevel;
    isPrimary?: boolean;
    isActive?: boolean;
    learningIntensity?: LearningIntensity;
    preferredPracticeTypes?: PracticeType[];
    dailyGoalMinutes?: number;
    weeklyGoalSessions?: number;
    difficultyPreference?: DifficultyPreference;
    visualLearningEnabled?: boolean;
    auditoryLearningEnabled?: boolean;
    kinestheticLearningEnabled?: boolean;
    practiceReminders?: boolean;
    milestoneNotifications?: boolean;
    weeklyProgressReports?: boolean;
    changeReason?: string;
}
export interface UpdateGlobalPreferencesRequest {
    preferredStudyTime?: StudyTimePreference;
    sessionDurationPreference?: number;
    breakIntervalPreference?: number;
    competitiveMode?: boolean;
    achievementNotifications?: boolean;
    leaderboardParticipation?: boolean;
    streakTracking?: boolean;
    aiPersonality?: AIPersonalityType;
    explanationDetail?: ExplanationDetailLevel;
    feedbackFrequency?: FeedbackFrequency;
    dataAnalyticsOptIn?: boolean;
    performanceTrackingOptIn?: boolean;
    personalizedRecommendations?: boolean;
    fontSize?: FontSize;
    colorScheme?: ColorScheme;
    reducedMotion?: boolean;
    screenReaderOptimized?: boolean;
    cloudSyncEnabled?: boolean;
    offlineModeEnabled?: boolean;
}
export interface ConfigurationValidationResult {
    isValid: boolean;
    errors: ConfigurationValidationError[];
    warnings: ConfigurationValidationWarning[];
}
export interface ConfigurationValidationError {
    field: string;
    code: string;
    message: string;
    currentValue?: any;
    allowedValues?: any[];
}
export interface ConfigurationValidationWarning {
    field: string;
    code: string;
    message: string;
    suggestion?: string;
}
export interface UserConfigurationSummary {
    userId: string;
    totalActiveLanguages: number;
    primaryLanguage: Language;
    languageConfigurations: UserLanguageConfiguration[];
    globalPreferences: GlobalLearningPreferences;
    recentChanges: UserLanguageConfigurationHistory[];
    configurationHealth: ConfigurationHealthStatus;
}
export interface ConfigurationHealthStatus {
    score: number;
    issues: ConfigurationIssue[];
    recommendations: string[];
}
export interface ConfigurationIssue {
    severity: 'low' | 'medium' | 'high';
    category: 'goals' | 'preferences' | 'consistency' | 'performance';
    description: string;
    suggestedAction: string;
}
export declare const DEFAULT_LANGUAGE_CONFIGURATION: Partial<UserLanguageConfiguration>;
export declare const DEFAULT_GLOBAL_PREFERENCES: Partial<GlobalLearningPreferences>;
//# sourceMappingURL=UserLanguageConfiguration.d.ts.map