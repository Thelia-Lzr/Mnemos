"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GLOBAL_PREFERENCES = exports.DEFAULT_LANGUAGE_CONFIGURATION = exports.DEFAULT_CONFIGURATION_CONSTRAINTS = void 0;
exports.DEFAULT_CONFIGURATION_CONSTRAINTS = {
    maxActiveLanguages: 3,
    minDailyGoalMinutes: 5,
    maxDailyGoalMinutes: 180,
    minWeeklyGoalSessions: 1,
    maxWeeklyGoalSessions: 21,
    allowedLevelProgression: {
        'A1': ['A1', 'A2'],
        'A2': ['A1', 'A2', 'B1'],
        'B1': ['A2', 'B1', 'B2'],
        'B2': ['B1', 'B2', 'C1'],
        'C1': ['B2', 'C1', 'C2'],
        'C2': ['C1', 'C2']
    }
};
exports.DEFAULT_LANGUAGE_CONFIGURATION = {
    learningIntensity: 'regular',
    preferredPracticeTypes: ['mixed'],
    dailyGoalMinutes: 15,
    weeklyGoalSessions: 5,
    difficultyPreference: 'adaptive',
    visualLearningEnabled: true,
    auditoryLearningEnabled: true,
    kinestheticLearningEnabled: false,
    practiceReminders: true,
    milestoneNotifications: true,
    weeklyProgressReports: true
};
exports.DEFAULT_GLOBAL_PREFERENCES = {
    preferredStudyTime: 'flexible',
    sessionDurationPreference: 20,
    breakIntervalPreference: 5,
    competitiveMode: false,
    achievementNotifications: true,
    leaderboardParticipation: false,
    streakTracking: true,
    aiPersonality: 'encouraging',
    explanationDetail: 'standard',
    feedbackFrequency: 'after_session',
    dataAnalyticsOptIn: true,
    performanceTrackingOptIn: true,
    personalizedRecommendations: true,
    fontSize: 'medium',
    colorScheme: 'auto',
    reducedMotion: false,
    screenReaderOptimized: false,
    cloudSyncEnabled: true,
    offlineModeEnabled: false
};
//# sourceMappingURL=UserLanguageConfiguration.js.map