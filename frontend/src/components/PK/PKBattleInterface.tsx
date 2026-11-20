import { useAppSelector } from '../../store/hooks';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Grid,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Timer, EmojiEvents } from '@mui/icons-material';
import io, { Socket } from 'socket.io-client';

interface PKBattleInterfaceProps {
  battleId: string;
  onBattleEnd: (result: any) => void;
}

interface Question {
  id: string;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface BattleProgress {
  player1Progress: {
    userId: string;
    currentQuestion: number;
    correctAnswers: number;
    totalTime: number;
    isFinished: boolean;
  };
  player2Progress: {
    userId: string;
    currentQuestion: number;
    correctAnswers: number;
    totalTime: number;
    isFinished: boolean;
  };
}

const PKBattleInterface: React.FC<PKBattleInterfaceProps> = ({
  battleId,
  onBattleEnd,
}) => {
  const [, setSocket] = useState<Socket | null>(null);
  const [, setBattle] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [progress, setProgress] = useState<BattleProgress | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10分钟
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [battleStatus, setBattleStatus] = useState<'waiting' | 'in_progress' | 'completed'>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);

  const currentUserId = useAppSelector((state) => state.workspace.profile?.id);

  useEffect(() => {
    // 初始化Socket连接
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001');
    setSocket(newSocket);

    // 加入对战房间
    newSocket.emit('join-battle', battleId);

    // 监听对战事件
    newSocket.on('battle_started', handleBattleStarted);
    newSocket.on('progress_update', handleProgressUpdate);
    newSocket.on('battle_finished', handleBattleFinished);

    // 获取对战信息
    fetchBattleInfo();

    return () => {
      newSocket.emit('leave-battle', battleId);
      newSocket.disconnect();
    };
  }, [battleId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (battleStatus === 'in_progress' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // 时间到，自动提交当前答案
            if (selectedAnswer) {
              submitAnswer();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [battleStatus, timeLeft, selectedAnswer]);

  const fetchBattleInfo = async () => {
    try {
      const response = await fetch(`/api/pk/battle/${battleId}`, {

      });

      if (response.ok) {
        const data = await response.json();
        setBattle(data.data);
        setBattleStatus(data.data.status);
        
        if (data.data.status === 'waiting') {
          // 开始对战
          startBattle();
        }
      } else {
        throw new Error('Failed to fetch battle info');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const startBattle = async () => {
    try {
      const response = await fetch(`/api/pk/battle/${battleId}/start`, {
        method: 'POST',

      });

      if (!response.ok) {
        throw new Error('Failed to start battle');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleBattleStarted = (data: any) => {
    setBattle(data.battle);
    setQuestions(data.practiceGroup.questions);
    setBattleStatus('in_progress');
    setTimeLeft(600); // 重置计时器
  };

  const handleProgressUpdate = (progressData: BattleProgress) => {
    setProgress(progressData);
  };

  const handleBattleFinished = (data: any) => {
    setBattleStatus('completed');
    setBattleResult(data);
    setShowResult(true);
  };

  const submitAnswer = async () => {
    if (!selectedAnswer || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/pk/battle/${battleId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: questions[currentQuestionIndex].id,
          answer: selectedAnswer,
        }),
      });

      if (response.ok) {
        // 移动到下一题
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedAnswer('');
        }
      } else {
        throw new Error('Failed to submit answer');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMyProgress = () => {
    if (!progress || !currentUserId) return null;
    return progress.player1Progress.userId === currentUserId 
      ? progress.player1Progress 
      : progress.player2Progress;
  };

  const getOpponentProgress = () => {
    if (!progress || !currentUserId) return null;
    return progress.player1Progress.userId === currentUserId 
      ? progress.player2Progress 
      : progress.player1Progress;
  };

  const handleCloseResult = () => {
    setShowResult(false);
    onBattleEnd(battleResult);
  };

  if (battleStatus === 'waiting') {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" gutterBottom>
          正在准备对战...
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
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

  const currentQuestion = questions[currentQuestionIndex];
  const myProgress = getMyProgress();
  const opponentProgress = getOpponentProgress();

  return (
    <Box>
      {/* 对战状态栏 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                我的进度
              </Typography>
              <Typography variant="h6">
                {myProgress?.correctAnswers || 0}/{questions.length}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Chip 
                icon={<Timer />} 
                label={formatTime(timeLeft)} 
                color={timeLeft < 60 ? 'error' : 'primary'}
                size="medium"
              />
            </Box>
          </Grid>
          
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                对手进度
              </Typography>
              <Typography variant="h6">
                {opponentProgress?.correctAnswers || 0}/{questions.length}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 题目区域 */}
      {currentQuestion && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              题目 {currentQuestionIndex + 1}/{questions.length}
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              {currentQuestion.content}
            </Typography>

            <Grid container spacing={2}>
              {currentQuestion.options.map((option, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Button
                    variant={selectedAnswer === option ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => setSelectedAnswer(option)}
                    sx={{ py: 2, textAlign: 'left' }}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </Button>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={submitAnswer}
                disabled={!selectedAnswer || isSubmitting}
                sx={{ minWidth: 200 }}
              >
                {isSubmitting ? '提交中...' : '提交答案'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 对战结果对话框 */}
      <Dialog 
        open={showResult} 
        onClose={handleCloseResult}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <EmojiEvents sx={{ fontSize: 48, color: 'gold', mb: 1 }} />
          <Typography variant="h5">
            对战结束
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {battleResult && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                {battleResult.battle.winnerId === currentUserId 
                  ? '🎉 恭喜获胜！' 
                  : battleResult.battle.winnerId 
                    ? '😔 很遗憾败北' 
                    : '🤝 平局'
                }
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      我的得分
                    </Typography>
                    <Typography variant="h4">
                      {myProgress?.correctAnswers || 0}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      对手得分
                    </Typography>
                    <Typography variant="h4">
                      {opponentProgress?.correctAnswers || 0}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {battleResult.rewards && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    奖励结算:
                  </Typography>
                  <Typography variant="body2">
                    Credits奖励: +{battleResult.rewards.winnerReward || 0}
                  </Typography>
                  <Typography variant="body2">
                    MMR变化: {battleResult.rewards.player1MMRChange > 0 ? '+' : ''}{battleResult.rewards.player1MMRChange}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseResult} variant="contained" fullWidth>
            返回竞技场
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PKBattleInterface;