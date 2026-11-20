import { expect, test } from '@playwright/test';

test('opens the local workspace and saves AI profiles and fallback order', async ({ page }) => {
  let settings = { revision: 0, profiles: [], routes: {} };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    expect(route.request().headers().authorization).toBeUndefined();
    if (path === '/api/ai-settings') {
      if (route.request().method() === 'PUT') {
        const update = route.request().postDataJSON();
        settings = { ...update, revision: update.revision + 1 };
      }
      await route.fulfill({ json: settings });
      return;
    }
    if (path === '/api/users/profile') {
      await route.fulfill({ json: { id: 'local', username: '本地工作台' } });
      return;
    }
    if (path === '/api/users/learning-status') {
      await route.fulfill({ json: { success: true, data: { languages: [], recentPractices: [], completedPractices: 0 } } });
      return;
    }
    await route.abort('failed');
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '学习概览', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'AI 配置' }).click();
  await expect(page).toHaveURL(/\/ai-settings$/);

  for (const [name, provider] of [['日常', '本机 Codex'], ['备用', '本机 Claude Code']]) {
    await page.getByRole('button', { name: '新增配置' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: '配置名称' }).fill(name);
    await dialog.getByRole('combobox', { name: '提供方' }).click();
    await page.getByRole('option', { name: provider }).click();
    await dialog.getByRole('button', { name: '应用到草稿' }).click();
  }

  for (const name of ['日常', '备用']) {
    await page.getByRole('combobox', { name: '选择要加入的配置' }).click();
    await page.getByRole('option', { name }).click();
    await page.getByRole('button', { name: '加入', exact: true }).click();
  }
  await page.getByRole('button', { name: '上移第 2 项' }).click();
  await page.getByRole('button', { name: '保存配置' }).click();
  await expect(page.getByText('AI 配置已保存。')).toBeVisible();

  await page.reload();
  const items = page.getByRole('list', { name: '调用顺序' }).getByRole('listitem');
  await expect(items.nth(0)).toHaveText(/主配置.*备用/);
  await expect(items.nth(1)).toHaveText(/备用 1.*日常/);
});

test('mobile navigation opens from the keyboard and follows current-page links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/users/profile') return route.fulfill({ json: { id: 'local', username: '本地工作台' } });
    if (pathname === '/api/users/learning-status') return route.fulfill({ json: { data: { languages: [], recentPractices: [] } } });
    if (pathname === '/api/assessment/capabilities') return route.fulfill({ json: { data: [] } });
    return route.abort();
  });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: '主导航' });
  await page.getByRole('button', { name: '打开导航' }).press('Enter');
  await navigation.getByRole('button', { name: '学习中心' }).press('Enter');
  await navigation.getByRole('link', { name: '能力评估' }).press('Enter');
  await expect(page.getByRole('heading', { name: '语言能力评估' })).toBeVisible();
  await expect(navigation).toBeHidden();
  await page.getByRole('button', { name: '打开导航' }).click();
  await expect(navigation.getByRole('link', { name: '能力评估' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByText('充值中心')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();
  expect(await page.locator('main').evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(390);
});

test('chat preserves a draft on failure and can resend it', async ({ page }) => {
  let attempts = 0;
  const draft = 'Could we practise a greeting?';
  await page.route('**/api/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/users/profile') return route.fulfill({ json: { id: 'local', username: '本地工作台' } });
    if (pathname === '/api/chat/history') return route.fulfill({ json: { success: true, messages: [], hasMore: false } });
    if (pathname !== '/api/chat/message') return route.abort();
    expect(route.request().postDataJSON().content).toBe(draft);
    if (++attempts === 1) {
      return route.fulfill({ status: 503, json: { detail: '请先配置 AI 提供方。' } });
    }
    const message = { userId: 'local', timestamp: new Date().toISOString(), processingStatus: 'completed' };
    return route.fulfill({ json: {
      success: true,
      userMessage: { ...message, id: 'prompt', content: draft, type: 'user_text' },
      message: { ...message, id: 'reply', content: 'Hello!', type: 'ai_response' },
    } });
  });
  await page.goto('/chat');
  const input = page.getByRole('textbox', { name: '消息' });
  await input.fill(draft);
  await page.getByRole('button', { name: '发送' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('请先配置 AI 提供方。');
  await expect(input).toHaveValue(draft);
  await expect(page.getByRole('main').getByRole('link', { name: 'AI 配置' })).toHaveAttribute('href', '/ai-settings');
  await input.press('Enter');
  await expect(page.getByText('Hello!', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('');
  expect(attempts).toBe(2);
});

test('AI configuration keeps the draft when another browser saves first', async ({ page }) => {
  let revision = 0;
  let attemptedSave = false;
  await page.route('**/api/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/users/profile') return route.fulfill({ json: { id: 'local', username: '本地工作台' } });
    if (pathname !== '/api/ai-settings') return route.abort();
    if (route.request().method() === 'PUT') {
      attemptedSave = true;
      revision++;
      return route.fulfill({ status: 409, json: { detail: 'AI 配置已在另一窗口更新，请重新加载后再保存。' } });
    }
    return route.fulfill({ json: { revision, profiles: [], routes: {} } });
  });
  await page.goto('/ai-settings');
  await page.getByRole('button', { name: '新增配置' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: '配置名称' }).fill('尚未保存');
  await dialog.getByRole('combobox', { name: '提供方' }).click();
  await page.getByRole('option', { name: '本机 Codex' }).click();
  await dialog.getByRole('button', { name: '应用到草稿' }).click();
  await page.getByRole('button', { name: '保存配置' }).click();
  await expect(page.getByRole('alert')).toContainText('另一窗口更新');
  await expect(page.getByText('尚未保存', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '放弃草稿并重载' }).click();
  await expect(page.getByRole('button', { name: '保存配置' })).toBeDisabled();
  expect(attemptedSave).toBe(true);
});
