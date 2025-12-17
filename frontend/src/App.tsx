import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { 
  Container, 
  ThemeProvider, 
  CssBaseline,
  useMediaQuery
} from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { lightTheme, darkTheme } from './theme/theme';
import SecurityUtils from './utils/security';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import PracticePage from './pages/PracticePage';
import VocabularyPage from './pages/VocabularyPage';
import PKArenaPage from './pages/PKArenaPage';
import ProfilePage from './pages/ProfilePage';
import PracticeHistoryPage from './pages/PracticeHistoryPage';
import AssessmentPage from './pages/AssessmentPage';
import RechargePage from './pages/RechargePage';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import NotificationProvider from './components/common/NotificationProvider';
import PageTransition from './components/common/PageTransition';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = SecurityUtils.getSecureItem<boolean>('darkMode');
    return saved !== null ? saved : prefersDarkMode;
  });

  useEffect(() => {
    SecurityUtils.setSecureItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    // Security checks on app initialization
    SecurityUtils.preventClickjacking();
    
    // Clear sensitive data on page unload
    const handleBeforeUnload = () => {
      // Only clear if user is not authenticated
      const token = SecurityUtils.getSecureItem<string>('token');
      if (!token) {
        SecurityUtils.clearSensitiveData();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <NotificationProvider>
          <Container maxWidth={false} disableGutters sx={{ height: '100vh' }}>
            <Routes>
              <Route 
                path="/auth" 
                element={
                  <PageTransition type="fade">
                    <AuthPage />
                  </PageTransition>
                } 
              />
              <Route path="/" element={<Layout />}>
                <Route 
                  index 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="up">
                        <DashboardPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="up">
                        <DashboardPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="chat" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="left">
                        <ChatPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="practice" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="left">
                        <PracticePage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="practice-history" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="left">
                        <PracticeHistoryPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="assessment" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="left">
                        <AssessmentPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="vocabulary" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="left">
                        <VocabularyPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="pk" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="left">
                        <PKArenaPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="profile" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="right">
                        <ProfilePage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="recharge" 
                  element={
                    <ProtectedRoute>
                      <PageTransition type="slide" direction="right">
                        <RechargePage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="admin" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <PageTransition type="zoom">
                        <AdminPage />
                      </PageTransition>
                    </ProtectedRoute>
                  } 
                />
              </Route>
            </Routes>
          </Container>
          
          {/* Toast notifications */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={darkMode ? 'dark' : 'light'}
            style={{ zIndex: 9999 }}
          />
        </NotificationProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;