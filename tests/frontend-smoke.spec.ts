import { expect, test } from '@playwright/test';

test('opens the workshop from the welcome page and persists study data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /MNEMOS/ })).toBeVisible();
  const portrait = page.getByRole('img', { name: /动漫少女/ });
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1024);
  await page.getByRole('main').getByRole('link', { name: '进入学习' }).click();
  await page.getByRole('link', { name: '暂时跳过' }).click();
  await expect(page.getByRole('heading', { name: '学习概览' })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: '词汇', exact: true }).click();
  await page.getByLabel('单词或短语').fill('morning');
  await page.getByLabel('释义').fill('早晨');
  await page.getByRole('button', { name: '添加词条' }).click();
  await page.getByText('我的词汇').waitFor();
  await page.reload();
  await expect(page.getByRole('button', { name: '移除 morning' })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: '评估' }).click();
  await page.getByRole('button', { name: '开始自测' }).click();
  const quizzes = page.getByRole('radiogroup');
  await expect(quizzes).toHaveCount(6);
  for (const group of await quizzes.all()) await group.getByRole('radio').first().check();
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.getByRole('link', { name: '查看历史' }).click();
  await expect(page.getByText('语言等级自测')).toBeVisible();
});

test('connects a custom model and restores conversation history after reload', async ({ page }) => {
  const endpoint = 'https://model.example/v1/chat/completions';
  const key = 'dummy-key-for-test';
  const payloads: unknown[] = [];
  await page.route(endpoint, async route => {
    const headers = {
      'access-control-allow-origin': 'http://localhost:3000',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    expect(route.request().headers().authorization).toBe(`Bearer ${key}`);
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ headers, json: { choices: [{ message: { content: 'Good morning!' } }] } });
  });
  await page.goto('/#/ai-setup');
  await page.getByRole('combobox', { name: '提供方' }).click();
  await page.getByRole('option', { name: 'OpenAI 兼容 API' }).click();
  await page.getByLabel('HTTPS API 地址').fill('https://model.example/v1');
  await page.getByLabel('模型 ID').fill('test-model');
  await page.getByLabel('API 密钥').fill(key);
  await page.getByRole('button', { name: '验证并进入学习' }).click();
  await expect(page).toHaveURL(/#\/dashboard/);
  await page.getByRole('navigation').getByRole('link', { name: '对话' }).click();
  await page.getByLabel('消息').fill('Hello!');
  await page.getByRole('button', { name: '发送' }).click();
  await expect(page.getByText('Good morning!')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Good morning!')).toBeVisible();
  expect(payloads).toHaveLength(2);
  expect(await page.evaluate(() => Object.values(localStorage))).not.toContain(key);
});
