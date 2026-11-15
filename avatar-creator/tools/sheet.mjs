// Contact sheet: node tools/sheet.mjs shots.json out.png [cols] [cellW cellH]
// shots.json: [{ "name": "...", "js": "code run in page (async)", "wait": 600 }]
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const [file, out, cols = '4', cw = '480', ch = '600'] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(file, 'utf8'));
const W = +cw, H = +ch;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 300)); });
await page.goto((process.env.URL || 'http://localhost:5199/') + '?fresh&bare');
await page.waitForFunction('window.__ready === true', null, { timeout: 90000 });
await page.addStyleTag({ content: '#panel,#toolbar,#toast{display:none!important} #view{height:100%!important}' });
await page.evaluate('__app.panelWidth = 0; __app.resize();');
const tiles = [];
for (const s of shots) {
  const r = await page.evaluate(`(async()=>{${s.js || ''}})()`);
  if (r !== undefined) console.log(s.name, JSON.stringify(r));
  await page.waitForTimeout(s.wait ?? 700);
  tiles.push({ name: s.name, buf: await page.screenshot() });
}
await browser.close();
const C = +cols, R = Math.ceil(tiles.length / C);
const label = (t) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="26"><rect width="100%" height="100%" fill="#201d1a"/><text x="8" y="18" font-family="sans-serif" font-size="14" fill="#fff">${t.replace(/[<&]/g, '')}</text></svg>`);
await sharp({ create: { width: C * W, height: R * (H + 26), channels: 3, background: '#201d1a' } })
  .composite(tiles.flatMap((t, i) => [
    { input: t.buf, left: (i % C) * W, top: Math.floor(i / C) * (H + 26) + 26 },
    { input: label(t.name), left: (i % C) * W, top: Math.floor(i / C) * (H + 26) },
  ])).png().toFile(out);
console.log('wrote', out);
