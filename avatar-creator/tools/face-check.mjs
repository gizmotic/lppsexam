// Loads a head-scan image into the running app (dev server on :5199) and renders face, side, bald and full views + the processed texture.
//   node tools/face-check.mjs <image> <out.png>   (use only images you have the rights to; never commit them)
import { chromium } from 'playwright';
import sharp from 'sharp';
const [img, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 200)); });
await page.goto('http://localhost:5199/?fresh&skin=1024');
await page.waitForFunction('window.__ready === true', null, { timeout: 90000 });
await page.addStyleTag({ content: '#panel,#toolbar,#toast{display:none!important} #view{height:100%!important}' });
await page.evaluate('__app.panelWidth = 0; __app.resize(); __app.ui.preset("m")');
await page.waitForTimeout(1500);
await page.evaluate(`(async()=>{ __app.setAnim('pose'); __app.state.parts.hair='gen_fade_crop'; __app.state.colors.hair='#4a3323'; __app.state.colors.brows='#4a3323'; await __app.partsChanged(); __app.colorsChanged(); })()`);
// the file input lives in the (hidden) panel: open the skin tab to build it
await page.evaluate("__app.ui.open('skin')");
await page.locator('#face-file').setInputFiles(img);
await page.waitForTimeout(2500);
const info = await page.evaluate(() => ({ on: __app.skin.material.uniforms.uFaceOn.value, avg: __app.skin.faceAvg, dbg: __app.skin.faceDebug }));
console.log(JSON.stringify(info));
const shots = [];
for (const [name, js] of [['face', "__app.frame('face',true)"], ['side', "__app.frame('side',true)"], ['bald', "__app.state.parts.hair=null; await __app.partsChanged(); __app.frame('face',true)"], ['full', "__app.state.parts.hair='gen_curtains'; await __app.partsChanged(); __app.frame('full',true)"]]) {
  await page.evaluate(`(async()=>{${js}})()`); await page.waitForTimeout(1500);
  shots.push(await page.screenshot({ timeout: 180000 }));
}
const fc = await page.evaluate(() => __app.skin.faceCanvas.toDataURL('image/png'));
await browser.close();
const W = 1000, H = 900;
const tex = await sharp(Buffer.from(fc.split(',')[1], 'base64')).resize(W, null).png().toBuffer();
const th = (await sharp(tex).metadata()).height;
await sharp({ create: { width: W * 2, height: H * 2 + th, channels: 3, background: '#222' } }).composite([
  ...shots.map((b, i) => ({ input: b, left: (i % 2) * W, top: Math.floor(i / 2) * H })), { input: tex, left: 0, top: H * 2 }]).png().toFile(out);
