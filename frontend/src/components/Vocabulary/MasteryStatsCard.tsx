import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { MasteryStats } from '../../services/vocabularyApi';

interface MasteryStatsCardProps {
  stats: MasteryStats;
  language: string;
}

const MasteryStatsCard: React.FC<MasteryStatsCardProps> = ({ stats, language }) => {
  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'en': return '英语';
      case 'ja': return '日语';
      case 'fr': return '法语';
      default: return lang.toUpperCase();
    }
  };

  const getMasteryDistribution = () => {
    if (stats.totalWords === 0) return [];
    
    return [
      { label: '新词', count: stats.newWords, color: '#9e9e9e', percentage: (stats.newWords / stats.totalWords) * 100 },
      { label: '学习中', count: stats.learningWords, color: '#ff9800', percentage: (stats.learningWords / stats.totalWords) * 100 },
      { label: '短期记忆', count: stats.shortTermWords, color: '#2196f3', percentage: (stats.shortTermWords / stats.totalWords) * 100 },
      { label: '长期记忆', count: stats.longTermWords, color: '#3f51b5', percentage: (stats.longTermWords / stats.totalWords) * 100 },
      { label: '已掌握', count: stats.masteredWords, color: '#4caf50', percentage: (stats.masteredWords / stats.totalWords) * 100 },
    ];
  };

  const distribution = getMasteryDistribution();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <StarIcon color="primary" />
          <Typography variant="h6">
            {getLanguageLabel(language)} 词汇掌握统计
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* 总体统计 */}
          <Grid item xs={12} md={4}>
            <Box textAlign="center" p={2} bgcolor="primary.50" borderRadius={2}>
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {stats.totalWords}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总词汇量
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box textAlign="center" p={2} bgcolor="success.50" borderRadius={2}>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {Math.round(stats.averageMasteryScore)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均掌握度
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box textAlign="center" p={2} bgcolor="warning.50" borderRadius={2}>
              <Typography variant="h3" color="warning.main" fontWeight="bold">
                {stats.wordsNeedingReview}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                待复习词汇
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* 掌握程度分布 */}
        <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
          <TrendingUpIcon />
          掌握程度分布
        </Typography>

        <Box mb={3}>
          {distribution.map((item, index) => (
            <Box key={index} mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box 
                    width={12} 
                    height={12} 
                    borderRadius="50%" 
                    bgcolor={item.color}
                  />
                  <Typography variant="body2">
                    {item.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {item.count} 词 ({item.percentage.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: item.color,
                  }
                }}
              />
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* 学习建议 */}
        <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
          <ScheduleIcon />
          学习建议
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1}>
          <Chip 
            label={`每日复习目标: ${stats.dailyReviewTarget} 词`}
            color="primary"
            variant="outlined"
          />
          
          {stats.wordsNeedingReview > 0 && (
            <Chip 
              label={`${stats.wordsNeedingReview} 词需要复习`}
              color="warning"
              variant="outlined"
            />
          )}
          
          {stats.newWords > 10 && (
            <Chip 
              label="建议先复习已学词汇"
              color="info"
              variant="outlined"
            />
          )}
          
          {stats.masteredWords > stats.totalWords * 0.7 && (
            <Chip 
              label="掌握程度良好！"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MasteryStatsCard;