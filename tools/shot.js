const connect = require('./cdp');
(async () => {
  const { browser, page } = await connect();
  const out = process.argv[2] || 'shot.png';
  await page.screenshot({ path: out });
  console.log(page.url());
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 2000));
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
