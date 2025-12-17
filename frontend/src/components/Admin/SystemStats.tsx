import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Api as ApiIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import SecurityUtils from '../../utils/security';
import api from '../../services/api';

interface RevenueStats {
  totalRevenue: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  packageSales: Array<{
    packageId: string;
    packageName: string;
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByLanguage: Record<string, number>;
  usersByLevel: Record<string, number>;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
}

interface UsageStats {
  totalApiCalls: number;
  apiCallsByFeature: Record<string, number>;
  dailyUsageTrend: Array<{
    date: string;
    api_calls: number;
    active_users: number;
  }>;
  featureUsageDistribution: Array<{
    type: string;
    usage_count: number;
    total_credits_consumed: number;
  }>;
  periodDays: number;
}

interface CreditStats {
  totalCreditsRemaining: number;
  totalCreditsIssued: number;
  totalCreditsConsumed: number;
  averageCreditsPerUser: number;
  totalUsersWithCredits: number;
  consumptionByFeature: Record<string, number>;
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

const SystemStats: React.FC = () => {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [creditStats, setCreditStats] = useState<CreditStats | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState(30);
  const [usagePeriod, setUsagePeriod] = useState(30);

  useEffect(() => {
    fetchAllStats();
  }, [revenuePeriod, usagePeriod]);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all statistics in parallel using the configured axios instance
      const [revenueRes, userRes, usageRes, creditRes, queueRes] = await Promise.all([
        api.get(`/admin/revenue-stats?days=${revenuePeriod}`),
        api.get('/admin/user-stats'),
        api.get(`/admin/usage-stats?days=${usagePeriod}`),
        api.get('/admin/credit-statistics'),
        api.get('/admin/queue-metrics')
      ]);

      if (revenueRes.data.success) {
        setRevenueStats(revenueRes.data.data);
      }

      if (userRes.data.success) {
        setUserStats(userRes.data.data);
      }

      if (usageRes.data.success) {
        setUsageStats(usageRes.data.data);
      }

      if (creditRes.data.success) {
        setCreditStats(creditRes.data.data);
      }

      if (queueRes.data.success) {
        setQueueMetrics(queueRes.data.data);
      }

    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      setError('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  }> = ({ title, value, subtitle, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: `${color}.main`, mr: 1 }}>{icon}</Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" sx={{ mb: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>System Statistics</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        System Statistics Dashboard
      </Typography>

      {/* Revenue Statistics */}
      {revenueStats && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Revenue Statistics</Typography>
            <FormControl size="small">
              <InputLabel>Period</InputLabel>
              <Select
                value={revenuePeriod}
                label="Period"
                onChange={(e) => setRevenuePeriod(Number(e.target.value))}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Revenue"
                value={formatCurrency(revenueStats.totalRevenue)}
                icon={<MoneyIcon />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Daily Revenue"
                value={formatCurrency(revenueStats.dailyRevenue)}
                subtitle="Today"
                icon={<TrendingUpIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Weekly Revenue"
                value={formatCurrency(revenueStats.weeklyRevenue)}
                subtitle="This week"
                icon={<TrendingUpIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Monthly Revenue"
                value={formatCurrency(revenueStats.monthlyRevenue)}
                subtitle="This month"
                icon={<TrendingUpIcon />}
                color="primary"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* User Statistics */}
      {userStats && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>User Statistics</Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Users"
                value={formatNumber(userStats.totalUsers)}
                icon={<PeopleIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Active Users"
                value={formatNumber(userStats.activeUsers)}
                subtitle="Last 30 days"
                icon={<PeopleIcon />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="New Users Today"
                value={formatNumber(userStats.newUsersToday)}
                icon={<PeopleIcon />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="New Users This Month"
                value={formatNumber(userStats.newUsersThisMonth)}
                icon={<PeopleIcon />}
                color="secondary"
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Users by Language</Typography>
                  {Object.entries(userStats.usersByLanguage).map(([language, count]) => (
                    <Box key={language} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{language.toUpperCase()}</Typography>
                        <Typography variant="body2">{count}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(count / userStats.totalUsers) * 100}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Users by Level</Typography>
                  {Object.entries(userStats.usersByLevel).map(([level, count]) => (
                    <Box key={level} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{level}</Typography>
                        <Typography variant="body2">{count}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(count / userStats.totalUsers) * 100}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* API Usage Statistics */}
      {usageStats && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">API Usage Statistics</Typography>
            <FormControl size="small">
              <InputLabel>Period</InputLabel>
              <Select
                value={usagePeriod}
                label="Period"
                onChange={(e) => setUsagePeriod(Number(e.target.value))}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total API Calls"
                value={formatNumber(usageStats.totalApiCalls)}
                icon={<ApiIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Chat Calls"
                value={formatNumber(usageStats.apiCallsByFeature.chat || 0)}
                icon={<ApiIcon />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Practice Calls"
                value={formatNumber(usageStats.apiCallsByFeature.practice || 0)}
                icon={<ApiIcon />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="PK Calls"
                value={formatNumber(usageStats.apiCallsByFeature.pk || 0)}
                icon={<ApiIcon />}
                color="secondary"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Credit Statistics */}
      {creditStats && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Credit Statistics</Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Credits Issued"
                value={formatNumber(creditStats.totalCreditsIssued)}
                icon={<StorageIcon />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Credits Consumed"
                value={formatNumber(creditStats.totalCreditsConsumed)}
                icon={<StorageIcon />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Credits Remaining"
                value={formatNumber(creditStats.totalCreditsRemaining)}
                icon={<StorageIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Avg per User"
                value={Math.round(creditStats.averageCreditsPerUser)}
                icon={<StorageIcon />}
                color="secondary"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Queue Metrics */}
      {queueMetrics && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Task Queue Metrics</Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Tasks"
                value={formatNumber(queueMetrics.totalTasks)}
                subtitle="Last 24 hours"
                icon={<SpeedIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Queued Tasks"
                value={formatNumber(queueMetrics.queuedTasks)}
                icon={<SpeedIcon />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Processing Tasks"
                value={formatNumber(queueMetrics.processingTasks)}
                icon={<SpeedIcon />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Error Rate"
                value={`${queueMetrics.errorRate.toFixed(1)}%`}
                icon={<SpeedIcon />}
                color={queueMetrics.errorRate > 5 ? 'error' : 'success'}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Queue Performance</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Avg Processing Time: {queueMetrics.averageProcessingTime.toFixed(2)}s
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Throughput: {queueMetrics.throughputPerMinute.toFixed(1)} tasks/min
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Task Status Breakdown</Typography>
                  {Object.entries(queueMetrics.statusBreakdown).map(([status, count]) => (
                    <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={status} size="small" />
                      <Typography variant="body2">{count}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Package Sales Performance */}
      {revenueStats && revenueStats.packageSales && revenueStats.packageSales.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Package Sales Performance</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Package Name</TableCell>
                  <TableCell align="right">Total Sales</TableCell>
                  <TableCell align="right">Total Revenue</TableCell>
                  <TableCell align="right">Avg Order Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenueStats.packageSales.map((pkg) => (
                  <TableRow key={pkg.packageId}>
                    <TableCell>{pkg.packageName}</TableCell>
                    <TableCell align="right">{formatNumber(pkg.totalSales)}</TableCell>
                    <TableCell align="right">{formatCurrency(pkg.totalRevenue)}</TableCell>
                    <TableCell align="right">{formatCurrency(pkg.averageOrderValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default SystemStats;