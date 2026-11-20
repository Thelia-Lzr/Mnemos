import { ArrowOutward, Assignment, Book, Chat, TrendingUp } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Grid, List, ListItem, ListItemText, Skeleton, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DailyRecommendationCard from '../components/DailyRecommendation/DailyRecommendationCard';
import api from '../services/api';
import { useAppSelector } from '../store/hooks';
import { brand } from '../theme/theme';

interface LearningStatus {
  languages: { language: string; currentLevel: string; isPrimary: boolean }[];
  completedPractices: number;
  totalPracticeMinutes: number;
  recentPractices: { id: string; title: string; accuracy: number; completedAt: string }[];
}

const actions = [
  { title: 'AI 对话', description: '练习表达，获得语言反馈', path: '/chat', icon: <Chat /> },
  { title: '练习题库', description: '生成个性化练习题目', path: '/practice', icon: <Assignment /> },
  { title: '生词表', description: '查看和复习生词', path: '/vocabulary', icon: <Book /> },
  { title: '能力评估', description: '查看各语言的能力资料', path: '/assessment', icon: <TrendingUp /> },
];

const DashboardPage: React.FC = () => {
  const profile = useAppSelector((state) => state.workspace.profile);
  const [status, setStatus] = useState<LearningStatus | null>(null);
  const [error, setError] = useState(false);

  const loadStatus = async () => {
    setError(false);
    try {
      const response = await api.get<{ data: LearningStatus }>('/users/learning-status');
      setStatus(response.data.data);
    } catch {
      setError(true);
    }
  };

  useEffect(() => { void loadStatus(); }, []);
  const languages = status?.languages ?? [];
  const primary = languages.find((language) => language.isPrimary) ?? languages[0];
  const recent = status?.recentPractices ?? [];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1440, mx: 'auto' }}>
      <Box component="header" sx={{
        display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 32%' },
        minHeight: { sm: 235 }, mb: { xs: 3, md: 4 }, overflow: 'hidden',
      }}>
        <Box sx={{ bgcolor: brand.blue, color: 'white', p: { xs: 3, sm: 4, lg: 5 } }}>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4.5rem' } }}>学习概览</Typography>
          <Typography sx={{ borderTop: '1px solid', borderColor: brand.lilac, mt: 2, pt: 2, maxWidth: 380, overflowWrap: 'anywhere' }}>
            欢迎回来，{profile?.username || '学习者'}
          </Typography>
        </Box>
        <Box aria-hidden="true" sx={{ display: { xs: 'none', sm: 'grid' }, placeItems: 'center', bgcolor: brand.violet, p: 2 }}>
          <Box className="mnemos-orbit" sx={{ width: 'min(90%, 205px)' }} />
        </Box>
      </Box>

      <Typography component="h2" variant="h5" sx={{ mb: 1.5 }}>开始学习</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 3 }}>
        {actions.map((action) => (
          <Card key={action.path} sx={{ borderTop: '3px solid', borderTopColor: 'primary.main' }}>
            <CardActionArea component={Link} to={action.path} sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Box aria-hidden="true" sx={{ display: 'flex', justifyContent: 'space-between', color: 'primary.main', mb: 2 }}>
                  {action.icon}<ArrowOutward fontSize="small" />
                </Box>
                <Typography component="h3" variant="h6">{action.title}</Typography>
                <Typography variant="body2" color="text.secondary">{action.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button onClick={loadStatus}>重试</Button>}>无法加载学习记录。</Alert>}
      {!error && !status && <Skeleton variant="rectangular" height={160} aria-label="正在加载学习记录" />}
      {status && (
        <>
          {primary ? <DailyRecommendationCard key={primary.language} language={primary.language} /> : (
            <Alert severity="info" action={<Button component={Link} to="/profile">添加语言</Button>}>
              设置学习语言后，即可查看对应的今日建议。
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography component="h2" variant="h6" gutterBottom>学习统计</Typography>
                  <Typography>已完成 {status.completedPractices ?? 0} 次练习</Typography>
                  <Typography>练习用时 {status.totalPracticeMinutes ?? 0} 分钟</Typography>
                  {primary && <Typography>主要语言等级 {primary.currentLevel}</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography component="h2" variant="h6" gutterBottom>最近完成的练习</Typography>
                  {recent.length ? (
                    <List dense disablePadding>
                      {recent.map((practice) => (
                        <ListItem key={practice.id} disableGutters>
                          <ListItemText primary={practice.title} secondary={`正确率 ${practice.accuracy}% · ${new Date(practice.completedAt).toLocaleString('zh-CN')}`} />
                        </ListItem>
                      ))}
                    </List>
                  ) : <Typography color="text.secondary">暂无已完成的练习。</Typography>}
                  <Button component={Link} to="/practice-history" sx={{ mt: 1 }}>查看练习历史</Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default DashboardPage;
