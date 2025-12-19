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
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // Generating practice groups (with taskId)
  const [generatingPractices, setGeneratingPractices] = useState<Map<string, {
    taskId: string;
    title: string;
    language: string;
    difficulty: string;
    type: string;
  }>>(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem('generatingPractices');
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (err) {
      console.error('Failed to load generating practices from localStorage:', err);
    }
    return new Map();
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [practiceToDelete, setPracticeToDelete] = useState<PracticeGroupData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Menu state for practice group actions
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPractice, setSelectedPractice] = useState<PracticeGroupData | null>(null);

  // Persist generating practices to localStorage whenever it changes
  useEffect(() => {
    try {
      const obj = Object.fromEntries(generatingPractices.entries());
      localStorage.setItem('generatingPractices', JSON.stringify(obj));
    } catch (err) {
      console.error('Failed to save generating practices to localStorage:', err);
    }
  }, [generatingPractices]);

  useEffect(() => {
    loadPracticeGroups();
  }, []);

  // Poll for generating practice status
  useEffect(() => {
    if (generatingPractices.size === 0) {
      // Clean up localStorage when no generating practices
      localStorage.removeItem('generatingPractices');
      return;
    }

    const pollInterval = setInterval(async () => {
      const updatedGenerating = new Map(generatingPractices);
      let hasChanges = false;

      // Convert Map entries to array for iteration
      const entries = Array.from(generatingPractices.entries());
      
      for (const [taskId, practiceInfo] of entries) {
        try {
          const status = await practiceApi.getTaskStatus(taskId);
          console.log('Task status for', taskId, ':', status);
          
          // Check for completed status (case-insensitive)
          const statusLower = status.status?.toLowerCase();
          if (statusLower === 'completed' && status.result) {
            // Task completed, add to practice groups
            console.log('Task completed, adding practice group:', status.result);
            
            // Ensure data format is correct
            const practiceGroup = status.result;
            const processedGroup = {
              ...practiceGroup,
              // Ensure createdAt is a string for date formatting
              createdAt: typeof practiceGroup.createdAt === 'string' 
                ? practiceGroup.createdAt 
                : new Date(practiceGroup.createdAt).toISOString(),
              // Ensure questions is an array
              questions: Array.isArray(practiceGroup.questions) ? practiceGroup.questions : [],
              // Ensure focusAreas is an array
              focusAreas: Array.isArray(practiceGroup.focusAreas) ? practiceGroup.focusAreas : []
            };
            
            setPracticeGroups(prev => [processedGroup, ...prev]);
            updatedGenerating.delete(taskId);
            hasChanges = true;
            ErrorHandler.showSuccess(`练习"${practiceInfo.title}"生成完成！`);
          } else if (statusLower === 'failed') {
            // Task failed, remove from generating
            updatedGenerating.delete(taskId);
            hasChanges = true;
            ErrorHandler.showError(`练习"${practiceInfo.title}"生成失败：${status.error || '未知错误'}`);
          } else {
            console.log('Task still in progress, status:', status.status);
          }
        } catch (err) {
          console.error('Error polling task status:', err);
          // If task not found (404), remove it from generating list
          if ((err as any)?.response?.status === 404) {
            updatedGenerating.delete(taskId);
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        setGeneratingPractices(updatedGenerating);
        // Immediately update localStorage after changes
        if (updatedGenerating.size === 0) {
          localStorage.removeItem('generatingPractices');
        } else {
          const obj = Object.fromEntries(updatedGenerating.entries());
          localStorage.setItem('generatingPractices', JSON.stringify(obj));
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [generatingPractices]);

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

  const handleCreateEnhancedPractice = async () => {
    try {
      setGenerating(true);
      
      // Use async enhanced practice generation
      const result = await practiceApi.createEnhancedPracticeGroupAsync({
        language: newPracticeForm.language,
        type: newPracticeForm.type,
        difficulty: newPracticeForm.difficulty,
        additionalPrompt: additionalPrompt.trim() || undefined
      });
      
      // Create a placeholder practice group for "generating" state
      const placeholderTitle = additionalPrompt.trim() 
        ? `${getTypeDisplayName(newPracticeForm.type)} - ${additionalPrompt.trim().substring(0, 20)}...`
        : `${getTypeDisplayName(newPracticeForm.type)} - ${getLanguageDisplayName(newPracticeForm.language)}`;
      
      // Add to generating practices map
      setGeneratingPractices(prev => new Map(prev.set(result.taskId, {
        taskId: result.taskId,
        title: placeholderTitle,
        language: newPracticeForm.language,
        difficulty: newPracticeForm.difficulty,
        type: newPracticeForm.type
      })));
      
      // Close dialog and reset form
      setShowCreateDialog(false);
      setNewPracticeForm({
        language: 'en',
        difficulty: 'intermediate',
        type: 'general',
        focusAreas: []
      });
      setAdditionalPrompt('');
      
      // Show success message
      ErrorHandler.showSuccess(result.message);
      
    } catch (err) {
      const errorMessage = ErrorHandler.getErrorMessage(err);
      setError(errorMessage);
      ErrorHandler.logError(err, 'Create Enhanced Practice Group');
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

  const handleClearGenerating = () => {
    // Use window.confirm to bypass eslint warning
    if (window.confirm('确定要清除所有"生成中"的练习组吗？')) {
      setGeneratingPractices(new Map());
      localStorage.removeItem('generatingPractices');
      ErrorHandler.showSuccess('已清除所有生成中的练习组');
    }
  };

  // Helper functions for display names
  const getTypeDisplayName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'general': '综合练习',
      'vocabulary': '词汇练习',
      'grammar': '语法练习',
      'comprehensive': '全面评估'
    };
    return typeMap[type] || '练习';
  };

  const getLanguageDisplayName = (language: string): string => {
    const languageMap: Record<string, string> = {
      'en': '英语',
      'ja': '日语',
      'fr': '法语'
    };
    return languageMap[language] || language;
  };

  const formatDate = (dateInput: any) => {
    try {
      // Handle null/undefined
      if (!dateInput) {
        return '未知日期';
      }
      
      // Handle string and Date objects
      let date: Date;
      if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        // Try to construct date from object
        date = new Date(dateInput);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '无效日期';
      }
      
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Date formatting error:', dateInput, e);
      return '日期格式错误';
    }
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
        <Stack direction="row" spacing={2}>
          {generatingPractices.size > 0 && (
            <Button
              variant="outlined"
              color="warning"
              onClick={handleClearGenerating}
            >
              清除生成中 ({generatingPractices.size})
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateDialog(true)}
          >
            创建练习
          </Button>
        </Stack>
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
          {/* Generating practice groups */}
          {Array.from(generatingPractices.values()).map((generatingPractice) => (
            <Grid item xs={12} md={6} lg={4} key={generatingPractice.taskId}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: 0.7 }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                      {generatingPractice.title}
                    </Typography>
                    <CircularProgress size={20} sx={{ ml: 1 }} />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    AI正在生成练习题，请稍候...
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={generatingPractice.difficulty}
                      color="default"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={getLanguageDisplayName(generatingPractice.language)}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={getTypeDisplayName(generatingPractice.type)}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    生成中...
                  </Typography>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled
                  >
                    生成中...
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}

          {/* Existing practice groups */}
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
                      • {group.questions?.length || 0} 题
                    </Typography>
                  </Stack>

                  {group.focusAreas && group.focusAreas.length > 0 && (
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
            {/* Basic Practice Configuration - Always Visible */}
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

            {/* Optional AI Enhancement */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="额外提示词（可选）"
              placeholder="例如：重点练习购物场景对话，包含价格询问和商品描述..."
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              helperText="AI将根据您的额外要求优化练习内容生成"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCreateDialog(false);
            setAdditionalPrompt('');
          }}>
            取消
          </Button>
          <Button
            onClick={() => {
              handleCreateEnhancedPractice();
            }}
            variant="contained"
            disabled={generating}
          >
            {generating ? <CircularProgress size={20} /> : '🤖 智能生成'}
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