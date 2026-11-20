import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  Collapse
} from '@mui/material';
import {
  Send,
  Psychology,
  Lightbulb,
  School,
  QuestionAnswer
} from '@mui/icons-material';
import { practiceApi, FollowUpResponse } from '../../services/practiceApi';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface InlineFollowUpProps {
  questionData: {
    questionId: string;
    questionContent: string;
    correctAnswer?: string;
    userAnswer?: string;
    explanation?: string;
    language: string;
    // Enhanced context
    options?: string[];
    userAnswerText?: string;
    correctAnswerText?: string;
    vocabularyWords?: string[];
    grammarPoints?: string[];
  };
}

const InlineFollowUp: React.FC<InlineFollowUpProps> = ({ questionData }) => {
  const [expanded, setExpanded] = useState(false);
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
      await practiceApi.askQuestionFollowUpStream(
        {
          questionId: questionData.questionId,
          questionContent: questionData.questionContent,
          correctAnswer: questionData.correctAnswer,
          userAnswer: questionData.userAnswer,
          explanation: questionData.explanation,
          followUpQuestion,
          language: questionData.language,
          // Enhanced context
          options: questionData.options,
          userAnswerText: questionData.userAnswerText,
          correctAnswerText: questionData.correctAnswerText,
          vocabularyWords: questionData.vocabularyWords,
          grammarPoints: questionData.grammarPoints
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
    } catch (err: any) {
      setError(err.message || '追问失败，请稍后重试');
      setIsStreaming(false);
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
    if (!expanded) {
      // Reset state when expanding
      setResponse(null);
      setError(null);
      setFollowUpQuestion('');
      setStreamingContent('');
      setIsStreaming(false);
    }
  };

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<QuestionAnswer />}
        onClick={toggleExpanded}
        color="primary"
        sx={{ mb: expanded ? 2 : 0 }}
      >
        {expanded ? '收起追问' : '对此题追问'}
      </Button>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            关于这道题
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="您的问题"
              placeholder="请输入您对这道题的疑问，比如：为什么选择这个答案？有没有其他解法？"
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              helperText="按 Enter 发送，Shift+Enter 换行"
              size="small"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!followUpQuestion.trim() || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Send />}
              size="small"
            >
              {loading ? '提问中...' : '发送问题'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {(streamingContent || response) && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Psychology color="primary" fontSize="small" />
                <Typography variant="subtitle2" color="primary">
                  AI 回答
                </Typography>
                {isStreaming && (
                  <CircularProgress size={16} />
                )}
              </Box>

              <Box sx={{ 
                bgcolor: 'primary.50', 
                p: 2, 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.200'
              }}>
                <MarkdownRenderer 
                  content={streamingContent || response?.answer || ''} 
                  variant="body2"
                  sx={{ mb: 1 }}
                />

                {!isStreaming && response?.relatedConcepts && response.relatedConcepts.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <School color="secondary" fontSize="small" />
                        <Typography variant="caption" color="secondary.main">
                          相关概念
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {response.relatedConcepts.map((concept, index) => (
                          <Chip
                            key={index}
                            label={concept}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  </>
                )}

                {!isStreaming && response?.additionalTips && response.additionalTips.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Lightbulb color="warning" fontSize="small" />
                        <Typography variant="caption" color="warning.main">
                          学习建议
                        </Typography>
                      </Box>
                      <Stack spacing={0.5}>
                        {response.additionalTips.map((tip, index) => (
                          <Typography key={index} variant="caption" sx={{ 
                            display: 'flex', 
                            alignItems: 'flex-start',
                            gap: 0.5,
                            lineHeight: 1.4
                          }}>
                            <Box component="span" sx={{ 
                              width: 4, 
                              height: 4, 
                              bgcolor: 'warning.main', 
                              borderRadius: '50%',
                              mt: 0.5,
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
        </Box>
      </Collapse>
    </Box>
  );
};

export default InlineFollowUp;