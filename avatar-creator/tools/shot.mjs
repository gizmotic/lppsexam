// node tools/shot.mjs out.png [w h] [js-to-eval-before-shot]
import { chromium } from 'playwright';
const [out, w = '1280', h = '800', js = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(process.env.URL || 'http://localhost:5199/');
await page.waitForFunction('window.__ready === true', null, { timeout: 60000 });
if (js) { const r = await page.evaluate(`(async()=>{${js}})()`); if (r !== undefined) console.log(JSON.stringify(r)); }
await page.waitForTimeout(+(process.env.WAIT || 800));
await page.screenshot({ path: out, timeout: 180000 });
await browser.close();
