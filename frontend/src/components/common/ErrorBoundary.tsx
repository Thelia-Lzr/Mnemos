import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import { 
  ErrorOutline, 
  Refresh, 
  ExpandMore, 
  ExpandLess,
  BugReport 
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Here you could also log the error to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 3,
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <ErrorOutline 
                sx={{ 
                  fontSize: 64, 
                  color: 'error.main', 
                  mb: 2 
                }} 
              />
              
              <Typography variant="h5" gutterBottom color="error">
                出现了一些问题
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                抱歉，应用程序遇到了意外错误。请尝试刷新页面或联系技术支持。
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                >
                  重试
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<BugReport />}
                  onClick={() => window.location.reload()}
                >
                  刷新页面
                </Button>
              </Box>

              {process.env.NODE_ENV === 'development' && (
                <Box>
                  <Button
                    variant="text"
                    size="small"
                    endIcon={this.state.showDetails ? <ExpandLess /> : <ExpandMore />}
                    onClick={this.toggleDetails}
                    sx={{ mb: 2 }}
                  >
                    {this.state.showDetails ? '隐藏' : '显示'}错误详情
                  </Button>
                  
                  <Collapse in={this.state.showDetails}>
                    <Alert severity="error" sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        错误信息:
                      </Typography>
                      <Typography variant="body2" component="pre" sx={{ 
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.75rem',
                        mb: 2
                      }}>
                        {this.state.error?.toString()}
                      </Typography>
                      
                      {this.state.errorInfo && (
                        <>
                          <Typography variant="subtitle2" gutterBottom>
                            组件堆栈:
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ 
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.75rem'
                          }}>
                            {this.state.errorInfo.componentStack}
                          </Typography>
                        </>
                      )}
                    </Alert>
                  </Collapse>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;