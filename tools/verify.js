const connect = require('./cdp');
const fs = require('fs'); const crypto = require('crypto');
(async () => {
  const { browser, page, ctx } = await connect();
  const raw = JSON.parse(fs.readFileSync('raw.json', 'utf8')).filter(m => m.kind === 'msg' && m.type === 'imageMessageContent');
  const pick = [raw[3], raw[40], raw[70], raw[95]].filter(Boolean);
  for (const m of pick) {
    await page.evaluate(id => document.querySelector(`[data-message-id="${id}"]`).scrollIntoView({ block: 'center' }), m.id);
    let popup = ctx.pages().find(p => p.url().includes('popup.html'));
    const prev = popup ? await popup.evaluate(() => document.querySelector('img')?.src || '') : '';
    if (popup) await page.evaluate(id => document.querySelector(`[data-message-id="${id}"] button[aria-label="Show image"]`).click(), m.id);
    else [popup] = await Promise.all([ctx.waitForEvent('page'), page.evaluate(id => document.querySelector(`[data-message-id="${id}"] button[aria-label="Show image"]`).click(), m.id)]);
    await popup.waitForFunction(p => { const i = document.querySelector('img'); return i && i.naturalWidth > 600 && i.src !== p; }, prev);
    const info = await popup.evaluate(async () => { const i = document.querySelector('img'); const b = await (await fetch(i.src)).arrayBuffer(); return { text: document.body.innerText.split('\n').slice(0, 2).join(' '), bytes: Array.from(new Uint8Array(b)) }; });
    const md5 = crypto.createHash('md5').update(Buffer.from(info.bytes)).digest('hex');
    const file = fs.readdirSync('../images').find(f => f.startsWith(m.id));
    const fileMd5 = file ? crypto.createHash('md5').update(fs.readFileSync('../images/' + file)).digest('hex') : null;
    console.log(m.id, m.time.slice(4, 24), '| viewer:', info.text, '| sameFile:', md5 === fileMd5);
  }
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
