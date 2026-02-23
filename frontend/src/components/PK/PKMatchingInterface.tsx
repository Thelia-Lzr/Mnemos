import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { setError, setMatching, setMatchingTaskId } from '../../store/slices/pkSlice';
import { RootState } from '../../store/store';

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
      const response = await api.get('/pk/stats', { params: { language } });
      setMatchingStats(response.data?.data ?? response.data ?? null);
    } catch (error) {
      setMatchingStats(null);
    }
  };

  const startMatching = async () => {
    try {
      dispatch(setError(null));
      dispatch(setMatching(true));
      
      const response = await api.post('/pk/find-match', { language });
      const data = response.data?.data ?? response.data;

      if (data) {
        if (data.status === 'matched') {
          // 立即找到匹配
          dispatch(setMatching(false));
          onMatchFound(data.matchId);
        } else {
          // 继续等待匹配
          dispatch(setMatchingTaskId(data.id));
          setEstimatedWaitTime(300); // 默认5分钟
        }
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
      dispatch(setMatching(false));
    }
  };

  const checkMatchStatus = async () => {
    if (!isMatching) return;

    try {
      const response = await api.get('/pk/match-status', { params: { language } });
      const data = response.data?.data ?? response.data;

      if (data) {
        if (data.battle) {
          // 找到匹配
          dispatch(setMatching(false));
          onMatchFound(data.battle.id);
        } else if (data.estimatedWaitTime) {
          setEstimatedWaitTime(data.estimatedWaitTime);
        }
      }
    } catch (error) {
      // ignore polling failures and keep current matching state
    }
  };

  const cancelMatching = async () => {
    try {
      await api.post('/pk/cancel-match', { language });
      dispatch(setMatching(false));
      dispatch(setMatchingTaskId(null));
      setShowCancelDialog(false);
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Failed to cancel matching'));
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