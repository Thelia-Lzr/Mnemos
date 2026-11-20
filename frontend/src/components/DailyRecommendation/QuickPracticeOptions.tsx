import React from 'react';
import { Button, Card, CardActions, CardContent, Grid, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { QuickPracticeOption } from '../../services/dailyRecommendationApi';

interface QuickPracticeOptionsProps {
  options: QuickPracticeOption[];
  language: string;
}

const QuickPracticeOptions: React.FC<QuickPracticeOptionsProps> = ({ options, language }) => (
  <Grid container spacing={2}>
    {options.map((option) => (
      <Grid item xs={12} sm={6} key={option.id}>
        <Card variant="outlined">
          <CardContent>
            <Typography component="h4" variant="subtitle1">{option.title}</Typography>
            <Typography variant="body2">{option.description}</Typography>
          </CardContent>
          <CardActions>
            <Button
              component={Link}
              to="/practice"
              state={{ recommendation: { language, type: option.type, difficulty: option.difficultyLevel, prompt: option.description } }}
            >
              {option.title} · 前往出题
            </Button>
          </CardActions>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export default QuickPracticeOptions;
