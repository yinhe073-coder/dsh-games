// games-wall: verify every staged game actually boots in a browser (local loopback static server).
// Output: per-game screenshot + console errors, so the wall entries are proven before hosting.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/yinhe/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js');

const WALL = path.resolve('C:/deepseek-harness/.dsh/bot/workspace/games-wall');
const OUT = path.join(WALL, '.verify');
fs.mkdirSync(OUT, { recursive: true });

const types = { '.js':'application/javascript','.wasm':'application/wasm','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.otf':'font/otf','.ttf':'font/ttf' };
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const f = path.resolve(WALL, '.' + (name === '/' ? '/index.html' : name));
  if (f !== WALL && !f.startsWith(WALL + path.sep)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const games = [
  { slug: 'half-sugar-chapter1', url: '/half-sugar-chapter1/index.html', waitMs: 22000, expect: '半糖心动' },
  { slug: 'ninefold-noodle', url: '/ninefold-noodle/debug.html', waitMs: 8000, expect: '小面馆' },
  { slug: 'smoke-check', url: '/smoke-check/index.html', waitMs: 6000, expect: '接入自检' }
];

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/yinhe/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const g of games) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = []; const failed = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message).slice(0, 200)));
  page.on('requestfailed', (r) => failed.push(r.url().slice(-80) + ' :: ' + (r.failure() && r.failure().errorText)));
  let ok = false, title = null, shot = null, detail = null;
  try {
    await page.goto('http://127.0.0.1:' + port + g.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(g.waitMs);
    title = await page.title();
    const probe = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { hasCanvas: !!c, canvasPx: c ? c.width + 'x' + c.height : null, bodyText: (document.body.innerText || '').slice(0, 120) };
    });
    detail = probe;
    shot = path.join(OUT, g.slug + '.png');
    await page.screenshot({ path: shot });
    ok = probe.hasCanvas || !!(title && title.includes(g.expect)) || (probe.bodyText || '').includes(g.expect);
  } catch (e) { detail = { error: String(e && e.message) }; }
  results.push({ slug: g.slug, url: g.url, title, ok, canvas: detail && detail.canvasPx, bodyText: detail && detail.bodyText, pageErrors: errors, failedRequests: failed.slice(0, 6), screenshot: shot && path.relative(WALL, shot) });
  await ctx.close();
}
await browser.close();
await new Promise((r) => server.close(r));
const report = { at: new Date().toISOString(), wall: WALL, results, allOk: results.every((r) => r.ok) };
fs.writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify(report, null, 2));
for (const r of results) console.log(`${r.slug}: ok=${r.ok} title=${JSON.stringify(r.title)} canvas=${r.canvas} errors=${r.pageErrors.length} failedReq=${r.failedRequests.length}`);
console.log('ALL_OK=' + report.allOk);
if (!report.allOk) for (const r of results) if (!r.ok) console.log('FAIL ' + r.slug + ' ' + JSON.stringify({ body: r.bodyText, errors: r.pageErrors, failed: r.failedRequests }));
