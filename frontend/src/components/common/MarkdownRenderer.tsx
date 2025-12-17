import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

interface MarkdownRendererProps {
  content: string;
  variant?: 'body1' | 'body2' | 'caption';
  sx?: any;
}

const StyledMarkdownContainer = styled(Box)(({ theme }) => ({
  // Ensure proper text color inheritance and contrast
  color: theme.palette.text.primary,
  backgroundColor: 'transparent',
  
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    margin: theme.spacing(1, 0),
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& h1': {
    fontSize: '1.5rem',
  },
  '& h2': {
    fontSize: '1.3rem',
  },
  '& h3': {
    fontSize: '1.1rem',
  },
  '& h4, & h5, & h6': {
    fontSize: '1rem',
  },
  '& p': {
    margin: theme.spacing(0.5, 0),
    lineHeight: 1.6,
    color: theme.palette.text.primary,
  },
  '& ul, & ol': {
    margin: theme.spacing(0.5, 0),
    paddingLeft: theme.spacing(2),
    color: theme.palette.text.primary,
  },
  '& li': {
    margin: theme.spacing(0.25, 0),
    lineHeight: 1.5,
    color: theme.palette.text.primary,
  },
  '& blockquote': {
    margin: theme.spacing(1, 0),
    padding: theme.spacing(1, 2),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[50],
    color: theme.palette.text.primary,
    fontStyle: 'italic',
  },
  '& code': {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
    color: theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.grey[900],
    padding: theme.spacing(0.25, 0.5),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875em',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  },
  '& pre': {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    color: theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.grey[900],
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    overflow: 'auto',
    margin: theme.spacing(1, 0),
    '& code': {
      backgroundColor: 'transparent',
      color: 'inherit',
      padding: 0,
    },
  },
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    margin: theme.spacing(1, 0),
    color: theme.palette.text.primary,
  },
  '& th, & td': {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0.5, 1),
    textAlign: 'left',
    color: theme.palette.text.primary,
  },
  '& th': {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[50],
    fontWeight: 600,
  },
  '& strong': {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& em': {
    fontStyle: 'italic',
    color: theme.palette.text.primary,
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '& hr': {
    border: 'none',
    borderTop: `1px solid ${theme.palette.divider}`,
    margin: theme.spacing(2, 0),
  },
  
  // Ensure all text elements have proper contrast
  '& *': {
    color: 'inherit',
  },
}));

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  variant = 'body1',
  sx = {} 
}) => {
  // Custom components for react-markdown
  const components = {
    p: ({ children }: any) => (
      <Typography variant={variant} component="p" sx={{ mb: 0.5 }}>
        {children}
      </Typography>
    ),
    h1: ({ children }: any) => (
      <Typography variant="h5" component="h1" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h2: ({ children }: any) => (
      <Typography variant="h6" component="h2" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h3: ({ children }: any) => (
      <Typography variant="subtitle1" component="h3" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h4: ({ children }: any) => (
      <Typography variant="subtitle2" component="h4" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h5: ({ children }: any) => (
      <Typography variant="body1" component="h5" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h6: ({ children }: any) => (
      <Typography variant="body2" component="h6" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    li: ({ children }: any) => (
      <Typography variant={variant} component="li" sx={{ lineHeight: 1.5 }}>
        {children}
      </Typography>
    ),
    blockquote: ({ children }: any) => (
      <Box
        component="blockquote"
        sx={{
          borderLeft: 4,
          borderColor: 'primary.main',
          bgcolor: 'grey.50',
          p: 1,
          pl: 2,
          my: 1,
          fontStyle: 'italic',
        }}
      >
        {children}
      </Box>
    ),
  };

  return (
    <StyledMarkdownContainer sx={sx}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </StyledMarkdownContainer>
  );
};

export default MarkdownRenderer;