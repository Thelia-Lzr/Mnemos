import React, { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Box,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import { CheckCircle, Schedule } from '@mui/icons-material';

interface Question {
  id: string;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  vocabularyWords: string[];
  grammarPoints: string[];
  difficulty: number;
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (questionId: string, answer: string) => void;
  selectedAnswer?: string;
  submitting: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  selectedAnswer,
  submitting
}) => {
  const [currentAnswer, setCurrentAnswer] = useState(selectedAnswer || '');
  const [startTime] = useState(Date.now());

  const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentAnswer(event.target.value);
  };

  const handleSubmit = () => {
    if (currentAnswer.trim() && !submitting) onAnswer(question.id, currentAnswer);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'success';
    if (difficulty <= 3) return 'warning';
    return 'error';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return '简单';
    if (difficulty <= 3) return '中等';
    return '困难';
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 4 }}>
        {/* Question Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
            题目 {questionNumber}
          </Typography>
          <Chip
            label={getDifficultyLabel(question.difficulty)}
            color={getDifficultyColor(question.difficulty)}
            size="small"
          />
        </Box>

        {/* Question Content */}
        <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem', lineHeight: 1.6 }}>
          {question.content}
        </Typography>

        {/* Answer Options */}
        {question.options.length === 0 ? (
          <TextField label="答案" fullWidth multiline value={currentAnswer} onChange={handleAnswerChange} sx={{ mb: 3 }} />
        ) : <RadioGroup
          value={currentAnswer}
          onChange={handleAnswerChange}
          sx={{ mb: 4 }}
        >
          {question.options.map((option, index) => (
            <FormControlLabel
              key={index}
              value={option}
              control={<Radio />}
              label={
                <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                  {option}
                </Typography>
              }
              sx={{
                mb: 1,
                p: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            />
          ))}
        </RadioGroup>}

        {/* Question Metadata */}
        {(question.vocabularyWords.length > 0 || question.grammarPoints.length > 0) && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ mb: 3 }}>
              {question.vocabularyWords.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    相关词汇:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {question.vocabularyWords.map((word, index) => (
                      <Chip
                        key={index}
                        label={word}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {question.grammarPoints.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    语法要点:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {question.grammarPoints.map((point, index) => (
                      <Chip
                        key={index}
                        label={point}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Submit Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting || !currentAnswer.trim()}
            startIcon={<CheckCircle />}
            sx={{ minWidth: 200 }}
          >
            {submitting ? '正在提交…' : questionNumber === totalQuestions ? '完成练习' : '下一题'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};