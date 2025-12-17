import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertColor, 
  Slide, 
  SlideProps,
  IconButton,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
  action?: React.ReactNode;
}

interface NotificationContextType {
  showNotification: (
    message: string, 
    severity?: AlertColor, 
    duration?: number,
    action?: React.ReactNode
  ) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((
    message: string, 
    severity: AlertColor = 'info', 
    duration: number = 6000,
    action?: React.ReactNode
  ) => {
    const id = Date.now().toString();
    const notification: Notification = {
      id,
      message,
      severity,
      duration,
      action,
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-hide notification after duration
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showNotification(message, 'success', duration);
  }, [showNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    showNotification(message, 'error', duration);
  }, [showNotification]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showNotification(message, 'warning', duration);
  }, [showNotification]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showNotification(message, 'info', duration);
  }, [showNotification]);

  const contextValue: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render notifications */}
      <Box sx={{ position: 'fixed', top: 80, right: 16, zIndex: 9999 }}>
        {notifications.map((notification, index) => (
          <Snackbar
            key={notification.id}
            open={true}
            TransitionComponent={SlideTransition}
            sx={{
              position: 'relative',
              mb: index > 0 ? 1 : 0,
              '& .MuiSnackbar-root': {
                position: 'relative',
              },
            }}
          >
            <Alert
              severity={notification.severity}
              variant="filled"
              sx={{
                width: '100%',
                minWidth: 300,
                boxShadow: 3,
                '& .MuiAlert-message': {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                },
              }}
              action={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {notification.action}
                  <IconButton
                    size="small"
                    aria-label="close"
                    color="inherit"
                    onClick={() => hideNotification(notification.id)}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              {notification.message}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;