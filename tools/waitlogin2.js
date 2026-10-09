const connect = require('./cdp');
(async () => {
  const { browser, page } = await connect();
  const t0 = Date.now();
  while (Date.now() - t0 < 10 * 60 * 1000) {
    const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (txt && !txt.includes('QRコードログイン') && !txt.includes('PCログイン認証')) { console.log('LOGGED_IN'); console.log(txt.slice(0, 800)); await page.screenshot({ path: 'home.png' }); break; }
    await new Promise(r => setTimeout(r, 3000));
  }
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
