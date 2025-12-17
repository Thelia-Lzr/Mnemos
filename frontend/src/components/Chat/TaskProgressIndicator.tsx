import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { TaskProgress } from '../../store/slices/chatSlice';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TaskProgressIndicatorProps {
  task: TaskProgress;
  onCancel?: (taskId: string) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

const TaskProgressIndicator: React.FC<TaskProgressIndicatorProps> = ({
  task,
  onCancel,
  expanded = false,
  onToggleExpanded,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <ScheduleIcon />;
      case 'processing':
        return <PlayArrowIcon />;
      case 'completed':
        return <CheckCircleIcon />;
      case 'failed':
      case 'cancelled':
      case 'timeout':
        return <ErrorIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'default';
      case 'processing':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
      case 'timeout':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'queued':
        return '排队中';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      case 'timeout':
        return '超时';
      default:
        return status;
    }
  };

  const formatEstimatedTime = (estimatedCompletion?: Date) => {
    if (!estimatedCompletion) return null;
    
    try {
      return formatDistanceToNow(new Date(estimatedCompletion), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch {
      return null;
    }
  };

  const isActive = task.status === 'queued' || task.status === 'processing';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed' || task.status === 'cancelled' || task.status === 'timeout';

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 1,
        borderRadius: 2,
        backgroundColor: isCompleted ? 'success.light' : isFailed ? 'error.light' : 'background.paper',
        opacity: isCompleted ? 0.8 : 1,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={getStatusIcon(task.status)}
            label={getStatusText(task.status)}
            color={getStatusColor(task.status)}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            任务 ID: {task.taskId.slice(0, 8)}...
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Cancel button for active tasks */}
          {isActive && onCancel && (
            <IconButton
              size="small"
              onClick={() => onCancel(task.taskId)}
              color="error"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          )}

          {/* Expand button */}
          {onToggleExpanded && (
            <IconButton size="small" onClick={onToggleExpanded}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Progress bar for active tasks */}
      {isActive && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant={task.progress > 0 ? 'determinate' : 'indeterminate'}
            value={task.progress}
            sx={{ borderRadius: 1, height: 6 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {task.progress > 0 ? `${task.progress}%` : '处理中...'}
            </Typography>
            {task.estimatedCompletion && (
              <Typography variant="caption" color="text.secondary">
                预计完成: {formatEstimatedTime(task.estimatedCompletion)}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Error message for failed tasks */}
      {isFailed && task.error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {task.error}
        </Alert>
      )}

      {/* Expanded details */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 1, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" display="block">
            <strong>任务ID:</strong> {task.taskId}
          </Typography>
          <Typography variant="caption" display="block">
            <strong>状态:</strong> {getStatusText(task.status)}
          </Typography>
          <Typography variant="caption" display="block">
            <strong>进度:</strong> {task.progress}%
          </Typography>
          {task.estimatedCompletion && (
            <Typography variant="caption" display="block">
              <strong>预计完成时间:</strong> {formatEstimatedTime(task.estimatedCompletion)}
            </Typography>
          )}
          {task.error && (
            <Typography variant="caption" display="block" color="error">
              <strong>错误:</strong> {task.error}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default TaskProgressIndicator;