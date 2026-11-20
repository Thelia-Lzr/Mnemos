import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
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
import { useAppDispatch, useAppSelector } from '../store/hooks';
import ErrorHandler from '../utils/errorHandler';
import { Link } from 'react-router-dom';
import {
  fetchVocabularyWords,
  addWordsFromText,
  removeVocabularyWord,
  fetchMasteryStats,
  generateVocabularyPractice,
  generateAdaptivePractice,
  setSelectedLanguage,
  clearCurrentPracticeGroup,
} from '../store/slices/vocabularySlice';
import VocabularyWordCard from '../components/Vocabulary/VocabularyWordCard';
import MasteryStatsCard from '../components/Vocabulary/MasteryStatsCard';
import VocabularyPractice from '../components/Vocabulary/VocabularyPractice';
import { vocabularyApi, PracticeResult, ReviewSchedule } from '../services/vocabularyApi';

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
  const dispatch = useAppDispatch();
  const {
    words,
    masteryStats,
    currentPracticeGroup,
    selectedLanguage,
    loading,
    error,
  } = useAppSelector((state) => state.vocabulary);

  const [tabValue, setTabValue] = useState(0);
  const [addWordsDialog, setAddWordsDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wordToRemove, setWordToRemove] = useState<{ id: string; word: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [addError, setAddError] = useState('');
  const [savingPractice, setSavingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState('');
  const [reviewSchedule, setReviewSchedule] = useState<ReviewSchedule[] | null>(null);
  const [reviewError, setReviewError] = useState(false);
  const [newWordsText, setNewWordsText] = useState('');
  const [masteryFilter, setMasteryFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    dispatch(fetchVocabularyWords({ language: selectedLanguage, masteryLevel: masteryFilter === 'all' ? undefined : masteryFilter }));
    dispatch(fetchMasteryStats(selectedLanguage));

  }, [dispatch, selectedLanguage, masteryFilter]);

  useEffect(() => {
    if (tabValue !== 2) return;
    let active = true;
    setReviewSchedule(null);
    setReviewError(false);
    void vocabularyApi.getScheduledReviews(selectedLanguage)
      .then(({ schedules }) => { if (active) setReviewSchedule(schedules); })
      .catch(() => { if (active) setReviewError(true); });
    return () => { active = false; };
  }, [selectedLanguage, tabValue]);

  const handleLanguageChange = (language: 'en' | 'ja' | 'fr') => {
    dispatch(setSelectedLanguage(language));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddWords = async () => {
    if (!newWordsText.trim() || adding) return;
    setAdding(true);
    setAddError('');

    try {
      const result = await dispatch(addWordsFromText({ text: newWordsText.trim(), language: selectedLanguage })).unwrap();
      setAddWordsDialog(false);
      setNewWordsText('');
      setSnackbar({ open: true, message: result.extractedCount ? `已添加 ${result.extractedCount} 个词汇。` : '没有提取到新的词汇。', severity: 'success' });
      
      // Refresh data
      dispatch(fetchVocabularyWords({ language: selectedLanguage }));
      dispatch(fetchMasteryStats(selectedLanguage));
    } catch (error) {
      setAddError(ErrorHandler.getErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveWord = async () => {
    if (!wordToRemove || removing) return;
    setRemoving(true);
    try {
      await dispatch(removeVocabularyWord(wordToRemove.id)).unwrap();
      setWordToRemove(null);
      setSnackbar({ open: true, message: '词汇删除成功', severity: 'success' });
      
      // Refresh stats
      dispatch(fetchMasteryStats(selectedLanguage));
    } catch (error) {
      setWordToRemove(null);
      setSnackbar({ open: true, message: '删除词汇失败，请重试。', severity: 'error' });
    } finally {
      setRemoving(false);
    }
  };

  const handlePracticeWord = (wordId: string) => {
    dispatch(generateVocabularyPractice({
      language: selectedLanguage,
      wordIds: [wordId],
      maxWords: 5,
    }));
  };

  const handleGeneratePractice = () => {
    dispatch(generateVocabularyPractice({
      language: selectedLanguage,
      maxWords: 10,
      focusOnWeakWords: true,
      includeReviewWords: true,
    }));
  };

  const handleGenerateAdaptivePractice = () => {
    dispatch(generateAdaptivePractice(selectedLanguage));
  };

  const handlePracticeComplete = async (results: PracticeResult[]) => {
    if (savingPractice) return;
    setSavingPractice(true);
    setPracticeError('');
    try {
      await vocabularyApi.submitPracticeResults(results);
      dispatch(clearCurrentPracticeGroup());
      setSnackbar({ open: true, message: '练习结果已保存！', severity: 'success' });
      
      // Refresh data
      dispatch(fetchVocabularyWords({ language: selectedLanguage }));
      dispatch(fetchMasteryStats(selectedLanguage));

    } catch (error) {
      setPracticeError(ErrorHandler.getErrorMessage(error));
    } finally {
      setSavingPractice(false);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={3}>
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


      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs variant="scrollable" aria-label="生词表功能" value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab id="vocabulary-tab-0" aria-controls="vocabulary-tabpanel-0" label="词汇列表" icon={<TrendingUpIcon />} />
          <Tab id="vocabulary-tab-1" aria-controls="vocabulary-tabpanel-1" label="学习分析" icon={<PsychologyIcon />} />
          <Tab id="vocabulary-tab-2" aria-controls="vocabulary-tabpanel-2" label="复习计划" icon={<ScheduleIcon />} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Vocabulary List */}
          <Box display="flex" justifyContent="between" alignItems="center" flexWrap="wrap" gap={1} mb={3} px={3}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="mastery-filter">掌握程度</InputLabel>
              <Select
                value={masteryFilter}
                labelId="mastery-filter"
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

            <Box display="flex" flexWrap="wrap" gap={1}>
              <Button
                variant="outlined"
                onClick={handleGeneratePractice}
                startIcon={<PsychologyIcon />}
                disabled={loading || words.length === 0}
              >
                生成练习
              </Button>
              <Button
                variant="contained"
                onClick={handleGenerateAdaptivePractice}
                startIcon={<AutoAwesomeIcon />}
                disabled={loading || words.length === 0}
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
                      onRemove={() => setWordToRemove({ id: word.id, word: word.word })}
                      onPractice={handlePracticeWord}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box px={{ xs: 1, sm: 3 }}>
            {masteryStats ? <MasteryStatsCard stats={masteryStats} language={selectedLanguage} /> : <Typography>暂无学习分析数据</Typography>}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box px={3}>
            {reviewError ? <Alert severity="error">无法加载复习计划。切换语言或标签后重试。</Alert> : !reviewSchedule ? (
              <Typography role="status">正在加载复习计划…</Typography>
            ) : reviewSchedule.length ? (
              <Box component="ul" sx={{ pl: 2 }}>
                {reviewSchedule.map(({ wordId, word, nextReviewAt }) => (
                  <Box component="li" key={wordId} sx={{ mb: 1 }}>
                    {word} · {new Date(nextReviewAt).toLocaleDateString('zh-CN')}
                    <Button size="small" disabled={loading} onClick={() => handlePracticeWord(wordId)}>复习 {word}</Button>
                  </Box>
                ))}
              </Box>
            ) : <Typography>完成一次词汇练习后，这里会显示下次复习时间。</Typography>}
          </Box>
        </TabPanel>
      </Card>

      {/* Add Words FAB */}
      <Tooltip title="添加词汇">
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          aria-label="添加词汇"
          onClick={() => { setAddError(''); setAddWordsDialog(true); }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Add Words Dialog */}
      <Dialog open={addWordsDialog} onClose={() => !adding && setAddWordsDialog(false)} maxWidth="md" fullWidth aria-labelledby="add-vocabulary-title">
        <DialogTitle id="add-vocabulary-title">添加词汇</DialogTitle>
        <DialogContent>
          {addError && <Alert severity="error" action={<Button component={Link} to="/ai-settings">AI 配置</Button>}>{addError}</Alert>}
          <TextField
            autoFocus
            disabled={adding}
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
          <Button onClick={() => setAddWordsDialog(false)} disabled={adding}>取消</Button>
          <Button onClick={handleAddWords} variant="contained" disabled={adding || !newWordsText.trim()}>
            {adding ? '正在提取…' : '添加词汇'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(wordToRemove)} onClose={() => !removing && setWordToRemove(null)} aria-labelledby="remove-word-title">
        <DialogTitle id="remove-word-title">删除词汇？</DialogTitle>
        <DialogContent>「{wordToRemove?.word}」的掌握进度和复习计划也会删除。</DialogContent>
        <DialogActions>
          <Button disabled={removing} onClick={() => setWordToRemove(null)}>取消</Button>
          <Button disabled={removing} color="error" onClick={handleRemoveWord}>确认删除</Button>
        </DialogActions>
      </Dialog>

      {/* Vocabulary Practice Dialog */}
      {currentPracticeGroup && (
        <VocabularyPractice
          practiceGroup={currentPracticeGroup}
          onComplete={handlePracticeComplete}
          saving={savingPractice}
          error={practiceError}
          onClose={() => { setPracticeError(''); dispatch(clearCurrentPracticeGroup()); }}
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
