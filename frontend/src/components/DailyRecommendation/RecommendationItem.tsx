import React from 'react';
import { LearningRecommendation } from '../../services/dailyRecommendationApi';

interface RecommendationItemProps {
  recommendation: LearningRecommendation;
  icon: string;
  typeLabel: string;
  isFollowed: boolean;
  onToggleFollowed: () => void;
}

const RecommendationItem: React.FC<RecommendationItemProps> = ({
  recommendation,
  icon,
  typeLabel,
  isFollowed,
  onToggleFollowed
}) => {
  const getPriorityColor = (priority: number): string => {
    if (priority <= 2) return 'bg-red-100 text-red-800';
    if (priority <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority <= 2) return '高优先级';
    if (priority <= 3) return '中优先级';
    return '低优先级';
  };

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 ${
      isFollowed ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">{icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(recommendation.priority)}`}>
                  {getPriorityLabel(recommendation.priority)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {typeLabel}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  约 {recommendation.estimatedTime} 分钟
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-700 mb-3 leading-relaxed">
            {recommendation.description}
          </p>

          {/* Focus Areas */}
          {recommendation.focusAreas && recommendation.focusAreas.length > 0 && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-600 mr-2">重点领域:</span>
              <div className="inline-flex flex-wrap gap-1">
                {recommendation.focusAreas.map((area, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Activities */}
          {recommendation.suggestedActivities && recommendation.suggestedActivities.length > 0 && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-600 mb-2 block">建议活动:</span>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {recommendation.suggestedActivities.map((activity, index) => (
                  <li key={index}>{activity}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Content */}
          <div className="flex flex-wrap gap-4 text-sm">
            {recommendation.relatedVocabulary && recommendation.relatedVocabulary.length > 0 && (
              <div>
                <span className="font-medium text-gray-600">相关词汇: </span>
                <span className="text-gray-700">
                  {recommendation.relatedVocabulary.slice(0, 3).join(', ')}
                  {recommendation.relatedVocabulary.length > 3 && ` 等${recommendation.relatedVocabulary.length}个`}
                </span>
              </div>
            )}
            {recommendation.relatedGrammar && recommendation.relatedGrammar.length > 0 && (
              <div>
                <span className="font-medium text-gray-600">相关语法: </span>
                <span className="text-gray-700">
                  {recommendation.relatedGrammar.slice(0, 2).join(', ')}
                  {recommendation.relatedGrammar.length > 2 && ` 等${recommendation.relatedGrammar.length}个`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={onToggleFollowed}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              isFollowed
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isFollowed ? (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                已采纳
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                采纳建议
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationItem;