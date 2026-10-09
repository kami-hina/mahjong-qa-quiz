const connect = require('./cdp');
const fs = require('fs');
const path = require('path');
(async () => {
  const { browser, page, ctx } = await connect();
  const outDir = path.join(__dirname, '..', 'images');
  const items = await page.evaluate(() => [...document.querySelectorAll('[class*="imageMessageContent-module__item"][data-message-id]')].map(e => ({ id: e.dataset.messageId, idx: e.querySelector('button')?.dataset.index || '0' })));
  const done = new Set(fs.readdirSync(outDir).map(f => f.replace(/\.\w+$/, '')));
  let ok = 0, fail = 0, popup = null, lastSrc = '';
  const T = () => Date.now();
  for (const it of items) {
    const name = it.id; // 画像メッセージごとに固有ID（グループ送信でも各画像にIDがある）
    if (done.has(name)) continue;
    const t0 = T();
    try {
      const btn = page.locator(`[class*="imageMessageContent-module__item"][data-message-id="${it.id}"] button[data-index="${it.idx}"]`).first();
      await btn.evaluate(el => el.scrollIntoView({ block: 'center' }));
      const t1 = T();
      popup = ctx.pages().find(p => p.url().includes('popup.html')) || null;
      let prevSrc = '';
      if (popup) {
        prevSrc = await popup.evaluate(() => document.querySelector('img')?.src || '').catch(() => '');
        await btn.evaluate(el => el.click());
      } else {
        [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }), btn.evaluate(el => el.click())]);
      }
      lastSrc = prevSrc;
      const t2 = T();
      await popup.waitForFunction((prev) => { const i = document.querySelector('img'); return i && i.naturalWidth > 600 && i.src !== prev; }, lastSrc, { timeout: 15000 });
      const t3 = T();
      const b64 = await popup.evaluate(async () => {
        const i = document.querySelector('img');
        const r = await fetch(i.src); const buf = await r.arrayBuffer();
        let s = ''; const u = new Uint8Array(buf); for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000));
        return { src: i.src, type: r.headers.get('content-type'), data: btoa(s), w: i.naturalWidth, h: i.naturalHeight };
      });
      lastSrc = b64.src;
      const ext = (b64.type || '').includes('png') ? 'png' : 'jpg';
      fs.writeFileSync(path.join(outDir, `${name}.${ext}`), Buffer.from(b64.data, 'base64'));
      ok++;
      console.log('saved', name, b64.w + 'x' + b64.h, 'scroll', t1 - t0, 'click', t2 - t1, 'wait', t3 - t2, 'total', T() - t0);
    } catch (e) { fail++; console.log('FAIL', name, String(e).slice(0, 150)); if (popup && !popup.isClosed()) { await popup.close().catch(() => {}); popup = null; } }
  }
  console.log('done ok=', ok, 'fail=', fail, 'remaining', items.length - done.size - ok);
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
