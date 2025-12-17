import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Save as SaveIcon,
  Science as TestIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Api as ApiIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { adminApi } from '../../services/adminApi';

interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  dailyTokenLimit?: number;
  monthlyTokenLimit?: number;
  costThreshold?: number;
  isActive: boolean;
  lastTestedAt?: string;
  testStatus: 'untested' | 'testing' | 'success' | 'failed' | 'expired';
  updatedAt?: string;
  updatedBy?: string;
}

interface TestResult {
  success: boolean;
  responseTime: number;
  availableModels: string[];
  errorMessage?: string;
  connectionTest: {
    success: boolean;
    latency: number;
    error?: string;
  };
  modelTests: Array<{
    model: string;
    success: boolean;
    responseTime: number;
    tokensUsed: number;
    error?: string;
    sampleResponse?: string;
  }>;
  testedAt: string;
}

interface UsageStats {
  daily: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
  };
  weekly: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
  };
  monthly: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
  };
  modelUsage: Record<string, {
    requestCount: number;
    tokenCount: number;
    averageTokensPerRequest: number;
    averageResponseTime: number;
    errorCount: number;
    totalCost: number;
  }>;
  costAnalysis: {
    totalCost: number;
    costByModel: Record<string, number>;
    costByTaskType: Record<string, number>;
    projectedMonthlyCost: number;
    costTrend: Array<{
      date: string;
      cost: number;
      tokens: number;
      requests: number;
    }>;
  };
  performanceMetrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    uptime: number;
    errorRate: number;
    throughput: number;
  };
  generatedAt: string;
}

const OpenRouterConfig: React.FC = () => {
  const [config, setConfig] = useState<OpenRouterConfig>({
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    isActive: true,
    testStatus: 'untested'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    loadConfig();
    loadUsageStats();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getOpenRouterConfig();
      setConfig(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await adminApi.getOpenRouterUsageStats();
      setUsageStats(response.data);
    } catch (err: any) {
      console.error('Failed to load usage stats:', err);
    }
  };

  const handleConfigChange = (field: keyof OpenRouterConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestApiKey = async () => {
    if (!newApiKey.trim()) {
      setError('请输入API密钥');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);

      const response = await adminApi.testOpenRouterKey({ apiKey: newApiKey });
      setTestResult(response.data);
      
      if (response.data.success) {
        setSuccess('API密钥测试成功！');
      } else {
        setError(`API密钥测试失败: ${response.data.errorMessage}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'API密钥测试失败');
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!newApiKey.trim()) {
      setError('请输入API密钥');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const configToSave = {
        ...config,
        apiKey: newApiKey
      };

      const response = await adminApi.updateOpenRouterConfig(configToSave);
      setConfig(response.data);
      setNewApiKey('');
      setSuccess('配置保存成功！');
      
      // Reload usage stats after config update
      setTimeout(() => {
        loadUsageStats();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'testing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckIcon />;
      case 'failed': return <ErrorIcon />;
      case 'testing': return <CircularProgress size={16} />;
      default: return <InfoIcon />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        OpenRouter API 配置管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              API 配置
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API 密钥"
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={config.apiKey ? '输入新的API密钥以更新' : '输入OpenRouter API密钥'}
                  helperText="格式: sk-or-xxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Base URL"
                  value={config.baseUrl}
                  onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="超时时间 (毫秒)"
                  type="number"
                  value={config.timeout}
                  onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                  inputProps={{ min: 1000, max: 120000 }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="最大重试次数"
                  type="number"
                  value={config.maxRetries}
                  onChange={(e) => handleConfigChange('maxRetries', parseInt(e.target.value))}
                  inputProps={{ min: 0, max: 10 }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="重试延迟 (毫秒)"
                  type="number"
                  value={config.retryDelay}
                  onChange={(e) => handleConfigChange('retryDelay', parseInt(e.target.value))}
                  inputProps={{ min: 100, max: 10000 }}
                />
              </Grid>

              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.isActive}
                      onChange={(e) => handleConfigChange('isActive', e.target.checked)}
                    />
                  }
                  label="启用 API"
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="每日Token限制"
                  type="number"
                  value={config.dailyTokenLimit || ''}
                  onChange={(e) => handleConfigChange('dailyTokenLimit', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="可选"
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="每月Token限制"
                  type="number"
                  value={config.monthlyTokenLimit || ''}
                  onChange={(e) => handleConfigChange('monthlyTokenLimit', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="可选"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="成本阈值 (USD)"
                  type="number"
                  value={config.costThreshold || ''}
                  onChange={(e) => handleConfigChange('costThreshold', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="可选"
                  inputProps={{ step: 0.01, min: 0 }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
                onClick={handleTestApiKey}
                disabled={testing || !newApiKey.trim()}
              >
                {testing ? '测试中...' : '测试API密钥'}
              </Button>

              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={handleSaveConfig}
                disabled={saving || !newApiKey.trim()}
              >
                {saving ? '保存中...' : '保存配置'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Status Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              状态信息
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  {getStatusIcon(config.testStatus)}
                </ListItemIcon>
                <ListItemText
                  primary="测试状态"
                  secondary={
                    <Chip
                      label={config.testStatus === 'success' ? '成功' : 
                             config.testStatus === 'failed' ? '失败' :
                             config.testStatus === 'testing' ? '测试中' : '未测试'}
                      color={getStatusColor(config.testStatus) as any}
                      size="small"
                    />
                  }
                />
              </ListItem>

              {config.lastTestedAt && (
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="最后测试时间"
                    secondary={new Date(config.lastTestedAt).toLocaleString('zh-CN')}
                  />
                </ListItem>
              )}

              {config.updatedAt && (
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="最后更新时间"
                    secondary={new Date(config.updatedAt).toLocaleString('zh-CN')}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Test Results */}
        {testResult && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                测试结果
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader
                      avatar={testResult.connectionTest.success ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                      title="连接测试"
                      subheader={`延迟: ${testResult.connectionTest.latency}ms`}
                    />
                    {testResult.connectionTest.error && (
                      <CardContent>
                        <Alert severity="error">
                          {testResult.connectionTest.error}
                        </Alert>
                      </CardContent>
                    )}
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader
                      avatar={<ApiIcon />}
                      title="可用模型"
                      subheader={`${testResult.availableModels.length} 个模型`}
                    />
                    <CardContent>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {testResult.availableModels.slice(0, 5).map((model) => (
                          <Chip key={model} label={model} size="small" />
                        ))}
                        {testResult.availableModels.length > 5 && (
                          <Chip label={`+${testResult.availableModels.length - 5} 更多`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {testResult.modelTests.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      模型测试详情
                    </Typography>
                    {testResult.modelTests.map((test, index) => (
                      <Accordion key={index}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {test.success ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                            <Typography>{test.model}</Typography>
                            <Chip label={`${test.responseTime}ms`} size="small" />
                            <Chip label={`${test.tokensUsed} tokens`} size="small" />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {test.error ? (
                            <Alert severity="error">{test.error}</Alert>
                          ) : (
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                示例响应:
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                                {test.sampleResponse}
                              </Typography>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Usage Statistics */}
        {usageStats && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                使用统计
              </Typography>

              <Grid container spacing={3}>
                {/* Period Stats */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardHeader
                      avatar={<AnalyticsIcon />}
                      title="每日统计"
                    />
                    <CardContent>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="请求数" secondary={usageStats.daily.totalRequests.toLocaleString()} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Token数" secondary={usageStats.daily.totalTokens.toLocaleString()} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="成本" secondary={formatCurrency(usageStats.daily.totalCost)} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="错误率" secondary={`${usageStats.daily.errorRate.toFixed(2)}%`} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardHeader
                      avatar={<AnalyticsIcon />}
                      title="每周统计"
                    />
                    <CardContent>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="请求数" secondary={usageStats.weekly.totalRequests.toLocaleString()} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Token数" secondary={usageStats.weekly.totalTokens.toLocaleString()} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="成本" secondary={formatCurrency(usageStats.weekly.totalCost)} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="错误率" secondary={`${usageStats.weekly.errorRate.toFixed(2)}%`} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardHeader
                      avatar={<AnalyticsIcon />}
                      title="每月统计"
                    />
                    <CardContent>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="请求数" secondary={usageStats.monthly.totalRequests.toLocaleString()} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Token数" secondary={usageStats.monthly.totalTokens.toLocaleString()} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="成本" secondary={formatCurrency(usageStats.monthly.totalCost)} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="错误率" secondary={`${usageStats.monthly.errorRate.toFixed(2)}%`} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Performance Metrics */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader
                      avatar={<SpeedIcon />}
                      title="性能指标"
                    />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">平均响应时间</Typography>
                          <Typography variant="h6">{usageStats.performanceMetrics.averageResponseTime}ms</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">P95响应时间</Typography>
                          <Typography variant="h6">{usageStats.performanceMetrics.p95ResponseTime}ms</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">正常运行时间</Typography>
                          <Typography variant="h6">{usageStats.performanceMetrics.uptime}%</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">吞吐量</Typography>
                          <Typography variant="h6">{usageStats.performanceMetrics.throughput.toFixed(2)}/min</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Cost Analysis */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader
                      title="成本分析"
                    />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>按任务类型</Typography>
                          {Object.entries(usageStats.costAnalysis.costByTaskType).map(([type, cost]) => (
                            <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">{type}</Typography>
                              <Typography variant="body2">{formatCurrency(cost)}</Typography>
                            </Box>
                          ))}
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>预计月度成本</Typography>
                          <Typography variant="h5" color="primary">
                            {formatCurrency(usageStats.costAnalysis.projectedMonthlyCost)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default OpenRouterConfig;