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
  LinearProgress
} from '@mui/material';
import SecurityUtils from '../../utils/security';
import api from '../../services/api';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Replay as RetryIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface FailedTask {
  id: string;
  user_id: string;
  type: string;
  priority: number;
  created_at: string;
  started_at: string;
  completed_at: string;
  error_message: string;
  retry_count: number;
  context: any;
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
  const [failedTasks, setFailedTasks] = useState<FailedTask[]>([]);
  const [totalFailedTasks, setTotalFailedTasks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDays, setClearDays] = useState(7);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeFailed, setIncludeFailed] = useState(false);
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
  }, [currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = SecurityUtils.getSecureItem<string>('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch queue metrics and failed tasks in parallel
      const [metricsRes, failedTasksRes] = await Promise.all([
        api.get('/admin/queue-metrics'),
        api.get(`/admin/failed-tasks?limit=${tasksPerPage}&offset=${(currentPage - 1) * tasksPerPage}`)
      ]);

      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.data);
      }

      if (failedTasksRes.data.success) {
        setFailedTasks(failedTasksRes.data.data.tasks);
        setTotalFailedTasks(failedTasksRes.data.data.totalCount);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
      showSnackbar('Failed to fetch queue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryTasks = async (taskIds: string[]) => {
    try {
      const response = await api.post('/admin/retry-failed-tasks', { taskIds });

      if (response.data.success) {
        showSnackbar(`Successfully retried ${response.data.data.retriedTasks} tasks`, 'success');
        setSelectedTasks([]);
        fetchData();
      } else {
        showSnackbar(response.data.message || 'Failed to retry tasks', 'error');
      }
    } catch (error) {
      console.error('Failed to retry tasks:', error);
      showSnackbar('Failed to retry tasks', 'error');
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

  const handleTaskSelection = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(failedTasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
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
        <Typography variant="h5" gutterBottom>Task Queue Management</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Task Queue Management
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
            Clear Queue
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

      {/* Failed Tasks */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Failed Tasks</Typography>
          {selectedTasks.length > 0 && (
            <Button
              variant="contained"
              startIcon={<RetryIcon />}
              onClick={() => handleRetryTasks(selectedTasks)}
            >
              Retry Selected ({selectedTasks.length})
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={failedTasks && selectedTasks.length === failedTasks.length && failedTasks.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Task ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Retry Count</TableCell>
                <TableCell>Error</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {failedTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {task.id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={task.type} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {task.user_id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(task.created_at)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={task.retry_count} 
                      size="small" 
                      color={task.retry_count >= 3 ? 'error' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={task.error_message}
                    >
                      {task.error_message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      onClick={() => handleRetryTasks([task.id])} 
                      size="small"
                      disabled={task.retry_count >= 3}
                    >
                      <RetryIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalFailedTasks > tasksPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(totalFailedTasks / tasksPerPage)}
              page={currentPage}
              onChange={(event, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        )}
      </Box>

      {/* Clear Queue Dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Clear Task Queue</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Clear tasks older than (days)"
              type="number"
              value={clearDays}
              onChange={(e) => setClearDays(parseInt(e.target.value) || 7)}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={includeCompleted}
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                />
              }
              label="Include completed tasks"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={includeFailed}
                  onChange={(e) => setIncludeFailed(e.target.checked)}
                />
              }
              label="Include failed tasks"
            />
            <Alert severity="warning">
              This action cannot be undone. Tasks will be permanently deleted from the queue.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearQueue} variant="contained" color="error">
            Clear Queue
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