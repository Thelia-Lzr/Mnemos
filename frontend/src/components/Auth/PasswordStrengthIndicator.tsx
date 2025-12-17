import React from 'react';
import { Box, LinearProgress, Typography, Chip } from '@mui/material';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  isStrong: boolean;
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const analyzePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    if (!password) {
      return {
        score: 0,
        feedback: [],
        isStrong: false,
        label: '',
        color: 'error'
      };
    }

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('Add special characters (@$!%*?&)');

    // Common patterns check
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1;
      feedback.push('Avoid common sequences');
    }

    const finalScore = Math.max(0, score);
    let label = '';
    let color: 'error' | 'warning' | 'info' | 'success' = 'error';

    if (finalScore <= 2) {
      label = 'Weak';
      color = 'error';
    } else if (finalScore <= 4) {
      label = 'Fair';
      color = 'warning';
    } else if (finalScore <= 5) {
      label = 'Good';
      color = 'info';
    } else {
      label = 'Strong';
      color = 'success';
    }

    return {
      score: finalScore,
      feedback,
      isStrong: finalScore >= 5,
      label,
      color
    };
  };

  const strength = analyzePasswordStrength(password);

  if (!password) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" sx={{ mr: 1 }}>
          Password strength:
        </Typography>
        <Chip 
          label={strength.label} 
          size="small" 
          color={strength.color}
          variant="outlined"
        />
      </Box>
      
      <LinearProgress
        variant="determinate"
        value={(strength.score / 6) * 100}
        color={strength.color}
        sx={{ height: 6, borderRadius: 3 }}
      />
      
      {strength.feedback.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {strength.feedback.slice(0, 3).map((tip, index) => (
            <Typography
              key={index}
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', fontSize: '0.75rem' }}
            >
              • {tip}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PasswordStrengthIndicator;