import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Refresh,
  Home,
  ExpandMore,
  TrendingUp,
  TrendingDown,
  School,
  Psychology,
  Visibility,
  QuestionAnswer
} from '@mui/icons-material';
import FollowUpDialog from './FollowUpDialog';
import InlineFollowUp from './InlineFollowUp';

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

interface Question {
  id: string;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  vocabularyWords: string[];
  grammarPoints: string[];
}

interface PracticeGroup {
  id: string;
  title: string;
  questions: Question[];
  language?: string;
}

interface AIAnalysis {
  id: string;
  analysisContent: string;
  learningAdvice: string;
  strengthsIdentified: string[];
  weaknessesIdentified: string[];
  improvementSuggestions: string[];
  confidenceScore: number;
  createdAt: string;
}

interface ResultSummaryProps {
  result: PracticeResult;
  practiceGroup: PracticeGroup;
  answers: Record<string, string>;
  onRestart: () => void;
  onExit: () => void;
  language?: string;
}

export const ResultSummary: React.FC<ResultSummaryProps> = ({
  result,
  practiceGroup,
  answers,
  onRestart,
  onExit,
  language = 'en'
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // Practice group follow-up dialog state
  const [practiceFollowUpDialog, setPracticeFollowUpDialog] = useState<{
    open: boolean;
    title: string;
    practiceData?: any;
  }>({
    open: false,
    title: '',
    practiceData: null
  });
  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'success';
    if (accuracy >= 60) return 'warning';
    return 'error';
  };

  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy >= 90) return '优秀';
    if (accuracy >= 80) return '良好';
    if (accuracy >= 60) return '及格';
    return '需要改进';
  };

  const getQuestionResults = () => {
    return practiceGroup.questions.map(question => {
      const userAnswer = answers[question.id] || '';
      
      // Normalize user answer to option identifier (A, B, C, D) for comparison
      let normalizedUserAnswer = userAnswer;
      if (userAnswer.length > 1) {
        // If user answer is a full option text, find the corresponding identifier
        const optionIndex = question.options.findIndex(option => option === userAnswer);
        if (optionIndex !== -1) {
          // Convert index to letter (0->A, 1->B, 2->C, 3->D)
          normalizedUserAnswer = String.fromCharCode(65 + optionIndex);
        } else {
          // Try to extract the letter from the beginning of the answer
          const letterMatch = userAnswer.match(/^([A-D])/);
          if (letterMatch) {
            normalizedUserAnswer = letterMatch[1];
          }
        }
      }
      
      const isCorrect = normalizedUserAnswer === question.correctAnswer;
      return {
        question,
        userAnswer,
        normalizedUserAnswer,
        isCorrect
      };
    });
  };

  const questionResults = getQuestionResults();

  // Check for existing analysis on component mount
  useEffect(() => {
    checkExistingAnalysis();
  }, []);

  const checkExistingAnalysis = async () => {
    try {
      const { practiceApi } = await import('../../services/practiceApi');
      const analysis = await practiceApi.getPracticeAnalysis(result.id);
      if (analysis) {
        setAiAnalysis(analysis);
      }
    } catch (error) {
      console.error('Error checking existing analysis:', error);
    }
  };

  const generateAIAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      // 使用practiceApi服务而不是直接fetch
      const { practiceApi } = await import('../../services/practiceApi');
      const analysis = await practiceApi.generatePracticeAnalysis(result.id, answers);
      setAiAnalysis(analysis);
      setShowAnalysis(true);
    } catch (error: any) {
      console.error('Error generating AI analysis:', error);
      let errorMessage = 'AI分析生成失败，请稍后重试';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const viewExistingAnalysis = () => {
    setShowAnalysis(true);
  };

  const handlePracticeGroupFollowUp = () => {
    setPracticeFollowUpDialog({
      open: true,
      title: practiceGroup.title,
      practiceData: {
        practiceGroupId: practiceGroup.id,
        practiceGroupTitle: practiceGroup.title,
        practiceGroupDescription: '', // ResultSummary doesn't have description
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        accuracy: result.accuracy,
        language: language,
        practiceResultId: result.id // Pass for detailed context
      }
    });
  };

  const closePracticeFollowUpDialog = () => {
    setPracticeFollowUpDialog({
      open: false,
      title: '',
      practiceData: null
    });
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 3 }}>
      {/* Main Results Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              练习完成！
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {practiceGroup.title}
            </Typography>
          </Box>

          {/* Score Display */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h2" component="div" sx={{ mb: 1 }}>
              {Math.round(result.accuracy)}%
            </Typography>
            <Chip
              label={getAccuracyLabel(result.accuracy)}
              color={getAccuracyColor(result.accuracy)}
              size="medium"
              sx={{ fontSize: '1rem', px: 2, py: 1 }}
            />
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mb: 4 }}>
            <LinearProgress
              variant="determinate"
              value={result.accuracy}
              color={getAccuracyColor(result.accuracy)}
              sx={{ height: 12, borderRadius: 6 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {result.correctAnswers} / {result.totalQuestions} 题正确
            </Typography>
          </Box>

          {/* Statistics */}
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" component="div">
                {formatTime(result.totalTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总用时
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" component="div">
                {formatTime(result.averageTimePerQuestion)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均每题
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" component="div">
                {result.totalQuestions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                题目总数
              </Typography>
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onRestart}
            >
              重新练习
            </Button>
            
            {aiAnalysis ? (
              <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={viewExistingAnalysis}
                color="secondary"
              >
                查看AI分析
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={analysisLoading ? <CircularProgress size={20} /> : <Psychology />}
                onClick={generateAIAnalysis}
                disabled={analysisLoading}
                color="secondary"
              >
                {analysisLoading ? '分析中...' : 'AI结果分析'}
              </Button>
            )}
            
            <Button
              variant="outlined"
              startIcon={<QuestionAnswer />}
              onClick={handlePracticeGroupFollowUp}
              color="primary"
            >
              整体追问
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={onExit}
            >
              返回首页
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Performance Analysis */}
      {(result.improvedAreas.length > 0 || result.weakAreas.length > 0) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              表现分析
            </Typography>

            {result.improvedAreas.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <TrendingUp color="success" />
                  <Typography variant="subtitle2" color="success.main">
                    表现良好的领域
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {result.improvedAreas.map((area, index) => (
                    <Chip
                      key={index}
                      label={area}
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {result.weakAreas.length > 0 && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <TrendingDown color="error" />
                  <Typography variant="subtitle2" color="error.main">
                    需要加强的领域
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {result.weakAreas.map((area, index) => (
                    <Chip
                      key={index}
                      label={area}
                      color="error"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendedFocus.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <School color="primary" />
              <Typography variant="h6">
                学习建议
              </Typography>
            </Stack>
            {result.recommendedFocus.map((recommendation, index) => (
              <Alert key={index} severity="info" sx={{ mb: 1 }}>
                {recommendation}
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Question Review */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            题目详解
          </Typography>
          
          {questionResults.map((result, index) => (
            <Accordion key={result.question.id}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                  {result.isCorrect ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Cancel color="error" />
                  )}
                  <Typography sx={{ flex: 1 }}>
                    题目 {index + 1}
                  </Typography>
                  <Chip
                    label={result.isCorrect ? '正确' : '错误'}
                    color={result.isCorrect ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    <strong>题目:</strong> {result.question.content}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      选项:
                    </Typography>
                    {result.question.options.map((option, optionIndex) => {
                      // Convert option index to letter (0->A, 1->B, 2->C, 3->D)
                      const optionLetter = String.fromCharCode(65 + optionIndex);
                      const isCorrectOption = optionLetter === result.question.correctAnswer;
                      const isUserChoice = option === result.userAnswer;
                      
                      return (
                        <Typography
                          key={optionIndex}
                          variant="body2"
                          sx={{
                            ml: 2,
                            color: isCorrectOption
                              ? 'success.main'
                              : isUserChoice && !result.isCorrect
                              ? 'error.main'
                              : 'text.primary'
                          }}
                        >
                          {option}
                          {isCorrectOption && ' ✓'}
                          {isUserChoice && !isCorrectOption && ' ✗'}
                        </Typography>
                      );
                    })}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>解析:</strong> {result.question.explanation}
                  </Typography>

                  {(result.question.vocabularyWords.length > 0 || result.question.grammarPoints.length > 0) && (
                    <Box sx={{ mb: 2 }}>
                      {result.question.vocabularyWords.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            相关词汇:
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            {result.question.vocabularyWords.map((word, wordIndex) => (
                              <Chip
                                key={wordIndex}
                                label={word}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {result.question.grammarPoints.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            语法要点:
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            {result.question.grammarPoints.map((point, pointIndex) => (
                              <Chip
                                key={pointIndex}
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
                  )}

                  {/* Show user's wrong choice if incorrect */}
                  {!result.isCorrect && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
                      <Typography variant="body2" color="error.main" gutterBottom>
                        <strong>您的选择:</strong> {result.userAnswer}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        <strong>正确答案:</strong> {result.question.options.find((_, idx) => 
                          String.fromCharCode(65 + idx) === result.question.correctAnswer
                        )}
                      </Typography>
                    </Box>
                  )}

                  {/* Inline Question Follow-up */}
                  <InlineFollowUp
                    questionData={{
                      questionId: result.question.id,
                      questionContent: result.question.content,
                      correctAnswer: result.question.correctAnswer,
                      userAnswer: result.normalizedUserAnswer,
                      explanation: result.question.explanation,
                      language: language,
                      // Enhanced context
                      options: result.question.options,
                      userAnswerText: result.userAnswer,
                      correctAnswerText: result.question.options.find((_, idx) => 
                        String.fromCharCode(65 + idx) === result.question.correctAnswer
                      ),
                      vocabularyWords: result.question.vocabularyWords,
                      grammarPoints: result.question.grammarPoints
                    }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      {/* AI Analysis Dialog */}
      <Dialog 
        open={showAnalysis} 
        onClose={() => setShowAnalysis(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Psychology color="secondary" />
            <Typography variant="h6">AI学习分析报告</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {aiAnalysis && (
            <Stack spacing={3}>
              {/* Analysis Content */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  表现分析
                </Typography>
                <Box sx={{ lineHeight: 1.8 }}>
                  {aiAnalysis.analysisContent.split('\n').map((paragraph, index) => (
                    <Typography key={index} variant="body1" sx={{ mb: paragraph.trim() ? 1 : 0 }}>
                      {paragraph.trim() || '\u00A0'}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Learning Advice */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  学习建议
                </Typography>
                <Box sx={{ lineHeight: 1.8 }}>
                  {aiAnalysis.learningAdvice.split('\n').map((paragraph, index) => (
                    <Typography key={index} variant="body1" sx={{ mb: paragraph.trim() ? 1 : 0 }}>
                      {paragraph.trim() || '\u00A0'}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Strengths */}
              {aiAnalysis.strengthsIdentified.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="success.main">
                    识别的强项
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {aiAnalysis.strengthsIdentified.map((strength, index) => (
                      <Chip
                        key={index}
                        label={strength}
                        color="success"
                        variant="outlined"
                        icon={<TrendingUp />}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Weaknesses */}
              {aiAnalysis.weaknessesIdentified.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="error.main">
                    需要改进的领域
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {aiAnalysis.weaknessesIdentified.map((weakness, index) => (
                      <Chip
                        key={index}
                        label={weakness}
                        color="error"
                        variant="outlined"
                        icon={<TrendingDown />}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Improvement Suggestions */}
              {aiAnalysis.improvementSuggestions.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="info.main">
                    具体改进建议
                  </Typography>
                  <Stack spacing={1}>
                    {aiAnalysis.improvementSuggestions.map((suggestion, index) => (
                      <Alert key={index} severity="info" variant="outlined">
                        {suggestion}
                      </Alert>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Confidence Score */}
              <Box>
                <Typography variant="body2" color="text.secondary" align="center">
                  AI分析置信度: {aiAnalysis.confidenceScore}%
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysis(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* Practice Group Follow-up Dialog */}
      <FollowUpDialog
        open={practiceFollowUpDialog.open}
        onClose={closePracticeFollowUpDialog}
        type="practice"
        title={practiceFollowUpDialog.title}
        practiceData={practiceFollowUpDialog.practiceData}
      />
    </Box>
  );
};