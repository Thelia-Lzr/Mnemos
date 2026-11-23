import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'frontend-smoke.spec.ts',
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm start --prefix frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { BROWSER: 'none' },
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
});
