import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { generateQuickPractice } from '../../store/slices/dailyRecommendationSlice';
import { QuickPracticeOption } from '../../services/dailyRecommendationApi';

interface QuickPracticeOptionsProps {
  options: QuickPracticeOption[];
  language: string;
}

const QuickPracticeOptions: React.FC<QuickPracticeOptionsProps> = ({ options, language }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { generatingPractice, lastPracticeTaskId } = useSelector(
    (state: RootState) => state.dailyRecommendation
  );

  const handleGeneratePractice = (practiceOptionId: string) => {
    dispatch(generateQuickPractice({ language, practiceOptionId }));
  };

  const getPracticeTypeIcon = (type: string): string => {
    switch (type) {
      case 'vocabulary':
        return '📚';
      case 'grammar':
        return '📝';
      case 'comprehensive':
        return '🎯';
      case 'general':
        return '📖';
      default:
        return '✏️';
    }
  };

  const getPracticeTypeLabel = (type: string): string => {
    switch (type) {
      case 'vocabulary':
        return '词汇练习';
      case 'grammar':
        return '语法练习';
      case 'comprehensive':
        return '综合练习';
      case 'general':
        return '通用练习';
      default:
        return '练习';
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner':
        return '初级';
      case 'intermediate':
        return '中级';
      case 'advanced':
        return '高级';
      default:
        return '未知';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {options.map((option) => (
        <div
          key={option.id}
          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="text-xl mr-2">{getPracticeTypeIcon(option.type)}</span>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">{option.title}</h4>
                <span className="text-xs text-gray-600">{getPracticeTypeLabel(option.type)}</span>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(option.difficultyLevel)}`}>
              {getDifficultyLabel(option.difficultyLevel)}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">
            {option.description}
          </p>

          {/* Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-xs text-gray-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {option.estimatedQuestions} 道题目
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              约 {option.estimatedTime} 分钟
            </div>
            {option.focusAreas && option.focusAreas.length > 0 && (
              <div className="flex items-start text-xs text-gray-600">
                <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{option.focusAreas.join('、')}</span>
              </div>
            )}
          </div>

          {/* Vocabulary Preview */}
          {option.includeVocabulary && option.includeVocabulary.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-600 mb-1">包含词汇:</div>
              <div className="flex flex-wrap gap-1">
                {option.includeVocabulary.slice(0, 4).map((word, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                  >
                    {word}
                  </span>
                ))}
                {option.includeVocabulary.length > 4 && (
                  <span className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded-full">
                    +{option.includeVocabulary.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => handleGeneratePractice(option.id)}
            disabled={!option.canGenerateImmediately || generatingPractice}
            className={`w-full py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
              option.canGenerateImmediately && !generatingPractice
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {generatingPractice ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </span>
            ) : option.canGenerateImmediately ? (
              <span className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                开始练习
              </span>
            ) : (
              '暂不可用'
            )}
          </button>

          {/* Task Status */}
          {lastPracticeTaskId && (
            <div className="mt-2 text-xs text-center text-gray-600">
              任务ID: {lastPracticeTaskId.slice(0, 8)}...
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuickPracticeOptions;