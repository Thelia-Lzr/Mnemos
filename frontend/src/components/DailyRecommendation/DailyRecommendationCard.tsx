import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  getTodaysRecommendation,
  generateRecommendation,
  generateRecommendationAsync,
  submitFeedback,
  clearError,
  markAsViewed
} from '../../store/slices/dailyRecommendationSlice';
import { DailyLearningRecommendation, LearningRecommendation, RecommendationType } from '../../services/dailyRecommendationApi';
import RecommendationItem from './RecommendationItem';
import QuickPracticeOptions from './QuickPracticeOptions';
import FeedbackModal from './FeedbackModal';

interface DailyRecommendationCardProps {
  language: string;
}

const DailyRecommendationCard: React.FC<DailyRecommendationCardProps> = ({ language }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    currentRecommendation,
    loading,
    error,
    generatingRecommendation,
    submittingFeedback
  } = useSelector((state: RootState) => state.dailyRecommendation);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [followedRecommendations, setFollowedRecommendations] = useState<string[]>([]);

  useEffect(() => {
    // Load today's recommendation when component mounts
    dispatch(getTodaysRecommendation(language));
  }, [dispatch, language]);

  useEffect(() => {
    // Mark as viewed when recommendation is loaded and not already viewed
    if (currentRecommendation && !currentRecommendation.isViewed) {
      dispatch(markAsViewed({ language }));
    }
  }, [currentRecommendation, dispatch, language]);

  const handleGenerateRecommendation = () => {
    dispatch(generateRecommendationAsync(language));
  };

  const handleRecommendationFollowed = (recommendationId: string) => {
    setFollowedRecommendations(prev => 
      prev.includes(recommendationId) 
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
    );
  };

  const handleSubmitFeedback = (feedback: {
    rating: number;
    isHelpful: boolean;
    comments?: string;
  }) => {
    dispatch(submitFeedback({
      language,
      feedback: {
        ...feedback,
        followedRecommendations
      }
    }));
    setShowFeedbackModal(false);
  };

  const getRecommendationIcon = (type: RecommendationType): string => {
    switch (type) {
      case RecommendationType.VOCABULARY_FOCUS:
        return '📚';
      case RecommendationType.GRAMMAR_PRACTICE:
        return '📝';
      case RecommendationType.SKILL_IMPROVEMENT:
        return '🎯';
      case RecommendationType.MILESTONE_PROGRESS:
        return '🏆';
      case RecommendationType.REVIEW_REMINDER:
        return '🔄';
      case RecommendationType.WEAKNESS_TARGETING:
        return '💪';
      default:
        return '📖';
    }
  };

  const getRecommendationTypeLabel = (type: RecommendationType): string => {
    switch (type) {
      case RecommendationType.VOCABULARY_FOCUS:
        return '词汇学习';
      case RecommendationType.GRAMMAR_PRACTICE:
        return '语法练习';
      case RecommendationType.SKILL_IMPROVEMENT:
        return '技能提升';
      case RecommendationType.MILESTONE_PROGRESS:
        return '里程碑进度';
      case RecommendationType.REVIEW_REMINDER:
        return '复习提醒';
      case RecommendationType.WEAKNESS_TARGETING:
        return '弱项强化';
      default:
        return '学习建议';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">无法加载每日建议</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => dispatch(clearError())}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              关闭
            </button>
            <button
              onClick={handleGenerateRecommendation}
              disabled={generatingRecommendation}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingRecommendation ? '生成中...' : '重新生成'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRecommendation) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有今日学习建议</h3>
          <p className="text-gray-600 mb-4">让我们为你生成个性化的学习建议吧！</p>
          <button
            onClick={handleGenerateRecommendation}
            disabled={generatingRecommendation}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {generatingRecommendation ? '生成中...' : '生成今日建议'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">今日学习建议</h2>
            <p className="text-blue-100 text-sm">
              {new Date(currentRecommendation.date).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-white text-sm">
              基于 {currentRecommendation.aiModel.split('/').pop()}
            </div>
            <div className="text-blue-100 text-xs">
              生成时间: {(currentRecommendation.generationTime / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Recommendations */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">个性化学习建议</h3>
          <div className="space-y-4">
            {currentRecommendation.recommendations
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((recommendation) => (
                <RecommendationItem
                  key={recommendation.id}
                  recommendation={recommendation}
                  icon={getRecommendationIcon(recommendation.type)}
                  typeLabel={getRecommendationTypeLabel(recommendation.type)}
                  isFollowed={followedRecommendations.includes(recommendation.id)}
                  onToggleFollowed={() => handleRecommendationFollowed(recommendation.id)}
                />
              ))}
          </div>
        </div>

        {/* Quick Practice Options */}
        {currentRecommendation.quickPracticeOptions && 
         currentRecommendation.quickPracticeOptions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷练习入口</h3>
            <QuickPracticeOptions
              options={currentRecommendation.quickPracticeOptions}
              language={language}
            />
          </div>
        )}

        {/* Feedback Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {currentRecommendation.userFeedback ? (
                <span className="text-green-600">
                  ✓ 已提交反馈 (评分: {currentRecommendation.userFeedback.rating}/5)
                </span>
              ) : (
                '这些建议对你有帮助吗？'
              )}
            </div>
            <div className="space-x-2">
              {!currentRecommendation.userFeedback && (
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  提供反馈
                </button>
              )}
              <button
                onClick={handleGenerateRecommendation}
                disabled={generatingRecommendation}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                {generatingRecommendation ? '生成中...' : '重新生成'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          onSubmit={handleSubmitFeedback}
          onClose={() => setShowFeedbackModal(false)}
          isSubmitting={submittingFeedback}
        />
      )}
    </div>
  );
};

export default DailyRecommendationCard;