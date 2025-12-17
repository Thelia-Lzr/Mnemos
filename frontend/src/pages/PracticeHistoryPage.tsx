import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Alert,
  Tooltip,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  History,
  TrendingUp,
  TrendingDown,
  School,
  Timer,
  Psychology,
  Visibility,
  Search,
  FilterList,
  Assessment,
  BarChart,
  Delete,
  SelectAll,
  CheckBox,
  CheckBoxOutlineBlank
} from '@mui/icons-material';
import { practiceApi, PracticeHistoryItem, AIAnalysis } from '../services/practiceApi';
import { PracticeResultDetail } from '../components/Practice/PracticeResultDetail';

const PracticeHistoryPage: React.FC = () => {
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [resultDetailOpen, setResultDetailOpen] = useState(false);
  const [showResultDetail, setShowResultDetail] = useState(false);
  
  // Batch selection and deletion
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPracticeIds, setSelectedPracticeIds] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Filters
  const [languageFilter, setLanguageFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const itemsPerPage = 12;

  useEffect(() => {
    fetchPracticeHistory();
  }, [page]);

  const fetchPracticeHistory = async () => {
    try {
      setLoading(true);
      const response = await practiceApi.getPracticeHistory(itemsPerPage, (page - 1) * itemsPerPage);
      setPracticeHistory(response.data);
      setTotalPages(Math.ceil(response.pagination.total / itemsPerPage));
    } catch (error) {
      console.error('Error fetching practice history:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewAnalysis = async (practiceResultId: string) => {
    try {
      const analysis = await practiceApi.getPracticeAnalysis(practiceResultId);
      if (analysis) {
        setSelectedAnalysis(analysis);
        setAnalysisDialogOpen(true);
      } else {
        alert('该练习还没有AI分析结果');
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      alert('获取分析结果失败');
    }
  };

  const viewResultDetail = (practiceResultId: string) => {
    setSelectedResultId(practiceResultId);
    setShowResultDetail(true);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedPracticeIds(new Set());
  };

  const togglePracticeSelection = (practiceGroupId: string) => {
    const newSelected = new Set(selectedPracticeIds);
    if (newSelected.has(practiceGroupId)) {
      newSelected.delete(practiceGroupId);
    } else {
      newSelected.add(practiceGroupId);
    }
    setSelectedPracticeIds(newSelected);
  };

  const selectAllPractices = () => {
    if (selectedPracticeIds.size === filteredHistory.length) {
      // Deselect all
      setSelectedPracticeIds(new Set());
    } else {
      // Select all
      const allIds = new Set(filteredHistory.map(p => p.practiceGroupId));
      setSelectedPracticeIds(allIds);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPracticeIds.size === 0) return;

    setDeleteLoading(true);
    try {
      const idsToDelete = Array.from(selectedPracticeIds);
      const result = await practiceApi.batchDeletePracticeHistory(idsToDelete);
      
      // Refresh the practice history
      await fetchPracticeHistory();
      
      // Reset selection
      setSelectedPracticeIds(new Set());
      setSelectionMode(false);
      setDeleteDialogOpen(false);
      
      alert(`${result.message}`);
    } catch (error: any) {
      console.error('Error deleting practice history:', error);
      let errorMessage = '删除失败，请稍后重试';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getLanguageLabel = (langCode: string) => {
    const labels: Record<string, string> = {
      'en': '英语',
      'ja': '日语',
      'fr': '法语'
    };
    return labels[langCode] || langCode;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return difficulty;
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'success';
    if (accuracy >= 60) return 'warning';
    return 'error';
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  // Filter and search logic
  const filteredHistory = practiceHistory.filter(item => {
    const matchesLanguage = !languageFilter || item.language === languageFilter;
    const matchesDifficulty = !difficultyFilter || item.difficulty === difficultyFilter;
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesLanguage && matchesDifficulty && matchesSearch;
  });

  // Calculate statistics
  const completedPractices = practiceHistory.filter(p => p.result);
  const totalAccuracy = completedPractices.reduce((sum, p) => sum + (p.result?.accuracy || 0), 0);
  const averageAccuracy = completedPractices.length > 0 ? totalAccuracy / completedPractices.length : 0;
  const totalTime = completedPractices.reduce((sum, p) => sum + (p.result?.totalTime || 0), 0);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          练习历史
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  // Show result detail in full page mode
  if (selectedResultId && showResultDetail) {
    return (
      <PracticeResultDetail
        practiceResultId={selectedResultId}
        onClose={() => {
          setSelectedResultId(null);
          setShowResultDetail(false);
        }}
        showAsDialog={false}
      />
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          练习历史
        </Typography>
        
        <Stack direction="row" spacing={2}>
          {selectionMode && (
            <>
              <Button
                variant="outlined"
                startIcon={selectedPracticeIds.size === filteredHistory.length ? <CheckBox /> : <CheckBoxOutlineBlank />}
                onClick={selectAllPractices}
                size="small"
              >
                {selectedPracticeIds.size === filteredHistory.length ? '取消全选' : '全选'}
              </Button>
              
              {selectedPracticeIds.size > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setDeleteDialogOpen(true)}
                  size="small"
                >
                  删除历史记录 ({selectedPracticeIds.size})
                </Button>
              )}
            </>
          )}
          
          <Button
            variant={selectionMode ? "contained" : "outlined"}
            startIcon={<SelectAll />}
            onClick={toggleSelectionMode}
            size="small"
          >
            {selectionMode ? '退出选择' : '批量管理'}
          </Button>
        </Stack>
      </Box>

      {/* Statistics Summary */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <School color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {completedPractices.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已完成练习
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Assessment color="success" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {Math.round(averageAccuracy)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均准确率
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Timer color="info" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {formatTime(totalTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总学习时间
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Psychology color="secondary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {practiceHistory.filter(p => p.analysis).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI分析报告
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="搜索练习..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>语言</InputLabel>
              <Select
                value={languageFilter}
                label="语言"
                onChange={(e) => setLanguageFilter(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="en">英语</MenuItem>
                <MenuItem value="ja">日语</MenuItem>
                <MenuItem value="fr">法语</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>难度</InputLabel>
              <Select
                value={difficultyFilter}
                label="难度"
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="beginner">初级</MenuItem>
                <MenuItem value="intermediate">中级</MenuItem>
                <MenuItem value="advanced">高级</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setLanguageFilter('');
                setDifficultyFilter('');
                setSearchTerm('');
              }}
            >
              清除筛选
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Practice History Grid */}
      {filteredHistory.length === 0 ? (
        <Alert severity="info">
          {practiceHistory.length === 0 ? '还没有练习记录' : '没有符合筛选条件的练习记录'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredHistory.map((practice) => (
            <Grid item xs={12} sm={6} md={4} key={practice.practiceGroupId}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: selectionMode && selectedPracticeIds.has(practice.practiceGroupId) ? 2 : 0,
                  borderColor: 'primary.main',
                  position: 'relative'
                }}
              >
                {selectionMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 1,
                      bgcolor: 'background.paper',
                      borderRadius: '50%',
                      p: 0.5
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => togglePracticeSelection(practice.practiceGroupId)}
                      color={selectedPracticeIds.has(practice.practiceGroupId) ? 'primary' : 'default'}
                    >
                      {selectedPracticeIds.has(practice.practiceGroupId) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                    </IconButton>
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1, pt: selectionMode ? 6 : 2 }}>
                  <Typography variant="h6" component="h3" gutterBottom noWrap>
                    {practice.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {practice.description}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                    <Chip
                      label={getLanguageLabel(practice.language)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={getDifficultyLabel(practice.difficulty)}
                      size="small"
                      color={getDifficultyColor(practice.difficulty)}
                      variant="outlined"
                    />
                    <Chip
                      label={practice.type}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  {practice.result ? (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          完成情况
                        </Typography>
                        <Chip
                          label={`${Math.round(practice.result.accuracy)}%`}
                          size="small"
                          color={getAccuracyColor(practice.result.accuracy)}
                        />
                      </Stack>
                      
                      <LinearProgress
                        variant="determinate"
                        value={practice.result.accuracy}
                        color={getAccuracyColor(practice.result.accuracy)}
                        sx={{ mb: 1 }}
                      />
                      
                      <Typography variant="caption" color="text.secondary">
                        用时: {formatTime(practice.result.totalTime)} | 
                        完成于: {new Date(practice.result.completedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      练习未完成
                    </Alert>
                  )}
                </CardContent>

                {practice.result && !selectionMode && (
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="查看完整结算">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => viewResultDetail(practice.result!.id)}
                        >
                          <BarChart />
                        </IconButton>
                      </Tooltip>
                      {practice.analysis && (
                        <Tooltip title="查看AI分析">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => viewAnalysis(practice.result!.id)}
                          >
                            <Psychology />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      {/* AI Analysis Dialog */}
      <Dialog 
        open={analysisDialogOpen} 
        onClose={() => setAnalysisDialogOpen(false)}
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
          {selectedAnalysis && (
            <Stack spacing={3}>
              {/* Analysis Content */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  表现分析
                </Typography>
                <Box sx={{ lineHeight: 1.8 }}>
                  {selectedAnalysis.analysisContent.split('\n').map((paragraph, index) => (
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
                  {selectedAnalysis.learningAdvice.split('\n').map((paragraph, index) => (
                    <Typography key={index} variant="body1" sx={{ mb: paragraph.trim() ? 1 : 0 }}>
                      {paragraph.trim() || '\u00A0'}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Strengths */}
              {selectedAnalysis.strengthsIdentified.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="success.main">
                    识别的强项
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedAnalysis.strengthsIdentified.map((strength, index) => (
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
              {selectedAnalysis.weaknessesIdentified.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="error.main">
                    需要改进的领域
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedAnalysis.weaknessesIdentified.map((weakness, index) => (
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
              {selectedAnalysis.improvementSuggestions.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="info.main">
                    具体改进建议
                  </Typography>
                  <Stack spacing={1}>
                    {selectedAnalysis.improvementSuggestions.map((suggestion, index) => (
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
                  AI分析置信度: {selectedAnalysis.confidenceScore}% | 
                  生成时间: {new Date(selectedAnalysis.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalysisDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Delete color="error" />
            <Typography variant="h6">确认删除练习历史记录</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            此操作将删除选中练习的<strong>历史记录</strong>（包括完成结果和AI分析报告），但会保留练习题目本身，您可以重新练习。
          </Alert>
          <Typography variant="body1">
            您确定要删除选中的 <strong>{selectedPracticeIds.size}</strong> 条练习历史记录吗？
          </Typography>
          {selectedPracticeIds.size > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                将要删除历史记录的练习：
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {filteredHistory
                  .filter(p => selectedPracticeIds.has(p.practiceGroupId))
                  .map(practice => (
                    <Typography key={practice.practiceGroupId} variant="body2" sx={{ ml: 2 }}>
                      • {practice.title} {practice.result ? `(准确率: ${Math.round(practice.result.accuracy)}%)` : '(未完成)'}
                    </Typography>
                  ))
                }
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleBatchDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <Delete />}
          >
            {deleteLoading ? '删除中...' : '确认删除历史记录'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PracticeHistoryPage;