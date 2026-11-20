import React from 'react';
import { Box, Fade, Slide, Grow, Zoom, useMediaQuery } from '@mui/material';

type TransitionType = 'fade' | 'slide' | 'grow' | 'zoom';

interface PageTransitionProps {
  children: React.ReactNode;
  type?: TransitionType;
  direction?: 'up' | 'down' | 'left' | 'right';
  timeout?: number;
  in?: boolean;
}

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  type = 'fade',
  direction = 'up',
  timeout = 300,
  in: inProp = true,
}) => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const renderTransition = () => {
    const commonProps = {
      in: inProp,
      timeout: prefersReducedMotion ? 0 : timeout,
      children: (
        <Box sx={{ width: '100%', height: '100%' }}>
          {children}
        </Box>
      ),
    };

    switch (type) {
      case 'slide':
        return (
          <Slide
            {...commonProps}
            direction={direction}
          />
        );
      
      case 'grow':
        return (
          <Grow
            {...commonProps}
            style={{ transformOrigin: '0 0 0' }}
          />
        );
      
      case 'zoom':
        return (
          <Zoom
            {...commonProps}
            style={{ transformOrigin: '0 0 0' }}
          />
        );
      
      case 'fade':
      default:
        return (
          <Fade
            {...commonProps}
          />
        );
    }
  };

  return renderTransition();
};

export default PageTransition;
