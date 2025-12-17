import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  fetchVocabularyWords,
  addWordsFromText,
  removeVocabularyWord,
  fetchMasteryStats,
  fetchLearningMetrics,
  generateVocabularyPractice,
  generateAdaptivePractice,
  setSelectedLanguage,
  clearCurrentPracticeGroup,
} from '../store/slices/vocabularySlice';
import VocabularyWordCard from '../components/Vocabulary/VocabularyWordCard';
import MasteryStatsCard from '../components/Vocabulary/MasteryStatsCard';
import VocabularyPractice from '../components/Vocabulary/VocabularyPractice';
import { vocabularyApi, PracticeResult } from '../services/vocabularyApi';

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
      id={`vocabulary-tabpanel-${index}`}
      aria-labelledby={`vocabulary-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const VocabularyPage: React.FC = () => {
  const dispatch = useDispatch();
  const {
    words,
    masteryStats,
    learningMetrics,
    currentPracticeGroup,
    selectedLanguage,
    loading,
    error,
  } = useSelector((state: RootState) => state.vocabulary);

  const [tabValue, setTabValue] = useState(0);
  const [addWordsDialog, setAddWordsDialog] = useState(false);
  const [newWordsText, setNewWordsText] = useState('');
  const [masteryFilter, setMasteryFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    dispatch(fetchVocabularyWords({ language: selectedLanguage, masteryLevel: masteryFilter === 'all' ? undefined : masteryFilter }) as any);
    dispatch(fetchMasteryStats(selectedLanguage) as any);
    dispatch(fetchLearningMetrics({ language: selectedLanguage }) as any);
  }, [dispatch, selectedLanguage, masteryFilter]);

  const handleLanguageChange = (language: 'en' | 'ja' | 'fr') => {
    dispatch(setSelectedLanguage(language));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddWords = async () => {
    if (!newWordsText.trim()) return;

    try {
      await dispatch(addWordsFromText({ text: newWordsText, language: selectedLanguage }) as any);
      setAddWordsDialog(false);
      setNewWordsText('');
      setSnackbar({ open: true, message: '词汇添加成功！', severity: 'success' });
      
      // Refresh data
      dispatch(fetchVocabularyWords({ language: selectedLanguage }) as any);
      dispatch(fetchMasteryStats(selectedLanguage) as any);
    } catch (error) {
      setSnackbar({ open: true, message: '添加词汇失败', severity: 'error' });
    }
  };

  const handleRemoveWord = async (wordId: string) => {
    try {
      await dispatch(removeVocabularyWord(wordId) as any);
      setSnackbar({ open: true, message: '词汇删除成功', severity: 'success' });
      
      // Refresh stats
      dispatch(fetchMasteryStats(selectedLanguage) as any);
    } catch (error) {
      setSnackbar({ open: true, message: '删除词汇失败', severity: 'error' });
    }
  };

  const handlePracticeWord = (wordId: string) => {
    dispatch(generateVocabularyPractice({
      language: selectedLanguage,
      wordIds: [wordId],
      maxWords: 5,
    }) as any);
  };

  const handleGeneratePractice = () => {
    dispatch(generateVocabularyPractice({
      language: selectedLanguage,
      maxWords: 10,
      focusOnWeakWords: true,
      includeReviewWords: true,
    }) as any);
  };

  const handleGenerateAdaptivePractice = () => {
    dispatch(generateAdaptivePractice(selectedLanguage) as any);
  };

  const handlePracticeComplete = async (results: PracticeResult[]) => {
    try {
      await vocabularyApi.submitPracticeResults(results);
      dispatch(clearCurrentPracticeGroup());
      setSnackbar({ open: true, message: '练习结果已保存！', severity: 'success' });
      
      // Refresh data
      dispatch(fetchVocabularyWords({ language: selectedLanguage }) as any);
      dispatch(fetchMasteryStats(selectedLanguage) as any);
      dispatch(fetchLearningMetrics({ language: selectedLanguage }) as any);
    } catch (error) {
      setSnackbar({ open: true, message: '保存练习结果失败', severity: 'error' });
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'en': return '英语';
      case 'ja': return '日语';
      case 'fr': return '法语';
      default: return lang.toUpperCase();
    }
  };

  const filteredWords = words.filter(word => 
    masteryFilter === 'all' || word.masteryLevel === masteryFilter
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          生词表管理
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          {/* Language Selector */}
          <Box display="flex" gap={1}>
            {(['en', 'ja', 'fr'] as const).map((lang) => (
              <Chip
                key={lang}
                label={getLanguageLabel(lang)}
                onClick={() => handleLanguageChange(lang)}
                color={selectedLanguage === lang ? 'primary' : 'default'}
                variant={selectedLanguage === lang ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Mastery Stats */}
      {masteryStats && (
        <MasteryStatsCard stats={masteryStats} language={selectedLanguage} />
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="词汇列表" icon={<TrendingUpIcon />} />
          <Tab label="学习分析" icon={<PsychologyIcon />} />
          <Tab label="复习计划" icon={<ScheduleIcon />} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Vocabulary List */}
          <Box display="flex" justifyContent="between" alignItems="center" mb={3} px={3}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>掌握程度</InputLabel>
              <Select
                value={masteryFilter}
                label="掌握程度"
                onChange={(e) => setMasteryFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="new">新词</MenuItem>
                <MenuItem value="learning">学习中</MenuItem>
                <MenuItem value="short_term">短期记忆</MenuItem>
                <MenuItem value="long_term">长期记忆</MenuItem>
                <MenuItem value="mastered">已掌握</MenuItem>
              </Select>
            </FormControl>

            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                onClick={handleGeneratePractice}
                startIcon={<PsychologyIcon />}
                disabled={words.length === 0}
              >
                生成练习
              </Button>
              <Button
                variant="contained"
                onClick={handleGenerateAdaptivePractice}
                startIcon={<AutoAwesomeIcon />}
                disabled={words.length === 0}
              >
                智能练习
              </Button>
            </Box>
          </Box>

          <Box px={3}>
            {loading ? (
              <Typography>加载中...</Typography>
            ) : filteredWords.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  暂无词汇
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  点击右下角的 + 按钮添加新词汇
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredWords.map((word) => (
                  <Grid item xs={12} md={6} lg={4} key={word.id}>
                    <VocabularyWordCard
                      word={word}
                      onRemove={handleRemoveWord}
                      onPractice={handlePracticeWord}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Learning Analytics */}
          <Box px={3}>
            {learningMetrics ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        学习效率
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">已学词汇:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {learningMetrics.wordsLearned}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">平均学习时间:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {learningMetrics.averageLearningTime.toFixed(1)} 天
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">记忆保持率:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {learningMetrics.retentionRate.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">掌握进度:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {learningMetrics.masteryProgression.toFixed(1)}%
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        薄弱环节
                      </Typography>
                      {learningMetrics.weaknessAreas.length > 0 ? (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {learningMetrics.weaknessAreas.map((area, index) => (
                            <Chip key={index} label={area} color="warning" size="small" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          暂无明显薄弱环节
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Typography>暂无学习分析数据</Typography>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Review Schedule */}
          <Box px={3}>
            <Typography variant="h6" gutterBottom>
              复习计划
            </Typography>
            <Typography variant="body2" color="text.secondary">
              复习计划功能正在开发中...
            </Typography>
          </Box>
        </TabPanel>
      </Card>

      {/* Add Words FAB */}
      <Tooltip title="添加词汇">
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setAddWordsDialog(true)}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Add Words Dialog */}
      <Dialog open={addWordsDialog} onClose={() => setAddWordsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>添加词汇</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="输入文本内容"
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            value={newWordsText}
            onChange={(e) => setNewWordsText(e.target.value)}
            placeholder="粘贴或输入包含新词汇的文本内容，系统将自动提取词汇..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddWordsDialog(false)}>取消</Button>
          <Button onClick={handleAddWords} variant="contained" disabled={!newWordsText.trim()}>
            添加词汇
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vocabulary Practice Dialog */}
      {currentPracticeGroup && (
        <VocabularyPractice
          practiceGroup={currentPracticeGroup}
          onComplete={handlePracticeComplete}
          onClose={() => dispatch(clearCurrentPracticeGroup())}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default VocabularyPage;