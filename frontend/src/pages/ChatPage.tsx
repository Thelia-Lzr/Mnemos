import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Fab,
  Badge,
} from '@mui/material';
import {
  History as HistoryIcon,
  Clear as ClearIcon,
  Settings as SettingsIcon,
  KeyboardArrowUp as ScrollUpIcon,
  Task as TaskIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  addMessages,
  setHistoryInfo,
  setLoadingHistory,
  clearMessages,
  setError,
  removeMessage,
  removeTask,
  setAvailableFunctions,
} from '../store/slices/chatSlice';
import ChatInterface from '../components/Chat/ChatInterface';
import MessageBubble from '../components/Chat/MessageBubble';
import TaskProgressIndicator from '../components/Chat/TaskProgressIndicator';
import chatApi from '../services/chatApi';

const ChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    messages, 
    activeTasks, 
    isLoadingHistory, 
    hasMoreMessages, 
    totalMessageCount,
    error,
    language 
  } = useSelector((state: RootState) => state.chat);

  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    loadChatHistory();
    loadAvailableFunctions();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll events for "scroll to top" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToTop(!isNearBottom && scrollTop > 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const loadChatHistory = async (offset: number = 0) => {
    if (isLoadingHistory) return;

    dispatch(setLoadingHistory(true));
    try {
      const response = await chatApi.getChatHistory(50, offset, language);
      
      if (response.success) {
        if (offset === 0) {
          // Initial load - replace messages
          dispatch(addMessages(response.messages));
        } else {
          // Load more - prepend messages
          dispatch(addMessages(response.messages));
        }
        
        dispatch(setHistoryInfo({
          totalCount: response.totalCount,
          hasMore: response.hasMore,
        }));
      } else {
        dispatch(setError(response.error || 'Failed to load chat history'));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      dispatch(setError('Failed to load chat history'));
    } finally {
      dispatch(setLoadingHistory(false));
    }
  };

  const loadAvailableFunctions = async () => {
    try {
      const response = await chatApi.getAvailableFunctions();
      if (response.success) {
        dispatch(setAvailableFunctions(response.functions));
      }
    } catch (error) {
      console.error('Error loading available functions:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = async () => {
    try {
      const response = await chatApi.clearChatHistory();
      if (response.success) {
        dispatch(clearMessages());
        setHistoryDrawerOpen(false);
      } else {
        dispatch(setError(response.error || 'Failed to clear chat history'));
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      dispatch(setError('Failed to clear chat history'));
    }
  };

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      // Could show a toast notification here
    }).catch(() => {
      dispatch(setError('Failed to copy message'));
    });
  }, [dispatch]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    dispatch(removeMessage(messageId));
  }, [dispatch]);

  const handleRetryMessage = useCallback((messageId: string) => {
    // Implementation for retrying failed messages
    console.log('Retry message:', messageId);
  }, []);

  const handleCancelTask = useCallback(async (taskId: string) => {
    try {
      const response = await chatApi.cancelTask(taskId);
      if (response.success) {
        dispatch(removeTask(taskId));
      } else {
        dispatch(setError(response.error || 'Failed to cancel task'));
      }
    } catch (error) {
      console.error('Error canceling task:', error);
      dispatch(setError('Failed to cancel task'));
    }
  }, [dispatch]);

  const activeTasksArray = Object.values(activeTasks);
  const activeTaskCount = activeTasksArray.filter(task => 
    task.status === 'queued' || task.status === 'processing'
  ).length;

  return (
    <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 2 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              AI学习助手
            </Typography>
            <Typography variant="body2" color="text.secondary">
              与AI助手对话，上传学习材料，获得个性化学习建议
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Task indicator */}
            <Tooltip title="查看任务">
              <IconButton onClick={() => setTaskDrawerOpen(true)}>
                <Badge badgeContent={activeTaskCount} color="primary">
                  <TaskIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* History button */}
            <Tooltip title="聊天历史">
              <IconButton onClick={() => setHistoryDrawerOpen(true)}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>

            {/* Clear history button */}
            <Tooltip title="清空历史">
              <IconButton onClick={handleClearHistory} color="error">
                <ClearIcon />
              </IconButton>
            </Tooltip>

            {/* Settings button */}
            <Tooltip title="设置">
              <IconButton>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Error display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => dispatch(setError(null))}
        >
          {error}
        </Alert>
      )}

      {/* Messages area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Paper 
          elevation={1} 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Messages container */}
          <Box
            ref={messagesContainerRef}
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Load more button */}
            {hasMoreMessages && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <IconButton 
                  onClick={() => loadChatHistory(messages.length)}
                  disabled={isLoadingHistory}
                >
                  <HistoryIcon />
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    加载更多历史消息
                  </Typography>
                </IconButton>
              </Box>
            )}

            {/* Messages */}
            {messages.length === 0 ? (
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}>
                <Typography variant="h6" color="text.secondary">
                  开始与AI助手对话
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  您可以：<br/>
                  • 发送文本消息进行语言学习对话<br/>
                  • 上传学习材料进行分析<br/>
                  • 请求生成练习题<br/>
                  • 查看学习进度和统计
                </Typography>
              </Box>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isUser={message.type === 'user_text' || message.type === 'user_file'}
                  onCopy={handleCopyMessage}
                  onDelete={handleDeleteMessage}
                  onRetry={handleRetryMessage}
                />
              ))
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Chat input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <ChatInterface
              placeholder="输入您的消息，或上传学习材料..."
            />
          </Box>
        </Paper>
      </Box>

      {/* Scroll to top button */}
      {showScrollToTop && (
        <Fab
          size="small"
          color="primary"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 24,
          }}
        >
          <ScrollUpIcon />
        </Fab>
      )}

      {/* History drawer */}
      <Drawer
        anchor="right"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            聊天历史
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            总消息数: {totalMessageCount}
          </Typography>
          <Divider sx={{ my: 2 }} />
          {/* History content would go here */}
          <Typography variant="body2" color="text.secondary">
            历史记录功能正在开发中...
          </Typography>
        </Box>
      </Drawer>

      {/* Task drawer */}
      <Drawer
        anchor="right"
        open={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
      >
        <Box sx={{ width: 400, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            任务状态
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            活跃任务: {activeTaskCount}
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          {activeTasksArray.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无活跃任务
            </Typography>
          ) : (
            activeTasksArray.map((task) => (
              <TaskProgressIndicator
                key={task.taskId}
                task={task}
                onCancel={handleCancelTask}
              />
            ))
          )}
        </Box>
      </Drawer>
    </Container>
  );
};

export default ChatPage;