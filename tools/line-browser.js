// LINE Chrome拡張を読み込んだChromiumを起動し、CDPポート9333で待ち受ける。
// ログイン状態は tools/profile に保存される（gitには含めない）。
const path = require('path');
const { chromium } = require('C:/Users/hinap/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright');

(async () => {
  const ext = path.join(__dirname, 'line-ext');
  const profile = path.join(__dirname, 'profile');
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    executablePath: 'C:/Users/hinap/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    viewport: { width: 1200, height: 900 },
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      '--remote-debugging-port=9333',
      '--lang=ja',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = sw.url().split('/')[2];
  console.log('EXT_ID=' + id);
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(`chrome-extension://${id}/index.html`);
  console.log('READY');
  // 開いたまま待機
  await new Promise(() => {});
})().catch(e => { console.error(e); process.exit(1); });
