import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadUserProfile, refreshAuthToken, setInitialized } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const { isAuthenticated, user, token, refreshToken, loading, initialized } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    const initializeAuth = async () => {
      if (token && !isAuthenticated && !loading) {
        // Try to load user profile with existing token
        try {
          await dispatch(loadUserProfile()).unwrap();
        } catch (error) {
          // If profile loading fails, try to refresh token
          if (refreshToken) {
            try {
              await dispatch(refreshAuthToken()).unwrap();
            } catch (refreshError) {
              // Both failed, user needs to login again
              dispatch(setInitialized());
            }
          } else {
            dispatch(setInitialized());
          }
        }
      } else if (!token) {
        dispatch(setInitialized());
      }
    };

    if (!initialized) {
      initializeAuth();
    }
  }, [dispatch, token, refreshToken, isAuthenticated, loading, initialized]);

  // Show loading spinner while initializing
  if (!initialized || loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={pathname === '/ai-setup' ? '/auth?next=ai-setup' : '/auth'} replace />;
  }

  // Check admin requirement
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;