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
    await route.fulfill({ json: { success: true, data: [] } });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '学习概览', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'AI 配置' }).click();
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
