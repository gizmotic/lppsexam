// Loads dist-page inside a sandboxed iframe (opaque origin, like an embedded artifact viewer) and reports whether the app starts.
//   node tools/sandbox-check.mjs [screenshot.png]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

// static host for dist-page that allows any origin, as a page host must for a sandboxed (opaque-origin) frame
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', webp: 'image/webp', wasm: 'application/wasm' };
const root = path.resolve(import.meta.dirname, '../dist-page');
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; r.end(); return; }
  r.setHeader('access-control-allow-origin', '*'); r.setHeader('content-type', TYPES[f.split('.').pop()] || 'application/octet-stream');
  fs.createReadStream(f).pipe(r);
}).listen(5197);
const wrapper = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><body style="margin:0"><iframe sandbox="allow-scripts" src="http://localhost:5197/index.html" style="border:0;width:100vw;height:100vh"></iframe>'); }).listen(5196);
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.goto('http://localhost:5196/');
const frame = page.frames().find((f) => f.url().includes('5197')) || page.frames()[1];
let ready = false;
try { await frame.waitForFunction('window.__ready === true', null, { timeout: 45000 }); ready = true; } catch { /* reported below */ }
await page.waitForTimeout(2500);
const info = ready ? await frame.evaluate(() => ({ origin: self.origin, parts: [...__app.avatar.parts.keys()].length, skinReady: !!__app.skin.ready, fps: +__app.stats.fps.toFixed(1) })) : null;
if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
console.log(JSON.stringify({ ready, info, errors: [...new Set(errors)].slice(0, 8) }, null, 1));
await browser.close(); wrapper.close(); srv.close();
process.exit(ready && !errors.length ? 0 : 1);
