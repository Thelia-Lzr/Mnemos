import React, { useRef, useState } from 'react';
import { Alert, Button, Card, CardContent, FormControl, FormControlLabel, LinearProgress, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import assessmentApi, { AssessmentReport, AssessmentSession, assessmentLanguages } from '../../services/assessmentApi';
import ErrorHandler from '../../utils/errorHandler';

type Answers = Record<string, number>;

const draftKey = (id: string) => `mnemos.assessment.draft.${id}`;

function readDraft(session: AssessmentSession): Answers {
  try {
    const stored = JSON.parse(window.localStorage.getItem(draftKey(session.id)) || '{}');
    const answers: Answers = {};
    for (const question of session.questions) {
      const option = stored?.[question.id];
      if (Number.isInteger(option) && option >= 0 && option < question.options.length) {
        answers[question.id] = option;
      }
    }
    return answers;
  } catch {
    return {};
  }
}

const AssessmentQuiz: React.FC<{
  session: AssessmentSession;
  onExit: () => void;
  onComplete: (report: AssessmentReport) => void;
}> = ({ session, onExit, onComplete }) => {
  const { questions } = session;
  const [answers, setAnswers] = useState(() => readDraft(session));
  const firstUnanswered = questions.findIndex((question) => answers[question.id] === undefined);
  const [index, setIndex] = useState(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[index];

  const move = (next: number) => {
    setIndex(next);
    window.requestAnimationFrame(() => heading.current?.focus());
  };

  const choose = (option: number) => {
    const updated = { ...answers, [question.id]: option };
    setAnswers(updated);
    setError(null);
    try {
      window.localStorage.setItem(draftKey(session.id), JSON.stringify(updated));
    } catch {
      // Answers remain available for the current visit if storage is disabled.
    }
  };

  const submit = async () => {
    if (pending.current) return;
    if (firstUnanswered >= 0) {
      move(firstUnanswered);
      setError('还有题目未作答。');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const report = await assessmentApi.submitSelfTest(session.id, answers);
      try {
        window.localStorage.removeItem(draftKey(session.id));
      } catch {
        // Submission is already saved on the server.
      }
      onComplete(report);
    } catch (error) {
      setError(ErrorHandler.getErrorMessage(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (!question) {
    return <Alert severity="error" action={<Button onClick={onExit}>返回评估</Button>}>没有可用的自测试题。</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} justifyContent="space-between" alignItems="center">
            <Typography component="h2" variant="h5">{assessmentLanguages[session.language]}本地自测</Typography>
            <Button onClick={onExit} disabled={busy}>稍后继续</Button>
          </Stack>
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">第 {index + 1} / {questions.length} 题 · 已答 {Object.keys(answers).length} 题</Typography>
            <LinearProgress aria-label="自测作答进度" variant="determinate" value={Object.keys(answers).length * 100 / questions.length} />
          </Stack>
          <Typography id="assessment-question" component="h3" variant="h6" ref={heading} tabIndex={-1} sx={{ overflowWrap: 'anywhere' }}>
            {question.prompt}
          </Typography>
          <FormControl disabled={busy}>
            <RadioGroup
              aria-labelledby="assessment-question"
              name={question.id}
              value={answers[question.id] ?? ''}
              onChange={(_, option) => choose(Number(option))}
            >
              {question.options.map((option, optionIndex) => (
                <FormControlLabel
                  key={optionIndex}
                  value={optionIndex}
                  control={<Radio />}
                  label={option}
                  sx={{ m: 0, py: 0.5, overflowWrap: 'anywhere' }}
                />
              ))}
            </RadioGroup>
          </FormControl>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} justifyContent="space-between">
            <Button onClick={() => move(index - 1)} disabled={index === 0 || busy}>上一题</Button>
            {index + 1 < questions.length ? (
              <Button variant="contained" disabled={answers[question.id] === undefined} onClick={() => move(index + 1)}>下一题</Button>
            ) : (
              <Button variant="contained" disabled={busy || answers[question.id] === undefined} onClick={submit}>
                {busy ? '正在交卷…' : '交卷并评分'}
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AssessmentQuiz;
