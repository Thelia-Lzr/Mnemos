import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Rating, Stack, TextField } from '@mui/material';
import React, { useState } from 'react';
import { RecommendationFeedback } from '../../services/dailyRecommendationApi';

interface FeedbackModalProps {
  onSubmit: (feedback: { rating: number; isHelpful: boolean; comments?: string }) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
  existingFeedback?: RecommendationFeedback;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onSubmit, onClose, isSubmitting, error, existingFeedback }) => {
  const [rating, setRating] = useState<number | null>(existingFeedback?.rating ?? 5);
  const [helpful, setHelpful] = useState(existingFeedback?.isHelpful === false ? 'no' : 'yes');
  const [comments, setComments] = useState(existingFeedback?.comments ?? '');

  return (
    <Dialog open onClose={() => !isSubmitting && onClose()} fullWidth maxWidth="sm" aria-labelledby="feedback-title">
      <form onSubmit={(event) => {
        event.preventDefault();
        if (rating && !isSubmitting) onSubmit({ rating, isHelpful: helpful === 'yes', comments: comments.trim() || undefined });
      }}>
        <DialogTitle id="feedback-title">反馈今日学习建议</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <FormControl>
              <FormLabel>整体评分</FormLabel>
              <Rating name="recommendation-rating" value={rating} onChange={(_, value) => setRating(value)} getLabelText={(value) => `${value} 星`} disabled={isSubmitting} />
            </FormControl>
            <FormControl>
              <FormLabel id="feedback-helpful">这些建议对你有帮助吗？</FormLabel>
              <RadioGroup row aria-labelledby="feedback-helpful" value={helpful} onChange={(_, value) => setHelpful(value)}>
                <FormControlLabel value="yes" control={<Radio />} label="有帮助" disabled={isSubmitting} />
                <FormControlLabel value="no" control={<Radio />} label="没有帮助" disabled={isSubmitting} />
              </RadioGroup>
            </FormControl>
            <TextField label="其他意见或建议（可选）" multiline minRows={3} value={comments} onChange={(event) => setComments(event.target.value)} disabled={isSubmitting} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={isSubmitting}>取消</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !rating}>提交反馈</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FeedbackModal;
