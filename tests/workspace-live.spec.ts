import { expect, test, type Locator, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const api = process.env.MNEMOS_TEST_API_URL?.replace(/\/$/, '');
let provider: Server;
let failingCalls = 0;

const answer = 'Bonjour';
const practicePrompt = 'Complétez la salutation.';
const conversationPrompt = 'Bonjour, travaillons les salutations.';
const conversationAnswer = 'Commençons par les salutations.';
const analysisAdvice = 'Révisez les salutations avec un exemple.';
const word = 'papillon';

function responseFor(prompt: string) {
  if (prompt === 'Reply with OK.') return 'OK';
  if (prompt.includes('提取重要单词和短语')) return [{ word, definition: '蝴蝶', part_of_speech: 'nom' }];
  if (prompt.includes('为以下') && prompt.includes('单词生成练习题')) return {
    questions: [{ word, content: 'Quel mot signifie 蝴蝶 ?', options: [word, 'soleil'], correct_answer: word }],
  };
  if (prompt.includes('练习题目。')) return {
    questions: [
      { type: 'multiple_choice', content: practicePrompt, options: [answer, 'Merci'], correct_answer: answer, explanation: 'Une salutation.' },
      { type: 'fill_in_blank', content: 'Complétez le remerciement.', options: [], correct_answer: 'Merci', explanation: 'Une formule de remerciement.' },
    ],
  };
  if (prompt.includes('分析用户的练习结果')) return {
    learning_advice: analysisAdvice, strengths: ['Les salutations'], weaknesses: [], improvement_suggestions: ['Répétez.'],
    confidence_score: 90, overall_progress_direction: 'improved',
  };
  if (prompt.includes('学习材料：')) return { summary: 'Un texte sur Paris.', vocabulary: [], grammar_points: [], learning_suggestions: [] };
  if (prompt.includes('学习推荐') || prompt.includes('学习建议') && prompt.includes('quick_practice_options')) return {
    review_items: [{ description: '复习法语问候语', count: 5 }],
    new_learning: [{ topic: '练习日常问候', estimated_time: 10 }],
    practice_suggestions: ['练习问候'],
    quick_practice_options: [{ id: 'qa-grammar', type: 'grammar', title: '问候语练习', description: '练习法语问候语', difficulty: 'beginner' }],
  };
  if (prompt.includes('用户的问题')) return 'Bonjour est une salutation.';
  return conversationAnswer;
}

async function select(page: Page, control: Locator, option: string) {
  await control.click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('真实工作台与本地模拟模型', () => {
  test.skip(!api, '使用 scripts/test-workspace.sh 创建独立测试工作台。');
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    expect(new URL(api!).hostname).toBe('127.0.0.1');
    expect((await (await request.get(`${api}/health`)).json()).status).toBe('healthy');
    const previousSettings = await (await request.get(`${api}/api/ai-settings`)).json();
    expect(previousSettings.profiles).toHaveLength(0);
    expect((await (await request.get(`${api}/api/user-languages`)).json()).data).toHaveLength(0);

    provider = createServer(async (req, res) => {
      if (req.url === '/unavailable/responses') {
        failingCalls++;
        res.writeHead(500).end();
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const { input } = JSON.parse(Buffer.concat(chunks).toString());
      const reply = responseFor(input.at(-1).content);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        status: 'completed', model: 'local-test', output_text: typeof reply === 'string' ? reply : JSON.stringify(reply),
      }));
    });
    await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
    const port = (provider.address() as AddressInfo).port;
    const profileIds = [randomUUID(), randomUUID()];
    const profiles = profileIds.map((id, index) => ({
      id, name: ['主服务', '备用服务'][index], provider: 'responses',
      endpoint: `http://127.0.0.1:${port}/${index === 0 ? 'unavailable/' : ''}responses`,
      model: 'local-test', ...(index === 1 ? { api_key: 'test-key' } : {}),
    }));
    const configured = await request.put(`${api}/api/ai-settings`, {
      data: { revision: previousSettings.revision, profiles, routes: { default: profileIds } },
    });
    await expect(configured).toBeOK();
    expect((await configured.json()).profiles[1]).toMatchObject({ has_api_key: true });
    expect(await configured.text()).not.toContain('test-key');
  });

  test.afterAll(async () => {
    if (provider?.listening) await new Promise<void>((resolve) => provider.close(() => resolve()));
  });

  test('首次打开、添加语言、编辑目标、查看评估和每日建议反馈', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '学习概览' })).toBeVisible();
    await expect(page.getByText('暂无已完成的练习。')).toBeVisible();
    await page.getByRole('link', { name: '添加语言' }).click();
    await page.getByRole('button', { name: '添加语言' }).click();
    const dialog = page.getByRole('dialog');
    await select(page, dialog.getByRole('combobox', { name: '语言', exact: true }), '法语');
    await select(page, dialog.getByRole('combobox', { name: '当前水平' }), 'B1');
    await select(page, dialog.getByRole('combobox', { name: '目标水平（可选）' }), 'C1');
    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('B1', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await select(page, dialog.getByRole('combobox', { name: '目标水平（可选）' }), '无目标');
    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(dialog).toBeHidden();
    await page.goto('/assessment');
    await expect(page.getByText('当前水平 B1')).toBeVisible();
    await page.getByRole('button', { name: '用练习记录评估' }).click();
    await expect(page.getByText('该语言还没有已完成的练习。可以先做本地自测。')).toBeVisible();
    await expect(page.getByRole('button', { name: '开始或继续自测' })).toBeEnabled();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '今日学习建议' })).toBeVisible();
    await page.getByRole('button', { name: '提供反馈' }).click();
    await dialog.getByRole('textbox', { name: /其他意见/ }).fill('适合复习。');
    await dialog.getByRole('button', { name: '提交反馈' }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByText(/已提交反馈/)).toBeVisible();
    await page.getByRole('button', { name: '更新反馈' }).click();
    await expect(dialog.getByRole('textbox', { name: /其他意见/ })).toHaveValue('适合复习。');
    await dialog.getByRole('button', { name: '取消' }).click();
    await page.getByRole('link', { name: /前往出题/ }).first().click();
    await expect(dialog.getByRole('combobox', { name: '语言', exact: true })).toHaveText('法语');
    await dialog.getByRole('button', { name: '取消' }).click();
  });

  test('移动端自测可以续答、交卷、回看逐题讲解并重新自测', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/assessment?language=fr');
    await page.getByRole('button', { name: '开始或继续自测' }).click();
    await expect(page.getByRole('heading', { name: '法语本地自测' })).toBeVisible();
    const testId = new URL(page.url()).searchParams.get('test')!;
    const reopen = await request.post(`${api}/api/assessment/reassessment`, { data: { language: 'fr' } });
    const reopened = (await reopen.json()).data;
    expect(reopened.id).toBe(testId);
    expect(reopened.questions).toHaveLength(6);
    expect(await reopen.text()).not.toContain('correctIndex');
    expect(await reopen.text()).not.toContain('explanation');
    const invalid = await request.post(`${api}/api/assessment/reassessment/${testId}/submit`, {
      data: { answers: { [reopened.questions[0].id]: 9 } },
    });
    expect(invalid.status()).toBe(422);
    await expect(page.getByRole('button', { name: '下一题' })).toBeDisabled();
    await page.getByRole('radio', { name: 'suis', exact: true }).check();
    await page.getByRole('button', { name: '稍后继续' }).click();
    await page.getByRole('button', { name: '开始或继续自测' }).click();
    await expect(page.getByText('第 2 / 6 题 · 已答 1 题')).toBeVisible();
    await page.reload();
    await expect(page.getByText('第 2 / 6 题 · 已答 1 题')).toBeVisible();
    for (const [index, option] of [
      'Non, il est fermé.', 'lirai', 'Prendre le train suivant.', 'soient', 'La reconduction exige un nouvel examen.',
    ].entries()) {
      await page.getByRole('radio', { name: option, exact: true }).check();
      await page.getByRole('button', { name: index === 4 ? '交卷并评分' : '下一题' }).click();
    }
    const report = page.getByRole('region', { name: '评估报告' });
    await expect(report.getByText('参考难度 · 基础')).toBeVisible();
    await expect(report.getByText('5 / 6 题答对')).toBeVisible();
    await report.getByRole('button', { name: /待复习.*Si j’avais/ }).click();
    await expect(report.getByText('你的答案 · lirai')).toBeVisible();
    await expect(report.getByText('正确答案 · lirais')).toBeVisible();

    const replay = await request.post(`${api}/api/assessment/reassessment/${testId}/submit`, {
      data: { answers: { [reopened.questions[0].id]: 0 } },
    });
    expect((await replay.json()).data).toMatchObject({ id: testId, correct: 5, total: 6 });
    await page.reload();
    await expect(page.getByRole('region', { name: '评估历史' }).getByText('本地自测 · 基础')).toBeVisible();
    await page.getByRole('button', { name: '开始或继续自测' }).click();
    await expect(page.getByRole('heading', { name: 'Nous ___ deux cafés, s’il vous plaît.' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('test')).not.toBe(testId);
    expect(await page.locator('main').evaluate((main) => main.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('对话、UTF-8 材料和历史刷新，主服务失败后回退', async ({ page }) => {
    const priorFailures = failingCalls;
    await page.goto('/chat');
    await expect(page.getByRole('heading', { name: 'AI 学习助手' })).toBeVisible();
    await select(page, page.getByRole('combobox', { name: '对话语言' }), '法语');
    const message = page.getByRole('textbox', { name: '消息' });
    await message.fill(conversationPrompt);
    await message.press('Enter');
    await expect(page.getByText(conversationAnswer, { exact: true })).toBeVisible();
    expect(failingCalls).toBeGreaterThan(priorFailures);
    await page.locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Paris est une ville.') });
    await expect(page.getByText('Un texte sur Paris.', { exact: true })).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from([0xff, 0xfe, 0xab]) });
    await expect(page.getByRole('main').getByRole('alert')).toContainText('UTF-8');
    await page.getByRole('button', { name: '消息操作' }).last().click();
    await page.getByRole('menuitem', { name: '删除' }).click();
    await page.getByRole('button', { name: '确认删除' }).click();
    await expect(page.getByText('Un texte sur Paris.', { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(conversationPrompt, { exact: true })).toBeVisible();
    await expect(page.getByText(conversationAnswer, { exact: true })).toBeVisible();
    await expect(page.getByText('Un texte sur Paris.', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '清空对话' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();
    await expect(page.getByText(conversationPrompt, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '清空对话' }).click();
    await page.getByRole('button', { name: '确认删除' }).click();
    await expect(page.getByText(conversationPrompt, { exact: true })).toHaveCount(0);
  });

  test('生成练习、重新打开试题、答题、查看历史和保存 AI 分析', async ({ page, request }) => {
    await page.goto('/practice');
    await page.getByRole('button', { name: '创建练习' }).first().click();
    const dialog = page.getByRole('dialog');
    await select(page, dialog.getByRole('combobox', { name: '语言', exact: true }), '法语');
    await dialog.getByRole('button', { name: /智能生成/ }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await page.getByRole('button', { name: '开始练习' }).click();
    await page.getByRole('button', { name: '开始答题' }).click();
    await expect(page.getByText(practicePrompt, { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: answer }).check();
    await page.getByRole('button', { name: '下一题' }).click();
    await expect(page.getByRole('textbox', { name: '答案' })).toHaveValue('');
    await page.getByRole('textbox', { name: '答案' }).fill('merci');
    await page.getByRole('button', { name: '完成练习' }).click();
    await expect(page.getByText('100%', { exact: true })).toBeVisible();
    await page.goto('/practice-history');
    await page.getByRole('textbox', { name: '搜索练习' }).fill('no match');
    await expect(page.getByRole('button', { name: '查看完整结算' })).toHaveCount(0);
    await page.getByRole('button', { name: '清除筛选' }).click();
    await page.getByRole('button', { name: '查看完整结算' }).click();
    await expect(page.getByText('100%', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '整体追问' }).click();
    await dialog.getByRole('textbox', { name: '您的问题' }).fill('Pourquoi dit-on bonjour ?');
    await dialog.getByRole('button', { name: '发送问题' }).click();
    await expect(dialog.getByText('Bonjour est une salutation.', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: '关闭' }).click();
    await page.getByRole('button', { name: 'AI结果分析' }).click();
    await expect(page.getByRole('heading', { name: 'AI学习分析报告' })).toBeVisible();
    await page.goto('/practice-history');
    await page.getByRole('button', { name: '查看AI分析' }).click();
    await expect(page.getByRole('heading', { name: 'AI学习分析报告' })).toBeVisible();
    await page.goto('/');
    await expect(page.getByText('已完成 1 次练习')).toBeVisible();
    await page.goto('/assessment?language=fr');
    await page.getByRole('button', { name: '用练习记录评估' }).click();
    const assessment = page.getByRole('region', { name: '评估报告' });
    await expect(assessment.getByText('参考难度 · 待确认')).toBeVisible();
    await expect(assessment.getByRole('heading', { name: '采用的练习记录' })).toBeVisible();
    const reportResults = await Promise.all([1, 2].map(() => request.post(`${api}/api/assessment/comprehensive`, {
      data: { language: 'fr' },
    })));
    const [firstReport, secondReport] = await Promise.all(reportResults.map(async (response) => (await response.json()).data));
    expect(firstReport).toMatchObject({ source: 'practice', total: 2, correct: 2, band: null });
    expect(firstReport.practice).toHaveLength(1);
    expect(secondReport.id).toBe(firstReport.id);
    const newestPractice = await request.get(`${api}/api/practice/history?limit=1`);
    const [{ practiceGroupId }] = (await newestPractice.json()).data;
    const exercise = await request.get(`${api}/api/practice/group/${practiceGroupId}`);
    const { questions } = await exercise.json();
    const secondAttempt = await request.post(`${api}/api/practice/group/${practiceGroupId}/submit`, {
      data: { totalTime: 3000, answers: questions.map(({ id }: { id: string }) => ({
        questionId: id, userAnswer: 'incorrect', timeSpent: 1500, attempts: 1,
      })) },
    });
    await expect(secondAttempt).toBeOK();
    const updatedReport = await request.post(`${api}/api/assessment/comprehensive`, { data: { language: 'fr' } });
    const updated = (await updatedReport.json()).data;
    expect(updated).toMatchObject({ correct: 0, total: 2 });
    expect(updated.practice).toHaveLength(1);
    expect(updated.id).not.toBe(firstReport.id);


    await page.goto('/practice-history');
    await expect(page.getByRole('button', { name: '查看完整结算' })).toBeVisible();
    await page.getByRole('button', { name: '批量管理' }).click();
    await page.getByRole('button', { name: '全选', exact: true }).click();
    await page.getByRole('button', { name: /删除历史记录 \(1\)/ }).click();
    await dialog.getByRole('button', { name: '确认删除历史记录' }).click();
    await expect(page.getByText('练习未完成')).toBeVisible();
    await page.goto('/practice');
    await expect(page.getByRole('button', { name: '开始练习' })).toBeVisible();
  });

  test('添加和筛选生词、提交词汇练习、查看复习计划', async ({ page }) => {
    await page.goto('/vocabulary');
    await page.getByRole('button', { name: '法语' }).click();
    await page.getByRole('button', { name: '添加词汇' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: '输入文本内容' }).fill('Un papillon.');
    await dialog.getByRole('button', { name: '添加词汇' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(word, { exact: true })).toBeVisible();
    await select(page, page.getByRole('combobox', { name: '掌握程度' }), '新词');
    await expect(page.getByText(word, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '生成练习' }).click();
    await expect(dialog.getByText('Quel mot signifie 蝴蝶 ?')).toBeVisible();
    await dialog.getByRole('radio', { name: word }).check();
    await dialog.getByRole('button', { name: '提交答案' }).click();
    await dialog.getByRole('button', { name: '完成练习' }).click();
    await dialog.getByRole('button', { name: '保存结果' }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('tab', { name: '学习分析' }).click();
    await expect(page.getByText('已掌握', { exact: false }).first()).toBeVisible();
    await page.getByRole('tab', { name: '复习计划' }).click();
    await expect(page.getByRole('button', { name: `复习 ${word}` })).toBeVisible();
    await page.getByRole('tab', { name: '词汇列表' }).click();
    await select(page, page.getByRole('combobox', { name: '掌握程度' }), '全部');
    await page.getByRole('button', { name: `${word} 的操作` }).click();
    await page.getByRole('menuitem', { name: '删除' }).click();
    await dialog.getByRole('button', { name: '确认删除' }).click();
    await expect(page.getByText('暂无词汇')).toBeVisible();
  });

  test('AI 连接、PK 历史和排行榜、工作台管理，支付入口已移除', async ({ page, request }) => {
    await page.goto('/ai-settings');
    await page.getByRole('button', { name: '测试 备用服务 的连接' }).click();
    await expect(page.getByText(/备用服务 连接成功/)).toBeVisible();
    await page.goto('/pk');
    await expect(page.getByText('还没有对战记录')).toBeVisible();
    await page.getByRole('tab', { name: '排行榜', exact: true }).first().click();
    await expect(page.getByText('MMR排行榜')).toBeVisible();
    await page.getByRole('tab', { name: '我的统计' }).click();
    await expect(page.getByText('我的PK统计')).toBeVisible();
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: '已完成练习' })).toBeVisible();
    await page.getByRole('tab', { name: '用户管理' }).click();
    const search = page.getByRole('textbox', { name: '搜索资料' });
    await search.fill('missing profile');
    await expect(page.getByText('未找到符合条件的资料')).toBeVisible();
    await search.fill('本地');
    await page.getByRole('button', { name: '查看 本地工作台 的资料' }).click();
    await expect(page.getByRole('dialog')).toContainText('本地工作台');
    await page.getByRole('button', { name: '关闭' }).click();
    await page.getByRole('tab', { name: '任务队列' }).click();
    await expect(page.getByRole('heading', { name: '任务队列管理' })).toBeVisible();
    await expect(page.getByText('old-completed', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '清理记录' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '清理记录' }).click();
    await expect(page.getByText('old-completed', { exact: true })).toHaveCount(0);
    await expect(page.getByText('recent-completed', { exact: true })).toBeVisible();
    await expect(page.getByText('old-failed', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: '系统监控' }).click();
    await expect(page.getByText('Database', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Redis', { exact: true }).first()).toBeVisible();
    expect((await request.get(`${api}/api/payment/packages`)).status()).toBe(404);
    expect((await request.get(`${api}/api/admin/packages`)).status()).toBe(404);
    await page.goto('/recharge');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('navigation', { name: '主导航' }).getByText('充值', { exact: false })).toHaveCount(0);
  });
});
