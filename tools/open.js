const connect = require('./cdp');
(async () => {
  const { browser, page } = await connect();
  await page.click('button[aria-label="Chat"]');
  await page.waitForTimeout(1500);
  const inp = page.locator('input[placeholder]').first();
  await inp.fill('麻雀質問用');
  await page.waitForTimeout(2500);
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 800));
  await page.screenshot({ path: 'search.png' });
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
