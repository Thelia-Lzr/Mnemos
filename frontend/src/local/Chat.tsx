import React, { FormEvent, useCallback, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { complete } from './ai';
import { read, update } from './db';
import { Message, languages } from './model';
import { PageTitle, errorMessage, useLocalData, useProfile } from './workspace';

export function Chat() {
  const { profile } = useProfile();
  const key = `chat:${profile.language}` as const;
  const load = useCallback(() => read(key, []), [key]);
  const { data, setData, error: storageError } = useLocalData(load);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!data || !draft.trim() || busy) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: draft.trim() };
    const replyId = crypto.randomUUID();
    setBusy(true);
    setError('');
    try {
      const latest = await read(key, []);
      const content = await complete([
        { role: 'system', content: `你是${languages[profile.language]}语言导师。按照 CEFR ${profile.level} 水平用目标语言回复，在必要时用中文简洁解释语法错误。仅提供语言学习帮助。` },
        ...latest.slice(-16).map(({ role, content: message }) => ({ role, content: message })),
        { role: userMessage.role, content: userMessage.content },
      ]);
      setData(await update(key, [], messages => [...messages, userMessage, { id: replyId, role: 'assistant', content }]));
      setDraft('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="AI 对话" details={`${languages[profile.language]} · ${profile.level}`} />
      <Stack spacing={2} sx={{ maxWidth: 840 }}>
        {storageError && <Alert severity="error">{storageError}</Alert>}
        {data?.length === 0 && <Typography color="text.secondary">试着用你正在学的语言打个招呼。</Typography>}
        <Stack spacing={1.5} role="log" aria-label="对话记录">
          {data?.map(message => (
            <Paper key={message.id} variant="outlined" sx={{
              p: 2, maxWidth: '92%', alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              bgcolor: message.role === 'user' ? 'action.selected' : 'background.paper', overflowWrap: 'anywhere',
            }}>
              <Typography variant="subtitle2">{message.role === 'user' ? '你' : 'Mnemos'}</Typography>
              {message.role === 'user' ? (
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
              ) : (
                <Box sx={{ '& p:last-child': { mb: 0 }, '& img': { display: 'none' } }}>
                  <ReactMarkdown allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'br', 'h2', 'h3']} unwrapDisallowed>
                    {message.content}
                  </ReactMarkdown>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
        {error && <Alert severity="error" action={<Button component={Link} to="/ai-settings">AI 设置</Button>}>{error}</Alert>}
        <Stack component="form" spacing={1} onSubmit={send}>
          <TextField label="消息" multiline minRows={2} value={draft} onChange={e => setDraft(e.target.value)}
            disabled={busy} inputProps={{ maxLength: 8000 }} />
          <Button type="submit" variant="contained" disabled={busy || !data || !draft.trim()} sx={{ alignSelf: 'flex-end' }}>
            {busy ? '等待回复…' : '发送'}
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
