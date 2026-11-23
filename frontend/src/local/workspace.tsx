import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { read, write } from './db';
import { Profile } from './model';

const initial: Profile = { name: '', language: 'en', level: 'A1' };
const context = createContext({ profile: initial, saveProfile: async (_profile: Profile) => {} });

export function useProfile() {
  return useContext(context);
}

export function useLocalData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    load().then(result => { if (active) setData(result); }).catch(() => {
      if (active) setError('无法读取浏览器中的学习数据。');
    });
    return () => { active = false; };
  }, [load]);
  return { data, setData, error };
}

const nav = [
  ['/dashboard', '概览'], ['/chat', '对话'], ['/practice', '练习'], ['/vocabulary', '词汇'],
  ['/assessment', '评估'], ['/practice-history', '历史'], ['/profile', '学习资料'], ['/ai-settings', 'AI 设置'],
];

export function Workspace() {
  const { data: profile, setData, error } = useLocalData(loadProfile);
  const saveProfile = async (next: Profile) => setData(await write('profile', next));
  return (
    <>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} gap={{ xs: 0, md: 3 }} alignItems={{ md: 'center' }} py={1}>
            <Typography component={Link} variant="h6" to="/" sx={{ textDecoration: 'none', color: 'text.primary' }}>Mnemos</Typography>
            <Stack component="nav" aria-label="学习工作台" direction="row" flexWrap="wrap" gap={0.5}>
              {nav.map(([path, label]) => (
                <Button key={path} component={NavLink} to={path} color="inherit" size="small" sx={{
                  '&.active': { color: 'primary.main', bgcolor: 'action.selected' },
                }}>{label}</Button>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!profile && !error && <CircularProgress size={24} aria-label="读取学习资料" />}
        {profile && <context.Provider value={{ profile, saveProfile }}><Outlet /></context.Provider>}
      </Container>
    </>
  );
}

function loadProfile() {
  return read('profile', initial);
}

export function PageTitle({ title, details }: { title: string; details?: string }) {
  return (
    <Box mb={3}>
      <Typography component="h1" variant="h4">{title}</Typography>
      {details && <Typography color="text.secondary" mt={1}>{details}</Typography>}
    </Box>
  );
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请重试。';
}
