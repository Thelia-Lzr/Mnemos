import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Grid, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import assessmentApi, { UserCapability } from '../services/assessmentApi';

const languageNames: Record<string, string> = { en: '英语', ja: '日语', fr: '法语' };
const skills = [
  { label: '听力', key: 'listeningLevel' },
  { label: '口语', key: 'speakingLevel' },
  { label: '阅读', key: 'readingLevel' },
  { label: '写作', key: 'writingLevel' },
] as const;

const AssessmentPage: React.FC = () => {
  const [capabilities, setCapabilities] = useState<UserCapability[] | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    try {
      setCapabilities(await assessmentApi.getAllCapabilities());
    } catch {
      setError(true);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">语言能力评估</Typography>
        <Alert severity="info">
          本页显示你设置的语言水平和已有的评估结果。综合评估及重新评估暂未开放。
        </Alert>
        {error ? (
          <Alert severity="error" action={<Button onClick={load}>重试</Button>}>无法加载语言能力资料。</Alert>
        ) : !capabilities ? (
          <CircularProgress aria-label="正在加载语言能力资料" />
        ) : capabilities.length === 0 ? (
          <Alert severity="info">暂无语言能力资料。前往 <Link to="/profile">个人资料</Link> 添加学习语言。</Alert>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {capabilities.map((capability) => (
              <Grid item xs={12} sm={6} key={capability.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography component="h2" variant="h6" gutterBottom>{languageNames[capability.language] ?? capability.language}</Typography>
                    <Typography>当前水平 {capability.currentLevel}</Typography>
                    {capability.learningGoal && <Typography>目标水平 {capability.learningGoal}</Typography>}
                    {capability.lastAssessedAt ? (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">最近评估 {new Date(capability.lastAssessedAt).toLocaleDateString('zh-CN')}</Typography>
                        {capability.overallLevel && <Typography>评估等级 {capability.overallLevel}</Typography>}
                        {skills.map(({ label, key }) => typeof capability[key] === 'number' && (
                          <Typography variant="body2" key={key}>{label} {capability[key]} / 100</Typography>
                        ))}
                      </Box>
                    ) : <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>暂无正式评估结果。</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        <Button component={Link} to="/practice" sx={{ alignSelf: 'flex-start' }}>前往练习题库</Button>
      </Stack>
    </Container>
  );
};

export default AssessmentPage;
