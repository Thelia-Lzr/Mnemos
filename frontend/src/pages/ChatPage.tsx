import { Alert, Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import ChatInterface from '../components/Chat/ChatInterface';
import MessageBubble from '../components/Chat/MessageBubble';
import chatApi from '../services/chatApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addMessages, clearMessages, removeMessage } from '../store/slices/chatSlice';

const historySize = 50;

const ChatPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { messages, isTyping } = useAppSelector((state) => state.chat);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const lastMessage = messages[messages.length - 1]?.id;

  const loadHistory = async (offset: number) => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await chatApi.getChatHistory(historySize, offset);
      if (!result.success) {
        setError(result.error || '无法加载对话历史。');
        return;
      }
      const list = messageList.current;
      const priorHeight = list?.scrollHeight ?? 0;
      if (offset === 0) dispatch(clearMessages());
      dispatch(addMessages([...result.messages].reverse()));
      setHasMore(result.hasMore);
      if (offset > 0 && list) requestAnimationFrame(() => { list.scrollTop += list.scrollHeight - priorHeight; });
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  useEffect(() => { void loadHistory(0); }, []);
  useEffect(() => {
    if (lastMessage && messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
  }, [lastMessage]);

  const deleteMessages = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      if (deleteTarget === 'all') {
        const response = await chatApi.clearChatHistory();
        if (!response.success) throw new Error(response.error);
        dispatch(clearMessages());
        setHasMore(false);
      } else {
        await chatApi.deleteMessage(deleteTarget);
        dispatch(removeMessage(deleteTarget));
      }
    } catch {
      setError('删除对话失败，请重试。');
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      setError('无法复制消息。');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100%', height: { md: '100%' }, py: 2, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Typography variant="h4" component="h1">AI 学习助手</Typography>
        <Button color="error" onClick={() => setDeleteTarget('all')} disabled={loading || isTyping || !messages.length}>清空对话</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={() => loadHistory(0)}>重新加载</Button>}>{error}</Alert>}
      <Paper ref={messageList} aria-label="对话记录" sx={{ flex: 1, overflowY: 'auto', minHeight: 160, maxHeight: { xs: '45dvh', md: 'none' }, p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        {hasMore && <Button disabled={loading || isTyping} onClick={() => loadHistory(messages.length)}>加载更早的消息</Button>}
        {loading && <Typography role="status">正在加载对话记录…</Typography>}
        {!loading && !messages.length && !error && <Typography color="text.secondary">发送消息开始对话，或上传 UTF-8 文本获取学习建议。</Typography>}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isUser={message.type === 'user_text' || message.type === 'user_file'}
            onCopy={copyMessage}
            onDelete={isTyping ? undefined : setDeleteTarget}
          />
        ))}
      </Paper>
      <Paper sx={{ p: 2 }}><ChatInterface disabled={loading || deleting} /></Paper>
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} aria-labelledby="delete-chat-title">
        <DialogTitle id="delete-chat-title">{deleteTarget === 'all' ? '清空对话？' : '删除这条消息？'}</DialogTitle>
        <DialogContent>删除后无法恢复。</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</Button>
          <Button color="error" onClick={deleteMessages} disabled={deleting}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ChatPage;
