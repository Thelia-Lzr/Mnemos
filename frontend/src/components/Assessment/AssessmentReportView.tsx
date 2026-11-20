import React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { AssessmentReport, assessmentBands } from '../../services/assessmentApi';

export const reportTitle = (report: AssessmentReport) => report.source === 'practice' ? '练习评估' : '本地自测';

export const reportDate = (report: AssessmentReport) =>
  new Date(report.completedAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

const AssessmentReportView: React.FC<{ report: AssessmentReport }> = ({ report }) => {
  const enoughPractice = report.bands[0].total >= report.minimumQuestions;

  return (
    <Card variant="outlined" component="section" aria-label="评估报告">
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography component="h2" variant="h5">评估报告</Typography>
            <Typography variant="body2" color="text.secondary">{reportTitle(report)} · {reportDate(report)}</Typography>
          </Box>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
            <Chip label={`参考难度 · ${report.band ? assessmentBands[report.band] : '待确认'}`} color={report.band ? 'primary' : 'default'} />
            <Chip label={`${report.correct} / ${report.total} 题答对`} variant="outlined" />
          </Stack>
          {!report.band && (
            <Alert severity="info">
              {enoughPractice
                ? '基础档的正确率未达到评定线。可以复习后再试。'
                : '基础档的练习样本不足。可以补做基础练习，或直接做本地自测。'}
            </Alert>
          )}
          <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {report.bands.map(({ band, correct, total }) => (
              <Box component="li" key={band} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography>{assessmentBands[band]}</Typography>
                <Typography color="text.secondary">{total ? `${correct} / ${total} 题答对` : '暂无样本'}</Typography>
              </Box>
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            从基础档起逐档评定。每档至少有 {report.minimumQuestions} 题，且正确率达到 {report.passingPercent}%。
          </Typography>
          <Divider />
          {report.practice.length > 0 && (
            <>
              <Typography component="h3" variant="subtitle1">采用的练习记录</Typography>
              <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5 }}>
                {report.practice.map((attempt) => (
                  <Box component="li" key={attempt.resultId} sx={{ overflowWrap: 'anywhere' }}>
                    {attempt.title} · {assessmentBands[attempt.band]} · {attempt.correct}/{attempt.total} 题
                  </Box>
                ))}
              </Stack>
            </>
          )}
          {report.answers.length > 0 && (
            <Box>
              <Typography component="h3" variant="subtitle1" sx={{ mb: 1 }}>逐题讲解</Typography>
              {report.answers.map((answer, index) => {
                const correct = answer.selectedIndex === answer.correctIndex;
                return (
                  <Accordion key={answer.id} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore />} id={`review-${answer.id}`} aria-controls={`answer-${answer.id}`}>
                      <Stack sx={{ minWidth: 0 }} direction="row" alignItems="baseline" spacing={1}>
                        <Typography variant="body2" color={correct ? 'success.main' : 'error.main'} sx={{ flexShrink: 0 }}>
                          {index + 1}. {correct ? '正确' : '待复习'}
                        </Typography>
                        <Typography sx={{ overflowWrap: 'anywhere' }}>{answer.prompt}</Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={0.75} sx={{ overflowWrap: 'anywhere' }}>
                        <Typography>你的答案 · {answer.options[answer.selectedIndex]}</Typography>
                        {!correct && <Typography>正确答案 · {answer.options[answer.correctIndex]}</Typography>}
                        <Typography color="text.secondary">{answer.explanation}</Typography>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AssessmentReportView;
