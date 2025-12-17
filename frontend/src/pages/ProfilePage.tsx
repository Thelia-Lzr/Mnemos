import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import userLanguageApi, { UserLanguage as UserLanguageType, CreateUserLanguageRequest } from '../services/userLanguageApi';
import PracticeHistorySummary from '../components/Profile/PracticeHistorySummary';

// Use the imported type
type UserLanguage = UserLanguageType;

const ProfilePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [languages, setLanguages] = useState<UserLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<UserLanguage | null>(null);
  const [formData, setFormData] = useState({
    language: '',
    currentLevel: '',
    targetLevel: '',
    isPrimary: false
  });

  const languageOptions = [
    { value: 'en', label: '英语' },
    { value: 'ja', label: '日语' },
    { value: 'fr', label: '法语' }
  ];

  const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  useEffect(() => {
    fetchUserLanguages();
  }, []);

  const fetchUserLanguages = async () => {
    try {
      const userLanguages = await userLanguageApi.getUserLanguages();
      setLanguages(userLanguages);
    } catch (error) {
      console.error('Error fetching user languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLanguage = () => {
    setEditingLanguage(null);
    setFormData({
      language: '',
      currentLevel: '',
      targetLevel: '',
      isPrimary: languages.length === 0
    });
    setDialogOpen(true);
  };

  const handleEditLanguage = (language: UserLanguage) => {
    setEditingLanguage(language);
    setFormData({
      language: language.language,
      currentLevel: language.currentLevel,
      targetLevel: language.targetLevel || '',
      isPrimary: language.isPrimary
    });
    setDialogOpen(true);
  };

  const handleSaveLanguage = async () => {
    try {
      if (editingLanguage) {
        // Update existing language
        await userLanguageApi.updateUserLanguage(formData.language, {
          currentLevel: formData.currentLevel,
          targetLevel: formData.targetLevel || undefined,
          isPrimary: formData.isPrimary
        });
      } else {
        // Add new language
        await userLanguageApi.addUserLanguage(formData as CreateUserLanguageRequest);
      }
      
      await fetchUserLanguages();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving language:', error);
      alert(error.response?.data?.error || '保存失败');
    }
  };

  const handleDeleteLanguage = async (language: string) => {
    if (window.confirm('确定要删除这个语言吗？')) {
      try {
        await userLanguageApi.removeUserLanguage(language);
        await fetchUserLanguages();
      } catch (error) {
        console.error('Error deleting language:', error);
        alert('删除失败');
      }
    }
  };

  const handleSetPrimary = async (language: string) => {
    try {
      await userLanguageApi.setPrimaryLanguage(language);
      await fetchUserLanguages();
    } catch (error) {
      console.error('Error setting primary language:', error);
      alert('设置主要语言失败');
    }
  };

  const getLanguageLabel = (langCode: string) => {
    return languageOptions.find(opt => opt.value === langCode)?.label || langCode;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        个人资料
      </Typography>

      {/* User Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            基本信息
          </Typography>
          <Typography variant="body1">
            用户名: {user?.username}
          </Typography>
          <Typography variant="body1">
            邮箱: {user?.email}
          </Typography>
        </CardContent>
      </Card>

      {/* Practice History Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            学习统计
          </Typography>
          <PracticeHistorySummary />
        </CardContent>
      </Card>

      {/* Learning Languages */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              学习语言
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddLanguage}
            >
              添加语言
            </Button>
          </Box>

          {languages.length === 0 ? (
            <Alert severity="info">
              还没有添加学习语言。点击"添加语言"开始设置您的学习目标。
            </Alert>
          ) : (
            <Stack spacing={2}>
              {languages.map((lang) => (
                <Card key={lang.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6">
                          {getLanguageLabel(lang.language)}
                        </Typography>
                        {lang.isPrimary && (
                          <Chip
                            icon={<StarIcon />}
                            label="主要语言"
                            color="primary"
                            size="small"
                          />
                        )}
                        {!lang.isActive && (
                          <Chip
                            label="已暂停"
                            color="default"
                            size="small"
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!lang.isPrimary && (
                          <Tooltip title="设为主要语言">
                            <IconButton
                              size="small"
                              onClick={() => handleSetPrimary(lang.language)}
                            >
                              <StarBorderIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => handleEditLanguage(lang)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLanguage(lang.language)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        当前水平: <strong>{lang.currentLevel}</strong>
                        {lang.targetLevel && (
                          <> → 目标水平: <strong>{lang.targetLevel}</strong></>
                        )}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Language Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLanguage ? '编辑语言' : '添加语言'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth disabled={!!editingLanguage}>
              <InputLabel>语言</InputLabel>
              <Select
                value={formData.language}
                label="语言"
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              >
                {languageOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>当前水平</InputLabel>
              <Select
                value={formData.currentLevel}
                label="当前水平"
                onChange={(e) => setFormData({ ...formData, currentLevel: e.target.value })}
              >
                {levelOptions.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>目标水平（可选）</InputLabel>
              <Select
                value={formData.targetLevel}
                label="目标水平（可选）"
                onChange={(e) => setFormData({ ...formData, targetLevel: e.target.value })}
              >
                <MenuItem value="">无目标</MenuItem>
                {levelOptions.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                />
              }
              label="设为主要语言"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleSaveLanguage}
            variant="contained"
            disabled={!formData.language || !formData.currentLevel}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;