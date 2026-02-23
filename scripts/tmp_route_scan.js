const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const report = [];

  const collectForPath = async (path) => {
    const issues = [];

    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        issues.push({ type: 'console', msg: msg.text() });
      }
    };

    const onResponse = (response) => {
      const status = response.status();
      const url = response.url();
      if (status >= 400 && url.includes('/api/')) {
        issues.push({ type: 'api', status, url });
      }
    };

    const onRequestFailed = (req) => {
      issues.push({ type: 'requestfailed', url: req.url(), error: req.failure()?.errorText });
    };

    page.on('console', onConsole);
    page.on('response', onResponse);
    page.on('requestfailed', onRequestFailed);

    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    page.off('console', onConsole);
    page.off('response', onResponse);
    page.off('requestfailed', onRequestFailed);

    report.push({
      path,
      finalUrl: page.url(),
      issueCount: issues.length,
      issues,
    });
  };

  await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  await page.fill('input[name="email"]', 'thelia@example.com');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  const paths = [
    '/dashboard',
    '/profile',
    '/vocabulary',
    '/chat',
    '/practice',
    '/assessment',
    '/recharge',
    '/pk',
    '/admin',
  ];

  for (const path of paths) {
    await collectForPath(path);
  }

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
