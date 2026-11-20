import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  IconButton
} from '@mui/material';
import {
  Send,
  Close,
  Psychology,
  Lightbulb,
  School
} from '@mui/icons-material';
import { practiceApi, FollowUpResponse } from '../../services/practiceApi';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface FollowUpDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'question' | 'practice';
  title: string;
  // For question follow-up
  questionData?: {
    questionId: string;
    questionContent: string;
    correctAnswer?: string;
    userAnswer?: string;
    explanation?: string;
    language: string;
  };
  // For practice group follow-up
  practiceData?: {
    practiceGroupId: string;
    practiceGroupTitle?: string;
    practiceGroupDescription?: string;
    totalQuestions?: number;
    correctAnswers?: number;
    accuracy?: number;
    language: string;
    practiceResultId?: string; // For detailed context
  };
}

const FollowUpDialog: React.FC<FollowUpDialogProps> = ({
  open,
  onClose,
  type,
  title,
  questionData,
  practiceData
}) => {
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FollowUpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = async () => {
    if (!followUpQuestion.trim()) return;

    setLoading(true);
    setIsStreaming(true);
    setError(null);
    setResponse(null);
    setStreamingContent('');

    try {
      if (type === 'question' && questionData) {
        await practiceApi.askQuestionFollowUpStream(
          {
            questionId: questionData.questionId,
            questionContent: questionData.questionContent,
            correctAnswer: questionData.correctAnswer,
            userAnswer: questionData.userAnswer,
            explanation: questionData.explanation,
            followUpQuestion,
            language: questionData.language
          },
          (chunk: string) => {
            setStreamingContent(prev => prev + chunk);
          },
          () => {
            setIsStreaming(false);
            setLoading(false);
            setFollowUpQuestion('');
          },
          (error: Error) => {
            setError(error.message || '追问失败，请稍后重试');
            setIsStreaming(false);
            setLoading(false);
          }
        );
      } else if (type === 'practice' && practiceData) {
        await practiceApi.askPracticeGroupFollowUpStream(
          {
            practiceGroupId: practiceData.practiceGroupId,
            practiceGroupTitle: practiceData.practiceGroupTitle,
            practiceGroupDescription: practiceData.practiceGroupDescription,
            totalQuestions: practiceData.totalQuestions,
            correctAnswers: practiceData.correctAnswers,
            accuracy: practiceData.accuracy,
            followUpQuestion,
            language: practiceData.language,
            practiceResultId: practiceData.practiceResultId // Pass for detailed context
          },
          (chunk: string) => {
            setStreamingContent(prev => prev + chunk);
          },
          () => {
            setIsStreaming(false);
            setLoading(false);
            setFollowUpQuestion('');
          },
          (error: Error) => {
            setError(error.message || '追问失败，请稍后重试');
            setIsStreaming(false);
            setLoading(false);
          }
        );
      } else {
        throw new Error('Invalid follow-up type or missing data');
      }
    } catch (err: any) {
      setError(err.message || '追问失败，请稍后重试');
      setIsStreaming(false);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFollowUpQuestion('');
    setResponse(null);
    setError(null);
    setStreamingContent('');
    setIsStreaming(false);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology color="primary" />
            <Typography variant="h6">
              {type === 'question' ? '题目追问' : '练习追问'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {type === 'question' ? '关于题目' : '关于练习组'}
          </Typography>
          <Typography variant="body2" sx={{ 
            bgcolor: 'grey.50', 
            p: 2, 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="您的问题"
            placeholder={
              type === 'question' 
                ? "请输入您对这道题的疑问，比如：为什么选择这个答案？有没有其他解法？"
                : "请输入您对这次练习的疑问，比如：如何提高准确率？哪些知识点需要加强？"
            }
            value={followUpQuestion}
            onChange={(e) => setFollowUpQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            helperText="按 Enter 发送，Shift+Enter 换行"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {(streamingContent || response) && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Psychology color="primary" />
              <Typography variant="h6" color="primary">
                AI 回答
              </Typography>
              {isStreaming && (
                <CircularProgress size={20} />
              )}
            </Box>

            <Box sx={{ 
              bgcolor: 'primary.50', 
              p: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'primary.200'
            }}>
              <MarkdownRenderer 
                content={streamingContent || response?.answer || ''} 
                variant="body1"
                sx={{ mb: 2 }}
              />

              {!isStreaming && response?.relatedConcepts && response.relatedConcepts.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <School color="secondary" fontSize="small" />
                      <Typography variant="subtitle2" color="secondary.main">
                        相关概念
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {response.relatedConcepts.map((concept, index) => (
                        <Chip
                          key={index}
                          label={concept}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}

              {!isStreaming && response?.additionalTips && response.additionalTips.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Lightbulb color="warning" fontSize="small" />
                      <Typography variant="subtitle2" color="warning.main">
                        学习建议
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {response.additionalTips.map((tip, index) => (
                        <Typography key={index} variant="body2" sx={{ 
                          display: 'flex', 
                          alignItems: 'flex-start',
                          gap: 1
                        }}>
                          <Box component="span" sx={{ 
                            width: 6, 
                            height: 6, 
                            bgcolor: 'warning.main', 
                            borderRadius: '50%',
                            mt: 0.75,
                            flexShrink: 0
                          }} />
                          {tip}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit">
          关闭
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!followUpQuestion.trim() || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
        >
          {loading ? '提问中...' : '发送问题'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FollowUpDialog;