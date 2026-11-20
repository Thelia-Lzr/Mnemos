import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  ExpandMore,
  TrendingUp,
  TrendingDown,
  School,
  Psychology,
  Visibility,
  ArrowBack,
  Close,
  QuestionAnswer
} from '@mui/icons-material';
import { practiceApi, PracticeGroup, PracticeResult, AIAnalysis } from '../../services/practiceApi';
import FollowUpDialog from './FollowUpDialog';
import InlineFollowUp from './InlineFollowUp';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface PracticeResultDetailProps {
  practiceResultId: string;
  onClose: () => void;
  showAsDialog?: boolean;
}

export const PracticeResultDetail: React.FC<PracticeResultDetailProps> = ({
  practiceResultId,
  onClose,
  showAsDialog = false
}) => {
  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);
  const [practiceGroup, setPracticeGroup] = useState<PracticeGroup | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchPracticeResultDetail();
  }, [practiceResultId]);

  const fetchPracticeResultDetail = async () => {
    try {
      setLoading(true);
      
      // Get practice result details using the API service
      const resultData = await practiceApi.getPracticeResultDetail(practiceResultId);
      
      console.log('🔍 fetchPracticeResultDetail: API response', {
        hasResult: !!resultData.result,
        hasPracticeGroup: !!resultData.practiceGroup,
        hasUserAnswers: !!resultData.userAnswers,
        questionsCount: resultData.practiceGroup?.questions?.length || 0,
        userAnswersCount: Object.keys(resultData.userAnswers || {}).length,
        practiceGroupId: resultData.practiceGroup?.id,
        resultId: resultData.result?.id
      });
      
      setPracticeResult(resultData.result);
      setPracticeGroup(resultData.practiceGroup);
      setUserAnswers(resultData.userAnswers || {});
      
      // Check for existing analysis
      await checkExistingAnalysis();
    } catch (error: any) {
      console.error('Error fetching practice result detail:', error);
      
      // Set error state or show user-friendly message
      if (error.response?.status === 404) {
        console.error('Practice result not found');
      } else if (error.response?.status === 403) {
        console.error('Access denied to practice result');
      } else {
        console.error('Failed to load practice result details');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAnalysis = async () => {
    try {
      const analysis = await practiceApi.getPracticeAnalysis(practiceResultId);
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
      const analysis = await practiceApi.generatePracticeAnalysis(practiceResultId, userAnswers);
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
    if (!practiceGroup || !practiceResult) return;
    
    setPracticeFollowUpDialog({
      open: true,
      title: practiceGroup.title,
      practiceData: {
        practiceGroupId: practiceGroup.id,
        practiceGroupTitle: practiceGroup.title,
        practiceGroupDescription: practiceGroup.description,
        totalQuestions: practiceResult.totalQuestions,
        correctAnswers: practiceResult.correctAnswers,
        accuracy: practiceResult.accuracy,
        language: practiceGroup.language,
        practiceResultId: practiceResultId // Pass for detailed context
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

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor((milliseconds ?? 0) / 1000);
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
    if (!practiceGroup || !practiceResult) {
      console.log('🔍 getQuestionResults: Missing practiceGroup or practiceResult', {
        hasPracticeGroup: !!practiceGroup,
        hasPracticeResult: !!practiceResult
      });
      return [];
    }
    
    if (!practiceGroup.questions || practiceGroup.questions.length === 0) {
      console.log('🔍 getQuestionResults: No questions found', {
        questions: practiceGroup.questions,
        questionsLength: practiceGroup.questions?.length,
        practiceGroupId: practiceGroup.id
      });
      return [];
    }
    
    console.log('🔍 getQuestionResults: Processing questions', {
      questionsCount: practiceGroup.questions.length,
      userAnswersCount: Object.keys(userAnswers).length,
      userAnswers: userAnswers
    });
    
    return practiceGroup.questions.map(question => {
      const userAnswer = userAnswers[question.id] || '';
      
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
      
      const normalize = (answer: string) => answer.trim().toLowerCase();
      const expected = question.correctAnswer;
      const isCorrect = normalize(userAnswer) === normalize(expected) ||
        (!question.options.includes(expected) && normalize(normalizedUserAnswer) === normalize(expected));
      return {
        question,
        userAnswer,
        normalizedUserAnswer,
        isCorrect
      };
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!practiceResult || !practiceGroup) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          练习结果数据加载失败
        </Alert>
        <Button onClick={onClose} sx={{ mt: 2 }}>
          返回
        </Button>
      </Box>
    );
  }

  const questionResults = getQuestionResults();

  const content = (
    <Box sx={{ 
      maxWidth: showAsDialog ? 'none' : 'none', 
      mx: 'auto', 
      p: showAsDialog ? 0 : 3,
      width: '100%',
      minHeight: showAsDialog ? 'auto' : '100vh'
    }}>
      {/* Header */}
      {!showAsDialog && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={onClose} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            练习结果详情
          </Typography>
        </Box>
      )}

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
              {Math.round(practiceResult.accuracy)}%
            </Typography>
            <Chip
              label={getAccuracyLabel(practiceResult.accuracy)}
              color={getAccuracyColor(practiceResult.accuracy)}
              size="medium"
              sx={{ fontSize: '1rem', px: 2, py: 1 }}
            />
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mb: 4 }}>
            <LinearProgress
              variant="determinate"
              value={practiceResult.accuracy}
              color={getAccuracyColor(practiceResult.accuracy)}
              sx={{ height: 12, borderRadius: 6 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {practiceResult.correctAnswers} / {practiceResult.totalQuestions} 题正确
            </Typography>
          </Box>

          {/* Statistics */}
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" component="div">
                {formatTime(practiceResult.totalTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总用时
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" component="div">
                {formatTime(practiceResult.averageTimePerQuestion)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均每题
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" component="div">
                {practiceResult.totalQuestions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                题目总数
              </Typography>
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
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
          </Stack>
        </CardContent>
      </Card>

      {/* Performance Analysis */}
      {(practiceResult.improvedAreas.length > 0 || practiceResult.weakAreas.length > 0) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              表现分析
            </Typography>

            {practiceResult.improvedAreas.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <TrendingUp color="success" />
                  <Typography variant="subtitle2" color="success.main">
                    表现良好的领域
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {practiceResult.improvedAreas.map((area, index) => (
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

            {practiceResult.weakAreas.length > 0 && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <TrendingDown color="error" />
                  <Typography variant="subtitle2" color="error.main">
                    需要加强的领域
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {practiceResult.weakAreas.map((area, index) => (
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
      {practiceResult.recommendedFocus.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <School color="primary" />
              <Typography variant="h6">
                学习建议
              </Typography>
            </Stack>
            {practiceResult.recommendedFocus.map((recommendation, index) => (
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
          
          {questionResults.length === 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                {!practiceGroup ? '正在加载练习数据...' : 
                 !practiceGroup.questions || practiceGroup.questions.length === 0 ? 
                 '该练习组没有题目数据' : 
                 '正在处理题目详情...'}
              </Alert>
              {practiceGroup && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    调试信息：
                  </Typography>
                  <Typography variant="caption" component="div">
                    • 练习组ID: {practiceGroup.id}
                  </Typography>
                  <Typography variant="caption" component="div">
                    • 题目数量: {practiceGroup.questions?.length || 0}
                  </Typography>
                  <Typography variant="caption" component="div">
                    • 用户答案数量: {Object.keys(userAnswers).length}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            questionResults.map((result, index) => (
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
                      const expected = result.question.correctAnswer;
                      const isCorrectOption = option === expected || (!result.question.options.includes(expected) && optionLetter === expected);
                      
                      // Check if this option is the user's choice
                      // User answer could be either the option text or the option letter
                      const isUserChoice = option === result.userAnswer || 
                                          optionLetter === result.normalizedUserAnswer ||
                                          optionLetter === result.userAnswer;
                      
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
                      language: practiceGroup?.language || 'en',
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
          ))
          )}
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
            <Typography variant="h6" component="span">AI学习分析报告</Typography>
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
                <MarkdownRenderer 
                  content={aiAnalysis.analysisContent} 
                  variant="body1"
                  sx={{ lineHeight: 1.8 }}
                />
              </Box>

              {/* Learning Advice */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  学习建议
                </Typography>
                <MarkdownRenderer 
                  content={aiAnalysis.learningAdvice} 
                  variant="body1"
                  sx={{ lineHeight: 1.8 }}
                />
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

  if (showAsDialog) {
    return (
      <Dialog
        open={true}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">练习结果详情</Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            {content}
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};