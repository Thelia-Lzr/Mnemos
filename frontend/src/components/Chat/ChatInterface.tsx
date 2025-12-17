import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Mic as MicIcon,
  MoreVert as MoreVertIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import {
  addMessage,
  setTyping,
  setError,
  addTask,
  updateTask,
  addFileUpload,
  updateFileUpload,
  updateMessage,
} from '../../store/slices/chatSlice';
import chatApi from '../../services/chatApi';
import { v4 as uuidv4 } from 'uuid';

interface ChatInterfaceProps {
  onMessageSent?: (message: string) => void;
  onFileUploaded?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onMessageSent,
  onFileUploaded,
  disabled = false,
  placeholder = '输入您的消息...',
}) => {
  const dispatch = useDispatch();
  const { isTyping, error, language, isConnected } = useSelector((state: RootState) => state.chat);
  
  const [message, setMessage] = useState('');
  const [isAsyncMode, setIsAsyncMode] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFieldRef = useRef<HTMLInputElement>(null);

  // Focus on text field when component mounts
  useEffect(() => {
    if (textFieldRef.current) {
      textFieldRef.current.focus();
    }
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || disabled || !isConnected) return;

    const messageContent = message.trim();
    setMessage('');
    dispatch(setError(null));

    // Create temporary message for immediate UI feedback
    const tempMessage = {
      id: uuidv4(),
      userId: 'current-user', // This should come from auth state
      content: messageContent,
      type: 'user_text' as const,
      timestamp: new Date(),
      processingStatus: 'pending' as const,
      isProcessing: true,
    };

    dispatch(addMessage(tempMessage));
    dispatch(setTyping(true));

    try {
      if (isAsyncMode) {
        // Send message asynchronously
        const response = await chatApi.sendMessageAsync({
          content: messageContent,
          language,
        });

        if (response.success && response.taskId) {
          // Add task to tracking
          dispatch(addTask({
            taskId: response.taskId,
            progress: 0,
            status: 'queued',
          }));

          // Update message with task ID
          dispatch(updateMessage({
            id: tempMessage.id,
            updates: {
              processingStatus: 'processing',
            },
          }));

          // Start polling for task completion
          pollTaskCompletion(response.taskId, tempMessage.id);
        } else {
          throw new Error(response.error || 'Failed to send message');
        }
      } else {
        // Send message synchronously
        const response = await chatApi.sendMessage({
          content: messageContent,
          language,
        });

        if (response.success && response.message) {
          // Update the temporary message
          dispatch(updateMessage({
            id: tempMessage.id,
            updates: {
              processingStatus: 'completed',
              isProcessing: false,
            },
          }));

          // Add AI response
          dispatch(addMessage(response.message));
        } else {
          throw new Error(response.error || 'Failed to send message');
        }
      }

      onMessageSent?.(messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(setError(error instanceof Error ? error.message : 'Failed to send message'));
      
      // Update message to show error
      dispatch(updateMessage({
        id: tempMessage.id,
        updates: {
          processingStatus: 'failed',
          isProcessing: false,
        },
      }));
    } finally {
      dispatch(setTyping(false));
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || disabled || !isConnected) return;

    const uploadId = uuidv4();
    dispatch(setError(null));

    // Add file upload to tracking
    dispatch(addFileUpload({
      id: uploadId,
      file,
      progress: 0,
      status: 'uploading',
    }));

    try {
      if (isAsyncMode) {
        // Upload file asynchronously
        const response = await chatApi.uploadMaterialAsync(file, { language });

        if (response.success) {
          dispatch(updateFileUpload({
            id: uploadId,
            updates: {
              status: 'processing',
              progress: 50,
              extractedContent: response.extractedContent,
            },
          }));

          if (response.taskId) {
            // Add task to tracking
            dispatch(addTask({
              taskId: response.taskId,
              progress: 0,
              status: 'queued',
            }));

            // Poll for task completion
            pollTaskCompletion(response.taskId, uploadId);
          }

          if (response.message) {
            dispatch(addMessage(response.message));
          }
        } else {
          throw new Error(response.error || 'Failed to upload file');
        }
      } else {
        // Upload file synchronously
        const response = await chatApi.uploadMaterial(file, { language });

        if (response.success) {
          dispatch(updateFileUpload({
            id: uploadId,
            updates: {
              status: 'completed',
              progress: 100,
              extractedContent: response.extractedContent,
            },
          }));

          if (response.message) {
            dispatch(addMessage(response.message));
          }
        } else {
          throw new Error(response.error || 'Failed to upload file');
        }
      }

      onFileUploaded?.(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      dispatch(setError(error instanceof Error ? error.message : 'Failed to upload file'));
      
      dispatch(updateFileUpload({
        id: uploadId,
        updates: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed',
        },
      }));
    }
  };

  const pollTaskCompletion = async (taskId: string, relatedId: string) => {
    try {
      const result = await chatApi.waitForTaskCompletion(
        taskId,
        (progress) => {
          dispatch(updateTask({
            taskId,
            updates: { progress },
          }));
        }
      );

      if (result.success && result.result) {
        // Task completed successfully
        dispatch(updateTask({
          taskId,
          updates: {
            status: 'completed',
            progress: 100,
          },
        }));

        // Add AI response if available
        if (result.result.result) {
          const aiMessage = {
            id: uuidv4(),
            userId: 'ai',
            content: result.result.result.content || 'Task completed successfully',
            type: 'ai_response' as const,
            timestamp: new Date(),
            processingStatus: 'completed' as const,
            aiResponse: result.result.result,
          };
          dispatch(addMessage(aiMessage));
        }
      } else {
        throw new Error(result.error || 'Task failed');
      }
    } catch (error) {
      console.error('Task polling error:', error);
      dispatch(updateTask({
        taskId,
        updates: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Task failed',
        },
      }));
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const toggleAsyncMode = () => {
    setIsAsyncMode(!isAsyncMode);
    handleMenuClose();
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: 'background.paper',
      }}
    >
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

      {/* Connection status */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          连接已断开，请检查网络连接
        </Alert>
      )}

      {/* Mode indicator */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={isAsyncMode ? '异步模式' : '同步模式'}
          color={isAsyncMode ? 'secondary' : 'primary'}
          size="small"
        />
        <Chip
          label={`语言: ${language.toUpperCase()}`}
          variant="outlined"
          size="small"
        />
        {isTyping && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              AI正在思考...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Input area */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <TextField
          ref={textFieldRef}
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || !isConnected}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        {/* File upload button */}
        <Tooltip title="上传文件">
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || !isConnected}
            color="primary"
          >
            <AttachFileIcon />
          </IconButton>
        </Tooltip>

        {/* Send button */}
        <Tooltip title={isAsyncMode ? '异步发送' : '发送'}>
          <IconButton
            onClick={handleSendMessage}
            disabled={disabled || !message.trim() || !isConnected}
            color="primary"
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'action.disabled',
                color: 'action.disabled',
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Tooltip>

        {/* Options menu */}
        <Tooltip title="选项">
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={toggleAsyncMode}>
            <ListItemIcon>
              <FunctionsIcon />
            </ListItemIcon>
            <ListItemText>
              {isAsyncMode ? '切换到同步模式' : '切换到异步模式'}
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileSelect}
        accept=".txt,.pdf,.doc,.docx,.json"
      />
    </Paper>
  );
};

export default ChatInterface;