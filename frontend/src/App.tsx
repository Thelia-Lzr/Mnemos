import React from 'react';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { lightTheme, darkTheme } from './theme/theme';
import WelcomePage from './pages/WelcomePage';
import AiSetupPage from './pages/AiSetupPage';
import { Workspace } from './local/workspace';
import { Dashboard, History, ProfilePage } from './local/overview';
import { Chat } from './local/Chat';
import { Quiz } from './local/Quiz';
import { Vocabulary } from './local/Vocabulary';

export default function App() {
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  return (
    <ThemeProvider theme={dark ? darkTheme : lightTheme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/ai-setup" element={<AiSetupPage />} />
        <Route element={<Workspace />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/practice" element={<Quiz key="practice" kind="practice" />} />
          <Route path="/assessment" element={<Quiz key="assessment" kind="assessment" />} />
          <Route path="/practice-history" element={<History />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ai-settings" element={<AiSetupPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
