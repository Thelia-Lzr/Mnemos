import React from 'react';
import { 
  Button, 
  CircularProgress, 
  ButtonProps, 
  Box,
  useTheme,
  alpha
} from '@mui/material';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText = '加载中...',
  children,
  disabled,
  variant = 'contained',
  ...props
}) => {
  const theme = useTheme();

  return (
    <Button
      {...props}
      variant={variant}
      disabled={disabled || loading}
      sx={{
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: loading ? 'none' : 'translateY(-1px)',
          boxShadow: loading ? 'none' : theme.shadows[4],
        },
        '&.Mui-disabled': {
          backgroundColor: loading ? alpha(theme.palette.primary.main, 0.6) : undefined,
          color: loading ? theme.palette.primary.contrastText : undefined,
        },
        ...props.sx,
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <CircularProgress 
            size={20} 
            sx={{ 
              color: variant === 'contained' 
                ? theme.palette.primary.contrastText 
                : theme.palette.primary.main 
            }} 
          />
        </Box>
      )}
      
      <Box
        sx={{
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {!loading && props.startIcon}
        {loading ? loadingText : children}
        {!loading && props.endIcon}
      </Box>
    </Button>
  );
};

export default LoadingButton;