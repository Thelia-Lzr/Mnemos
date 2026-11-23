import React, { FormEvent, useState } from 'react';
import { Alert, Button, FormControl, FormControlLabel, FormLabel, Paper, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { generateQuestions } from './ai';
import { selfTestQuestions } from './assessment';
import { read, update } from './db';
import { ActivityKind, Profile, Question } from './model';
import { PageTitle, errorMessage, useProfile } from './workspace';

export interface QuizSession {
  id: string;
  topic: string;
  questions: Question[];
}

export function Quiz({ kind }: { kind: 'practice' | 'assessment' }) {
  const { profile } = useProfile();
  const assessment = kind === 'assessment';
  const [session, setSession] = useState<QuizSession>();
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const title = assessment ? '语言等级自测' : topic.trim() || '日常交流';
      const questions = assessment
        ? selfTestQuestions(profile.language, (await read('results', [])).filter(item => item.kind === 'assessment' && item.language === profile.language).length)
        : await generateQuestions(profile.language, profile.level, title);
      setSession({ id: crypto.randomUUID(), topic: title, questions });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={assessment ? '语言评估' : '主题练习'}
        details={assessment ? '六道本地题覆盖入门、中级和进阶，帮助你找出需要复习的内容。' : '按学习资料里的语言和等级生成五道选择题。'} />
      {session ? <QuestionForm key={session.id} session={session} profile={profile} kind={kind} onClose={() => setSession(undefined)} /> : (
        <Stack component="form" spacing={2} maxWidth={540} onSubmit={start}>
          {!assessment && <TextField label="练习主题" placeholder="例如：在餐厅点餐" value={topic} disabled={busy}
            onChange={e => setTopic(e.target.value)} inputProps={{ maxLength: 160 }} />}
          {error && <Alert severity="error" action={<Button component={Link} to="/ai-settings">AI 设置</Button>}>{error}</Alert>}
          <Button type="submit" variant="contained" disabled={busy}>{assessment ? '开始自测' : busy ? '正在出题…' : '生成练习'}</Button>
        </Stack>
      )}
    </>
  );
}

export function QuestionForm({ session, profile, kind, onClose }: {
  session: QuizSession; profile: Profile; kind: ActivityKind; onClose: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || score !== undefined || Object.keys(answers).length !== session.questions.length) return;
    setBusy(true);
    setError('');
    const correct = session.questions.filter((q, i) => answers[i] === q.answer).length;
    try {
      await update('results', [], records => records.some(record => record.id === session.id) ? records : [{
        id: session.id, kind, ...profile, topic: session.topic, at: Date.now(),
        correct, total: session.questions.length,
      }, ...records]);
      setScore(correct);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack component="form" spacing={2} maxWidth={720} onSubmit={submit}>
      {session.questions.map((q, i) => (
        <Paper variant="outlined" key={i} sx={{ p: 2 }}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">{i + 1}. {q.prompt}</FormLabel>
            <RadioGroup name={`question-${i}`} value={answers[i] ?? ''} onChange={e => setAnswers({ ...answers, [i]: Number(e.target.value) })}>
              {q.choices.map((choice, index) => <FormControlLabel key={index} value={index}
                control={<Radio />} label={choice} disabled={busy || score !== undefined} />)}
            </RadioGroup>
          </FormControl>
          {score !== undefined && <Alert severity={answers[i] === q.answer ? 'success' : 'info'}>
            正确答案：{q.choices[q.answer]}。{q.explanation}
          </Alert>}
        </Paper>
      ))}
      {error && <Alert severity="error">{error}</Alert>}
      {score === undefined ? (
        <Button type="submit" variant="contained" disabled={busy || Object.keys(answers).length !== session.questions.length}>
          {busy ? '正在保存…' : '提交答案'}
        </Button>
      ) : (
        <>
          <Typography role="status" variant="h6">答对 {score} / {session.questions.length} 题，已保存。</Typography>
          <Button component={Link} to="/practice-history">查看历史</Button>
        </>
      )}
      <Button type="button" onClick={onClose} disabled={busy}>{score === undefined ? '退出题组' : '返回'}</Button>
    </Stack>
  );
}
