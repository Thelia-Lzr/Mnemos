import { Card, CardContent, Chip, FormControlLabel, Checkbox, Stack, Typography } from '@mui/material';
import React from 'react';
import { LearningRecommendation } from '../../services/dailyRecommendationApi';

interface RecommendationItemProps {
  recommendation: LearningRecommendation;
  typeLabel: string;
  isFollowed: boolean;
  onToggleFollowed: () => void;
}

const RecommendationItem: React.FC<RecommendationItemProps> = ({ recommendation, typeLabel, isFollowed, onToggleFollowed }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Stack spacing={1} alignItems="flex-start">
        <Typography variant="subtitle1" component="h3">{recommendation.title}</Typography>
        <Typography variant="body2">{recommendation.description}</Typography>
        {!!recommendation.suggestedActivities?.length && (
          <Typography component="ul" variant="body2" sx={{ pl: 3, my: 0 }}>
            {recommendation.suggestedActivities.map((activity, index) => <li key={index}>{activity}</li>)}
          </Typography>
        )}
        <Chip label={typeLabel} size="small" variant="outlined" />
        <FormControlLabel
          control={<Checkbox size="small" checked={isFollowed} onChange={onToggleFollowed} />}
          label="采纳建议"
        />
      </Stack>
    </CardContent>
  </Card>
);

export default RecommendationItem;
