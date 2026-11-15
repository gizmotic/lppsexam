// Renders one consistent thumbnail per garment/hair/hat with the app itself (dev server must run on :5199).
//   node tools/make-thumbs.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '../public/assets/thumbs');
const FRAME = { hair: 'hair', hat: 'hair', glasses: 'face', top: 'upper', extra: 'upper', bottom: 'lower', full: 'full', shoes: 'feet' };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 1136 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto((process.env.URL || 'http://localhost:5199/') + '?fresh');
await page.waitForFunction('window.__ready === true', null, { timeout: 90000 });
await page.addStyleTag({ content: '#panel,#toolbar,#toast{display:none!important} #app{background:#bfb8ae!important}' });
await page.evaluate('__app.panelWidth = 0; __app.resize(); __app.scene.children.filter(o => o.isMesh && o.material.isShadowMaterial).forEach(o => o.visible = false);');
const items = await page.evaluate((slots) => Object.entries(__app.D.proxies).filter(([, p]) => slots.includes(p.slot)).map(([id, p]) => ({ id, slot: p.slot, tags: p.tags })), Object.keys(FRAME));
for (const it of items) {
  const female = /^(female|f_)/.test(it.id) || it.tags.includes('female');
  const gender = it.id.startsWith('male') ? 1 : female ? 0 : 0.35;
  await page.evaluate(async ({ it, gender, frame }) => {
    const s = __app.state;
    Object.assign(s.macro, { gender, cup: 0.45 });
    for (const k of Object.keys(s.parts)) s.parts[k] = null;
    s.parts[it.slot] = it.id; s.parts.brows = 'eyebrow001';
    s.skin.base = gender < 0.5 ? 'young_lightskinned_female' : 'young_lightskinned_male'; s.skin.tone = '#c9beb2'; s.skin.underColor = '#b5ada3'; s.skin.underTop = gender < 0.5 ? 'on' : 'off';
    s.colors.hair = '#4a3323';
    await __app.partsChanged(); __app.colorsChanged(); __app.shapeChanged(); __app.setAnim('pose'); __app.frame(frame, true);
  }, { it, gender, frame: FRAME[it.slot] });
  await page.waitForTimeout(450);
  await sharp(await page.screenshot()).resize(176, 250).webp({ quality: 84 }).toFile(path.join(OUT, it.id + '.webp'));
}
await browser.close();
console.log('thumbnails', items.length, '->', OUT, (fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1e3).toFixed(0) + ' kB');
