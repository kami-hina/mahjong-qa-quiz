// 共通: 起動済みブラウザにCDP接続し、LINE拡張ページを返す
const { chromium } = require('C:/Users/hinap/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright');
module.exports = async function connect() {
  const browser = await chromium.connectOverCDP('http://localhost:9333');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().startsWith('chrome-extension://')) || ctx.pages()[0];
  return { browser, ctx, page };
};
