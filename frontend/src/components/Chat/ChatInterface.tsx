import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { AttachFile, Send } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import chatApi from '../../services/chatApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addMessage, setLanguage, setTyping } from '../../store/slices/chatSlice';

interface ChatInterfaceProps {
  disabled?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ disabled = false }) => {
  const dispatch = useAppDispatch();
  const { language, isTyping } = useAppSelector((state) => state.chat);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);

  const submit = async (file?: File) => {
    if (disabled || pending.current || (!file && !message.trim())) return;
    const content = message.trim();
    pending.current = true;
    dispatch(setTyping(true));
    setError(null);
    try {
      const response = file
        ? await chatApi.uploadMaterial(file, { language })
        : await chatApi.sendMessage({ content, language });
      if (!response.success || !response.message) {
        setError(response.error || '无法处理请求，请重试。');
        return;
      }
      if (!file) {
        if ('userMessage' in response && response.userMessage) dispatch(addMessage(response.userMessage));
        setMessage('');
      }
      dispatch(addMessage(response.message));
    } finally {
      pending.current = false;
      dispatch(setTyping(false));
    }
  };

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error" action={<Button component={Link} to="/ai-settings">AI 配置</Button>}>{error}</Alert>}
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField select size="small" label="对话语言" value={language} onChange={(event) => dispatch(setLanguage(event.target.value))} disabled={isTyping}>
          <MenuItem value="en">英语</MenuItem>
          <MenuItem value="ja">日语</MenuItem>
          <MenuItem value="fr">法语</MenuItem>
        </TextField>
        {isTyping && <Typography role="status" variant="body2"><CircularProgress size={14} sx={{ mr: 1 }} />正在等待 AI 回复…</Typography>}
      </Stack>
      <TextField
        label="消息"
        multiline
        minRows={2}
        maxRows={5}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault();
            void submit();
          }
        }}
        InputProps={{ readOnly: isTyping }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<AttachFile />} onClick={() => fileInput.current?.click()} disabled={disabled || isTyping}>上传文本</Button>
        <Button variant="contained" endIcon={<Send />} onClick={() => submit()} disabled={disabled || isTyping || !message.trim()}>发送</Button>
      </Box>
      <input ref={fileInput} type="file" accept=".txt,text/plain" hidden onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void submit(file);
      }} />
    </Stack>
  );
};

export default ChatInterface;
