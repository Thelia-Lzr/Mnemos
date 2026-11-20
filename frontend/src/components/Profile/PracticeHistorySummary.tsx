import {
    History,
    Psychology,
    School,
    Timer,
    TrendingUp,
    Visibility
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceApi, PracticeHistoryItem } from '../../services/practiceApi';

interface PracticeStats {
  totalPractices: number;
  averageAccuracy: number;
  totalStudyTime: number;
  completedToday: number;
  currentStreak: number;
  recentPractices: PracticeHistoryItem[];
}

const PracticeHistorySummary: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [fullHistory, setFullHistory] = useState<PracticeHistoryItem[]>([]);

  useEffect(() => {
    fetchPracticeStats();
  }, []);

  const fetchPracticeStats = async () => {
    try {
      const historyResponse = await practiceApi.getPracticeHistory(10, 0);
      const recentPractices = Array.isArray(historyResponse?.data)
        ? historyResponse.data
        : [];

      // Calculate stats from recent practices
      const completedPractices = recentPractices.filter(p => p.result);
      const totalAccuracy = completedPractices.reduce((sum, p) => sum + (p.result?.accuracy || 0), 0);
      const totalTime = completedPractices.reduce((sum, p) => sum + (p.result?.totalTime || 0), 0);
      
      // Calculate today's practices
      const today = new Date().toDateString();
      const completedToday = completedPractices.filter(p => 
        p.result && new Date(p.result.completedAt).toDateString() === today
      ).length;

      const practiceStats: PracticeStats = {
        totalPractices: completedPractices.length,
        averageAccuracy: completedPractices.length > 0 ? totalAccuracy / completedPractices.length : 0,
        totalStudyTime: Math.round(totalTime / 60000), // Convert to minutes
        completedToday,
        currentStreak: calculateStreak(completedPractices),
        recentPractices
      };

      setStats(practiceStats);
    } catch (error) {
      setStats({
        totalPractices: 0,
        averageAccuracy: 0,
        totalStudyTime: 0,
        completedToday: 0,
        currentStreak: 0,
        recentPractices: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (practices: PracticeHistoryItem[]): number => {
    if (practices.length === 0) return 0;

    const sortedPractices = practices
      .filter(p => p.result)
      .sort((a, b) => new Date(b.result!.completedAt).getTime() - new Date(a.result!.completedAt).getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const practice of sortedPractices) {
      const practiceDate = new Date(practice.result!.completedAt);
      practiceDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate.getTime() - practiceDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  };

  const fetchFullHistory = async () => {
    try {
      const response = await practiceApi.getPracticeHistory(50, 0);
      setFullHistory(Array.isArray(response?.data) ? response.data : []);
      setHistoryDialogOpen(true);
    } catch (error) {
      setFullHistory([]);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
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

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          还没有练习记录。开始你的第一次练习吧！
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Practices */}
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <School color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {stats.totalPractices}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总练习次数
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Average Accuracy */}
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingUp color="success" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {Math.round(stats.averageAccuracy)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均准确率
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Study Time */}
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Timer color="info" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {formatTime(stats.totalStudyTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总学习时间
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Streak */}
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Psychology color="warning" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" component="div">
                {stats.currentStreak}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                连续学习天数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Practices */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            最近练习
          </Typography>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => navigate('/practice-history')}
            size="small"
          >
            查看全部
          </Button>
        </Box>

        {stats.recentPractices.length === 0 ? (
          <Typography color="text.secondary">
            还没有练习记录
          </Typography>
        ) : (
          <Stack spacing={1}>
            {stats.recentPractices.slice(0, 5).map((practice) => (
              <Card key={practice.practiceGroupId} variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {practice.title}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                          label={getLanguageLabel(practice.language)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={practice.difficulty}
                          size="small"
                          color={getDifficultyColor(practice.difficulty)}
                          variant="outlined"
                        />
                        {practice.result && (
                          <Chip
                            label={`${Math.round(practice.result.accuracy)}%`}
                            size="small"
                            color={practice.result.accuracy >= 80 ? 'success' : 'default'}
                          />
                        )}
                      </Stack>
                    </Box>
                    
                    <Box sx={{ textAlign: 'right', ml: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {practice.result 
                          ? new Date(practice.result.completedAt).toLocaleDateString()
                          : '未完成'
                        }
                      </Typography>
                      {practice.analysis && (
                        <Tooltip title="有AI分析">
                          <Psychology color="secondary" sx={{ fontSize: 16 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Full History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <History />
            <Typography variant="h6">练习历史</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <List>
            {fullHistory.map((practice) => (
              <ListItem key={practice.practiceGroupId} divider>
                <ListItemText
                  primary={practice.title}
                  secondary={
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip
                        label={getLanguageLabel(practice.language)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={practice.difficulty}
                        size="small"
                        color={getDifficultyColor(practice.difficulty)}
                        variant="outlined"
                      />
                      {practice.result && (
                        <>
                          <Chip
                            label={`${Math.round(practice.result.accuracy)}%`}
                            size="small"
                            color={practice.result.accuracy >= 80 ? 'success' : 'default'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(practice.result.completedAt).toLocaleString()}
                          </Typography>
                        </>
                      )}
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  {practice.analysis && (
                    <Tooltip title="查看AI分析">
                      <IconButton size="small">
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PracticeHistorySummary;