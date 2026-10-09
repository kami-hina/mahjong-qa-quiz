const connect = require('./cdp');
(async () => {
  const { browser, page } = await connect();
  const stat = () => page.evaluate(() => {
    const c = document.querySelector('.message_list');
    const ids = [...document.querySelectorAll('[data-message-id]')].map(e => e.dataset.messageId);
    const dates = [...document.querySelectorAll('[class*="messageDate-module__date__"]')].map(e => e.textContent);
    return { n: new Set(ids).size, st: c.scrollTop, sh: c.scrollHeight, ch: c.clientHeight, dates: [...new Set(dates)] };
  });
  const box = await page.locator('.message_list').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  let prev = '', same = 0;
  for (let i = 0; i < 200; i++) {
    await page.evaluate(() => { const c = document.querySelector('.message_list'); c.scrollTop = -(c.scrollHeight); });
    await page.mouse.wheel(0, -5000);
    await page.waitForTimeout(1200);
    const s = await stat();
    const key = s.n + ':' + s.sh;
    if (i % 10 === 0) console.log(JSON.stringify(s));
    if (key === prev) { same++; if (same >= 8) break; } else same = 0;
    prev = key;
  }
  console.log('FINAL', JSON.stringify(await stat()));
  await page.screenshot({ path: 'top.png' });
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
