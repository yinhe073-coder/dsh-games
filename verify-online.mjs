// games-wall: verify the DEPLOYED https entries (what the game wall iframe will actually load).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/yinhe/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js');

const BASE = 'https://yinhe073-coder.github.io/dsh-games/';
const OUT = 'C:/deepseek-harness/.dsh/bot/workspace/games-wall/.verify-online';
fs.mkdirSync(OUT, { recursive: true });
const games = [
  { slug: 'half-sugar-chapter1', url: BASE + 'half-sugar-chapter1/index.html', wait: 26000 },
  { slug: 'ninefold-noodle', url: BASE + 'ninefold-noodle/debug.html', wait: 9000 },
  { slug: 'smoke-check', url: BASE + 'smoke-check/index.html', wait: 6000 }
];
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/yinhe/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = [];
for (const g of games) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message).slice(0, 160)));
  page.on('requestfailed', (r) => failed.push(r.url().slice(-90) + ' :: ' + (r.failure() && r.failure().errorText)));
  let rec = { slug: g.slug, url: g.url, ok: false };
  try {
    await page.goto(g.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(g.wait);
    rec.title = await page.title();
    const probe = await page.evaluate(() => { const c = document.querySelector('canvas'); return { hasCanvas: !!c, canvas: c ? c.width + 'x' + c.height : null }; });
    rec.hasCanvas = probe.hasCanvas; rec.canvas = probe.canvas;
    const shot = path.join(OUT, g.slug + '.png');
    await page.screenshot({ path: shot });
    rec.screenshot = shot;
    rec.ok = probe.hasCanvas || !!(rec.title && rec.title.length > 1);
  } catch (e) { rec.error = String(e && e.message).slice(0, 200); }
  rec.pageErrors = errors; rec.failedRequests = failed.slice(0, 6);
  out.push(rec);
  await ctx.close();
}
await browser.close();
const report = { at: new Date().toISOString(), base: BASE, results: out, allOk: out.every((r) => r.ok) };
fs.writeFileSync(path.join(OUT, 'verify-online.json'), JSON.stringify(report, null, 2));
for (const r of out) console.log(`${r.slug}: ok=${r.ok} title=${JSON.stringify(r.title)} canvas=${r.canvas} errors=${r.pageErrors.length} failed=${r.failedRequests.length} ${r.error ? 'ERR=' + r.error : ''}`);
console.log('ALL_OK=' + report.allOk);
