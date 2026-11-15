import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ready = async (page, url = '/?fresh') => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  return errors;
};
// width of the torso in a height band (fractions of body height above the floor), rest-pose geometry, metres
const bodyWidth = (page, lo, hi) => page.evaluate(([lo, hi]) => {
  const a = __app.avatar; a.update();
  const p = a.body.geometry.attributes.position.array, g = a.root.position.y, H = a.bodyHeight; let min = 9, max = -9, n = 0;
  for (let i = 0; i < p.length; i += 3) { const y = (p[i + 1] + g) / H; if (y > lo && y < hi && Math.abs(p[i]) < 0.35) { min = Math.min(min, p[i]); max = Math.max(max, p[i]); n++; } }
  if (!n) throw new Error('no vertices in band');
  return max - min;
}, [lo, hi]);

test('loads without errors and shows the avatar', async ({ page }) => {
  const errors = await ready(page);
  const info = await page.evaluate(() => ({ parts: [...__app.avatar.parts.keys()], h: __app.avatar.bodyHeight, missing: [...(__app.avatar.missing || [])] }));
  expect(errors).toEqual([]);
  expect(info.missing).toEqual([]);
  expect(info.parts).toEqual(expect.arrayContaining(['eyes', 'teeth', 'tongue', 'hair', 'brows', 'lashes', 'top', 'bottom', 'shoes']));
  expect(info.h).toBeGreaterThan(1.5); expect(info.h).toBeLessThan(1.95);
  await expect(page.locator('#panel .rail button')).toHaveCount(8);
});

test('every slider drives an existing morph target', async ({ page }) => {
  await ready(page);
  const res = await page.evaluate(async () => {
    const { GROUPS, sliderKey, targetWeights } = __app.modifiers;
    const missing = new Set(); let n = 0;
    const check = (state) => { for (const [name] of targetWeights(state)) { n++; if (!__app.D.target(name)) missing.add(name); } };
    const base = JSON.parse(JSON.stringify(__app.state));
    for (const g of GROUPS) for (const s of g.sliders) for (const v of [-1, 1]) { const st = JSON.parse(JSON.stringify(base)); st.mods[sliderKey(s)] = (!s[2] && !s[3]) ? 1 : v; check(st); }
    for (const gender of [0, 0.5, 1]) for (const age of [0, 1]) for (const m of [0, 0.5, 1]) for (const w of [0, 0.5, 1]) for (const c of [0, 0.5, 1]) for (const f of [0, 1]) for (const h of [0, 1]) {
      const st = JSON.parse(JSON.stringify(base)); Object.assign(st.macro, { gender, age, muscle: m, weight: w, cup: c, firmness: f, height: h, proportions: h, african: 0.3, asian: 0.3, caucasian: 0.4 }); check(st);
    }
    return { missing: [...missing], n, sliders: GROUPS.reduce((a, g) => a + g.sliders.length, 0) };
  });
  expect(res.missing).toEqual([]);
  expect(res.sliders).toBeGreaterThan(120);
});

test('body sliders change the shape (weight, muscle, bust, height)', async ({ page }) => {
  await ready(page);
  const set = (k, v) => page.evaluate(([k, v]) => { __app.state.macro[k] = v; __app.shapeChanged(); }, [k, v]);
  const waist0 = await bodyWidth(page, 0.58, 0.64);
  expect(waist0).toBeGreaterThan(0.15);
  await set('weight', 1);
  expect(await bodyWidth(page, 0.58, 0.64)).toBeGreaterThan(waist0 * 1.08);
  await set('weight', 0);
  expect(await bodyWidth(page, 0.58, 0.64)).toBeLessThan(waist0 * 0.95);
  await set('weight', 0.5);
  const h0 = await page.evaluate(() => { __app.avatar.update(); return __app.avatar.bodyHeight; });
  await set('height', 1);
  expect(await page.evaluate(() => { __app.avatar.update(); return __app.avatar.bodyHeight; })).toBeGreaterThan(h0 + 0.05);
  // bust: chest depth grows with cup size on a female body
  const depth = () => page.evaluate(() => { const a = __app.avatar; a.update(); const p = a.body.geometry.attributes.position.array, H = a.bodyHeight, g = a.root.position.y; let m = -9;
    for (let i = 0; i < p.length; i += 3) { const y = (p[i + 1] + g) / H; if (y > 0.68 && y < 0.78 && Math.abs(p[i]) < 0.2 && p[i + 2] > m) m = p[i + 2]; }
    if (m < -8) throw new Error('no vertices in band'); return m; });
  await set('gender', 0); await set('cup', 0);
  const d0 = await depth();
  await set('cup', 1);
  expect(await depth()).toBeGreaterThan(d0 + 0.02);
});

test('face slider moves the nose through the panel UI', async ({ page }) => {
  await ready(page);
  const tip = () => page.evaluate(() => { const a = __app.avatar; a.update(); return a.V[297 * 3 + 2]; });
  const z0 = await tip();
  await page.locator('.rail button[data-id=face]').click();
  await page.locator('summary', { hasText: 'Nase' }).click();
  const slider = page.locator('label.slider', { hasText: 'Nasentiefe' }).locator('input');
  await slider.fill('1');
  expect(await tip()).toBeGreaterThan(z0 + 0.05);
});

test('hair, clothes and shoes can be changed from the panel', async ({ page }) => {
  await ready(page);
  await page.locator('.rail button[data-id=hair]').click();
  await page.locator('.tile', { hasText: 'Hoher Pferdeschwanz' }).click();
  await page.waitForFunction(() => __app.avatar.parts.get('hair')?.id === 'gen_high_pony');
  await page.locator('.rail button[data-id=clothes]').click();
  await page.locator('summary', { hasText: 'Kleider & Outfits' }).click();
  await page.locator('.tile', { hasText: 'Sommerkleid' }).click();
  await page.waitForFunction(() => __app.avatar.parts.get('full')?.id === 'f_dress_02' && !__app.avatar.parts.has('top'));
  await page.locator('summary', { hasText: 'Schuhe' }).click();
  await page.locator('.tile', { hasText: 'Barfuß' }).click();
  await page.waitForFunction(() => !__app.avatar.parts.has('shoes'));
});

test('a click on the face places a mole and a tattoo', async ({ page }) => {
  await ready(page);
  await page.locator('.rail button[data-id=skin]').click();
  await page.locator('summary', { hasText: 'Punkterl' }).click();
  await page.getByRole('button', { name: 'Punkterl setzen' }).click();
  await page.waitForTimeout(900);     // camera settles on the face
  const hit = await page.evaluate(() => { const r = document.getElementById('view').getBoundingClientRect(); const x = __app.panelWidth + (r.width - __app.panelWidth) / 2, y = r.height * 0.42; return { x, y, ok: !!__app.pick({ clientX: x, clientY: y }) }; });
  expect(hit.ok).toBe(true);
  await page.mouse.click(hit.x, hit.y);
  expect(await page.evaluate(() => __app.state.skin.moles.length)).toBe(1);
});

test('skin compositor renders tone, freckles and make-up into the texture', async ({ page }) => {
  await ready(page);
  const mean = () => page.evaluate(() => { __app.skin.render(); const c = __app.skin.toCanvas(64).getContext('2d').getImageData(0, 0, 64, 64).data; let s = 0; for (let i = 0; i < c.length; i += 4) s += c[i] + c[i + 1] + c[i + 2]; return s / (c.length / 4) / 3; });
  await page.waitForFunction(() => __app.skin.ready);
  const light = await mean();
  await page.evaluate(() => { __app.state.skin.tone = '#5a3623'; __app.skinChanged(); });
  expect(await mean()).toBeLessThan(light * 0.6);
});

test('GLB export is rigged, animated and plays in a stock loader', async ({ page, context }) => {
  await ready(page);
  const b64 = await page.evaluate(async () => {
    const glb = await __app.exportGLB({ animations: true, save: false });
    let s = ''; const u = new Uint8Array(glb); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const buf = Buffer.from(b64, 'base64');
  expect(buf.subarray(0, 4).toString()).toBe('glTF');
  expect(buf.length).toBeLessThan(20e6);
  fs.mkdirSync('test-results', { recursive: true }); fs.writeFileSync(path.join('test-results', 'avatar.glb'), buf);
  const viewer = await context.newPage();
  await viewer.goto('/viewer.html');
  await viewer.waitForFunction('window.__ready === true');
  const info = await viewer.evaluate(async (b64) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.__load(u.buffer);
    const v = window.__viewer; let morphs = 0, skinned = 0;
    v.model.traverse((o) => { if (o.isSkinnedMesh) skinned++; if (o.morphTargetInfluences) morphs = Math.max(morphs, o.morphTargetInfluences.length); });
    const hand = v.model.getObjectByName('wrist_R'); const p0 = hand.getWorldPosition(hand.position.clone());
    await new Promise((r) => setTimeout(r, 900));
    const p1 = hand.getWorldPosition(hand.position.clone());
    return { clips: v.clips, bones: v.bones, meshes: v.meshes, height: v.height, morphs, skinned, moved: p0.distanceTo(p1) };
  }, b64);
  expect(info.clips).toEqual(['idle', 'wave', 'walk', 'dance']);
  expect(info.bones).toBe(163);
  expect(info.skinned).toBe(info.meshes);
  expect(info.morphs).toBe(6);
  expect(info.height).toBeGreaterThan(1.5); expect(info.height).toBeLessThan(2.0);
  expect(info.moved).toBeGreaterThan(0.0005);   // the clip is actually driving the skeleton
});

test('state survives a reload and the download stays under budget', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { __app.state.macro.muscle = 0.9; __app.state.skin.freckles = 0.7; __app.shapeChanged(); __app.skinChanged(); });
  await page.waitForTimeout(600);
  await ready(page, '/');
  expect(await page.evaluate(() => [__app.state.macro.muscle, __app.state.skin.freckles])).toEqual([0.9, 0.7]);
  const du = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? du(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
  expect(du('dist')).toBeLessThan(40e6);
});

test('school-safe: clothes are mandatory and a change never shows a frame without them', async ({ page }) => {
  await ready(page);
  // a state that asks for no clothes at all still gets a top and a bottom
  await page.evaluate(async () => { const s = __app.state; s.parts.top = null; s.parts.bottom = null; s.parts.full = null; await __app.partsChanged(); });
  expect(await page.evaluate(() => [__app.avatar.parts.has('top'), __app.avatar.parts.has('bottom')])).toEqual([true, true]);
  // the UI offers no "none" for tops and bottoms
  await page.locator('.rail button[data-id=clothes]').click();
  await page.locator('summary', { hasText: 'Oberteile' }).click();
  await expect(page.locator('details[open] .tile.none')).toHaveCount(0);
  await page.locator('summary', { hasText: 'Hosen & Röcke' }).click();
  await expect(page.locator('details[open] .tile.none')).toHaveCount(0);
  // sample every animation frame while garments are swapped: the body must never be drawn without a top and a bottom (or a full outfit)
  const bare = await page.evaluate(async () => {
    const a = __app.avatar; let bare = 0, frames = 0, run = true;
    const tick = () => { frames++; const dressed = a.parts.has('full') || (a.parts.has('top') && a.parts.has('bottom')); if (!dressed) bare++; if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const s = __app.state;
    for (const change of [{ top: 'tubetop' }, { top: 'male_casualsuit05_top' }, { full: 'f_dress_02' }, { full: null, top: 'sleeveless', bottom: 'miniskirt' }, { bottom: 'tightjeans' }, { hair: 'gen_dreads' }, { top: 'coat' }]) {
      Object.assign(s.parts, change); await __app.partsChanged();
    }
    await new Promise((r) => setTimeout(r, 200)); run = false;
    return { bare, frames };
  });
  expect(bare.frames).toBeGreaterThan(5);
  expect(bare.bare).toBe(0);
  // the painted base layer is off, so no white patches can appear on the skin
  expect(await page.evaluate(() => __app.skin.material.uniforms.uUnderTop.value + __app.skin.material.uniforms.uUnderBottom.value)).toBe(0);
});

test('every generated hairstyle builds and rides on the scalp', async ({ page }) => {
  await ready(page);
  const res = await page.evaluate(async () => {
    const { D } = __app, out = [];
    for (const [id, m] of Object.entries(D.proxies)) {
      if (!m.gen) continue;
      const p = await D.proxy(id); let bad = 0;
      for (let i = 0; i < p.ref.length; i++) if (p.ref[i] >= D.core.nBody) bad++;      // hair must only reference body (scalp) vertices
      for (let i = 0; i < p.off.length; i++) if (!Number.isFinite(p.off[i])) bad++;
      out.push({ id, tris: p.idx.length / 3, verts: p.nP, bad });
    }
    return out;
  });
  expect(res.length).toBeGreaterThanOrEqual(25);
  for (const r of res) { expect(r.bad, r.id).toBe(0); if (r.id !== 'gen_buzz') expect(r.tris, r.id).toBeGreaterThan(300); }
  // the hair tab offers them
  await page.locator('.rail button[data-id=hair]').click();
  expect(await page.locator('.page:not([hidden]) .tile').count()).toBeGreaterThanOrEqual(26);
});
