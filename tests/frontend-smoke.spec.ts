import { expect, test } from '@playwright/test';

test.describe('Frontend smoke', () => {
  test('auth page loads with login form', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/auth', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#root')).toBeVisible();

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await emailInput.fill('thelia@example.com');
    await passwordInput.fill('123456');

    await expect(emailInput).toHaveValue('thelia@example.com');
    await expect(passwordInput).toHaveValue('123456');
  });
});
