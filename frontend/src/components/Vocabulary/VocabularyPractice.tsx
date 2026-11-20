import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { VocabularyPracticeGroup, VocabularyQuestion, PracticeResult } from '../../services/vocabularyApi';

interface VocabularyPracticeProps {
  practiceGroup: VocabularyPracticeGroup;
  onComplete: (results: PracticeResult[]) => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}

const VocabularyPractice: React.FC<VocabularyPracticeProps> = ({
  practiceGroup,
  onComplete,
  onClose, saving, error,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = practiceGroup.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / practiceGroup.questions.length) * 100;

  const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedAnswer(event.target.value);
  };

  const handleSubmitAnswer = () => {
    const responseTime = Date.now() - questionStartTime;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const result: PracticeResult = {
      wordId: currentQuestion.targetWord.id,
      questionType: currentQuestion.type,
      isCorrect,
      responseTime,
      score: isCorrect ? 100 : 0,
    };

    setResults(prev => [...prev, result]);
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    setShowResult(false);
    setSelectedAnswer('');
    
    if (currentQuestionIndex < practiceGroup.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      setIsCompleted(true);
    }
  };

  const handleComplete = () => {
    onComplete(results);
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'word_to_definition': return '词义选择';
      case 'definition_to_word': return '选词填空';
      case 'fill_in_blank': return '完形填空';
      case 'usage_in_context': return '语境理解';
      default: return type;
    }
  };

  const calculateScore = () => {
    const correctAnswers = results.filter(r => r.isCorrect).length;
    return Math.round((correctAnswers / results.length) * 100);
  };

  const getAverageResponseTime = () => {
    const totalTime = results.reduce((sum, r) => sum + r.responseTime, 0);
    return Math.round(totalTime / results.length / 1000);
  };

  if (isCompleted) {
    return (
      <Dialog open={true} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
        <DialogTitle>练习完成！</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          <Box textAlign="center" py={3}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom>
              {calculateScore()}%
            </Typography>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {practiceGroup.title}
            </Typography>

            <Box display="flex" justifyContent="center" gap={4} mt={3} mb={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {results.filter(r => r.isCorrect).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  正确
                </Typography>
              </Box>
              
              <Box textAlign="center">
                <Typography variant="h6" color="error.main">
                  {results.filter(r => !r.isCorrect).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  错误
                </Typography>
              </Box>
              
              <Box textAlign="center">
                <Typography variant="h6" color="primary.main">
                  {getAverageResponseTime()}s
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  平均用时
                </Typography>
              </Box>
            </Box>

            <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1} mt={2}>
              {practiceGroup.focusAreas.map((area, index) => (
                <Chip key={index} label={area} size="small" />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            返回
          </Button>
          <Button onClick={handleComplete} variant="contained" disabled={saving}>
            保存结果
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {practiceGroup.title}
          </Typography>
          <Chip 
            label={`${currentQuestionIndex + 1} / ${practiceGroup.questions.length}`}
            size="small"
          />
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mt: 1 }}
        />
      </DialogTitle>
      
      <DialogContent>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Chip 
                label={getQuestionTypeLabel(currentQuestion.type)}
                color="primary"
                size="small"
              />
              <Box display="flex" alignItems="center" gap={1}>
                <TimerIcon fontSize="small" />
                <Typography variant="caption">
                  难度: {currentQuestion.difficulty}/10
                </Typography>
              </Box>
            </Box>

            <Typography variant="h6" mb={3}>
              {currentQuestion.question}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={selectedAnswer}
                onChange={handleAnswerChange}
              >
                {currentQuestion.options.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={option}
                    control={<Radio />}
                    label={option}
                    disabled={showResult}
                    sx={{
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      border: showResult && option === currentQuestion.correctAnswer 
                        ? '2px solid #4caf50' 
                        : showResult && option === selectedAnswer && option !== currentQuestion.correctAnswer
                        ? '2px solid #f44336'
                        : '1px solid transparent',
                      backgroundColor: showResult && option === currentQuestion.correctAnswer 
                        ? 'success.50' 
                        : showResult && option === selectedAnswer && option !== currentQuestion.correctAnswer
                        ? 'error.50'
                        : 'transparent',
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {showResult && (
              <Alert 
                severity={selectedAnswer === currentQuestion.correctAnswer ? 'success' : 'error'}
                sx={{ mt: 2 }}
                icon={selectedAnswer === currentQuestion.correctAnswer ? <CheckCircleIcon /> : <CancelIcon />}
              >
                <Typography variant="body2" mb={1}>
                  {selectedAnswer === currentQuestion.correctAnswer ? '回答正确！' : '回答错误'}
                </Typography>
                <Typography variant="body2">
                  {currentQuestion.explanation}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          退出练习
        </Button>
        
        {!showResult ? (
          <Button 
            onClick={handleSubmitAnswer}
            variant="contained"
            disabled={!selectedAnswer}
            startIcon={<PlayArrowIcon />}
          >
            提交答案
          </Button>
        ) : (
          <Button 
            onClick={handleNextQuestion}
            variant="contained"
            startIcon={<PlayArrowIcon />}
          >
            {currentQuestionIndex < practiceGroup.questions.length - 1 ? '下一题' : '完成练习'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VocabularyPractice;