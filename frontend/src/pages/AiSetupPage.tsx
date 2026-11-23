import React, { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { AiSettings, aiSettingsApi } from '../services/aiSettingsApi';

export default function AiSetupPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AiSettings>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    aiSettingsApi.get()
      .then(data => { if (active) setSettings(data); })
      .catch(() => { if (active) setError('无法读取 AI 配置，请重试。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await aiSettingsApi.save(apiKey.trim());
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message || '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  async function removeKey() {
    setBusy(true);
    setError('');
    try {
      setSettings(await aiSettingsApi.remove());
    } catch {
      setError('无法移除密钥，请重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box component="main" sx={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', p: { xs: 2, sm: 4 },
      bgcolor: '#0e0c1b', backgroundImage: 'radial-gradient(ellipse at top right, #32215f, transparent 60%)',
    }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 560, p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Button component={Link} to="/" sx={{ alignSelf: 'flex-start' }}>← 返回欢迎页</Button>
          <Box>
            <Typography component="h1" variant="h4" fontWeight={800} gutterBottom>设置 AI API</Typography>
            <Typography color="text.secondary">
              连接 OpenRouter 后，就能使用 AI 对话和练习。你可以在个人菜单里重新打开此页。
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          {loading && <CircularProgress size={24} aria-label="读取 AI 配置" />}
          {!loading && !settings && (
            <Button onClick={() => { setError(''); setLoading(true); setRetry(attempt => attempt + 1); }}>重试</Button>
          )}
          {settings && (
            <>
              {settings.personalKey && settings.canSavePersonalKey && <Alert severity="success">已连接个人 OpenRouter 密钥。</Alert>}
              {!settings.personalKey && settings.serverKey && (
                <Alert severity="info">服务器已配置 OpenRouter，你可以直接进入学习。</Alert>
              )}
              {!settings.canSavePersonalKey && (
                <Alert severity="info">服务器尚未启用个人密钥存储。请联系管理员启用。</Alert>
              )}
              {settings.canSavePersonalKey && (
                <Stack component="form" spacing={2} onSubmit={save}>
                  <TextField
                    label="OpenRouter API 密钥"
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    onChange={event => setApiKey(event.target.value)}
                    disabled={busy}
                    required
                    inputProps={{ maxLength: 512, spellCheck: false }}
                    helperText={<a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">在 OpenRouter 创建密钥 ↗</a>}
                  />
                  <Button type="submit" variant="contained" disabled={busy || !apiKey.trim()}>
                    {busy ? '正在处理…' : settings.personalKey ? '验证并更新密钥' : '验证并进入学习'}
                  </Button>
                </Stack>
              )}
              {(settings.personalKey ? settings.canSavePersonalKey : settings.serverKey) && (
                <Button component={Link} to="/dashboard" variant="outlined">进入学习</Button>
              )}
              {settings.personalKey && (
                <Button onClick={removeKey} disabled={busy} color="error">移除个人密钥</Button>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
