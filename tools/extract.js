const connect = require('./cdp');
const fs = require('fs');
(async () => {
  const { browser, page } = await connect();
  const data = await page.evaluate(() => {
    const list = document.querySelector('.message_list');
    const out = [];
    // DOM順（column-reverseなので表示は逆）で全ノードを歩き、日付区切りとメッセージを拾う
    const nodes = [...list.querySelectorAll('[class*="messageDate-module__date__"], .message-module__message__7odk3')];
    for (const n of nodes) {
      if (n.className.includes('messageDate')) { out.push({ kind: 'date', text: n.textContent.trim() }); continue; }
      const m = { kind: 'msg' };
      m.cls = n.className.trim();
      m.dir = n.getAttribute('data-direction') || n.parentElement.className.toString().slice(0, 80);
      const un = n.querySelector(':scope > pre[class*="username"], :scope > div > pre[class*="username"], pre[class*="username"]');
      m.sender = un ? un.textContent.trim() : null;
      const t = n.querySelector('time[datetime]'); m.time = t ? t.getAttribute('datetime') : null;
      const cw = n.querySelector('[data-message-id]'); m.id = cw ? cw.dataset.messageId : null;
      m.type = cw ? cw.className.split('-module')[0] : null;
      const reply = n.querySelector('[class*="replyMessageContent-module__content_wrap"]');
      if (reply) {
        m.isReply = true;
        const q = reply.querySelector('button[aria-label="See in chat"]');
        m.quoteSender = q?.querySelector('pre[class*="username"]')?.textContent.trim() || null;
        m.quoteText = q?.querySelector('[class*="replyMessageContent-module__text"]')?.textContent.trim() || null;
        m.quoteImg = q?.querySelector('[class*="origin_content"] img')?.src || null;
        m.quoteHtml = q ? q.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '').slice(0, 300) : null;
        const inner = reply.querySelector('[class*="reply_content"] [data-message-id]');
        m.innerType = inner ? inner.className.split('-module')[0] : null;
        m.text = inner?.querySelector('[data-is-message-text]')?.textContent || inner?.textContent || null;
        m.imgs = inner ? [...inner.querySelectorAll('img')].map(i => i.src) : [];
      } else {
        m.text = cw?.querySelector('[data-is-message-text]')?.textContent ?? null;
        m.imgs = cw ? [...cw.querySelectorAll('img')].map(i => i.src) : [];
        if (m.type === 'imageMessageContent') m.html = cw.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '').slice(0, 600);
      }
      out.push(m);
    }
    return out;
  });
  fs.writeFileSync('raw.json', JSON.stringify(data, null, 1));
  console.log('count', data.length);
  const types = {}; data.forEach(d => { const k = d.kind + ':' + (d.type || '') + ':' + (d.innerType || '') + ':' + (d.sender || 'me'); types[k] = (types[k] || 0) + 1; });
  console.log(types);
  console.log(JSON.stringify(data.slice(0, 12), null, 1));
  await browser.close().catch(()=>{});
})().catch(e => { console.error(e); process.exit(1); });
