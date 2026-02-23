import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Button,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import { 
  TrendingUp, 
  School, 
  Book, 
  SportsEsports, 
  AccountBalanceWallet,
  EmojiEvents,
  Timeline,
  Speed,
  Star,
  PlayArrow,
  Visibility,
  Assignment
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import DailyRecommendationCard from '../components/DailyRecommendation/DailyRecommendationCard';
import CreditBalance from '../components/Payment/CreditBalance';
import api from '../services/api';

interface LearningStats {
  totalStudyTime: number;
  streakDays: number;
  completedPractices: number;
  vocabularyMastered: number;
  currentLevel: string;
  overallProgress: number;
}

interface UserCredits {
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'practice' | 'vocabulary' | 'pk' | 'chat';
  title: string;
  description: string;
  timestamp: Date;
  score?: number;
}

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Default to English if no user language is set
  const userLanguage = 'en'; // TODO: Get from user capabilities or preferences

  const quickActions: QuickAction[] = [
    {
      title: 'AI助手聊天',
      description: '与AI助手进行语言学习对话',
      icon: <School />,
      path: '/chat',
      color: theme.palette.primary.main
    },
    {
      title: '开始练习',
      description: '生成个性化练习题目',
      icon: <Assignment />,
      path: '/practice',
      color: theme.palette.success.main
    },
    {
      title: '管理生词表',
      description: '查看和练习生词',
      icon: <Book />,
      path: '/vocabulary',
      color: theme.palette.info.main
    },
    {
      title: 'PK对战',
      description: '与其他用户竞技学习',
      icon: <SportsEsports />,
      path: '/pk',
      color: theme.palette.warning.main
    }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user credits
      try {
        const creditsResponse = await api.get('/payment/credits');
        const creditsData = creditsResponse.data?.data?.credits || creditsResponse.data;

        if (creditsData) {
          setUserCredits({
            currentBalance: creditsData.currentBalance ?? creditsData.balance ?? 0,
            totalEarned: creditsData.totalEarned ?? 0,
            totalSpent: creditsData.totalSpent ?? 0,
          });
        }
      } catch (creditsError) {
        console.error('Failed to fetch user credits:', creditsError);
        // Set default credits if fetch fails
        setUserCredits({
          currentBalance: 0,
          totalEarned: 0,
          totalSpent: 0
        });
      }

      // Fetch learning status
      const learningResponse = await api.get('/users/learning-status');
      if (learningResponse.data.success) {
        const learningData =
          learningResponse.data.learningStatus ||
          learningResponse.data.data?.learningStatus ||
          learningResponse.data.data?.languages ||
          [];

        if (!Array.isArray(learningData) || learningData.length === 0) {
          setLearningStats({
            totalStudyTime: 0,
            streakDays: 0,
            completedPractices: 0,
            vocabularyMastered: 0,
            currentLevel: 'A1',
            overallProgress: 0,
          });
        } else {
        
        // Process learning statistics
        const stats: LearningStats = {
          totalStudyTime: learningData.reduce((total: number, lang: any) => 
            total + (lang.progress?.totalStudyTime || 0), 0),
          streakDays: Math.max(...learningData.map((lang: any) => 
            lang.progress?.streakDays || 0)),
          completedPractices: learningData.reduce((total: number, lang: any) => 
            total + (lang.progress?.completedPractices || 0), 0),
          vocabularyMastered: learningData.reduce((total: number, lang: any) => 
            total + (lang.capability?.vocabularyCapability?.masteredWordsCount || 0), 0),
          currentLevel: learningData[0]?.capability?.currentLevel || 'A1',
          overallProgress: learningData[0]?.capability?.confidenceScore || 0
        };
        
        setLearningStats(stats);
        }
      }

      // Fetch recent activities (mock data for now)
      const mockActivities: RecentActivity[] = [
        {
          id: '1',
          type: 'practice',
          title: '完成语法练习',
          description: '完成了10道语法选择题',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          score: 85
        },
        {
          id: '2',
          type: 'vocabulary',
          title: '学习新单词',
          description: '添加了15个新单词到生词表',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
        },
        {
          id: '3',
          type: 'chat',
          title: 'AI对话练习',
          description: '与AI助手进行了20分钟对话',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ];
      
      setRecentActivities(mockActivities);

    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError('加载仪表板数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'practice': return <Assignment />;
      case 'vocabulary': return <Book />;
      case 'pk': return <SportsEsports />;
      case 'chat': return <School />;
      default: return <Star />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'practice': return theme.palette.success.main;
      case 'vocabulary': return theme.palette.info.main;
      case 'pk': return theme.palette.warning.main;
      case 'chat': return theme.palette.primary.main;
      default: return theme.palette.grey[500];
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 600
          }}
        >
          欢迎回来，{user?.username || '学习者'}！
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          继续您的语言学习之旅
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Daily Recommendation */}
        <Grid item xs={12}>
          <DailyRecommendationCard language={userLanguage} />
        </Grid>

        {/* Credit Balance */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            height: '100%',
            minHeight: { xs: 'auto', md: 200 }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <AccountBalanceWallet sx={{ 
                  mr: { xs: 0, sm: 1 }, 
                  mb: { xs: 1, sm: 0 },
                  color: theme.palette.primary.main 
                }} />
                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Credit余额
                </Typography>
              </Box>
              <CreditBalance 
                balance={userCredits?.currentBalance || 0} 
                loading={loading}
                onRecharge={() => navigate('/recharge')}
              />
              <Button 
                variant="outlined" 
                size="small" 
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => navigate('/recharge')}
              >
                充值Credits
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Learning Statistics */}
        <Grid item xs={12} sm={6} md={8}>
          <Card sx={{ 
            height: '100%',
            minHeight: { xs: 'auto', md: 200 }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <TrendingUp sx={{ 
                  mr: { xs: 0, sm: 1 }, 
                  mb: { xs: 1, sm: 0 },
                  color: theme.palette.success.main 
                }} />
                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  学习统计
                </Typography>
              </Box>
              
              {learningStats ? (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography 
                        variant="h4" 
                        color="primary"
                        sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                      >
                        {learningStats.streakDays}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        连续学习天数
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography 
                        variant="h4" 
                        color="success.main"
                        sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}
                      >
                        {formatTime(learningStats.totalStudyTime)}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        总学习时间
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography 
                        variant="h4" 
                        color="info.main"
                        sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                      >
                        {learningStats.vocabularyMastered}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        掌握单词数
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip 
                        label={learningStats.currentLevel}
                        color="primary"
                        size="small"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mt: 1,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                      >
                        当前水平
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography 
                      variant="body2" 
                      gutterBottom
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      整体进度: {learningStats.overallProgress}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={learningStats.overallProgress} 
                      sx={{ height: { xs: 6, sm: 8 }, borderRadius: 4 }}
                    />
                  </Grid>
                </Grid>
              ) : (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    textAlign: 'center',
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  暂无学习数据，开始您的第一次学习吧！
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              mt: 2,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            快捷操作
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
            {quickActions.map((action, index) => (
              <Grid item xs={6} sm={6} md={3} key={index}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4]
                    }
                  }}
                  onClick={() => navigate(action.path)}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: { xs: 2, sm: 3 },
                    px: { xs: 1, sm: 2 },
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: alpha(action.color, 0.1),
                        color: action.color,
                        width: { xs: 40, sm: 56 },
                        height: { xs: 40, sm: 56 },
                        mx: 'auto',
                        mb: { xs: 1, sm: 2 }
                      }}
                    >
                      {action.icon}
                    </Avatar>
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                        lineHeight: 1.2
                      }}
                    >
                      {action.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: { xs: 'none', sm: 'block' }
                      }}
                    >
                      {action.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ 
                    justifyContent: 'center', 
                    pb: { xs: 1, sm: 2 },
                    pt: 0
                  }}>
                    <Button 
                      size="small" 
                      startIcon={<PlayArrow />}
                      sx={{ 
                        color: action.color,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      开始
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            minHeight: { xs: 300, md: 400 }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <Timeline sx={{ 
                  mr: { xs: 0, sm: 1 }, 
                  mb: { xs: 1, sm: 0 },
                  color: theme.palette.info.main 
                }} />
                <Typography 
                  variant="h6"
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  最近活动
                </Typography>
              </Box>
              
              {recentActivities.length > 0 ? (
                <List dense sx={{ width: '100%' }}>
                  {recentActivities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem sx={{ px: { xs: 0, sm: 2 } }}>
                        <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: alpha(getActivityColor(activity.type), 0.1),
                              color: getActivityColor(activity.type),
                              width: { xs: 28, sm: 32 },
                              height: { xs: 28, sm: 32 }
                            }}
                          >
                            {getActivityIcon(activity.type)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 500
                              }}
                            >
                              {activity.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                              >
                                {activity.description}
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1, 
                                mt: 0.5,
                                flexWrap: 'wrap'
                              }}>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                >
                                  {activity.timestamp.toLocaleString('zh-CN')}
                                </Typography>
                                {activity.score && (
                                  <Chip 
                                    label={`${activity.score}分`}
                                    size="small"
                                    color="success"
                                    sx={{ 
                                      height: { xs: 16, sm: 20 },
                                      fontSize: { xs: '0.6rem', sm: '0.75rem' }
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recentActivities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    textAlign: 'center',
                    py: 4,
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  暂无最近活动
                </Typography>
              )}
              
              <Button 
                size="small" 
                startIcon={<Visibility />}
                sx={{ 
                  mt: 2,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
                onClick={() => navigate('/profile')}
                fullWidth
              >
                查看全部活动
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Achievement Highlights */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            minHeight: { xs: 300, md: 400 }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <EmojiEvents sx={{ 
                  mr: { xs: 0, sm: 1 }, 
                  mb: { xs: 1, sm: 0 },
                  color: theme.palette.warning.main 
                }} />
                <Typography 
                  variant="h6"
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  成就亮点
                </Typography>
              </Box>
              
              <List dense sx={{ width: '100%' }}>
                <ListItem sx={{ px: { xs: 0, sm: 2 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                    <Speed sx={{ 
                      color: theme.palette.success.main,
                      fontSize: { xs: 20, sm: 24 }
                    }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          fontWeight: 500
                        }}
                      >
                        学习连击
                      </Typography>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        连续学习 {learningStats?.streakDays || 0} 天
                      </Typography>
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem sx={{ px: { xs: 0, sm: 2 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                    <Book sx={{ 
                      color: theme.palette.info.main,
                      fontSize: { xs: 20, sm: 24 }
                    }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          fontWeight: 500
                        }}
                      >
                        词汇大师
                      </Typography>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        已掌握 {learningStats?.vocabularyMastered || 0} 个单词
                      </Typography>
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem sx={{ px: { xs: 0, sm: 2 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                    <Assignment sx={{ 
                      color: theme.palette.primary.main,
                      fontSize: { xs: 20, sm: 24 }
                    }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          fontWeight: 500
                        }}
                      >
                        练习达人
                      </Typography>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        完成 {learningStats?.completedPractices || 0} 次练习
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
              
              <Button 
                size="small" 
                startIcon={<EmojiEvents />}
                sx={{ 
                  mt: 2,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
                onClick={() => navigate('/profile')}
                fullWidth
              >
                查看所有成就
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;