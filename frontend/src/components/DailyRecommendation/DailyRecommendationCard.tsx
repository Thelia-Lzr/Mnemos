import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RecommendationType } from '../../services/dailyRecommendationApi';
import {
    clearError,
    generateRecommendation,
    getTodaysRecommendation,
    markAsViewed,
    submitFeedback
} from '../../store/slices/dailyRecommendationSlice';
import { AppDispatch, RootState } from '../../store/store';
import FeedbackModal from './FeedbackModal';
import QuickPracticeOptions from './QuickPracticeOptions';
import RecommendationItem from './RecommendationItem';

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
  const [followedSelection, setFollowedSelection] = useState<string[] | null>(null);
  const followedRecommendations = followedSelection ?? currentRecommendation?.userFeedback?.followedRecommendations ?? [];

  useEffect(() => {
    // Load today's recommendation when component mounts
    dispatch(getTodaysRecommendation(language));
  }, [dispatch, language]);

  useEffect(() => {
    // Mark as viewed when recommendation is loaded and not already viewed
    if (currentRecommendation?.language === language && !currentRecommendation.isViewed) {
      dispatch(markAsViewed({ language }));
    }
  }, [currentRecommendation, dispatch, language]);

  const handleGenerateRecommendation = () => {
    dispatch(generateRecommendation(language));
  };

  const handleRecommendationFollowed = (recommendationId: string) => {
    setFollowedSelection(followedRecommendations.includes(recommendationId)
      ? followedRecommendations.filter((id) => id !== recommendationId)
      : [...followedRecommendations, recommendationId]);
  };

  const handleSubmitFeedback = async (feedback: {
    rating: number;
    isHelpful: boolean;
    comments?: string;
  }) => {
    if (!currentRecommendation) return;
    const outcome = await dispatch(submitFeedback({
      language,
      recommendationId: currentRecommendation.id,
      feedback: {
        ...feedback,
        followedRecommendations
      }
    }));
    if (submitFeedback.fulfilled.match(outcome)) setShowFeedbackModal(false);
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

  if (loading || (currentRecommendation && currentRecommendation.language !== language && !error)) {
    return <Skeleton variant="rectangular" height={130} aria-label="正在加载今日学习建议" />;
  }

  if (!currentRecommendation || currentRecommendation.language !== language) {
    return (
      <Alert severity={error ? 'error' : 'info'} action={<Button onClick={handleGenerateRecommendation} disabled={generatingRecommendation}>重试</Button>}>
        {error || '正在准备今日学习建议。'}
      </Alert>
    );
  }

  return (
    <Card component="section" aria-label="今日学习建议">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Box>
              <Typography component="h2" variant="h5">今日学习建议</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(`${currentRecommendation.date}T00:00:00`).toLocaleDateString('zh-CN', { dateStyle: 'full' })}
              </Typography>
            </Box>
            <Button onClick={handleGenerateRecommendation} disabled={generatingRecommendation}>
              {generatingRecommendation ? '正在生成…' : '重新生成'}
            </Button>
          </Stack>
          {error && !showFeedbackModal && <Alert severity="error">{error}</Alert>}
          <Grid container spacing={2}>
            {currentRecommendation.recommendations.slice().sort((a, b) => a.priority - b.priority).map((recommendation) => (
              <Grid item xs={12} sm={6} key={recommendation.id}>
                <RecommendationItem
                  recommendation={recommendation}
                  typeLabel={getRecommendationTypeLabel(recommendation.type)}
                  isFollowed={followedRecommendations.includes(recommendation.id)}
                  onToggleFollowed={() => handleRecommendationFollowed(recommendation.id)}
                />
              </Grid>
            ))}
          </Grid>
          <QuickPracticeOptions options={currentRecommendation.quickPracticeOptions} language={language} />
          <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {currentRecommendation.userFeedback && (
              <Typography variant="body2" color="success.main">已提交反馈（{currentRecommendation.userFeedback.rating}/5）</Typography>
            )}
            <Button onClick={() => { dispatch(clearError()); setShowFeedbackModal(true); }} disabled={generatingRecommendation}>
              {currentRecommendation.userFeedback ? '更新反馈' : '提供反馈'}
            </Button>
          </Stack>
        </Stack>
        {showFeedbackModal && (
          <FeedbackModal
            onSubmit={handleSubmitFeedback}
            onClose={() => setShowFeedbackModal(false)}
            isSubmitting={submittingFeedback}
            error={error}
            existingFeedback={currentRecommendation.userFeedback}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DailyRecommendationCard;
