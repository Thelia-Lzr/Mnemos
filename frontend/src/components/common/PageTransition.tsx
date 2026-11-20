import React from 'react';
import { Box, Fade, useMediaQuery } from '@mui/material';

const PageTransition: React.FC<React.PropsWithChildren> = ({ children }) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const content = <Box sx={{ width: '100%', height: '100%' }}>{children}</Box>;
  return reducedMotion ? content : <Fade in timeout={180}>{content}</Fade>;
};

export default PageTransition;
