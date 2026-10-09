const connect = require('./cdp');
(async () => {
  const { browser, page } = await connect();
  await page.locator('button[aria-label="Go chatroom"]').first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'room.png' });
  // メッセージ領域のDOM構造を確認
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].map(i => ({ src: i.src.slice(0, 120), alt: i.alt, w: i.naturalWidth, cls: i.className.slice(0, 80) }));
    const main = document.querySelector('main') || document.body;
    return { text: document.body.innerText.slice(0, 3000), imgs: imgs.slice(0, 20), html: main.innerHTML.slice(0, 6000) };
  });
  console.log(info.text); console.log(JSON.stringify(info.imgs, null, 1)); console.log(info.html);
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
