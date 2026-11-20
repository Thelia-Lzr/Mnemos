import { useAppSelector } from '../../store/hooks';
import {
    AccessTime,
    Close,
    EmojiEvents,
    Person,
    Remove,
    TrendingDown,
    TrendingUp,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface BattleHistoryEntry {
  id: string;
  player1Id: string;
  player2Id: string;
  language: string;
  player1Score: number;
  player2Score: number;
  player1Time: number;
  player2Time: number;
  winnerId?: string;
  player1MmrChange: number;
  player2MmrChange: number;
  createdAt: string;
}

interface PKBattleHistoryProps {
  language: string;
}

const PKBattleHistory: React.FC<PKBattleHistoryProps> = ({ language }) => {
  const [battles, setBattles] = useState<BattleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = useAppSelector((state) => state.workspace.profile?.id);

  useEffect(() => {
    fetchBattleHistory();
  }, [language]);

  const fetchBattleHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pk/history', { params: { limit: 20, language } });
      const payload = response.data?.data ?? response.data;
      const nextBattles = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.battles)
          ? payload.battles
          : [];
      setBattles(nextBattles);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getBattleResult = (battle: BattleHistoryEntry) => {
    if (!battle.winnerId) return 'draw';
    return battle.winnerId === currentUserId ? 'win' : 'loss';
  };

  const getResultIcon = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return <EmojiEvents sx={{ color: 'success.main' }} />;
      case 'loss':
        return <Close sx={{ color: 'error.main' }} />;
      case 'draw':
        return <Remove sx={{ color: 'warning.main' }} />;
    }
  };

  const getResultColor = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return 'success';
      case 'loss':
        return 'error';
      case 'draw':
        return 'warning';
    }
  };

  const getResultText = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return '胜利';
      case 'loss':
        return '失败';
      case 'draw':
        return '平局';
    }
  };

  const getMyScore = (battle: BattleHistoryEntry) => {
    return battle.player1Id === currentUserId ? battle.player1Score : battle.player2Score;
  };

  const getOpponentScore = (battle: BattleHistoryEntry) => {
    return battle.player1Id === currentUserId ? battle.player2Score : battle.player1Score;
  };

  const getMyMMRChange = (battle: BattleHistoryEntry) => {
    return battle.player1Id === currentUserId ? battle.player1MmrChange : battle.player2MmrChange;
  };



  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
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

  if (battles.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            还没有对战记录
          </Typography>
          <Typography variant="body2" color="text.secondary">
            开始你的第一场PK对战吧！
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          对战历史
        </Typography>

        <List>
          {battles.map((battle, index) => {
            const result = getBattleResult(battle);
            const myScore = getMyScore(battle);
            const opponentScore = getOpponentScore(battle);
            const mmrChange = getMyMMRChange(battle);

            return (
              <React.Fragment key={battle.id}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getResultIcon(result)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getResultText(result)}
                          color={getResultColor(result)}
                          size="small"
                        />
                        <Typography variant="body1" fontWeight="bold">
                          {myScore} - {opponentScore}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          {mmrChange > 0 ? (
                            <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                          ) : mmrChange < 0 ? (
                            <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
                          ) : null}
                          <Typography 
                            variant="body2" 
                            color={mmrChange > 0 ? 'success.main' : mmrChange < 0 ? 'error.main' : 'text.secondary'}
                            sx={{ ml: 0.5 }}
                          >
                            {mmrChange > 0 ? '+' : ''}{mmrChange} MMR
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            vs 对手
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTime sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(battle.createdAt)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {battle.language.toUpperCase()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                
                {index < battles.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};

export default PKBattleHistory;