import React, { FormEvent, useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { complete, jsonFromModel } from './ai';
import { read, update } from './db';
import { Word, languages } from './model';
import { PageTitle, errorMessage, useLocalData, useProfile } from './workspace';

const loadWords = () => read('words', []);
const day = 86_400_000;
type Entry = Pick<Word, 'term' | 'meaning' | 'example'>;

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<Entry>;
  return typeof entry.term === 'string' && !!entry.term.trim()
    && typeof entry.meaning === 'string' && !!entry.meaning.trim()
    && typeof entry.example === 'string';
}

export function Vocabulary() {
  const { profile } = useProfile();
  const { data, setData, error: loadError } = useLocalData(loadWords);
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [material, setMaterial] = useState('');
  const [revealed, setRevealed] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const words = data?.filter(word => word.language === profile.language) ?? [];
  const next = words.find(word => word.due <= Date.now());

  async function store(entries: Entry[]) {
    const updated = await update('words', [], existing => {
      const seen = new Set(existing.filter(word => word.language === profile.language).map(word => word.term.toLocaleLowerCase(profile.language)));
      const additions: Word[] = [];
      for (const entry of entries) {
        const key = entry.term.trim().toLocaleLowerCase(profile.language);
        if (seen.has(key)) continue;
        seen.add(key);
        additions.push({ ...entry, term: entry.term.trim(), id: crypto.randomUUID(), language: profile.language, reviews: 0, due: 0 });
      }
      return [...existing, ...additions];
    });
    setData(updated);
    setStatus('词汇表已更新，重复词条会自动合并。');
  }

  async function change(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await operation();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function add(event: FormEvent) {
    event.preventDefault();
    if (!term.trim() || !meaning.trim()) return;
    void change(async () => {
      await store([{ term: term.trim(), meaning: meaning.trim(), example: '' }]);
      setTerm('');
      setMeaning('');
    });
  }

  function extract(event: FormEvent) {
    event.preventDefault();
    if (!material.trim()) return;
    void change(async () => {
      const raw = jsonFromModel(await complete([
        { role: 'system', content: `从给定的${languages[profile.language]}材料提取最多 10 个适合 CEFR ${profile.level} 学习者的词条。仅返回 JSON 数组，每项为 {"term":"原词","meaning":"中文释义","example":"原语言例句"}。` },
        { role: 'user', content: material.trim() },
      ]));
      if (!Array.isArray(raw) || !raw.length || !raw.every(isEntry)) throw new Error('模型未返回可导入的词条。');
      await store(raw.slice(0, 10));
      setMaterial('');
    });
  }

  function review(word: Word, remembered: boolean) {
    void change(async () => {
      setData(await update('words', [], existing => existing.map(item => {
        if (item.id !== word.id) return item;
        const reviews = remembered ? item.reviews + 1 : 0;
        return { ...item, reviews, due: Date.now() + (remembered ? Math.min(30, 2 ** (reviews - 1)) * day : 10 * 60_000) };
      })));
      setRevealed(undefined);
    });
  }

  return (
    <>
      <PageTitle title="词汇" details={`${languages[profile.language]} · ${words.length} 个词条`} />
      <Stack spacing={2.5} maxWidth={760}>
        {(loadError || error) && <Alert severity="error">{loadError || error}</Alert>}
        {status && <Alert severity="success">{status}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography component="h2" variant="h6">到期复习</Typography>
          {next ? (
            <Stack spacing={1} mt={1}>
              <Typography variant="h5">{next.term}</Typography>
              {revealed === next.id ? (
                <>
                  <Typography>{next.meaning}</Typography>
                  {next.example && <Typography color="text.secondary">{next.example}</Typography>}
                  <Stack direction="row" gap={1}>
                    <Button onClick={() => review(next, true)} disabled={busy} variant="contained">记住了</Button>
                    <Button onClick={() => review(next, false)} disabled={busy}>再复习</Button>
                  </Stack>
                </>
              ) : <Button onClick={() => setRevealed(next.id)} sx={{ alignSelf: 'flex-start' }}>显示释义</Button>}
            </Stack>
          ) : <Typography color="text.secondary">目前没有到期词条。</Typography>}
        </Paper>
        <Stack component="form" spacing={1.5} onSubmit={add}>
          <Typography component="h2" variant="h6">手动添加</Typography>
          <TextField label="单词或短语" value={term} onChange={e => setTerm(e.target.value)} disabled={busy} inputProps={{ maxLength: 150 }} />
          <TextField label="释义" value={meaning} onChange={e => setMeaning(e.target.value)} disabled={busy} inputProps={{ maxLength: 500 }} />
          <Button type="submit" variant="outlined" disabled={busy || !data || !term.trim() || !meaning.trim()}>添加词条</Button>
        </Stack>
        <Stack component="form" spacing={1.5} onSubmit={extract}>
          <Typography component="h2" variant="h6">从文本提取</Typography>
          <TextField label="学习材料" multiline minRows={2} value={material} onChange={e => setMaterial(e.target.value)} disabled={busy} inputProps={{ maxLength: 8000 }} />
          <Button type="submit" variant="outlined" disabled={busy || !data || !material.trim()}>用 AI 提取词汇</Button>
        </Stack>
        {words.length > 0 && (
          <Stack spacing={1}>
            <Typography component="h2" variant="h6">我的词汇</Typography>
            {words.map(word => (
              <Paper key={word.id} variant="outlined" sx={{ px: 2, py: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                  <Stack><Typography fontWeight={700}>{word.term}</Typography><Typography>{word.meaning}</Typography></Stack>
                  <Button size="small" color="error" disabled={busy} aria-label={`移除 ${word.term}`}
                    onClick={() => change(async () => setData(await update('words', [], existing => existing.filter(item => item.id !== word.id))))}>移除</Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </>
  );
}
