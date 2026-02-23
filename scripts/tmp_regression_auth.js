const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let issueCount = 0;

  page.on('console', (msg) => {
    if (msg.text().includes('Failed to read from localStorage')) {
      issueCount += 1;
    }
  });

  await page.goto('http://localhost:3000/auth', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.fill('input[name="email"]', 'thelia@example.com');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1800);

  const afterLogin = page.url();
  const paths = ['/dashboard', '/profile', '/vocabulary'];
  const results = [];

  for (const path of paths) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    results.push({ path, finalUrl: page.url() });
  }

  const tokenValue = await page.evaluate(() => localStorage.getItem('token'));
  const refreshValue = await page.evaluate(() => localStorage.getItem('refreshToken'));

  console.log(
    JSON.stringify(
      {
        afterLogin,
        hasToken: !!tokenValue,
        hasRefresh: !!refreshValue,
        results,
        issueCount,
      },
      null,
      2,
    ),
  );

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
