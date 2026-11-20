import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import api from '../../services/api';

interface WorkspaceStats {
  totalUsers: number;
  completedPractices: number;
  totalTasks: number;
}

const metrics: { key: keyof WorkspaceStats; label: string }[] = [
  { key: 'totalUsers', label: '本地资料' },
  { key: 'completedPractices', label: '已完成练习' },
  { key: 'totalTasks', label: '后台任务' },
];

const SystemStats: React.FC = () => {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [error, setError] = useState(false);

  const loadStats = async () => {
    setError(false);
    try {
      const response = await api.get<{ data: WorkspaceStats }>('/admin/statistics');
      setStats(response.data.data);
    } catch {
      setError(true);
    }
  };

  useEffect(() => { void loadStats(); }, []);

  if (error) {
    return <Alert severity="error" action={<Button onClick={loadStats}>重试</Button>}>无法加载系统统计。</Alert>;
  }

  if (!stats) {
    return <Typography role="status">正在加载系统统计…</Typography>;
  }

  return (
    <Grid container spacing={2} aria-label="系统统计">
      {metrics.map(({ key, label }) => (
        <Grid item xs={12} sm={4} key={key}>
          <Card variant="outlined">
            <CardContent>
              <Typography component="h2" variant="subtitle1">{label}</Typography>
              <Typography variant="h4">{stats[key].toLocaleString('zh-CN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default SystemStats;
