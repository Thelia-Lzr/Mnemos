import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  LinearProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  VolumeUp as VolumeUpIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { VocabularyWord } from '../../services/vocabularyApi';

interface VocabularyWordCardProps {
  word: VocabularyWord;
  onRemove: (wordId: string) => void;
  onPractice: (wordId: string) => void;
}

const VocabularyWordCard: React.FC<VocabularyWordCardProps> = ({
  word,
  onRemove,
  onPractice,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRemove = () => {
    onRemove(word.id);
    handleMenuClose();
  };

  const handlePractice = () => {
    onPractice(word.id);
    handleMenuClose();
  };

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'new': return 'default';
      case 'learning': return 'warning';
      case 'short_term': return 'info';
      case 'long_term': return 'primary';
      case 'mastered': return 'success';
      default: return 'default';
    }
  };

  const getMasteryLabel = (level: string) => {
    switch (level) {
      case 'new': return '新词';
      case 'learning': return '学习中';
      case 'short_term': return '短期记忆';
      case 'long_term': return '长期记忆';
      case 'mastered': return '已掌握';
      default: return level;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const isReviewDue = () => {
    if (!word.nextReviewAt) return false;
    return new Date(word.nextReviewAt) <= new Date();
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        border: isReviewDue() ? '2px solid #ff9800' : 'none',
        '&:hover': { 
          boxShadow: 3,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6" component="h3">
                {word.word}
              </Typography>
              {word.pronunciation && (
                <Tooltip title="发音">
                  <IconButton size="small" onClick={() => {
                    // In production, this would use text-to-speech API
                    console.log('Play pronunciation:', word.pronunciation);
                  }}>
                    <VolumeUpIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {isReviewDue() && (
                <Tooltip title="需要复习">
                  <ScheduleIcon color="warning" fontSize="small" />
                </Tooltip>
              )}
            </Box>
            
            <Typography variant="body2" color="text.secondary" mb={1}>
              {word.definition || '暂无定义'}
            </Typography>
            
            {word.partOfSpeech && (
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                词性: {word.partOfSpeech}
              </Typography>
            )}
          </Box>
          
          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Chip 
            label={getMasteryLabel(word.masteryLevel)} 
            color={getMasteryColor(word.masteryLevel) as any}
            size="small"
          />
          <Typography variant="caption" color="text.secondary">
            难度: {word.difficulty}/10
          </Typography>
        </Box>

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="caption" color="text.secondary">
              掌握程度
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {word.masteryScore}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={word.masteryScore} 
            sx={{ 
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              }
            }}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            添加时间: {formatDate(word.addedAt)}
          </Typography>
          {word.nextReviewAt && (
            <Typography variant="caption" color={isReviewDue() ? 'warning.main' : 'text.secondary'}>
              下次复习: {formatDate(word.nextReviewAt)}
            </Typography>
          )}
        </Box>

        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            复习次数: {word.forgettingCurveParams.reviewCount} | 
            上次得分: {word.forgettingCurveParams.lastReviewScore}%
          </Typography>
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handlePractice}>
          练习此词
        </MenuItem>
        <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default VocabularyWordCard;