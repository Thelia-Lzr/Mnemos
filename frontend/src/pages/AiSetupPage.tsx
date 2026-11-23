import React, { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Container, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { compatibleUrl, openRouterUrl, verify } from '../local/ai';
import { read, write } from '../local/db';
import { AiConfig } from '../local/model';
import { errorMessage, PageTitle, useLocalData } from '../local/workspace';

const providers = {
  openrouter: 'OpenRouter',
  compatible: 'OpenAI 兼容 API',
  codex: '本机 Codex',
  claude: '本机 Claude Code',
};
const loadConfig = () => read('ai', null);

export default function AiSetupPage() {
  const navigate = useNavigate();
  const setup = useLocation().pathname === '/ai-setup';
  const { data: saved, setData, error: storageError } = useLocalData(loadConfig);
  const [provider, setProvider] = useState<AiConfig['provider']>('openrouter');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const local = provider === 'codex' || provider === 'claude';

  useEffect(() => {
    if (!saved) return;
    setProvider(saved.provider);
    setModel(saved.model);
    setBaseUrl('baseUrl' in saved ? saved.baseUrl : '');
  }, [saved]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const endpoint = local ? '' : provider === 'openrouter' ? openRouterUrl : compatibleUrl(baseUrl);
      const sameDestination = saved?.provider === provider && (
        'origin' in saved ? saved.origin === window.location.origin : saved.baseUrl === endpoint
      );
      const credential = secret.trim() || (sameDestination ? saved?.secret : '') || '';
      if ((provider !== 'compatible' && !credential) || (!local && !model.trim())) {
        throw new Error(local ? '请填写本机桥接器显示的配对码。' : '请填写模型 ID 和所需的 API 密钥。');
      }
      const config: AiConfig = local
        ? { provider, origin: window.location.origin, model: model.trim(), secret: credential }
        : { provider, baseUrl: endpoint, model: model.trim(), secret: credential };
      await verify(config);
      setData(await write('ai', config));
      setSecret('');
      if (setup) navigate('/dashboard', { replace: true });
      else setStatus('连接成功，配置已保存。');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setError('');
    setBusy(true);
    try {
      setData(await write('ai', null));
      setSecret('');
      setStatus('已从此浏览器移除连接配置。');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container component={setup ? 'main' : 'section'} maxWidth="sm" sx={{ py: setup ? { xs: 3, md: 8 } : 0 }}>
      {setup && <Button component={Link} to="/" sx={{ mb: 2 }}>← 返回欢迎页</Button>}
      <PageTitle title="设置 AI" details="密钥或配对码保存在当前浏览器的 IndexedDB。学习请求会发给你选择的模型服务。" />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          {storageError && <Alert severity="error">{storageError}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {status && <Alert severity="success">{status}</Alert>}
          {saved === undefined && !storageError && <CircularProgress size={24} aria-label="读取 AI 配置" />}
          {saved !== undefined && (
            <Stack component="form" spacing={2} onSubmit={save}>
              <TextField select label="提供方" value={provider} disabled={busy} onChange={e => {
                const next = e.target.value as AiConfig['provider'];
                setProvider(next);
                setModel(next === 'openrouter' ? 'openai/gpt-4o-mini' : '');
                setBaseUrl('');
                setSecret('');
                setStatus('');
              }}>
                {Object.entries(providers).map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
              </TextField>
              {provider === 'compatible' && (
                <TextField required label="HTTPS API 地址" placeholder="https://api.example.com/v1" value={baseUrl}
                  disabled={busy} onChange={e => { setBaseUrl(e.target.value); setSecret(''); }}
                  helperText="服务需支持 Chat Completions，并允许当前网页来源的 CORS 请求。" />
              )}
              <TextField required={!local} label="模型 ID" value={model} disabled={busy} onChange={e => setModel(e.target.value)}
                inputProps={{ maxLength: 150 }} helperText={local ? '留空使用本机 CLI 的默认模型。' : undefined} />
              {local && <Alert severity="info">
                在本机登录 CLI 后运行 <code>node bridge/server.mjs --origin {window.location.origin}</code>，再填入终端显示的配对码。
              </Alert>}
              <TextField label={local ? '桥接器配对码' : 'API 密钥'} type="password" autoComplete="new-password" value={secret}
                disabled={busy} onChange={e => setSecret(e.target.value)} inputProps={{ maxLength: 4096, spellCheck: false }}
                helperText={saved?.provider === provider ? '同一地址留空时保留当前凭据。' : provider === 'compatible' ? '无需认证的服务可留空。' : undefined} />
              <Button type="submit" variant="contained" disabled={busy}>{busy ? '正在验证…' : setup ? '验证并进入学习' : '验证并保存'}</Button>
            </Stack>
          )}
          {setup && <Button component={Link} to="/dashboard">{saved ? '使用已有配置进入学习' : '暂时跳过'}</Button>}
          {saved && !setup && <Button onClick={disconnect} disabled={busy} color="error">移除连接配置</Button>}
        </Stack>
      </Paper>
    </Container>
  );
}
