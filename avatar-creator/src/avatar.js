// The avatar: CPU-morphed base mesh, fitted proxies (hair, clothes, eyes...), one shared skeleton.
import * as THREE from 'three';
import { targetWeights } from './modifiers.js';
import { CONFIG } from './config.js';
import { spread, loadImage } from './data.js';
import { hairTexture, CAPEDGE } from './hair.js';

export const EXPRESSIONS = {
  blinkL: [['eye-left-closure', 1]],
  blinkR: [['eye-right-closure', 1]],
  smile: [['mouth-corner-puller', 1], ['mouth-elevation', 0.25]],
  mouthOpen: [['mouth-open', 1]],
  browUp: [['eyebrows-left-up', 1], ['eyebrows-right-up', 1]],
  browDown: [['eyebrows-left-down', 1], ['eyebrows-right-down', 1]],
};
const EXPR_NAMES = Object.keys(EXPRESSIONS);
const FACE_SLOTS = new Set(['brows', 'lashes', 'teeth', 'tongue']);
const HIDE_SLOTS = new Set(['top', 'bottom', 'full', 'shoes', 'extra']);
const FIXED = { eyes: 'eyes', teeth: 'teeth_base', tongue: 'tongue01' };

export const boneName = (n) => n.replace(/\./g, '_');

function computeNormals(P, nP, idx, vmap, out, tmp) {
  // P: positions per logical vert, idx: render-vert triangles, vmap: render -> logical
  tmp.fill(0, 0, nP * 3);
  for (let i = 0; i < idx.length; i += 3) {
    const a = vmap[idx[i]] * 3, b = vmap[idx[i + 1]] * 3, c = vmap[idx[i + 2]] * 3;
    const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
    const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    tmp[a] += nx; tmp[a + 1] += ny; tmp[a + 2] += nz;
    tmp[b] += nx; tmp[b + 1] += ny; tmp[b + 2] += nz;
    tmp[c] += nx; tmp[c + 1] += ny; tmp[c + 2] += nz;
  }
  for (let r = 0; r < vmap.length; r++) {
    const v = vmap[r] * 3;
    const l = Math.hypot(tmp[v], tmp[v + 1], tmp[v + 2]) || 1;
    out[3 * r] = tmp[v] / l; out[3 * r + 1] = tmp[v + 1] / l; out[3 * r + 2] = tmp[v + 2] / l;
  }
}

// Tiling micro-relief for skin (pores and fine creases); the 512px colour source carries none.
function makePoreNormalMap(size = 256, repeat = 46) {
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const h = new Float32Array(size * size);
  for (let n = 0; n < 2600; n++) {                       // pores: small pits
    const cx = rnd() * size, cy = rnd() * size, r = 1.1 + rnd() * 1.6, depth = 0.5 + rnd() * 0.5;
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const d = Math.hypot(x, y) / r; if (d > 1.6) continue;
      const i = ((Math.round(cy) + y + size) % size) * size + ((Math.round(cx) + x + size) % size);
      h[i] -= depth * Math.exp(-d * d * 2.2);
    }
  }
  for (let n = 0; n < 420; n++) {                        // fine creases: short shallow lines
    let x = rnd() * size, y = rnd() * size; const a = rnd() * Math.PI, len = 8 + rnd() * 22, dx = Math.cos(a), dy = Math.sin(a);
    for (let k = 0; k < len; k++) { const i = ((Math.round(y) + size) % size) * size + ((Math.round(x) + size) % size); h[i] -= 0.35; x += dx; y += dy; }
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), id = ctx.createImageData(size, size), H = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (H(x - 1, y) - H(x + 1, y)) * 1.4, ny = (H(x, y - 1) - H(x, y + 1)) * 1.4, l = Math.hypot(nx, ny, 1), i = 4 * (y * size + x);
    id.data[i] = (nx / l * 0.5 + 0.5) * 255; id.data[i + 1] = (-ny / l * 0.5 + 0.5) * 255; id.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; id.data[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.colorSpace = THREE.NoColorSpace;
  return t;
}

export class Avatar {
  constructor(D, state, skinTexture, renderer) {
    this.D = D; this.state = state; this.renderer = renderer;
    this.root = new THREE.Group(); this.root.name = 'Avatar';
    this.V = new Float32Array(D.nV * 3);
    this.dirty = { shape: true };
    this.parts = new Map();          // slot -> { id, mesh, proxy, P }
    this.texCache = new Map();
    this.loading = new Set();        // texture loads in flight (awaited before a GLB export)
    this.onRebuilt = null;
    this._partsVersion = 0;
    this._tmp = new Float32Array(D.nV * 3);
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();

    // --- skeleton
    const nb = D.bones.length;
    this.bones = D.bones.map((b) => { const o = new THREE.Bone(); o.name = boneName(b.name); return o; });
    D.bones.forEach((b, i) => { if (b.parent >= 0) this.bones[b.parent].add(this.bones[i]); });
    this.boneByName = new Map(this.bones.map((b) => [b.name, b]));
    this.rest = new Float32Array(nb * 3);   // head positions, metres
    this.tails = new Float32Array(nb * 3);
    this.skeleton = new THREE.Skeleton(this.bones, this.bones.map(() => new THREE.Matrix4()));
    this.motion = new THREE.Group(); this.motion.name = 'Motion';
    this.root.add(this.motion); this.motion.add(this.bones[0]);

    // --- expression deltas (dense, MH units) — independent of the body shape
    this.expr = {};
    if (CONFIG.expressions) for (const name of EXPR_NAMES) {
      const d = new Float32Array(D.nV * 3);
      for (const [t, w] of EXPRESSIONS[name]) {
        const tg = D.target('expression/units/caucasian/' + t);
        if (!tg) { console.warn('missing expression target', t); continue; }
        const s = tg.s * w;
        for (let k = 0; k < tg.n; k++) { const v = tg._i[k] * 3; d[v] += tg._d[3 * k] * s; d[v + 1] += tg._d[3 * k + 1] * s; d[v + 2] += tg._d[3 * k + 2] * s; }
      }
      this.expr[name] = d;
    }

    // --- body
    const B = D.body;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(B.nR * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(B.nR * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(B.uv, 2));
    const si = new Uint16Array(B.nR * 4), sw = new Float32Array(B.nR * 4);
    for (let r = 0; r < B.nR; r++) for (let k = 0; k < 4; k++) { si[4 * r + k] = D.skinIdx[4 * B.vmap[r] + k]; sw[4 * r + k] = D.skinW[4 * B.vmap[r] + k]; }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(B.idx), 1));
    this._addExprMorphs(g, B.vmap, B.nR, (name) => this.expr[name]);
    this.skinMaterial = new THREE.MeshPhysicalMaterial({
      map: skinTexture, roughness: 0.52, metalness: 0, specularIntensity: 0.45,
      sheen: 0.14, sheenRoughness: 0.5, sheenColor: new THREE.Color(1.0, 0.62, 0.5),
    });
    if (CONFIG.skinDetailNormal) {
      this.skinMaterial.normalMap = makePoreNormalMap(); this.skinMaterial.normalMap.anisotropy = Math.min(8, this.maxAniso);
      this.skinMaterial.normalScale.set(0.32, 0.32);
    }
    this.body = this._skinned(g, this.skinMaterial, 'Body');
    this.root.add(this.body);
  }

  _skinned(geometry, material, name) {
    const m = new THREE.SkinnedMesh(geometry, material);
    m.name = name; m.bind(this.skeleton, new THREE.Matrix4());
    m.frustumCulled = false; m.castShadow = CONFIG.shadows; m.receiveShadow = CONFIG.shadows;
    if (geometry.morphAttributes.position) m.updateMorphTargets();
    return m;
  }

  _addExprMorphs(geometry, vmap, nR, denseOf) {
    if (!CONFIG.expressions) return;
    const u = this.D.unit;
    geometry.morphAttributes.position = EXPR_NAMES.map((name) => {
      const d = denseOf(name); const a = new Float32Array(nR * 3);
      for (let r = 0; r < nR; r++) { const v = vmap[r] * 3; a[3 * r] = d[v] * u; a[3 * r + 1] = d[v + 1] * u; a[3 * r + 2] = d[v + 2] * u; }
      const attr = new THREE.BufferAttribute(a, 3); attr.name = name; return attr;
    });
    geometry.morphTargetsRelative = true;
    geometry.userData.targetNames = EXPR_NAMES;
  }

  setExpression(name, v) {
    const i = EXPR_NAMES.indexOf(name); if (i < 0) return;
    for (const m of this.morphMeshes()) m.morphTargetInfluences[i] = v;
  }
  morphMeshes() {
    const out = [];
    if (this.body.morphTargetInfluences) out.push(this.body);
    for (const p of this.parts.values()) if (p.mesh.morphTargetInfluences) out.push(p.mesh);
    return out;
  }

  // ------------------------------------------------------------ textures
  texture(file, { gray = false, srgb = true, cleanEdge = false } = {}) {
    const key = file + (gray ? '|g' : '') + (cleanEdge ? '|c' : '');
    let t = this.texCache.get(key);
    if (t) return t;
    if (!gray) {
      t = new THREE.Texture();
      this._track(loadImage(file).then((img) => { t.image = img; t.needsUpdate = true; }));
    } else {
      // luminance-normalised copy so material.color can tint it (survives GLB export as baseColorFactor)
      const canvas = document.createElement('canvas');
      t = new THREE.Texture();
      this._track(loadImage(file).then((img) => {
        // 2x smooth upscale: the alpha edge of the 512px source becomes a rounder contour
        const W = img.width * 2, H = img.height * 2;
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, W, H);
        const id = ctx.getImageData(0, 0, W, H); const d = id.data;
        // mean luminance of the solid pixels; soft-edge pixels often carry a pale matte colour, so pull them to the mean
        let sum = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; n++; }
        const mean = n ? Math.max(1, sum / n) : 128;
        // lift very dark sources with a gamma first (keeps strand contrast), then gain to a common level
        const gamma = Math.max(0.35, Math.min(1, Math.log(150 / 255) / Math.log(mean / 255)));
        const lifted = 255 * Math.pow(mean / 255, gamma), gain = Math.min(2.2, 160 / lifted);
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3] / 255; let l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
          l = l * a + mean * (1 - a);
          l = 255 * Math.pow(l / 255, gamma) * gain;
          l = Math.max(0, Math.min(255, 160 + (l - 160) * 1.45));   // more strand contrast
          d[i] = d[i + 1] = d[i + 2] = l;
        }
        if (cleanEdge) {
          // blur the coverage, then re-harden it: strand-level tatters become one smooth, deliberate contour
          const a = new Float32Array(W * H), b = new Float32Array(W * H), R = 5;
          for (let i = 0; i < a.length; i++) a[i] = d[4 * i + 3] / 255;
          for (let pass = 0; pass < 2; pass++) {
            for (let y = 0; y < H; y++) { let acc = 0; const row = y * W;
              for (let x = -R; x < W; x++) { if (x + R < W) acc += a[row + x + R]; if (x - R - 1 >= 0) acc -= a[row + x - R - 1]; if (x >= 0) b[row + x] = acc / (2 * R + 1); } }
            for (let x = 0; x < W; x++) { let acc = 0;
              for (let y = -R; y < H; y++) { if (y + R < H) acc += b[(y + R) * W + x]; if (y - R - 1 >= 0) acc -= b[(y - R - 1) * W + x]; if (y >= 0) a[y * W + x] = acc / (2 * R + 1); } }
          }
          for (let i = 0; i < a.length; i++) { const k = Math.min(1, Math.max(0, (a[i] - 0.3) / 0.3)); d[4 * i + 3] = 255 * k * k * (3 - 2 * k); }
        }
        ctx.putImageData(id, 0, 0); t.image = canvas; t.needsUpdate = true;
      }));
    }
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = Math.min(8, this.maxAniso);
    this.texCache.set(key, t);
    return t;
  }

  _track(promise) { this.loading.add(promise); promise.catch((e) => console.error(e)).finally(() => this.loading.delete(promise)); return promise; }
  async texturesReady() { while (this.loading.size) await Promise.allSettled([...this.loading]); }

  // iris recoloured from the one base texture: saturated pixels are iris, their value carries the fibre detail
  eyeTexture(hex) {
    const key = 'eye|' + hex;
    let t = this.texCache.get(key);
    if (t) return t;
    t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, this.maxAniso);
    this.texCache.set(key, t);
    const paint = (img) => {
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, img.width, img.height), d = id.data;
      const c = new THREE.Color(hex).convertLinearToSRGB(); const cr = c.r * 255, cg = c.g * 255, cb = c.b * 255;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        if (mx < 8) continue;
        const sat = (mx - mn) / mx; let k = (sat - 0.3) / 0.25; if (k <= 0) continue; if (k > 1) k = 1;
        const l = Math.min(1.25, (mx / 255) * 1.75);
        d[i] += (Math.min(255, cr * l) - d[i]) * k; d[i + 1] += (Math.min(255, cg * l) - d[i + 1]) * k; d[i + 2] += (Math.min(255, cb * l) - d[i + 2]) * k;
      }
      ctx.putImageData(id, 0, 0); t.image = canvas; t.needsUpdate = true;
    };
    if (!this._eyeImg) {
      this._eyeImg = loadImage('tex/eye_base.webp');
    }
    this._track(this._eyeImg.then(paint));
    return t;
  }

  _material(slot, meta) {
    const color = this.state.colors[slot];
    if (slot === 'eyes') {
      return new THREE.MeshPhysicalMaterial({ map: this.eyeTexture(this.state.eyes.color), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, alphaTest: 0.02, envMapIntensity: 0.55 });
    }
    if (slot === 'hat' && meta.gen) {
      // generated head wear: plain cloth in the chosen colour
      const t = this.state.colors.hat || meta.defaultColor || '#2d6fb0';
      return new THREE.MeshStandardMaterial({ color: new THREE.Color(t), roughness: 0.82, envMapIntensity: 0.5, side: THREE.DoubleSide });
    }
    if (slot === 'hair' && meta.gen) {
      // generated hair: solid sculpted geometry, strand pattern as tint and relief
      const strands = hairTexture(meta.tex);
      return new THREE.MeshStandardMaterial({ vertexColors: true, map: strands, bumpMap: strands, bumpScale: meta.tex === 'strand' ? 2.4 : 3.4, color: new THREE.Color(color || '#3a2a1f'), roughness: 0.6, envMapIntensity: 0.55, side: THREE.DoubleSide });
    }
    if (slot === 'hair') {
      // opaque core; the soft strand tips are drawn by a second, blended pass (see _softHair)
      const strands = this.texture(meta.map, { gray: true, cleanEdge: CONFIG.hairCleanEdge });
      return new THREE.MeshStandardMaterial({ vertexColors: true, map: strands, bumpMap: strands, bumpScale: 1.6, color: new THREE.Color(color || '#3a2a1f'), roughness: 0.62, envMapIntensity: 0.5, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide });
    }
    if (slot === 'brows' || slot === 'lashes') {
      return new THREE.MeshStandardMaterial({
        map: this.texture(meta.map, { gray: slot === 'brows' }), color: new THREE.Color(slot === 'brows' ? (color || '#2e2119') : '#16110e'),
        roughness: 0.7, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
    }
    if (slot === 'teeth' || slot === 'tongue') return new THREE.MeshStandardMaterial({ map: this.texture(meta.map), roughness: 0.35 });
    const m = new THREE.MeshStandardMaterial({
      map: this.texture(meta.map, { gray: !!color }), color: new THREE.Color(color || '#e9e9e9'),   // untinted cloth sits just under white so it keeps its shading
      roughness: slot === 'shoes' ? 0.6 : 0.85, side: THREE.DoubleSide, alphaTest: 0.5,
    });
    if (meta.normal) { m.normalMap = this.texture(meta.normal, { srgb: false }); m.normalScale.set(0.8, 0.8); }
    if (slot === 'glasses') { m.alphaTest = 0; m.transparent = true; m.roughness = 0.2; }
    // outer layers win where two garments nearly touch (boots under jeans, shirt over waistband)
    const layer = { shoes: 1, extra: 1, bottom: 2, top: 3, full: 3 }[slot];
    if (layer) { m.polygonOffset = true; m.polygonOffsetFactor = -layer; m.polygonOffsetUnits = -layer * 2; }
    return m;
  }

  _softHair(core) {
    const m = core.clone();
    m.alphaTest = 0.36; m.alphaToCoverage = false; m.transparent = true; m.depthWrite = false;
    return m;
  }

  // New materials are built first and swapped in only once their textures are in memory:
  // a garment whose texture is still loading would render invisible for a moment.
  async applyColors() {
    const version = this._colorVersion = (this._colorVersion || 0) + 1;
    const next = [...this.parts].map(([slot, p]) => [p, this._material(slot, p.proxy.meta)]);
    await this.texturesReady();
    if (version !== this._colorVersion) { next.forEach(([, m]) => m.dispose()); return; }
    for (const [p, m] of next) {
      if (!this.root.children.includes(p.mesh)) { m.dispose(); continue; }
      p.mesh.material.dispose(); p.mesh.material = m;
      if (p.soft) { p.soft.material.dispose(); p.soft.material = this._softHair(m); }
    }
  }

  // ------------------------------------------------------------ parts
  wanted() {
    const s = this.state.parts; const w = { ...FIXED };
    for (const slot of ['hair', 'brows', 'lashes', 'shoes', 'hat', 'glasses', 'extra']) if (s[slot]) w[slot] = s[slot];
    if (s.full && this.D.proxies[s.full]) w.full = s.full;
    else {
      // school-safe: a figure without an outfit always gets a top and a bottom, whatever the saved state says
      const top = this.D.proxies[s.top] ? s.top : CONFIG.schoolSafe ? CONFIG.defaultTop : null;
      const bottom = this.D.proxies[s.bottom] ? s.bottom : CONFIG.schoolSafe ? CONFIG.defaultBottom : null;
      if (top) w.top = s.top = top; if (bottom) w.bottom = s.bottom = bottom;
    }
    // a saved avatar may name a part this build no longer ships: skip it instead of failing
    for (const [slot, id] of Object.entries(w)) if (!this.D.proxies[id]) { delete w[slot]; if (s[slot] === id) s[slot] = null; }
    return w;
  }

  async syncParts() {
    const version = ++this._partsVersion;
    const want = this.wanted();
    const loaded = await Promise.all(Object.entries(want).map(async ([slot, id]) => [slot, id, await this.D.proxy(id)]));
    if (version !== this._partsVersion) return;
    // 1) build every new part off-scene
    const fresh = [];
    for (const [slot, id, proxy] of loaded) {
      if (this.parts.get(slot)?.id === id) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(proxy.nR * 3), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(proxy.nR * 3), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(proxy.uv, 2));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(proxy.skinIdx, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(proxy.skinW, 4));
      if (proxy.shade) { const c = new Float32Array(proxy.nR * 3); for (let i = 0; i < proxy.nR; i++) c[3 * i] = c[3 * i + 1] = c[3 * i + 2] = proxy.shade[i]; g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
      g.setIndex(new THREE.BufferAttribute(proxy.idx, 1));
      if (FACE_SLOTS.has(slot)) {
        if (!proxy.exprDense) {
          proxy.exprDense = {};
          for (const name of EXPR_NAMES) {
            const src = this.expr[name]; if (!src) continue;
            const d = new Float32Array(proxy.nP * 3);
            for (let i = 0; i < proxy.nP; i++) for (let k = 0; k < 3; k++) {
              const v = proxy.ref[3 * i + k] * 3, b = proxy.bary[3 * i + k];
              d[3 * i] += src[v] * b; d[3 * i + 1] += src[v + 1] * b; d[3 * i + 2] += src[v + 2] * b;
            }
            proxy.exprDense[name] = d;
          }
        }
        this._addExprMorphs(g, proxy.vmap, proxy.nR, (name) => proxy.exprDense[name]);
      }
      const mesh = this._skinned(g, this._material(slot, proxy.meta), 'Part_' + slot);
      if (slot === 'brows' || slot === 'lashes') { mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 2; }
      if (slot === 'hair' && proxy.gen) mesh.castShadow = false;   // thin overlapping clumps shadow each other as blocky patches (shadow acne)
      if (slot === 'glasses') mesh.renderOrder = 3;
      const part = { id, mesh, proxy, P: new Float32Array(proxy.nP * 3) };
      if (slot === 'hair' && CONFIG.hairSoftPass && !proxy.gen) {
        part.soft = this._skinned(g, this._softHair(mesh.material), 'Part_hair_soft');
        part.soft.castShadow = false; part.soft.receiveShadow = false; part.soft.renderOrder = 1; part.soft.userData.noExport = true;
      }
      fresh.push([slot, part]);
    }
    // 2) wait until their textures are loaded; the old parts stay on screen meanwhile
    await this.texturesReady();
    if (version !== this._partsVersion) { for (const [, p] of fresh) { p.mesh.geometry.dispose(); p.mesh.material.dispose(); } return; }
    // 3) swap in one step: nothing is ever shown half-dressed
    const drop = (p) => { this.root.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); if (p.soft) { this.root.remove(p.soft); p.soft.material.dispose(); } };
    for (const [slot, p] of [...this.parts]) if (want[slot] !== p.id) { drop(p); this.parts.delete(slot); }
    for (const [slot, part] of fresh) {
      if (part.mesh.morphTargetInfluences && this.body.morphTargetInfluences) this.body.morphTargetInfluences.forEach((v, i) => { part.mesh.morphTargetInfluences[i] = v; });
      this.root.add(part.mesh); if (part.soft) this.root.add(part.soft);
      this.parts.set(slot, part);
    }
    this._updateBodyMask();
    this.rebuild();          // positions for the new parts before the next frame is drawn
  }

  _updateBodyMask() {
    const D = this.D; const hide = new Uint8Array(D.nV); let any = false;
    for (const [slot, p] of this.parts) if (HIDE_SLOTS.has(slot)) { for (const v of p.proxy.del) hide[v] = 1; any = any || p.proxy.del.length > 0; }
    const src = D.body.idx, vm = D.body.vmap; const out = new Uint32Array(src.length); let n = 0;
    for (let i = 0; i < src.length; i += 3) {
      if (any && hide[vm[src[i]]] && hide[vm[src[i + 1]]] && hide[vm[src[i + 2]]]) continue;
      out[n++] = src[i]; out[n++] = src[i + 1]; out[n++] = src[i + 2];
    }
    this.body.geometry.setIndex(new THREE.BufferAttribute(out.subarray(0, n), 1));
  }

  // ------------------------------------------------------------ shape
  rebuild() {
    const D = this.D, V = this.V, u = D.unit;
    V.set(D.pos);
    this.missing = this.missing || new Set();
    for (const [name, w] of targetWeights(this.state)) {
      const t = D.target(name);
      if (!t) { if (!this.missing.has(name)) { this.missing.add(name); console.warn('missing target', name); } continue; }
      const s = t.s * w, I = t._i, Dd = t._d;
      for (let k = 0; k < t.n; k++) { const v = I[k] * 3; V[v] += Dd[3 * k] * s; V[v + 1] += Dd[3 * k + 1] * s; V[v + 2] += Dd[3 * k + 2] * s; }
    }
    // body
    const B = D.body, pa = this.body.geometry.attributes.position, na = this.body.geometry.attributes.normal;
    let minY = Infinity, maxY = -Infinity;
    for (let r = 0; r < B.nR; r++) {
      const v = B.vmap[r] * 3; const y = V[v + 1] * u;
      pa.array[3 * r] = V[v] * u; pa.array[3 * r + 1] = y; pa.array[3 * r + 2] = V[v + 2] * u;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    computeNormals(V, D.nV, B.idx, B.vmap, na.array, this._tmp);
    pa.needsUpdate = true; na.needsUpdate = true;
    // skeleton
    const nb = D.bones.length, rest = this.rest;
    const mean = (list, out, o) => {
      let x = 0, y = 0, z = 0;
      for (const v of list) { x += V[3 * v]; y += V[3 * v + 1]; z += V[3 * v + 2]; }
      const k = u / list.length; out[o] = x * k; out[o + 1] = y * k; out[o + 2] = z * k;
    };
    for (let i = 0; i < nb; i++) { mean(D.bones[i].head, rest, 3 * i); mean(D.bones[i].tail, this.tails, 3 * i); }
    for (let i = 0; i < nb; i++) {
      const p = D.bones[i].parent, b = this.bones[i];
      if (p < 0) b.position.set(rest[0], rest[1], rest[2]);
      else b.position.set(rest[3 * i] - rest[3 * p], rest[3 * i + 1] - rest[3 * p + 1], rest[3 * i + 2] - rest[3 * p + 2]);
      this.skeleton.boneInverses[i].makeTranslation(-rest[3 * i], -rest[3 * i + 1], -rest[3 * i + 2]);
    }
    // proxies
    for (const [slot, part] of this.parts) {
      const p = part.proxy, P = part.P;
      let sc;
      if (p.baseSpread) {
        // an axis along which the item is thin gives a noisy ratio: use the wide axes' mean there
        const cur = spread(V, p.refSet), bs = p.baseSpread, top = Math.max(bs[0], bs[1], bs[2]);
        const ratio = cur.map((x, ax) => x / bs[ax]);
        const wide = [0, 1, 2].filter((ax) => bs[ax] >= 0.5 * top), mean = wide.reduce((a, ax) => a + ratio[ax], 0) / wide.length;
        sc = ratio.map((r, ax) => Math.min(1.3, Math.max(0.78, bs[ax] >= 0.5 * top ? r : mean)));
      }
      else sc = p.scale.map(([a, b, den], ax) => Math.abs(V[3 * b + ax] - V[3 * a + ax]) / den);
      part.sc = sc;
      for (let i = 0; i < p.nP; i++) {
        const a = p.ref[3 * i] * 3, b = p.ref[3 * i + 1] * 3, c = p.ref[3 * i + 2] * 3;
        const wa = p.bary[3 * i], wb = p.bary[3 * i + 1], wc = p.bary[3 * i + 2];
        P[3 * i] = wa * V[a] + wb * V[b] + wc * V[c] + p.off[3 * i] * sc[0];
        P[3 * i + 1] = wa * V[a + 1] + wb * V[b + 1] + wc * V[c + 1] + p.off[3 * i + 1] * sc[1];
        P[3 * i + 2] = wa * V[a + 2] + wb * V[b + 2] + wc * V[c + 2] + p.off[3 * i + 2] * sc[2];
      }
      const gp = part.mesh.geometry.attributes.position, gn = part.mesh.geometry.attributes.normal;
      for (let r = 0; r < p.nR; r++) {
        const v = p.vmap[r] * 3; const y = P[v + 1] * u;
        gp.array[3 * r] = P[v] * u; gp.array[3 * r + 1] = y; gp.array[3 * r + 2] = P[v + 2] * u;
        if (slot === 'shoes' && y < minY) minY = y;
        if ((slot === 'hair' || slot === 'hat') && y > maxY) maxY = y;
      }
      if (this._tmp.length < p.nP * 3) this._tmp = new Float32Array(p.nP * 3);   // generated hair can have more vertices than the base mesh
      computeNormals(P, p.nP, p.idx, p.vmap, gn.array, this._tmp);
      if (slot === 'top' || slot === 'bottom' || slot === 'full') {
        // a little air between cloth and body, more on heavy builds where the body would otherwise poke through
        const air = 0.003 + 0.014 * Math.max(0, this.state.macro.weight - 0.5) + 0.006 * Math.max(0, this.state.macro.muscle - 0.5), A = gp.array, N = gn.array;
        for (let i = 0; i < A.length; i++) A[i] += N[i] * air;
      }
      if (slot === 'hair' && !p.gen) {
        // hair is many overlapping cards: lean the normals toward a head-centred shell so it shades as one volume
        const hi = D.bones.findIndex((b) => b.name === 'head') * 3;
        const cx = rest[hi], cy = rest[hi + 1] + 0.07, cz = rest[hi + 2] - 0.01, N = gn.array, A = gp.array;
        for (let r = 0; r < p.nR; r++) {
          let dx = A[3 * r] - cx, dy = Math.max(0, A[3 * r + 1] - cy), dz = A[3 * r + 2] - cz;
          const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
          let nx = N[3 * r], ny = N[3 * r + 1], nz = N[3 * r + 2];
          if (nx * dx + ny * dy + nz * dz < 0) { nx = -nx; ny = -ny; nz = -nz; }
          nx = nx * 0.3 + dx * 0.7; ny = ny * 0.3 + dy * 0.7; nz = nz * 0.3 + dz * 0.7;
          const k = Math.hypot(nx, ny, nz) || 1; N[3 * r] = nx / k; N[3 * r + 1] = ny / k; N[3 * r + 2] = nz / k;
        }
      }
      gp.needsUpdate = true; gn.needsUpdate = true;
    }
    // garment-on-garment: a hat hides the hair inside its crown, a long coat or tunic hides what it covers of the trousers/skirt
    const lowest = (part) => { const a = part.mesh.geometry.attributes.position.array; let m = Infinity; for (let i = 1; i < a.length; i += 3) if (a[i] < m) m = a[i]; return m; };
    // hair under head wear: a triangle goes when all its corners lie above the cap's lower edge (which is high at the front and sides, low at the neck)
    const hc = rest.slice(3 * D.bones.findIndex((b) => b.name === 'head'), 3 * D.bones.findIndex((b) => b.name === 'head') + 3);
    const CX = 0, CY = hc[1] + 0.053, CZ = hc[2] + 0.034;
    const underCap = (A, i) => {
      const dx = A[3 * i] - CX, dy = A[3 * i + 1] - CY, dz = A[3 * i + 2] - CZ, r = Math.hypot(dx, dy, dz) || 1;
      const th = Math.asin(Math.max(-1, Math.min(1, dy / r))) * 57.2958, aphi = Math.abs(Math.atan2(dx, dz)) * 57.2958;
      return th > CAPEDGE(aphi) + 6;   // hair stays up to 6 deg under the cap edge: the cap covers the jagged cut
    };
    const cullCap = (part, cap) => {
      const src = part.proxy.idx; let idx = src;
      if (cap) {
        const A = part.mesh.geometry.attributes.position.array, out = new Uint32Array(src.length); let n = 0;
        for (let i = 0; i < src.length; i += 3) {
          if (underCap(A, src[i]) && underCap(A, src[i + 1]) && underCap(A, src[i + 2])) continue;
          out[n++] = src[i]; out[n++] = src[i + 1]; out[n++] = src[i + 2];
        }
        idx = out.subarray(0, n);
      }
      if (part.culled || cap) part.mesh.geometry.setIndex(new THREE.BufferAttribute(idx, 1));
      part.culled = !!cap;
    };
    // trousers/skirt under a top: drop what lies above the top's hem
    const cullAbove = (part, cut) => {
      const src = part.proxy.idx; let idx = src;
      if (cut !== null) {
        const A = part.mesh.geometry.attributes.position.array, out = new Uint32Array(src.length); let n = 0;
        for (let i = 0; i < src.length; i += 3) {
          if (A[3 * src[i] + 1] > cut && A[3 * src[i + 1] + 1] > cut && A[3 * src[i + 2] + 1] > cut) continue;
          out[n++] = src[i]; out[n++] = src[i + 1]; out[n++] = src[i + 2];
        }
        idx = out.subarray(0, n);
      }
      if (part.culled || cut !== null) part.mesh.geometry.setIndex(new THREE.BufferAttribute(idx, 1));
      part.culled = cut !== null;
    };
    const hair = this.parts.get('hair'), hat = this.parts.get('hat'), top = this.parts.get('top'), bottom = this.parts.get('bottom');
    if (hair) cullCap(hair, !!(hat && !hat.proxy.meta.noCull));   // the cap is thicker than the hair: what it covers is dropped
    if (bottom) {
      // the top's hem at the middle of the torso (sleeves excluded): whatever the trousers/skirt have above it lies under the top
      // and would poke through it, so it is dropped. A crop top's hem is higher than the waistband, so nothing is dropped then.
      let hem = Infinity;
      if (top) { const a = top.mesh.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i]) < 0.16 && a[i + 1] < hem) hem = a[i + 1]; }
      cullAbove(bottom, Number.isFinite(hem) ? hem + CONFIG.hemMargin : null);
    }
    this.root.position.y = -minY;
    this.height = maxY - minY;
    this.bodyHeight = (() => { let m = -Infinity; for (let v = 0; v < D.core.nBody; v++) if (V[3 * v + 1] > m) m = V[3 * v + 1]; return m * u - minY; })();
    this.dirty.shape = false;
    if (this.onRebuilt) this.onRebuilt();
  }

  // world-space anchor points for camera framing
  anchor(name) {
    const i = this.D.bones.findIndex((b) => b.name === name);
    return new THREE.Vector3(this.rest[3 * i], this.rest[3 * i + 1] + this.root.position.y, this.rest[3 * i + 2]);
  }

  update() {
    if (this.dirty.shape) this.rebuild();
  }
}
