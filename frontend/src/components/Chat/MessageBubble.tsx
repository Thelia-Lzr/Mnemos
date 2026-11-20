import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Collapse,
  Divider,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as AIIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MoreVert as MoreVertIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  AttachFile as AttachFileIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import { Message } from '../../store/slices/chatSlice';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  onCopy?: (content: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isUser,
  onCopy,
  onDelete,
  onRetry,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleCopy = () => {
    onCopy?.(message.content);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete?.(message.id);
    handleMenuClose();
  };

  const handleRetry = () => {
    onRetry?.(message.id);
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: zhCN,
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1,
        mb: 2,
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          backgroundColor: isUser ? 'primary.main' : 'secondary.main',
        }}
      >
        {isUser ? <PersonIcon /> : <AIIcon />}
      </Avatar>

      {/* Message content */}
      <Box sx={{ maxWidth: { xs: 'calc(100% - 40px)', sm: '80%' }, minWidth: 0, overflowWrap: 'anywhere' }}>
        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: isUser ? 'primary.light' : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            position: 'relative',
          }}
        >
          {/* Message header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {isUser ? '您' : 'AI助手'}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                {formatTimestamp(message.timestamp)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Processing status */}
              {message.isProcessing && (
                <CircularProgress size={16} />
              )}
              
              {/* Status chip */}
              <Chip
                label={getStatusText(message.processingStatus)}
                color={getStatusColor(message.processingStatus)}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />

              {/* Menu button */}
              <IconButton
                size="small"
                aria-label="消息操作"
                onClick={handleMenuOpen}
                sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Message type indicator */}
          {message.type !== 'user_text' && message.type !== 'ai_response' && (
            <Box sx={{ mb: 1 }}>
              <Chip
                icon={message.type === 'user_file' ? <AttachFileIcon /> : <InfoIcon />}
                label={
                  message.type === 'user_file' ? '文件上传' :
                  message.type === 'system' ? '系统消息' : message.type
                }
                size="small"
                variant="outlined"
              />
            </Box>
          )}

          {/* Main content */}
          {message.type === 'ai_response' || (message.type === 'system' && message.aiResponse) ? (
            <MarkdownRenderer 
              content={message.content} 
              variant="body1"
              sx={{ wordBreak: 'break-word' }}
            />
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.content}
            </Typography>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                附件:
              </Typography>
              {message.attachments.map((attachment, index) => (
                <Chip
                  key={index}
                  icon={<AttachFileIcon />}
                  label={attachment.filename}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              ))}
            </Box>
          )}

          {/* Function calls indicator */}
          {message.functionCalls && message.functionCalls.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Chip
                icon={<FunctionsIcon />}
                label={`执行了 ${message.functionCalls.length} 个功能`}
                size="small"
                color="info"
                variant="outlined"
              />
            </Box>
          )}

          {/* Expandable details */}
          {(message.aiResponse || message.extractedVocabulary || message.identifiedGrammar || message.functionResults) && (
            <Box sx={{ mt: 1 }}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ opacity: 0.7 }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  详细信息
                </Typography>
              </IconButton>

              <Collapse in={expanded}>
                <Box sx={{ mt: 1, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  {/* AI Response details */}
                  {message.aiResponse && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        AI响应详情:
                      </Typography>
                      <Typography variant="caption" display="block">
                        模型: {message.aiResponse.model}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Token使用: {message.aiResponse.tokensUsed}
                      </Typography>
                      <Typography variant="caption" display="block">
                        处理时间: {message.aiResponse.processingTime}ms
                      </Typography>
                    </Box>
                  )}

                  {/* Extracted vocabulary */}
                  {message.extractedVocabulary && message.extractedVocabulary.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        提取的词汇:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {message.extractedVocabulary.map((word, index) => (
                          <Chip
                            key={index}
                            label={word}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Identified grammar */}
                  {message.identifiedGrammar && message.identifiedGrammar.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        识别的语法:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {message.identifiedGrammar.map((grammar, index) => (
                          <Chip
                            key={index}
                            label={grammar}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Function results */}
                  {message.functionResults && message.functionResults.length > 0 && (
                    <Box>
                      <Typography variant="caption" fontWeight="bold">
                        功能执行结果:
                      </Typography>
                      {message.functionResults.map((result, index) => (
                        <Box key={index} sx={{ mt: 0.5, p: 1, backgroundColor: 'background.paper', borderRadius: 0.5 }}>
                          <Typography variant="caption">
                            {result.success ? '✅ 成功' : '❌ 失败'}
                            {result.error && `: ${result.error}`}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}
        </Paper>

        {/* Context menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleCopy}>
            <ListItemIcon>
              <CopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>复制</ListItemText>
          </MenuItem>
          
          {onRetry && message.processingStatus === 'failed' && (
            <MenuItem onClick={handleRetry}>
              <ListItemIcon>
                <RefreshIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>重试</ListItemText>
            </MenuItem>
          )}
          
          {onDelete && <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>删除</ListItemText>
          </MenuItem>}
        </Menu>
      </Box>
    </Box>
  );
};

export default MessageBubble;