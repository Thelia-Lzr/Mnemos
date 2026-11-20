import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Pagination,
  Grid,
  FormControlLabel,
  Switch,
  LinearProgress,
  MenuItem
} from '@mui/material';
import api from '../../services/api';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface Task {
  id: string;
  user_id: string;
  type: string;
  status: string;
  priority: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress: number;
  execution_time?: number;
  tokens_used?: number;
  error_message?: string;
}

interface QueueMetrics {
  totalTasks: number;
  queuedTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
  resourceUtilization: number;
  errorRate: number;
  statusBreakdown: Record<string, number>;
}

const TaskQueueManager: React.FC = () => {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDays, setClearDays] = useState(7);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const tasksPerPage = 20;

  useEffect(() => {
    fetchData();
  }, [currentPage, statusFilter, typeFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        limit: tasksPerPage.toString(),
        offset: ((currentPage - 1) * tasksPerPage).toString()
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      // Fetch queue metrics and tasks in parallel
      const [metricsRes, tasksRes] = await Promise.all([
        api.get('/admin/queue-metrics'),
        api.get(`/admin/tasks?${params.toString()}`)
      ]);

      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.data);
      }

      if (tasksRes.data.success) {
        setTasks(tasksRes.data.data.tasks);
        setTotalTasks(tasksRes.data.data.totalCount);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
      showSnackbar('Failed to fetch queue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearQueue = async () => {
    try {
      const response = await api.post('/admin/clear-queue', {
        days: clearDays,
        includeCompleted,
        includeFailed
      });

      if (response.data.success) {
        showSnackbar(`Successfully cleared ${response.data.data.deletedTasks} tasks`, 'success');
        setClearDialogOpen(false);
        fetchData();
      } else {
        showSnackbar(response.data.message || 'Failed to clear queue', 'error');
      }
    } catch (error) {
      console.error('Failed to clear queue:', error);
      showSnackbar('Failed to clear queue', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'error';
      case 'queued': return 'info';
      default: return 'default';
    }
  };

  if (loading && !metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>任务队列管理</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h5" component="h2">
          任务队列管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={() => setClearDialogOpen(true)}
          >
            清理记录
          </Button>
        </Box>
      </Box>

      {/* Queue Metrics */}
      {metrics && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Queue Metrics (Last 24 Hours)</Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    {metrics.totalTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Tasks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main">
                    {metrics.queuedTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Queued
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="info.main">
                    {metrics.processingTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Processing
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">
                    {metrics.completedTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="error.main">
                    {metrics.failedTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color={metrics.errorRate > 5 ? 'error.main' : 'success.main'}>
                    {metrics.errorRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Error Rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Average Processing Time: {metrics.averageProcessingTime.toFixed(2)}s
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Throughput: {metrics.throughputPerMinute.toFixed(1)} tasks/min
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Status Breakdown</Typography>
                  {Object.entries(metrics.statusBreakdown).map(([status, count]) => (
                    <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip 
                        label={status} 
                        size="small" 
                        color={getStatusColor(status) as any}
                      />
                      <Typography variant="body2">{count}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Task Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Type Filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="practice_generation">Practice Generation</MenuItem>
              <MenuItem value="chat_response">Chat Response</MenuItem>
              <MenuItem value="material_analysis">Material Analysis</MenuItem>
              <MenuItem value="level_assessment">Level Assessment</MenuItem>
              <MenuItem value="daily_recommendation">Daily Recommendation</MenuItem>
              <MenuItem value="vocabulary_extraction">Vocabulary Extraction</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* All Tasks */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Tasks ({statusFilter !== 'all' ? statusFilter : 'all'})
          </Typography>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Task ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Execution Time</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!tasks.length && <TableRow><TableCell colSpan={8}>暂无任务记录</TableCell></TableRow>}
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {task.id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={task.status} 
                      size="small" 
                      color={getStatusColor(task.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={task.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {task.user_id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(task.created_at)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={task.progress} 
                        sx={{ width: 60, height: 6 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 35 }}>
                        {task.progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {task.execution_time ? `${(task.execution_time / 1000).toFixed(1)}s` : '-'}
                  </TableCell>
                  <TableCell>
                    {task.error_message ? (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 200, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'error.main'
                        }}
                        title={task.error_message}
                      >
                        {task.error_message}
                      </Typography>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalTasks > tasksPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(totalTasks / tasksPerPage)}
              page={currentPage}
              onChange={(event, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        )}
      </Box>

      {/* 清理记录 Dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>清理任务记录</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="保留天数"
              type="number"
              value={clearDays || ''}
              inputProps={{ min: 1, max: 3650 }}
              onChange={(e) => setClearDays(Number(e.target.value))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={includeCompleted}
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                />
              }
              label="已完成任务"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={includeFailed}
                  onChange={(e) => setIncludeFailed(e.target.checked)}
                />
              }
              label="失败任务"
            />
            <Alert severity="warning">
              符合保留期和状态条件的任务记录将被永久删除。
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearQueue} variant="contained" color="error" disabled={!Number.isInteger(clearDays) || clearDays < 1 || clearDays > 3650 || (!includeCompleted && !includeFailed)}>
            清理记录
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskQueueManager;