import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Refresh,
  Warning,
  Error as ErrorIcon,
  Info,
  CheckCircle,
  Memory,
  Speed,
  Storage,
  NetworkCheck,
  Timeline,
  Delete,
  Settings
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../../services/api';
import ErrorHandler from '../../utils/errorHandler';
import PerformanceUtils from '../../utils/performance';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    memory: ServiceStatus;
    cpu: ServiceStatus;
  };
  metrics: {
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    errorRate: number;
  };
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  lastCheck: string;
  responseTime?: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: any;
}

const parseSystemHealth = (response: any): SystemHealth => {
  if (!response?.data?.success || !response?.data?.data) {
    throw new Error('Invalid /monitoring/health response');
  }

  const health = response.data.data;
  const requiredServices = ['database', 'redis', 'memory', 'cpu'];
  const hasAllServices = requiredServices.every((name) => health?.services?.[name]);
  const hasMetrics = health?.metrics
    && typeof health.metrics.activeConnections === 'number'
    && typeof health.metrics.memoryUsage === 'number'
    && typeof health.metrics.cpuUsage === 'number'
    && typeof health.metrics.responseTime === 'number'
    && typeof health.metrics.errorRate === 'number';

  if (!hasAllServices || !hasMetrics) {
    throw new Error('Malformed monitoring health payload');
  }

  return health as SystemHealth;
};

const parseAlerts = (response: any): Alert[] => {
  if (!response?.data?.success || !Array.isArray(response?.data?.data)) {
    throw new Error('Invalid /monitoring/alerts response');
  }

  return response.data.data as Alert[];
};

const SystemMonitoring: React.FC = () => {
  const theme = useTheme();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadSystemData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadSystemData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadSystemData = async () => {
    try {
      const [healthResponse, alertsResponse] = await Promise.all([
        api.get('/monitoring/health'),
        api.get('/monitoring/alerts?limit=50')
      ]);

      const parsedHealth = parseSystemHealth(healthResponse);
      const parsedAlerts = parseAlerts(alertsResponse);

      setHealth(parsedHealth);
      setAlerts(parsedAlerts);
    } catch (error) {
      ErrorHandler.handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadSystemData();
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await api.patch(`/monitoring/alerts/${alertId}/resolve`);
      if (response.data.success) {
        ErrorHandler.showSuccess('Alert resolved successfully');
        loadSystemData();
      }
    } catch (error) {
      ErrorHandler.handleApiError(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return theme.palette.success.main;
      case 'degraded': return theme.palette.warning.main;
      case 'critical': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'degraded': return <Warning sx={{ color: theme.palette.warning.main }} />;
      case 'critical': return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      default: return <Info sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (loading && !health) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          System Monitoring
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={autoRefresh ? <Timeline /> : <Refresh />}
            onClick={() => setAutoRefresh(!autoRefresh)}
            color={autoRefresh ? 'primary' : 'inherit'}
          >
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* System Status Overview */}
      {health && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {getStatusIcon(health.status)}
              <Typography variant="h6">
                System Status: {health.status.toUpperCase()}
              </Typography>
              <Chip 
                label={`Uptime: ${formatUptime(health.uptime)}`}
                color="info"
                variant="outlined"
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Memory sx={{ fontSize: 40, color: getStatusColor(health.services.memory.status) }} />
                  <Typography variant="h6">Memory</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {health.metrics.memoryUsage.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={health.metrics.memoryUsage} 
                    sx={{ mt: 1 }}
                    color={health.metrics.memoryUsage > 80 ? 'error' : 'primary'}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Speed sx={{ fontSize: 40, color: getStatusColor(health.services.cpu.status) }} />
                  <Typography variant="h6">CPU</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {health.metrics.cpuUsage.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={health.metrics.cpuUsage} 
                    sx={{ mt: 1 }}
                    color={health.metrics.cpuUsage > 80 ? 'error' : 'primary'}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Storage sx={{ fontSize: 40, color: getStatusColor(health.services.database.status) }} />
                  <Typography variant="h6">Database</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {health.metrics.activeConnections} connections
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {health.services.database.responseTime}ms
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <NetworkCheck sx={{ fontSize: 40, color: getStatusColor(health.services.redis.status) }} />
                  <Typography variant="h6">Redis</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {health.services.redis.responseTime}ms
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {health.metrics.errorRate.toFixed(1)}% errors
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Alerts" />
          <Tab label="Services" />
          <Tab label="Performance" />
        </Tabs>
      </Box>

      {/* Alerts Tab */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            
            {alerts.length === 0 ? (
              <Alert severity="success">No alerts found</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Chip
                            icon={alert.type === 'error' ? <ErrorIcon /> : alert.type === 'warning' ? <Warning /> : <Info />}
                            label={alert.type}
                            color={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{alert.service}</TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>
                          {new Date(alert.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alert.resolved ? 'Resolved' : 'Active'}
                            color={alert.resolved ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {!alert.resolved && (
                            <Button
                              size="small"
                              onClick={() => handleResolveAlert(alert.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Services Tab */}
      {tabValue === 1 && health && (
        <Grid container spacing={3}>
          {Object.entries(health.services).map(([serviceName, service]) => (
            <Grid item xs={12} md={6} key={serviceName}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    {getStatusIcon(service.status)}
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {serviceName}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {service.message}
                  </Typography>
                  
                  <Typography variant="caption" display="block">
                    Last Check: {new Date(service.lastCheck).toLocaleString()}
                  </Typography>
                  
                  {service.responseTime && (
                    <Typography variant="caption" display="block">
                      Response Time: {service.responseTime}ms
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Performance Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Frontend Performance
                </Typography>
                <Box>
                  {(() => {
                    const report = PerformanceUtils.getPerformanceReport();
                    return (
                      <Box>
                        <Typography variant="body2">
                          Page Load: {report.pageLoad.loadComplete.toFixed(2)}ms
                        </Typography>
                        <Typography variant="body2">
                          DOM Ready: {report.pageLoad.domContentLoaded.toFixed(2)}ms
                        </Typography>
                        {report.memory && (
                          <Typography variant="body2">
                            Memory Usage: {report.memory.used}MB / {report.memory.total}MB ({report.memory.percentage}%)
                          </Typography>
                        )}
                        <Typography variant="body2">
                          Slow Operations: {report.slowOperations.length}
                        </Typography>
                      </Box>
                    );
                  })()}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Backend Performance
                </Typography>
                {health && (
                  <Box>
                    <Typography variant="body2">
                      Response Time: {health.metrics.responseTime}ms
                    </Typography>
                    <Typography variant="body2">
                      Error Rate: {health.metrics.errorRate.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2">
                      Active Connections: {health.metrics.activeConnections}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SystemMonitoring;