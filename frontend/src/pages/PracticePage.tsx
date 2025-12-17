import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Assessment,
  Schedule,
  School,
  Delete,
  MoreVert
} from '@mui/icons-material';
import { PracticeGroup } from '../components/Practice/PracticeGroup';
import practiceApi, { PracticeGroup as PracticeGroupData } from '../services/practiceApi';
import ErrorHandler from '../utils/errorHandler';

// Remove the local interface since we're importing it from practiceApi

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

const PracticePage: React.FC = () => {
  const [practiceGroups, setPracticeGroups] = useState<PracticeGroupData[]>([]);
  const [currentPractice, setCurrentPractice] = useState<PracticeGroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state for creating new practice
  const [newPracticeForm, setNewPracticeForm] = useState({
    language: 'en',
    difficulty: 'intermediate',
    type: 'general',
    focusAreas: [] as string[]
  });

  // AI practice generation state
  const [aiMessage, setAiMessage] = useState('');
  const [useAI, setUseAI] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [practiceToDelete, setPracticeToDelete] = useState<PracticeGroupData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Menu state for practice group actions
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPractice, setSelectedPractice] = useState<PracticeGroupData | null>(null);

  useEffect(() => {
    loadPracticeGroups();
  }, []);

  const loadPracticeGroups = async () => {
    try {
      setLoading(true);
      const response = await practiceApi.getPracticeGroups();
      setPracticeGroups(response.data || []);
    } catch (err) {
      const errorMessage = ErrorHandler.getErrorMessage(err);
      setError(errorMessage);
      ErrorHandler.logError(err, 'Load Practice Groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePractice = async () => {
    try {
      setGenerating(true);
      const practiceGroup = await practiceApi.createPracticeGroup(newPracticeForm);
      setPracticeGroups(prev => [practiceGroup, ...prev]);
      setShowCreateDialog(false);
      setNewPracticeForm({
        language: 'en',
        difficulty: 'intermediate',
        type: 'general',
        focusAreas: []
      });
    } catch (err) {
      const errorMessage = ErrorHandler.getErrorMessage(err);
      setError(errorMessage);
      ErrorHandler.logError(err, 'Create Practice Group');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateAIPractice = async (message: string) => {
    try {
      setGenerating(true);
      const result = await practiceApi.createAIPracticeGroup({
        message,
        language: newPracticeForm.language,
        type: newPracticeForm.type,
        difficulty: newPracticeForm.difficulty
      });
      
      setPracticeGroups(prev => [result.practiceGroup, ...prev]);
      setShowCreateDialog(false);
      setNewPracticeForm({
        language: 'en',
        difficulty: 'intermediate',
        type: 'general',
        focusAreas: []
      });
      
      // Show success message with AI analysis
      if (result.aiAnalysis) {
        console.log('AI Analysis:', result.aiAnalysis);
        ErrorHandler.showSuccess(`AI成功分析您的需求并生成了${result.practiceGroup.questions.length}道练习题！`);
      }
    } catch (err) {
      const errorMessage = ErrorHandler.getErrorMessage(err);
      setError(errorMessage);
      ErrorHandler.logError(err, 'Create AI Practice Group');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartPractice = (practiceGroup: PracticeGroupData) => {
    setCurrentPractice(practiceGroup);
  };

  const handlePracticeComplete = (result: PracticeResult) => {
    console.log('Practice completed:', result);
    // Could show a success message or navigate to results page
  };

  const handleExitPractice = () => {
    setCurrentPractice(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, practice: PracticeGroupData) => {
    setAnchorEl(event.currentTarget);
    setSelectedPractice(practice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPractice(null);
  };

  const handleDeleteClick = () => {
    if (selectedPractice) {
      setPracticeToDelete(selectedPractice);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!practiceToDelete) return;

    try {
      setDeleting(true);
      await practiceApi.deletePracticeGroup(practiceToDelete.id);
      
      // Remove from local state
      setPracticeGroups(prev => prev.filter(group => group.id !== practiceToDelete.id));
      
      ErrorHandler.showSuccess('练习已成功删除');
      setDeleteDialogOpen(false);
      setPracticeToDelete(null);
    } catch (err) {
      const errorMessage = ErrorHandler.getErrorMessage(err);
      setError(errorMessage);
      ErrorHandler.logError(err, 'Delete Practice Group');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPracticeToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vocabulary': return <School />;
      case 'grammar': return <Assessment />;
      case 'comprehensive': return <Assessment />;
      default: return <PlayArrow />;
    }
  };

  if (currentPractice) {
    return (
      <PracticeGroup
        practiceGroup={currentPractice}
        onComplete={handlePracticeComplete}
        onExit={handleExitPractice}
      />
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          练习中心
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateDialog(true)}
        >
          创建练习
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : practiceGroups.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              还没有练习组
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              创建您的第一个练习组开始学习吧！
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowCreateDialog(true)}
            >
              创建练习
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {practiceGroups.map((group) => (
            <Grid item xs={12} md={6} lg={4} key={group.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                      {group.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, group)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {group.description}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={group.difficulty}
                      color={getDifficultyColor(group.difficulty)}
                      size="small"
                    />
                    <Chip
                      label={group.type}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {group.estimatedDuration} 分钟
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {group.questions.length} 题
                    </Typography>
                  </Stack>

                  {group.focusAreas.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        重点领域:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {group.focusAreas.map((area, index) => (
                          <Chip
                            key={index}
                            label={area}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    创建于: {formatDate(group.createdAt)}
                  </Typography>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={getTypeIcon(group.type)}
                    onClick={() => handleStartPractice(group)}
                  >
                    开始练习
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Practice Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新练习</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* AI Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">使用AI智能生成</Typography>
              <Button
                variant={useAI ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setUseAI(!useAI)}
              >
                {useAI ? '🤖 AI模式' : '📝 手动模式'}
              </Button>
            </Box>

            {useAI ? (
              /* AI Practice Generation */
              <TextField
                fullWidth
                multiline
                rows={3}
                label="描述您想要的练习"
                placeholder="例如：我想练习英语购物场景的对话，包含价格询问和商品描述..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                helperText="AI将根据您的描述自动生成个性化练习题"
              />
            ) : (
              /* Manual Practice Configuration */
              <>
                <FormControl fullWidth>
                  <InputLabel>语言</InputLabel>
                  <Select
                    value={newPracticeForm.language}
                    label="语言"
                    onChange={(e) => setNewPracticeForm(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <MenuItem value="en">英语</MenuItem>
                    <MenuItem value="ja">日语</MenuItem>
                    <MenuItem value="fr">法语</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>难度</InputLabel>
                  <Select
                    value={newPracticeForm.difficulty}
                    label="难度"
                    onChange={(e) => setNewPracticeForm(prev => ({ ...prev, difficulty: e.target.value }))}
                  >
                    <MenuItem value="beginner">初级</MenuItem>
                    <MenuItem value="intermediate">中级</MenuItem>
                    <MenuItem value="advanced">高级</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>类型</InputLabel>
                  <Select
                    value={newPracticeForm.type}
                    label="类型"
                    onChange={(e) => setNewPracticeForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <MenuItem value="general">综合练习</MenuItem>
                    <MenuItem value="vocabulary">词汇练习</MenuItem>
                    <MenuItem value="grammar">语法练习</MenuItem>
                    <MenuItem value="comprehensive">全面评估</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCreateDialog(false);
            setUseAI(false);
            setAiMessage('');
          }}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (useAI && aiMessage.trim()) {
                handleCreateAIPractice(aiMessage.trim());
              } else if (!useAI) {
                handleCreatePractice();
              }
            }}
            variant="contained"
            disabled={generating || (useAI && !aiMessage.trim())}
          >
            {generating ? <CircularProgress size={20} /> : useAI ? '🤖 AI生成' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Practice Group Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="删除练习" />
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            您确定要删除练习 "{practiceToDelete?.title}" 吗？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            此操作无法撤销，所有相关的练习记录也将被删除。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            取消
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PracticePage;