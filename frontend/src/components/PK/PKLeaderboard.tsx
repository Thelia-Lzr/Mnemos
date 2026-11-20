import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { EmojiEvents, TrendingUp, Person } from '@mui/icons-material';

interface LeaderboardEntry {
  userId: string;
  username: string;
  currentMMR: number;
  totalBattles: number;
  wins: number;
  winRate: number;
  rank: number;
}

interface PKLeaderboardProps {
  language: string;
}

const PKLeaderboard: React.FC<PKLeaderboardProps> = ({ language }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchLeaderboard();
    fetchUserStats();
  }, [language]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pk/leaderboard?language=${language}&limit=50`, {

      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.data);
      } else {
        throw new Error('Failed to fetch leaderboard');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`/api/pk/stats?language=${language}`, {

      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <EmojiEvents sx={{ color: 'gold' }} />;
      case 2:
        return <EmojiEvents sx={{ color: 'silver' }} />;
      case 3:
        return <EmojiEvents sx={{ color: '#CD7F32' }} />;
      default:
        return <Typography variant="body2">{rank}</Typography>;
    }
  };

  const getMMRColor = (mmr: number) => {
    if (mmr >= 1800) return 'error'; // 红色 - 大师
    if (mmr >= 1600) return 'warning'; // 橙色 - 钻石
    if (mmr >= 1400) return 'info'; // 蓝色 - 铂金
    if (mmr >= 1200) return 'success'; // 绿色 - 黄金
    return 'default'; // 灰色 - 白银/青铜
  };

  const getMMRTitle = (mmr: number) => {
    if (mmr >= 1800) return '大师';
    if (mmr >= 1600) return '钻石';
    if (mmr >= 1400) return '铂金';
    if (mmr >= 1200) return '黄金';
    if (mmr >= 1000) return '白银';
    return '青铜';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="排行榜" />
        <Tab label="我的统计" />
      </Tabs>

      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <EmojiEvents sx={{ mr: 1 }} />
              MMR排行榜
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>排名</TableCell>
                    <TableCell>玩家</TableCell>
                    <TableCell align="center">MMR</TableCell>
                    <TableCell align="center">段位</TableCell>
                    <TableCell align="center">对战数</TableCell>
                    <TableCell align="center">胜率</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow key={entry.userId}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getRankIcon(entry.rank)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            <Person />
                          </Avatar>
                          <Typography variant="body2">
                            {entry.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" fontWeight="bold">
                          {entry.currentMMR}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getMMRTitle(entry.currentMMR)}
                          color={getMMRColor(entry.currentMMR)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {entry.totalBattles}
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color={entry.winRate >= 60 ? 'success.main' : entry.winRate >= 40 ? 'text.primary' : 'error.main'}
                        >
                          {entry.winRate.toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && userStats && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} />
              我的PK统计
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  当前MMR
                </Typography>
                <Typography variant="h4" color="primary">
                  {userStats.currentMMR}
                </Typography>
                <Chip
                  label={getMMRTitle(userStats.currentMMR)}
                  color={getMMRColor(userStats.currentMMR)}
                  size="small"
                />
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  历史最高MMR
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {userStats.peakMMR}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  总对战数
                </Typography>
                <Typography variant="h4">
                  {userStats.totalBattles}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  胜率
                </Typography>
                <Typography 
                  variant="h4"
                  color={userStats.winRate >= 60 ? 'success.main' : userStats.winRate >= 40 ? 'text.primary' : 'error.main'}
                >
                  {userStats.winRate.toFixed(1)}%
                </Typography>
              </Paper>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  胜场
                </Typography>
                <Typography variant="h5" color="success.main">
                  {userStats.wins}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  败场
                </Typography>
                <Typography variant="h5" color="error.main">
                  {userStats.losses}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  平局
                </Typography>
                <Typography variant="h5">
                  {userStats.draws}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Credits收入
                </Typography>
                <Typography variant="h5" color="success.main">
                  +{userStats.totalCreditsEarned}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Credits支出
                </Typography>
                <Typography variant="h5" color="error.main">
                  -{userStats.totalCreditsSpent}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  平均MMR变化
                </Typography>
                <Typography variant="h5">
                  ±{userStats.averageMMRChange.toFixed(1)}
                </Typography>
              </Paper>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PKLeaderboard;