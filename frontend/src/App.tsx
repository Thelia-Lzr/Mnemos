import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import AISettingsPage from './pages/AISettingsPage';
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
import { useAppDispatch } from './store/hooks';
import { loadWorkspaceProfile } from './store/slices/workspaceSlice';
import ErrorBoundary from './components/common/ErrorBoundary';
import NotificationProvider from './components/common/NotificationProvider';
import PageTransition from './components/common/PageTransition';

function App() {
  const dispatch = useAppDispatch();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode] = useState(() => {
    const saved = SecurityUtils.getSecureItem<boolean>('darkMode');
    return saved !== null ? saved : prefersDarkMode;
  });

  useEffect(() => {
    SecurityUtils.setSecureItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    SecurityUtils.preventClickjacking();
    SecurityUtils.clearLegacySession();
    dispatch(loadWorkspaceProfile());
  }, [dispatch]);

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <NotificationProvider>
          <Container maxWidth={false} disableGutters sx={{ height: '100vh' }}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route 
                  index 
                  element={
                    <PageTransition type="slide" direction="up">
                      <DashboardPage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="dashboard" 
                  element={
                    <PageTransition type="slide" direction="up">
                      <DashboardPage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="chat" 
                  element={
                    <PageTransition type="slide" direction="left">
                      <ChatPage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="practice" 
                  element={
                    <PageTransition type="slide" direction="left">
                      <PracticePage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="practice-history" 
                  element={
                    <PageTransition type="slide" direction="left">
                      <PracticeHistoryPage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="assessment" 
                  element={
                    <PageTransition type="slide" direction="left">
                      <AssessmentPage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="vocabulary" 
                  element={
                    <PageTransition type="slide" direction="left">
                      <VocabularyPage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="pk" 
                  element={
                    <PageTransition type="slide" direction="left">
                      <PKArenaPage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="profile" 
                  element={
                    <PageTransition type="slide" direction="right">
                      <ProfilePage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="recharge" 
                  element={
                    <PageTransition type="slide" direction="right">
                      <RechargePage />
                    </PageTransition>
                  } 
                />
                <Route 
                  path="admin" 
                  element={
                    <PageTransition type="zoom">
                      <AdminPage />
                    </PageTransition>
                  } 
                />
                <Route path="ai-settings" element={<AISettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
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