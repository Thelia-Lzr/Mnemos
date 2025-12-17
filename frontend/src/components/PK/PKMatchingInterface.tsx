import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setMatching, setMatchingTaskId, setError } from '../../store/slices/pkSlice';
import SecurityUtils from '../../utils/security';

interface PKMatchingInterfaceProps {
  language: string;
  onMatchFound: (battleId: string) => void;
}

const PKMatchingInterface: React.FC<PKMatchingInterfaceProps> = ({
  language,
  onMatchFound,
}) => {
  const dispatch = useDispatch();
  const { isMatching, matchingTaskId, mmr, error } = useSelector((state: RootState) => state.pk);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [matchingStats, setMatchingStats] = useState<any>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    // 获取匹配统计信息
    fetchMatchingStats();
  }, [language]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMatching) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        checkMatchStatus();
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMatching]);

  const fetchMatchingStats = async () => {
    try {
      const response = await fetch(`/api/pk/matching-stats?language=${language}`, {
        headers: {
          'Authorization': `Bearer ${SecurityUtils.getSecureItem<string>('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatchingStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching matching stats:', error);
    }
  };

  const startMatching = async () => {
    try {
      dispatch(setError(null));
      dispatch(setMatching(true));
      
      const response = await fetch('/api/pk/find-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SecurityUtils.getSecureItem<string>('token')}`,
        },
        body: JSON.stringify({ language }),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.data.status === 'matched') {
          // 立即找到匹配
          dispatch(setMatching(false));
          onMatchFound(data.data.matchId);
        } else {
          // 继续等待匹配
          dispatch(setMatchingTaskId(data.data.id));
          setEstimatedWaitTime(300); // 默认5分钟
        }
      } else {
        throw new Error(data.error || 'Failed to start matching');
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
      dispatch(setMatching(false));
    }
  };

  const checkMatchStatus = async () => {
    if (!isMatching) return;

    try {
      const response = await fetch(`/api/pk/match-status?language=${language}`, {
        headers: {
          'Authorization': `Bearer ${SecurityUtils.getSecureItem<string>('token')}`,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.data.battle) {
          // 找到匹配
          dispatch(setMatching(false));
          onMatchFound(data.data.battle.id);
        } else if (data.data.estimatedWaitTime) {
          setEstimatedWaitTime(data.data.estimatedWaitTime);
        }
      }
    } catch (error) {
      console.error('Error checking match status:', error);
    }
  };

  const cancelMatching = async () => {
    try {
      const response = await fetch('/api/pk/cancel-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SecurityUtils.getSecureItem<string>('token')}`,
        },
        body: JSON.stringify({ language }),
      });

      if (response.ok) {
        dispatch(setMatching(false));
        dispatch(setMatchingTaskId(null));
        setShowCancelDialog(false);
      }
    } catch (error) {
      console.error('Error cancelling match:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (estimatedWaitTime === 0) return 0;
    return Math.min((elapsedTime / estimatedWaitTime) * 100, 100);
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            PK匹配系统
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              当前MMR:
            </Typography>
            <Chip label={mmr} color="primary" />
          </Box>

          {matchingStats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                等待中的玩家: {matchingStats.totalWaiting} | 
                平均等待时间: {Math.round(matchingStats.averageWaitTime)}分钟 | 
                今日对战: {matchingStats.matchesCreatedToday}场
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!isMatching ? (
            <Button
              variant="contained"
              size="large"
              onClick={startMatching}
              fullWidth
              sx={{ py: 2 }}
            >
              开始匹配对手
            </Button>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography variant="body1">
                  正在寻找对手... {formatTime(elapsedTime)}
                </Typography>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={getProgressPercentage()} 
                sx={{ mb: 2 }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                预计等待时间: {Math.round(estimatedWaitTime / 60)}分钟
              </Typography>
              
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowCancelDialog(true)}
                fullWidth
              >
                取消匹配
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 取消确认对话框 */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>取消匹配</DialogTitle>
        <DialogContent>
          <Typography>
            确定要取消匹配吗？已扣除的2个Credits不会退还。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>
            继续等待
          </Button>
          <Button onClick={cancelMatching} color="error">
            确认取消
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PKMatchingInterface;