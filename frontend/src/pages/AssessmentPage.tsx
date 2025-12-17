import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Paper,

  Tab,
  Tabs
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,

  History,
  Refresh,
  ExpandMore,
  Language as LanguageIcon,
  Speed,
  MenuBook,
  RecordVoiceOver,
  Hearing,
  Visibility,
  Edit
} from '@mui/icons-material';
// import { useSelector } from 'react-redux';
// import { RootState } from '../store/store';
import { assessmentApi, UserCapability, CapabilityAssessment, ReassessmentCase } from '../services/assessmentApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`assessment-tabpanel-${index}`}
      aria-labelledby={`assessment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AssessmentPage: React.FC = () => {
  // const { user } = useSelector((state: RootState) => state.auth);
  
  const [currentTab, setCurrentTab] = useState(0);
  const [capabilities, setCapabilities] = useState<UserCapability[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [currentCapability, setCurrentCapability] = useState<UserCapability | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<CapabilityAssessment[]>([]);
  const [reassessmentHistory, setReassessmentHistory] = useState<ReassessmentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [showNewAssessmentDialog, setShowNewAssessmentDialog] = useState(false);
  const [showReassessmentDialog, setShowReassessmentDialog] = useState(false);
  const [reassessmentReason, setReassessmentReason] = useState('');
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);

  const skillAreas = [
    'vocabulary', 'grammar', 'listening', 'speaking', 
    'reading', 'writing', 'pronunciation', 'fluency'
  ];

  const skillAreaLabels: Record<string, string> = {
    vocabulary: '词汇',
    grammar: '语法',
    listening: '听力',
    speaking: '口语',
    reading: '阅读',
    writing: '写作',
    pronunciation: '发音',
    fluency: '流利度'
  };

  const skillAreaIcons: Record<string, React.ReactElement> = {
    vocabulary: <MenuBook />,
    grammar: <Edit />,
    listening: <Hearing />,
    speaking: <RecordVoiceOver />,
    reading: <Visibility />,
    writing: <Edit />,
    pronunciation: <RecordVoiceOver />,
    fluency: <Speed />
  };

  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        setLoading(true);
        const caps = await assessmentApi.getAllCapabilities();
        setCapabilities(caps);
        
        if (caps.length > 0 && !selectedLanguage) {
          setSelectedLanguage(caps[0].language);
        }
      } catch (error) {
        console.error('Error loading capabilities:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCapabilities();
  }, [selectedLanguage]);

  useEffect(() => {
    if (selectedLanguage) {
      loadLanguageData(selectedLanguage);
    }
  }, [selectedLanguage]);



  const loadLanguageData = async (language: string) => {
    try {
      setLoading(true);
      
      // Load capability
      const capability = await assessmentApi.getCapability(language);
      setCurrentCapability(capability);
      
      // Load assessment history
      const history = await assessmentApi.getAssessmentHistory(language);
      setAssessmentHistory(history);
      
      // Load reassessment history
      const reassessments = await assessmentApi.getReassessmentHistory(language);
      setReassessmentHistory(reassessments);
      
    } catch (error) {
      console.error('Error loading language data:', error);
      setCurrentCapability(null);
      setAssessmentHistory([]);
      setReassessmentHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePerformAssessment = async () => {
    if (!selectedLanguage) return;
    
    try {
      setAssessmentLoading(true);
      await assessmentApi.performComprehensiveAssessment({
        language: selectedLanguage,
        assessmentType: 'user_requested',
        dataSource: 'comprehensive_test',
        includeRecommendations: true
      });
      
      // Reload data
      await loadLanguageData(selectedLanguage);
      setShowNewAssessmentDialog(false);
    } catch (error) {
      console.error('Error performing assessment:', error);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleInitiateReassessment = async () => {
    if (!selectedLanguage || !reassessmentReason) return;
    
    try {
      setAssessmentLoading(true);
      await assessmentApi.initiateReassessment({
        language: selectedLanguage,
        reason: reassessmentReason,
        focusAreas: selectedFocusAreas.length > 0 ? selectedFocusAreas : undefined
      });
      
      // Reload data
      await loadLanguageData(selectedLanguage);
      setShowReassessmentDialog(false);
      setReassessmentReason('');
      setSelectedFocusAreas([]);
    } catch (error) {
      console.error('Error initiating reassessment:', error);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 60) return '及格';
    return '需要改进';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && capabilities.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          能力评估
        </Typography>
        <Typography variant="body1" color="text.secondary">
          全面了解您的语言学习能力和进展情况
        </Typography>
      </Box>

      {/* Language Selection */}
      {capabilities.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>选择语言</InputLabel>
              <Select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                label="选择语言"
              >
                {capabilities.map((cap) => (
                  <MenuItem key={cap.language} value={cap.language}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LanguageIcon />
                      {cap.language === 'en' ? '英语' : cap.language === 'ja' ? '日语' : '法语'}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      {capabilities.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          您还没有设置任何语言的学习能力。请先在个人资料页面设置您正在学习的语言。
        </Alert>
      ) : currentCapability ? (
        <>
          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(_, newValue) => setCurrentTab(newValue)}
              variant="fullWidth"
            >
              <Tab label="能力概览" icon={<Assessment />} />
              <Tab label="评估历史" icon={<History />} />
              <Tab label="重新评估" icon={<Refresh />} />
            </Tabs>
          </Paper>

          {/* Tab Panels */}
          <TabPanel value={currentTab} index={0}>
            {/* Current Capability Overview */}
            <Grid container spacing={3}>
              {/* Overall Score */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      总体水平
                    </Typography>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                      <CircularProgress
                        variant="determinate"
                        value={currentCapability.confidenceScore}
                        size={120}
                        thickness={4}
                        color={getScoreColor(currentCapability.confidenceScore)}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column'
                        }}
                      >
                        <Typography variant="h4" component="div">
                          {currentCapability.confidenceScore}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          分
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h6" color={`${getScoreColor(currentCapability.confidenceScore)}.main`}>
                      {currentCapability.overallLevel}
                    </Typography>
                    <Chip
                      label={getScoreLabel(currentCapability.confidenceScore)}
                      color={getScoreColor(currentCapability.confidenceScore)}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Quick Stats */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      学习统计
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">词汇量</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {currentCapability.estimatedVocabularySize.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">已掌握单词</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {currentCapability.masteredWordsCount.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">学习中单词</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {currentCapability.learningWordsCount.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">上次评估</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDate(currentCapability.lastAssessedAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Skill Breakdown */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      技能分析
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Hearing color="primary" sx={{ fontSize: 40, mb: 1 }} />
                          <Typography variant="body2" gutterBottom>听力</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={currentCapability.listeningLevel}
                            color={getScoreColor(currentCapability.listeningLevel)}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" fontWeight="bold">
                            {currentCapability.listeningLevel}/100
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <RecordVoiceOver color="primary" sx={{ fontSize: 40, mb: 1 }} />
                          <Typography variant="body2" gutterBottom>口语</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={currentCapability.speakingLevel}
                            color={getScoreColor(currentCapability.speakingLevel)}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" fontWeight="bold">
                            {currentCapability.speakingLevel}/100
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Visibility color="primary" sx={{ fontSize: 40, mb: 1 }} />
                          <Typography variant="body2" gutterBottom>阅读</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={currentCapability.readingLevel}
                            color={getScoreColor(currentCapability.readingLevel)}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" fontWeight="bold">
                            {currentCapability.readingLevel}/100
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Edit color="primary" sx={{ fontSize: 40, mb: 1 }} />
                          <Typography variant="body2" gutterBottom>写作</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={currentCapability.writingLevel}
                            color={getScoreColor(currentCapability.writingLevel)}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" fontWeight="bold">
                            {currentCapability.writingLevel}/100
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Strengths and Weaknesses */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp color="success" />
                      优势领域
                    </Typography>
                    {currentCapability.strengths.length > 0 ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {currentCapability.strengths.map((strength, index) => (
                          <Chip
                            key={index}
                            label={skillAreaLabels[strength] || strength}
                            color="success"
                            variant="outlined"
                            size="small"
                            icon={skillAreaIcons[strength] || undefined}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        暂无明显优势领域
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDown color="error" />
                      需要改进
                    </Typography>
                    {currentCapability.weaknesses.length > 0 ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {currentCapability.weaknesses.map((weakness, index) => (
                          <Chip
                            key={index}
                            label={skillAreaLabels[weakness] || weakness}
                            color="error"
                            variant="outlined"
                            size="small"
                            icon={skillAreaIcons[weakness] || undefined}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        暂无明显薄弱领域
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={() => setShowNewAssessmentDialog(true)}
                    disabled={assessmentLoading}
                  >
                    开始新评估
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => setShowReassessmentDialog(true)}
                    disabled={assessmentLoading}
                  >
                    申请重新评估
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {/* Assessment History */}
            <Typography variant="h6" gutterBottom>
              评估历史记录
            </Typography>
            
            {assessmentHistory.length > 0 ? (
              <Stack spacing={2}>
                {assessmentHistory.map((assessment) => (
                  <Card key={assessment.id}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">
                            {assessment.assessmentType === 'initial' ? '初始评估' :
                             assessment.assessmentType === 'periodic' ? '定期评估' :
                             assessment.assessmentType === 'user_requested' ? '用户申请评估' :
                             '性能触发评估'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(assessment.assessmentDate)}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${assessment.overallScore}分`}
                          color={getScoreColor(assessment.overallScore)}
                          size="medium"
                        />
                      </Box>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography>详细信息</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>技能得分</Typography>
                              {Object.entries(assessment.skillScores).map(([skill, score]) => (
                                <Box key={skill} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">
                                    {skillAreaLabels[skill] || skill}
                                  </Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {score}/100
                                  </Typography>
                                </Box>
                              ))}
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>建议</Typography>
                              {assessment.recommendations.map((rec, index) => (
                                <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                                  • {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                                </Typography>
                              ))}
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert severity="info">
                暂无评估历史记录
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {/* Reassessment History */}
            <Typography variant="h6" gutterBottom>
              重新评估记录
            </Typography>
            
            {reassessmentHistory.length > 0 ? (
              <Stack spacing={2}>
                {reassessmentHistory.map((reassessment) => (
                  <Card key={reassessment.id}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">
                            重新评估申请
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(reassessment.createdAt)}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            原因: {reassessment.reason}
                          </Typography>
                        </Box>
                        <Chip
                          label={
                            reassessment.status === 'pending' ? '待处理' :
                            reassessment.status === 'in_progress' ? '进行中' :
                            reassessment.status === 'completed' ? '已完成' :
                            '已取消'
                          }
                          color={
                            reassessment.status === 'completed' ? 'success' :
                            reassessment.status === 'in_progress' ? 'warning' :
                            reassessment.status === 'cancelled' ? 'error' :
                            'default'
                          }
                        />
                      </Box>

                      {reassessment.focusAreas.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>关注领域</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {reassessment.focusAreas.map((area, index) => (
                              <Chip
                                key={index}
                                label={skillAreaLabels[area] || area}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {reassessment.userResponses.length > 0 && (
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography>回答详情 ({reassessment.userResponses.length}/{reassessment.targetedQuestions.length})</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Stack spacing={2}>
                              {reassessment.userResponses.map((response, index) => (
                                <Box key={index} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    问题 {parseInt(response.questionId) + 1}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    {response.question}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic' }}>
                                    您的回答: {response.userAnswer}
                                  </Typography>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                      得分: {typeof response.aiEvaluation?.score === 'number' ? response.aiEvaluation.score : 'N/A'}/100
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDate(response.submittedAt)}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert severity="info">
                暂无重新评估记录
              </Alert>
            )}

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => setShowReassessmentDialog(true)}
                disabled={assessmentLoading}
              >
                申请重新评估
              </Button>
            </Box>
          </TabPanel>
        </>
      ) : selectedLanguage ? (
        <Alert severity="warning">
          无法加载该语言的能力数据，请稍后重试。
        </Alert>
      ) : null}

      {/* New Assessment Dialog */}
      <Dialog open={showNewAssessmentDialog} onClose={() => setShowNewAssessmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>开始新的能力评估</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            系统将基于您的学习数据、练习表现和互动历史进行全面的语言能力评估。
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            评估过程可能需要几分钟时间，请耐心等待。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewAssessmentDialog(false)}>
            取消
          </Button>
          <Button 
            onClick={handlePerformAssessment} 
            variant="contained"
            disabled={assessmentLoading}
            startIcon={assessmentLoading ? <CircularProgress size={20} /> : <Assessment />}
          >
            {assessmentLoading ? '评估中...' : '开始评估'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassessment Dialog */}
      <Dialog open={showReassessmentDialog} onClose={() => setShowReassessmentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>申请重新评估</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            如果您认为当前的能力评估不准确，可以申请重新评估。请说明原因并选择需要重点关注的技能领域。
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="申请原因"
            value={reassessmentReason}
            onChange={(e) => setReassessmentReason(e.target.value)}
            placeholder="请详细说明您认为评估不准确的原因..."
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            关注领域 (可选)
          </Typography>
          <Grid container spacing={1}>
            {skillAreas.map((skill) => (
              <Grid item key={skill}>
                <Chip
                  label={skillAreaLabels[skill]}
                  clickable
                  color={selectedFocusAreas.includes(skill) ? 'primary' : 'default'}
                  onClick={() => {
                    if (selectedFocusAreas.includes(skill)) {
                      setSelectedFocusAreas(selectedFocusAreas.filter(s => s !== skill));
                    } else {
                      setSelectedFocusAreas([...selectedFocusAreas, skill]);
                    }
                  }}
                  icon={skillAreaIcons[skill] || undefined}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowReassessmentDialog(false);
            setReassessmentReason('');
            setSelectedFocusAreas([]);
          }}>
            取消
          </Button>
          <Button 
            onClick={handleInitiateReassessment} 
            variant="contained"
            disabled={!reassessmentReason.trim() || assessmentLoading}
            startIcon={assessmentLoading ? <CircularProgress size={20} /> : <Refresh />}
          >
            {assessmentLoading ? '提交中...' : '提交申请'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AssessmentPage;