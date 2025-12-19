import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { PlayArrow, Schedule } from '@mui/icons-material';
import { QuestionCard } from './QuestionCard';
import { ResultSummary } from './ResultSummary';
import practiceApi from '../../services/practiceApi';

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

interface PracticeGroup {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  difficulty: string;
  type: string;
  estimatedDuration: number;
  focusAreas: string[];
  language: string;
}

interface PracticeResult {
  id: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  totalTime: number;
  averageTimePerQuestion: number;
  weakAreas: string[];
  improvedAreas: string[];
  recommendedFocus: string[];
}

interface PracticeGroupProps {
  practiceGroup: PracticeGroup;
  onComplete: (result: PracticeResult) => void;
  onExit: () => void;
}

export const PracticeGroup: React.FC<PracticeGroupProps> = ({
  practiceGroup,
  onComplete,
  onExit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Safety check for questions array
  const questions = practiceGroup.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    if (isStarted && !questionStartTime) {
      setQuestionStartTime(new Date());
    }
  }, [isStarted, currentQuestionIndex]);

  const handleStart = () => {
    setIsStarted(true);
    setStartTime(new Date());
    setQuestionStartTime(new Date());
  };

  const handleAnswer = (questionId: string, answer: string) => {
    console.log('PracticeGroup handleAnswer called:', {
      questionId,
      answer,
      currentQuestionIndex,
      totalQuestions: questions.length,
      isLastQuestion: currentQuestionIndex >= questions.length - 1
    });

    // Record time spent on this question
    const timeSpent = questionStartTime ? Date.now() - questionStartTime.getTime() : 0;
    
    // Update both answers and question times
    const updatedAnswers = {
      ...answers,
      [questionId]: answer
    };
    
    const updatedQuestionTimes = {
      ...questionTimes,
      [questionId]: timeSpent
    };

    setAnswers(updatedAnswers);
    setQuestionTimes(updatedQuestionTimes);

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      console.log('Moving to next question');
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(new Date());
    } else {
      console.log('Last question answered, calling handleComplete with updated answers');
      // Pass the updated answers directly to handleComplete to avoid state timing issues
      handleCompleteWithAnswers(updatedAnswers, updatedQuestionTimes);
    }
  };

  const handleCompleteWithAnswers = async (finalAnswers: Record<string, string>, finalQuestionTimes: Record<string, number>) => {
    if (!startTime) return;

    const totalTime = Date.now() - startTime.getTime();
    
    // Calculate results using the provided answers
    const submittedAnswers = questions.map(question => ({
      questionId: question.id,
      userAnswer: finalAnswers[question.id] || '',
      timeSpent: finalQuestionTimes[question.id] || 0,
      attempts: 1
    }));

    console.log('Submitting practice with data:', {
      practiceGroupId: practiceGroup.id,
      answers: submittedAnswers,
      totalTime,
      answersCount: submittedAnswers.length,
      allQuestionsAnswered: submittedAnswers.every(a => a.userAnswer !== '')
    });

    try {
      // Submit to backend using practiceApi
      const result = await practiceApi.submitPractice(practiceGroup.id, {
        answers: submittedAnswers,
        totalTime
      });

      console.log('Practice submission successful:', result);
      setResult(result);
      setIsCompleted(true);
      onComplete(result);
    } catch (error) {
      console.error('Error submitting practice:', error);
      // Show more detailed error to user
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`提交练习结果时出现错误：${errorMessage}。请重试。`);
    }
  };

  const handleComplete = async () => {
    // Use current state values
    handleCompleteWithAnswers(answers, questionTimes);
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    onExit();
  };

  if (!isStarted) {
    return (
      <Card sx={{ maxWidth: 800, mx: 'auto', mt: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {practiceGroup.title}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            {practiceGroup.description}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Chip 
              label={`难度: ${practiceGroup.difficulty}`} 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={`类型: ${practiceGroup.type}`} 
              color="secondary" 
              variant="outlined" 
            />
            <Chip 
              icon={<Schedule />}
              label={`预计时间: ${practiceGroup.estimatedDuration} 分钟`} 
              variant="outlined" 
            />
          </Stack>

          {practiceGroup.focusAreas.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                重点领域:
              </Typography>
              <Stack direction="row" spacing={1}>
                {practiceGroup.focusAreas.map((area, index) => (
                  <Chip key={index} label={area} size="small" />
                ))}
              </Stack>
            </Box>
          )}

          <Alert severity="info" sx={{ mb: 3 }}>
            本练习包含 {questions.length} 道题目。请在安静的环境中完成，确保有足够的时间。
          </Alert>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={handleStart}
            >
              开始练习
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={onExit}
            >
              返回
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (isCompleted && result) {
    return (
      <ResultSummary 
        result={result} 
        practiceGroup={practiceGroup}
        answers={answers}
        language={practiceGroup.language}
        onRestart={() => {
          setIsStarted(false);
          setIsCompleted(false);
          setCurrentQuestionIndex(0);
          setAnswers({});
          setResult(null);
          setStartTime(null);
          setQuestionStartTime(null);
          setQuestionTimes({});
        }}
        onExit={onExit}
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 3 }}>
      {/* Progress Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              题目 {currentQuestionIndex + 1} / {questions.length}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={handleExit}
            >
              退出练习
            </Button>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            进度: {Math.round(progress)}%
          </Typography>
        </CardContent>
      </Card>

      {/* Current Question */}
      <QuestionCard
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        onAnswer={handleAnswer}
        selectedAnswer={answers[currentQuestion.id]}
      />

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <DialogTitle>确认退出</DialogTitle>
        <DialogContent>
          <Typography>
            您确定要退出当前练习吗？所有进度将会丢失。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExitDialog(false)}>
            取消
          </Button>
          <Button onClick={confirmExit} color="error">
            确认退出
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};