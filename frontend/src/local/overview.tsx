import React, { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardActionArea, CardContent, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowOutward from '@mui/icons-material/ArrowOutward';
import { Link } from 'react-router-dom';
import { brand } from '../theme/theme';
import { read } from './db';
import { Language, Level, Result, languages, levels } from './model';
import { PageTitle, errorMessage, useLocalData, useProfile } from './workspace';

const actions = [
  ['/chat', 'AI 对话', '在交流中练习表达。'],
  ['/practice', '主题练习', '按语言等级和主题出题。'],
  ['/vocabulary', '词汇复习', '整理生词，按间隔复习。'],
  ['/assessment', '语言评估', '用内置题库做等级自测。'],
];

const loadResults = () => read('results', []);

export function Dashboard() {
  const { profile } = useProfile();
  const { data: results, error } = useLocalData(loadResults);
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 32%' }, mb: 3 }}>
        <Box sx={{ bgcolor: brand.blue, color: '#fff', p: { xs: 3, md: 5 } }}>
          <Typography component="h1" variant="h3">学习概览</Typography>
          <Typography sx={{ borderTop: '1px solid', borderColor: brand.lilac, mt: 2, pt: 2, maxWidth: 360 }}>
            {profile.name ? `${profile.name} · ` : ''}{languages[profile.language]} · {profile.level}
          </Typography>
        </Box>
        <Box aria-hidden="true" sx={{ display: { xs: 'none', sm: 'grid' }, placeItems: 'center', bgcolor: brand.violet, p: 2 }}>
          <Box className="mnemos-orbit" sx={{ width: 110 }} />
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {actions.map(([path, title, details]) => (
          <Card key={path} sx={{ borderTop: '3px solid', borderTopColor: 'primary.main' }}>
            <CardActionArea component={Link} to={path} sx={{ height: '100%' }}>
              <CardContent>
                <ArrowOutward color="primary" />
                <Typography variant="h6">{title}</Typography>
                <Typography variant="body2" color="text.secondary">{details}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {results && <ResultList results={results.slice(0, 5)} title={`最近活动 · 共完成 ${results.length} 次`} />}
    </>
  );
}

export function History() {
  const { data: results, error } = useLocalData(loadResults);
  const [language, setLanguage] = useState<Language | ''>('');
  return (
    <>
      <PageTitle title="学习历史" details="查看此浏览器保存的练习、词汇小测和自测记录。" />
      <TextField select size="small" label="语言" value={language} onChange={e => setLanguage(e.target.value as Language | '')} sx={{ minWidth: 140, mb: 2 }}>
        <MenuItem value="">全部语言</MenuItem>
        {Object.entries(languages).map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
      </TextField>
      {error && <Alert severity="error">{error}</Alert>}
      {results && <ResultList title="已完成" results={results.filter(result => !language || result.language === language)} />}
    </>
  );
}

function ResultList({ title, results }: { title: string; results: Result[] }) {
  const labels = { practice: '练习', assessment: '自测', vocabulary: '词汇' };
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography component="h2" variant="h6" mb={1}>{title}</Typography>
      {results.length === 0 && <Typography color="text.secondary">暂无记录。</Typography>}
      <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
        {results.map(result => (
          <Stack key={result.id} direction="row" justifyContent="space-between" spacing={2} py={1}>
            <Box>
              <Typography>{result.topic}</Typography>
              <Typography variant="body2" color="text.secondary">
                {labels[result.kind]} · {languages[result.language]} · {new Date(result.at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
            <Typography aria-label="得分">{result.correct}/{result.total}</Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

export function ProfilePage() {
  const { profile, saveProfile } = useProfile();
  const [draft, setDraft] = useState(profile);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveProfile({ ...draft, name: draft.name.trim() });
      setStatus('已保存');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="学习资料" details="设置默认学习语言和等级。" />
      <Stack component="form" spacing={2} maxWidth={420} onSubmit={save}>
        <TextField label="昵称" value={draft.name} inputProps={{ maxLength: 40 }} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        <TextField select label="学习语言" value={draft.language} onChange={e => setDraft({ ...draft, language: e.target.value as Language })}>
          {Object.entries(languages).map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
        </TextField>
        <TextField select label="等级" value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value as Level })}>
          {levels.map(level => <MenuItem key={level} value={level}>{level}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="contained" disabled={busy}>保存学习资料</Button>
        <Typography role="status">{status}</Typography>
      </Stack>
    </>
  );
}
