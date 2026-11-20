import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, LinearProgress, List, ListItemButton, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import AssessmentQuiz from '../components/Assessment/AssessmentQuiz';
import AssessmentReportView, { reportDate, reportTitle } from '../components/Assessment/AssessmentReportView';
import assessmentApi, { AssessmentLanguage, AssessmentReport, AssessmentSession, UserCapability, assessmentBands, assessmentLanguages } from '../services/assessmentApi';
import ErrorHandler from '../utils/errorHandler';

const languages = Object.keys(assessmentLanguages) as AssessmentLanguage[];
const legacySkills = [
  ['听力', 'listeningLevel'], ['口语', 'speakingLevel'], ['阅读', 'readingLevel'], ['写作', 'writingLevel'],
] as const;

const AssessmentPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const requestedLanguage = languages.find((item) => item === params.get('language'));
  const testId = params.get('test');
  const [capabilities, setCapabilities] = useState<UserCapability[] | null>(null);
  const [capabilitiesError, setCapabilitiesError] = useState(false);
  const [history, setHistory] = useState<{ language: AssessmentLanguage; items: AssessmentReport[] } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [action, setAction] = useState<'practice' | 'self_test' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reportTop = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const language = requestedLanguage ?? capabilities?.find((item) => languages.includes(item.language))?.language ?? 'en';
  const capability = capabilities?.find((item) => item.language === language);
  const currentSession = testId && session?.id === testId ? session : null;
  const reports = history?.language === language ? history.items : null;
  const selectedReport = report?.language === language ? report : reports?.[0];

  useEffect(() => {
    const controller = new AbortController();
    void assessmentApi.getAllCapabilities(controller.signal).then((items) => {
      if (!controller.signal.aborted) setCapabilities(items);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setCapabilities([]);
        setCapabilitiesError(true);
      }
    });
    return () => controller.abort();
  }, []);

  const profileReady = capabilities !== null || requestedLanguage !== undefined;
  useEffect(() => {
    if (!profileReady) return;
    const controller = new AbortController();
    setHistoryError(null);
    void assessmentApi.getHistory(language, controller.signal).then((items) => {
      if (!controller.signal.aborted) setHistory({ language, items });
    }).catch((error) => {
      if (!controller.signal.aborted) setHistoryError(ErrorHandler.getErrorMessage(error));
    });
    return () => controller.abort();
  }, [language, profileReady, historyVersion]);

  useEffect(() => {
    if (!testId || currentSession) return;
    const controller = new AbortController();
    setSessionError(null);
    void assessmentApi.getSelfTest(testId, controller.signal).then((testSession) => {
      if (!controller.signal.aborted) setSession(testSession);
    }).catch((error) => {
      if (!controller.signal.aborted) setSessionError(ErrorHandler.getErrorMessage(error));
    });
    return () => controller.abort();
  }, [testId, currentSession, sessionVersion]);

  const showReport = (next: AssessmentReport) => {
    setReport(next);
    window.requestAnimationFrame(() => reportTop.current?.focus());
  };

  const finishSelfTest = (completed: AssessmentReport) => {
    setHistoryVersion((version) => version + 1);
    showReport(completed);
    setParams({ language: completed.language }, { replace: true });
  };

  const run = async (kind: 'practice' | 'self_test') => {
    if (pending.current) return;
    pending.current = true;
    setAction(kind);
    setActionError(null);
    try {
      if (kind === 'practice') {
        showReport(await assessmentApi.assessPractice(language));
        setHistoryVersion((version) => version + 1);
      } else {
        const testSession = await assessmentApi.startSelfTest(language);
        setSession(testSession);
        setParams({ language, test: testSession.id });
      }
    } catch (error) {
      setActionError(ErrorHandler.getErrorMessage(error));
    } finally {
      pending.current = false;
      setAction(null);
    }
  };

  const returnToAssessment = () => setParams({ language: currentSession?.language ?? language }, { replace: true });

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Typography variant="h4" component="h1">语言能力评估</Typography>
        {testId ? (
          currentSession?.report ? (
            <>
              <AssessmentReportView report={currentSession.report} />
              <Button onClick={() => finishSelfTest(currentSession.report!)} sx={{ alignSelf: 'flex-start' }}>返回评估</Button>
            </>
          ) : currentSession ? (
            <AssessmentQuiz key={currentSession.id} session={currentSession} onExit={returnToAssessment} onComplete={finishSelfTest} />
          ) : sessionError ? (
            <Alert severity="error" action={
              <Stack direction="row" flexWrap="wrap">
                <Button onClick={() => setSessionVersion((version) => version + 1)}>重试</Button>
                <Button onClick={returnToAssessment}>返回评估</Button>
              </Stack>
            }>{sessionError}</Alert>
          ) : <LinearProgress aria-label="正在加载自测" />
        ) : (
          <>
            <Typography color="text.secondary">
              根据练习成绩或本地自测了解擅长的难度和需要复习的题目。结果供学习参考。听力、口语和正式等级需要另外评估。
            </Typography>
            <TextField
              id="assessment-language"
              select
              size="small"
              label="评估语言"
              value={language}
              disabled={action !== null}
              onChange={(event) => {
                setReport(null);
                setActionError(null);
                setParams({ language: event.target.value }, { replace: true });
              }}
              sx={{ alignSelf: 'flex-start', minWidth: 132 }}
            >
              {languages.map((item) => <MenuItem key={item} value={item}>{assessmentLanguages[item]}</MenuItem>)}
            </TextField>
            {capabilitiesError && <Alert severity="warning">无法读取个人资料。你仍然可以选择语言并进行评估。</Alert>}
            {capability && (
              <Box>
                {capability.currentLevel && <Typography>当前水平 {capability.currentLevel}（个人设置）</Typography>}
                {capability.learningGoal && <Typography color="text.secondary">目标水平 {capability.learningGoal}</Typography>}
                {capability.lastAssessedAt && (
                  <Typography color="text.secondary" variant="body2">
                    既有评估 · {new Date(capability.lastAssessedAt).toLocaleDateString('zh-CN')}
                    {capability.overallLevel && ` · ${capability.overallLevel}`}
                    {legacySkills.map(([label, key]) => typeof capability[key] === 'number' && ` · ${label} ${capability[key]}/100`)}
                  </Typography>
                )}
              </Box>
            )}
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1.25}>
                  <Typography component="h2" variant="h6">选择评估方式</Typography>
                  <Typography variant="body2" color="text.secondary">练习评估汇总最近已完成的练习。本地自测有 6 道阅读和语法题，暂时退出后可在同一浏览器继续。</Typography>
                  <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
                    <Button variant="contained" onClick={() => run('self_test')} disabled={action !== null || !profileReady}>
                      {action === 'self_test' ? '正在打开…' : '开始或继续自测'}
                    </Button>
                    <Button variant="outlined" onClick={() => run('practice')} disabled={action !== null || !profileReady}>
                      {action === 'practice' ? '正在汇总…' : '用练习记录评估'}
                    </Button>
                  </Stack>
                  {actionError && <Alert severity="info">{actionError}</Alert>}
                </Stack>
              </CardContent>
            </Card>
            {selectedReport && <Box ref={reportTop} tabIndex={-1}><AssessmentReportView report={selectedReport} /></Box>}
            <Box component="section" aria-label="评估历史">
              <Typography component="h2" variant="h6">评估历史</Typography>
              {historyError && <Alert severity="error" action={<Button onClick={() => setHistoryVersion((version) => version + 1)}>重试</Button>}>{historyError}</Alert>}
              {!reports && !historyError ? <LinearProgress aria-label="正在加载评估历史" /> : null}
              {reports?.length === 0 && <Typography color="text.secondary">完成一次评估后，报告会显示在这里。</Typography>}
              {!!reports?.length && (
                <List disablePadding>
                  {reports.map((item) => (
                    <ListItemButton key={item.id} selected={selectedReport?.id === item.id} onClick={() => showReport(item)}>
                      <ListItemText
                        primary={`${reportTitle(item)} · ${item.band ? assessmentBands[item.band] : '参考难度待确认'}`}
                        secondary={`${reportDate(item)} · ${item.correct}/${item.total} 题答对`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
            <Button component={Link} to="/practice" sx={{ alignSelf: 'flex-start' }}>前往练习题库</Button>
          </>
        )}
      </Stack>
    </Container>
  );
};

export default AssessmentPage;
