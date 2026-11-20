import { Add, ArrowDownward, ArrowUpward, DeleteOutline, EditOutlined } from '@mui/icons-material';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
  AIFeature, AIProfile, AIProvider, AISettings, aiFeatures, loadAISettings,
  providers, saveAISettings, testAIProfile,
} from '../services/aiSettingsApi';

const featureNames = Object.keys(aiFeatures) as AIFeature[];
const providerNames = Object.keys(providers) as AIProvider[];

function createProfile(): AIProfile {
  return {
    id: crypto.randomUUID(),
    name: '',
    provider: 'responses',
    endpoint: '',
    model: '',
    timeout_seconds: 45,
    max_output_tokens: 8192,
    has_api_key: false,
  };
}

function describeError(error: unknown): string {
  const result = error as { message?: string; details?: { msg: string }[] };
  return result?.details?.[0]?.msg?.replace(/^Value error, /, '') || result?.message || '操作失败，请重试。';
}

interface ProfileEditorProps {
  initial: AIProfile;
  existing: boolean;
  onClose: () => void;
  onApply: (profile: AIProfile) => void;
}

function ProfileEditor({ initial, existing, onClose, onApply }: ProfileEditorProps) {
  const [profile, setProfile] = useState(initial);
  const responses = profile.provider === 'responses';
  const canKeepKey = initial.has_api_key && profile.endpoint.trim() === initial.endpoint;
  const title = existing ? '编辑配置' : '新增配置';

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile.name.trim() || (responses && (!profile.model.trim() || !profile.endpoint.trim()))) {
      return;
    }
    onApply({
      ...profile,
      name: profile.name.trim(),
      model: profile.model.trim(),
      endpoint: responses ? profile.endpoint.trim() : '',
      api_key: responses ? profile.api_key : undefined,
      has_api_key: responses && canKeepKey && profile.api_key !== null,
    });
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="ai-profile-title">
      <Box component="form" onSubmit={apply}>
        <DialogTitle id="ai-profile-title">{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField autoFocus required label="配置名称" value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              inputProps={{ maxLength: 80 }} />
            <TextField select label="提供方" value={profile.provider}
              onChange={(event) => setProfile({ ...profile, provider: event.target.value as AIProvider })}>
              {providerNames.map((provider) => <MenuItem key={provider} value={provider}>{providers[provider]}</MenuItem>)}
            </TextField>
            {responses && (
              <TextField required type="url" label="Responses API 地址" value={profile.endpoint}
                placeholder="https://api.openai.com/v1/responses"
                helperText="填写以 /responses 结尾的完整地址。"
                onChange={(event) => setProfile({ ...profile, endpoint: event.target.value })}
                inputProps={{ maxLength: 1024 }} />
            )}
            <TextField required={responses} label="模型 ID" value={profile.model}
              helperText={responses ? undefined : '留空时使用 CLI 的默认模型。'}
              onChange={(event) => setProfile({ ...profile, model: event.target.value })}
              inputProps={{ maxLength: 150 }} />
            {responses && (
              <Box>
                <TextField fullWidth type="password" label="API 密钥（可选）" autoComplete="new-password"
                  value={profile.api_key || ''}
                  helperText={profile.api_key === null ? '保存后移除已存密钥。' :
                    canKeepKey ? '留空保留已存密钥。' : '需要认证的服务请填写 Bearer 密钥。'}
                  onChange={(event) => setProfile({ ...profile, api_key: event.target.value || undefined })}
                  inputProps={{ maxLength: 4096 }} />
                {canKeepKey && (
                  <Button size="small" color={profile.api_key === null ? 'primary' : 'error'} sx={{ mt: 0.5 }}
                    onClick={() => setProfile({ ...profile, api_key: profile.api_key === null ? undefined : null })}>
                    {profile.api_key === null ? '保留已存密钥' : '清除已存密钥'}
                  </Button>
                )}
              </Box>
            )}
            {!responses && (
              <Typography variant="body2" color="text.secondary">
                后端会从本机 PATH 启动 CLI，并使用该 CLI 的认证。
              </Typography>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField required fullWidth type="number" label="超时（秒）" value={profile.timeout_seconds || ''}
                inputProps={{ min: 5, max: 120 }}
                onChange={(event) => setProfile({ ...profile, timeout_seconds: Number(event.target.value) })} />
              {responses && (
                <TextField required fullWidth type="number" label="最大输出 Token" value={profile.max_output_tokens || ''}
                  inputProps={{ min: 16, max: 32768 }}
                  onChange={(event) => setProfile({ ...profile, max_output_tokens: Number(event.target.value) })} />
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose}>取消</Button>
          <Button variant="contained" type="submit">应用到草稿</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default function AISettingsPage() {
  const [saved, setSaved] = useState<AISettings | null>(null);
  const [draft, setDraft] = useState<AISettings | null>(null);
  const [feature, setFeature] = useState<AIFeature>('default');
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<AIProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const dirty = draft !== saved;

  async function reload() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const config = await loadAISettings();
      setSaved(config);
      setDraft(config);
    } catch (error) {
      setError(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const config = await saveAISettings(draft);
      setSaved(config);
      setDraft(config);
      setNotice('AI 配置已保存。');
    } catch (error) {
      setError(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  async function test(profile: AIProfile) {
    setTesting(profile.id);
    setError('');
    setNotice('');
    try {
      const result = await testAIProfile(profile);
      setNotice(`${profile.name} 连接成功 · ${result.model} · ${(result.processing_time / 1000).toFixed(1)} 秒`);
    } catch (error) {
      setError(`${profile.name} · ${describeError(error)}`);
    } finally {
      setTesting(null);
    }
  }

  function applyProfile(profile: AIProfile) {
    if (!draft) return;
    const profiles = draft.profiles.some(({ id }) => id === profile.id)
      ? draft.profiles.map((item) => item.id === profile.id ? profile : item)
      : [...draft.profiles, profile];
    setDraft({ ...draft, profiles });
    setEditing(null);
  }

  function removeProfile(id: string) {
    if (!draft) return;
    const routes = { ...draft.routes };
    for (const name of featureNames) {
      if (routes[name]?.includes(id)) {
        routes[name] = routes[name]?.filter((entry) => entry !== id);
      }
    }
    setDraft({ ...draft, routes, profiles: draft.profiles.filter((profile) => profile.id !== id) });
    if (adding === id) setAdding('');
  }

  const queue = draft?.routes[feature] || [];
  const defaultQueue = draft?.routes.default || [];
  const available = draft?.profiles.filter(({ id }) => !queue.includes(id)) || [];
  const locked = busy || testing !== null;

  function updateQueue(order: string[]) {
    if (!draft) return;
    setDraft({ ...draft, routes: { ...draft.routes, [feature]: order } });
    setAdding('');
  }

  function move(index: number, amount: number) {
    const order = [...queue];
    [order[index], order[index + amount]] = [order[index + amount], order[index]];
    updateQueue(order);
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1180, mx: 'auto', width: '100%', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Box>
          <Typography component="h1" variant="h4" gutterBottom>AI 配置</Typography>
          <Typography color="text.secondary">管理 AI 提供方，并为各学习功能设置调用顺序。</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {(dirty || error) && (
            <Button disabled={locked} onClick={reload}>{dirty ? '放弃草稿并重载' : '重新加载'}</Button>
          )}
          <Button variant="contained" disabled={locked || !dirty || !draft} onClick={save}>保存配置</Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {!draft && busy && <CircularProgress size={28} aria-label="正在加载 AI 配置" />}
      {draft && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
          <Paper variant="outlined" component="section" aria-labelledby="ai-profiles-heading" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography id="ai-profiles-heading" component="h2" variant="h6">提供方配置</Typography>
                <Button startIcon={<Add />} disabled={locked || draft.profiles.length >= 40}
                  onClick={() => setEditing(createProfile())}>新增配置</Button>
              </Stack>
              {draft.profiles.length === 0 && (
                <Typography color="text.secondary">添加一个 Responses API 或本机 CLI 配置，即可设置功能路由。</Typography>
              )}
              {draft.profiles.map((profile) => {
                const isSaved = saved?.profiles.find(({ id }) => id === profile.id) === profile;
                return (
                  <Paper variant="outlined" key={profile.id} sx={{ p: 2, minWidth: 0 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                        <Typography component="h3" variant="subtitle1" sx={{ overflowWrap: 'anywhere', fontWeight: 700 }}>
                          {profile.name}
                        </Typography>
                        <Chip label={providers[profile.provider]} size="small" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                        {profile.model || 'CLI 默认模型'} · {profile.timeout_seconds} 秒
                      </Typography>
                      {profile.provider === 'responses' && (
                        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {profile.endpoint}
                        </Typography>
                      )}
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Button size="small" disabled={locked || !isSaved} onClick={() => test(profile)}
                          aria-label={`测试 ${profile.name} 的连接`}>
                          {testing === profile.id ? '测试中…' : '测试连接'}
                        </Button>
                        {!isSaved && <Typography variant="caption" color="text.secondary">保存后可测试</Typography>}
                        <Box sx={{ flex: 1 }} />
                        <IconButton size="small" disabled={locked} aria-label={`编辑 ${profile.name}`} onClick={() => setEditing(profile)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                        <IconButton size="small" disabled={locked} aria-label={`移除 ${profile.name}`} onClick={() => removeProfile(profile.id)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Paper>

          <Paper variant="outlined" component="section" aria-labelledby="ai-routes-heading" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
            <Stack spacing={2}>
              <Typography id="ai-routes-heading" component="h2" variant="h6">功能路由</Typography>
              <TextField select fullWidth label="学习功能" value={feature} disabled={locked}
                onChange={(event) => { setFeature(event.target.value as AIFeature); setAdding(''); }}>
                {featureNames.map((name) => (
                  <MenuItem key={name} value={name}>
                    {aiFeatures[name]}{name !== 'default' && (draft.routes[name]?.length ? ' · 自定义' : ' · 继承默认')}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="body2" color="text.secondary">
                首项优先调用，失败时依序尝试备用配置。每个队列最多五项。
              </Typography>
              <Divider />
              {queue.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {feature === 'default' ? '默认队列为空。'
                    : defaultQueue.length ? `当前继承默认队列 · ${defaultQueue.map((id) => draft.profiles.find((p) => p.id === id)?.name).join(' → ')}`
                    : '当前继承默认队列。默认队列为空。'}
                </Typography>
              )}
              {queue.length > 0 && (
                <Stack component="ol" spacing={1} aria-label="调用顺序" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                  {queue.map((id, index) => (
                    <Stack key={id} component="li" direction="row" alignItems="center" spacing={0.5}
                      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, pl: 1.25, pr: 0.5, py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{index === 0 ? '主配置' : `备用 ${index}`}</Typography>
                      <Typography variant="body2" sx={{ flex: 1, pl: 0.5, overflowWrap: 'anywhere' }}>
                        {draft.profiles.find((profile) => profile.id === id)?.name}
                      </Typography>
                      <IconButton size="small" disabled={locked || index === 0} aria-label={`上移第 ${index + 1} 项`}
                        onClick={() => move(index, -1)}><ArrowUpward fontSize="small" /></IconButton>
                      <IconButton size="small" disabled={locked || index === queue.length - 1} aria-label={`下移第 ${index + 1} 项`}
                        onClick={() => move(index, 1)}><ArrowDownward fontSize="small" /></IconButton>
                      <IconButton size="small" disabled={locked} aria-label={`移除队列第 ${index + 1} 项`}
                        onClick={() => updateQueue(queue.filter((entry) => entry !== id))}><DeleteOutline fontSize="small" /></IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
              {available.length > 0 && queue.length < 5 && (
                <Stack spacing={1} direction="row">
                  <TextField select fullWidth size="small" label="选择要加入的配置" disabled={locked}
                    value={adding} onChange={(event) => setAdding(event.target.value)}>
                    {available.map((profile) => <MenuItem key={profile.id} value={profile.id}>{profile.name}</MenuItem>)}
                  </TextField>
                  <Button variant="outlined" disabled={locked || !adding} onClick={() => updateQueue([...queue, adding])}>加入</Button>
                </Stack>
              )}
              {feature !== 'default' && queue.length > 0 && (
                <Button sx={{ alignSelf: 'flex-start' }} disabled={locked} onClick={() => updateQueue([])}>恢复继承默认</Button>
              )}
            </Stack>
          </Paper>
        </Box>
      )}
      {editing && (
        <ProfileEditor initial={editing} existing={!!draft?.profiles.some((profile) => profile.id === editing.id)}
          onClose={() => setEditing(null)} onApply={applyProfile} />
      )}
    </Stack>
  );
}
