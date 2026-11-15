// GPU skin compositor: base skin (age blend) + tone + lips, blush, eye shadow, freckles,
// moles ("Punkterl"), beard shadow, tattoos and a painted underwear layer -> one texture.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { url } from './data.js';

export const MAX_MOLES = 24, MAX_TATTOOS = 8;
export const TATTOO_GLYPHS = ['★', '♥', '☾', '⚓', '☀', '♪', '∞', '✿', '⚡', '☯', '♠', '✦', '❖', '➳', '☘', '♛'];
export const SKIN_TONES = ['#f7e0d3', '#f2d0bb', '#eabf9f', '#deab88', '#cd946e', '#b57d57', '#986342', '#7a4c31', '#5a3623', '#402619'];

const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSkinA, uSkinB, uMaskA, uMaskB, uAtlas, uPos;
uniform float uHasPos, uWaist;
uniform float uAgeMix, uFreckles, uBodyFreckles, uSeed, uLip, uBlush, uShadow, uBeard, uUnderTop, uUnderBottom;
uniform vec3 uOldMul, uOldMulFace, uToneMul, uLipColor, uBlushColor, uShadowColor, uHairColor, uUnderColor;
uniform vec4 uMoles[${MAX_MOLES}];
uniform int uMoleCount;
uniform vec4 uTat[${MAX_TATTOOS}];
uniform vec4 uTatInfo[${MAX_TATTOOS}];
uniform int uTatCount;

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
float spots(vec2 uv, float scale, float density, float seed){
  vec2 g = uv * scale, id = floor(g), f = fract(g); float acc = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y)), cid = id + o;
    float exist = step(hash21(cid * 1.7 + seed * 13.1), density);
    vec2 c = o + 0.15 + 0.7 * vec2(hash21(cid + seed), hash21(cid + seed + 19.19));
    float r = mix(0.10, 0.36, hash21(cid + 7.3 + seed));
    acc = max(acc, exist * smoothstep(r, r * 0.4, length(f - c)) * mix(0.45, 1.0, hash21(cid + 3.1)));
  }
  return acc;
}
float lum(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); }
vec3 toLinear(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }

void main(){
  vec4 mA = texture2D(uMaskA, vUv), mB = texture2D(uMaskB, vUv);
  // the older variant is colour-matched to the chosen skin, so the blend adds wrinkles without shifting the tone
  float faceIsland = smoothstep(0.60, 0.66, vUv.x) * step(0.14, vUv.y) * step(vUv.y, 0.86);
  // ageing transfers the older variant's light/dark structure (wrinkles, folds) onto the chosen skin, not its colour cast
  vec3 c = texture2D(uSkinA, vUv).rgb;
  vec3 older = texture2D(uSkinB, vUv).rgb * mix(uOldMul, uOldMulFace, faceIsland);
  float relief = clamp(dot(older, vec3(0.3, 0.59, 0.11)) / max(dot(c, vec3(0.3, 0.59, 0.11)), 0.05), 0.5, 1.3);
  c = mix(c, mix(c * relief, older, 0.25), uAgeMix);
  c *= uToneMul;
  // fine detail the 512px source cannot carry: pores and faint mottling
  float pores = vnoise(vUv * 1500.0) * 0.6 + vnoise(vUv * 3100.0) * 0.4;
  c *= 1.0 + (pores - 0.5) * 0.07;
  c.gb *= 1.0 - (vnoise(vUv * 55.0) - 0.5) * 0.035;

  // blush
  c *= mix(vec3(1.0), mix(vec3(1.0), uBlushColor / max(lum(uBlushColor), 0.2) * 0.94, 0.55), clamp(mA.g * uBlush * 0.7, 0.0, 1.0));
  // eye shadow
  float lid = smoothstep(0.12, 0.55, mA.b) * uShadow;
  c = mix(c, uShadowColor * (0.55 + 0.6 * lum(c)), lid * 0.85);
  // lips
  float lip = smoothstep(0.30, 0.52, mA.r) * uLip;
  c = mix(c, uLipColor * (0.5 + 0.75 * lum(c)), lip * 0.9);

  // freckles: face cluster + body
  float fr = max(spots(vUv, 420.0, 0.75, uSeed), spots(vUv, 760.0, 0.6, uSeed + 5.0) * 0.8);
  float frMask = clamp(mA.a * uFreckles * 1.6, 0.0, 1.0) + clamp(mB.a * uBodyFreckles, 0.0, 1.0);
  float thin = smoothstep(1.0 - clamp(frMask, 0.0, 1.0), 1.0, vnoise(vUv * 90.0 + uSeed) * 0.6 + 0.5);
  c = mix(c, c * vec3(0.70, 0.52, 0.42), fr * thin * min(frMask * 1.5, 0.85) * (1.0 - lip));

  // beard shadow + stubble
  float bm = smoothstep(0.15, 0.6, mB.b) * uBeard * (1.0 - smoothstep(0.25, 0.5, mA.r));
  float stub = max(spots(vUv, 3400.0, 0.9, 3.0), spots(vUv, 2300.0, 0.7, 9.0));
  c = mix(c, c * (uHairColor * 0.75 + 0.2), bm * (0.3 + 0.6 * stub));

  // moles
  for (int i = 0; i < ${MAX_MOLES}; i++) {
    if (i >= uMoleCount) break;
    vec4 m = uMoles[i];
    float d = length(vUv - m.xy);
    float k = smoothstep(m.z, m.z * 0.5, d) * m.w;
    c = mix(c, c * vec3(0.36, 0.25, 0.21), k);
  }
  // tattoos
  for (int i = 0; i < ${MAX_TATTOOS}; i++) {
    if (i >= uTatCount) break;
    vec4 t = uTat[i]; vec4 info = uTatInfo[i];
    vec2 p = vUv - t.xy; float cs = cos(t.w), sn = sin(t.w);
    p = vec2(cs * p.x + sn * p.y, -sn * p.x + cs * p.y) / t.z + 0.5;
    if (p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0) {
      vec2 cell = vec2(mod(info.x, 4.0), 3.0 - floor(info.x / 4.0));
      float a = texture2D(uAtlas, (cell + p) / 4.0).a * info.y;
      c = mix(c, vec3(0.07, 0.10, 0.14) + c * 0.12, a * 0.88);
    }
  }
  // underwear base layer
  float mb = smoothstep(0.46, 0.54, mB.r), mt = smoothstep(0.46, 0.54, mB.g);
  float hem = max(mb - smoothstep(0.62, 0.7, mB.r), mt - smoothstep(0.62, 0.7, mB.g));
  if (uHasPos > 0.5) {
    // crisp edges from the rest-pose position of each texel (decimetres, origin at mid body)
    vec4 bp = texture2D(uPos, vUv); float e = 0.012, ax = abs(bp.x);
    float inB = smoothstep(-0.96 - e, -0.96 + e, bp.y) * (1.0 - smoothstep(uWaist - e, uWaist + e, bp.y)) * step(ax, 2.6);
    float inT = smoothstep(3.36 - e, 3.36 + e, bp.y) * (1.0 - smoothstep(4.74 - e, 4.74 + e, bp.y)) * (1.0 - smoothstep(1.56 - e, 1.56 + e, ax));
    float bandB = 1.0 - smoothstep(0.0, 0.11, min(bp.y + 0.96, uWaist - bp.y));
    float bandT = 1.0 - smoothstep(0.0, 0.09, min(min(bp.y - 3.36, 4.74 - bp.y), 1.56 - ax));
    mb = inB * bp.a; mt = inT * bp.a; hem = max(mb * bandB, mt * bandT);
  }
  float ub = max(mb * uUnderBottom, mt * uUnderTop);
  vec3 cloth = uUnderColor * (0.93 + 0.07 * sin(vUv.x * 5200.0) * sin(vUv.y * 5200.0)) * (1.0 - 0.10 * hem);
  c = mix(c, cloth, ub);

  gl_FragColor = vec4(toLinear(clamp(c, 0.0, 1.0)), 1.0);
}`;

// fills texels outside the UV islands with the average of their valid neighbours (keeps seams clean)
const SPREAD = /* glsl */`
precision highp float; varying vec2 vUv; uniform sampler2D uTex; uniform float uPx;
void main(){ vec4 m = texture2D(uTex, vUv);
  if (m.a < 0.5) { vec4 s = vec4(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec4 n = texture2D(uTex, vUv + vec2(float(x), float(y)) * uPx); if (n.a > 0.5) s += vec4(n.rgb, 1.0); }
    m = s.a > 0.0 ? vec4(s.rgb / s.a, 1.0) : vec4(0.0); }
  gl_FragColor = m; }`;

const DILATE = /* glsl */`
precision highp float; varying vec2 vUv; uniform sampler2D uTex; uniform float uPx;
void main(){ vec4 m = texture2D(uTex, vUv);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) m = max(m, texture2D(uTex, vUv + vec2(float(x), float(y)) * uPx));
  gl_FragColor = m; }`;

export class SkinCompositor {
  constructor(renderer, D) {
    this.renderer = renderer; this.D = D; this.dirty = true;
    const size = CONFIG.skinSize;
    this.rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.rt.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.texture = this.rt.texture;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quadScene = new THREE.Scene(); this.quadScene.add(this.quad);
    this.skinTex = new Map(); this.avg = new Map(); this.avgFace = new Map();
    this._buildMasks();
    this._buildAtlas();
    const v4 = (n) => Array.from({ length: n }, () => new THREE.Vector4());
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uSkinA: { value: null }, uSkinB: { value: null }, uMaskA: { value: this.maskA.texture }, uMaskB: { value: this.maskB.texture }, uAtlas: { value: this.atlas }, uPos: { value: this.posMap ? this.posMap.texture : null }, uHasPos: { value: this.posMap ? 1 : 0 }, uWaist: { value: 0.9 },
        uAgeMix: { value: 0 }, uFreckles: { value: 0 }, uBodyFreckles: { value: 0 }, uSeed: { value: 1 }, uLip: { value: 0 }, uBlush: { value: 0 },
        uShadow: { value: 0 }, uBeard: { value: 0 }, uUnderTop: { value: 0 }, uUnderBottom: { value: 1 },
        uOldMul: { value: new THREE.Vector3(1, 1, 1) }, uOldMulFace: { value: new THREE.Vector3(1, 1, 1) }, uToneMul: { value: new THREE.Vector3(1, 1, 1) }, uLipColor: { value: new THREE.Color() }, uBlushColor: { value: new THREE.Color() },
        uShadowColor: { value: new THREE.Color() }, uHairColor: { value: new THREE.Color() }, uUnderColor: { value: new THREE.Color() },
        uMoles: { value: v4(MAX_MOLES) }, uMoleCount: { value: 0 }, uTat: { value: v4(MAX_TATTOOS) }, uTatInfo: { value: v4(MAX_TATTOOS) }, uTatCount: { value: 0 },
      },
    });
  }

  // per-vertex region masks rendered once into UV space
  _buildMasks() {
    const D = this.D, B = D.body, nV = D.nV, P = D.pos, r0 = this.renderer;
    const A = new Float32Array(nV * 4), M = new Float32Array(nV * 4);
    const fromTargets = (names, ch, arr, gain) => {
      const mag = new Float32Array(nV); let max = 0;
      for (const n of names) { const t = D.target(n); if (!t) { console.warn('mask target missing', n); continue; }
        for (let k = 0; k < t.n; k++) { const m = Math.hypot(t._d[3 * k], t._d[3 * k + 1], t._d[3 * k + 2]) * t.s; const v = t._i[k]; mag[v] = Math.max(mag[v], m); if (mag[v] > max) max = mag[v]; } }
      for (let v = 0; v < nV; v++) arr[4 * v + ch] = Math.max(arr[4 * v + ch], Math.min(1, mag[v] / max * gain));
    };
    // lips: the lip-volume morphs move exactly the lip surface; each lip normalised on its own
    fromTargets(['mouth/mouth-upperlip-volume-incr'], 0, A, 1);
    fromTargets(['mouth/mouth-lowerlip-volume-incr'], 0, A, 1);
    fromTargets(['expression/units/caucasian/eye-left-closure', 'expression/units/caucasian/eye-right-closure'], 2, A, 1.6);
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const bonesOf = (re) => new Set(D.bones.map((b, i) => (re.test(b.name) ? i : -1)).filter((i) => i >= 0));
    const torso = bonesOf(/^(spine|breast|root|pelvis|clavicle|neck)/), legs = bonesOf(/^(upperleg|pelvis|spine05|spine04|root)/), arms = bonesOf(/^(upperarm|lowerarm|shoulder)/);
    const wsum = (v, set) => { let s = 0; for (let k = 0; k < 4; k++) if (set.has(D.skinIdx[4 * v + k])) s += D.skinW[4 * v + k]; return s; };
    for (let v = 0; v < D.core.nBody; v++) {
      const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2], ax = Math.abs(x);
      const front = ss(0.75, 1.15, z);
      // blush: cheek apples
      const dc = Math.hypot(ax - 0.55, y - 6.93, (z - 1.2) * 0.6);
      A[4 * v + 1] = y > 6 ? Math.exp(-(dc * dc) / (0.34 * 0.34)) : 0;
      // face freckles: nose bridge and cheeks
      A[4 * v + 3] = y > 6.2 ? front * Math.exp(-(((y - 7.02) / 0.3) ** 2)) * Math.exp(-((x / 0.8) ** 2)) : 0;
      // underwear
      M[4 * v] = ss(-1.0, -0.86, y) * ss(1.08, 0.96, y) * (wsum(v, legs) > 0.5 ? 1 : 0);
      M[4 * v + 1] = ss(3.2, 3.36, y) * ss(4.82, 4.66, y) * (wsum(v, torso) > 0.55 && ax < 1.7 ? 1 : 0);
      // beard: jaw, chin, upper lip
      const side = ss(0.05, 0.5, z) * ss(1.0, 0.75, ax);
      M[4 * v + 2] = y > 5.7 && y < 7 ? side * ss(7.08, 6.62, y - 0.12 * Math.max(0, 0.5 - ax)) * ss(5.85, 6.1, y + 0.25 * Math.max(0, z - 0.8)) : 0;
      // body freckles: shoulders, arms, upper chest/back
      M[4 * v + 3] = Math.max(wsum(v, arms) * 0.9, wsum(v, torso) * ss(4.4, 5.2, y) * ss(6.1, 5.6, y));
    }
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(B.nR * 3), ca = new Float32Array(B.nR * 4), cb = new Float32Array(B.nR * 4);
    for (let r = 0; r < B.nR; r++) {
      pos[3 * r] = B.uv[2 * r] * 2 - 1; pos[3 * r + 1] = B.uv[2 * r + 1] * 2 - 1;
      for (let k = 0; k < 4; k++) { ca[4 * r + k] = A[4 * B.vmap[r] + k]; cb[4 * r + k] = M[4 * B.vmap[r] + k]; }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aMask', new THREE.BufferAttribute(ca, 4));
    g.setIndex(new THREE.BufferAttribute(B.idx, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: 'attribute vec4 aMask; varying vec4 vM; void main(){ vM = aMask; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'precision highp float; varying vec4 vM; void main(){ gl_FragColor = vM; }',
      depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NoBlending,
    });
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
    const scene = new THREE.Scene(); scene.add(mesh);
    const floatOK = r0.extensions.has('EXT_color_buffer_float') || r0.extensions.has('EXT_color_buffer_half_float');
    let rtType = THREE.UnsignedByteType;
    const mk = () => new THREE.WebGLRenderTarget(1024, 1024, { depthBuffer: false, type: rtType });
    const r = this.renderer, prev = r.getRenderTarget(), prevClear = r.getClearColor(new THREE.Color()), prevAlpha = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    const dil = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: DILATE, uniforms: { uTex: { value: null }, uPx: { value: 1 / 1024 } }, depthTest: false, depthWrite: false });
    const bake = (attr, passes = 2, frag = null) => {
      g.setAttribute('aMask', new THREE.BufferAttribute(attr, 4));
      let a = mk(), b = mk();
      r.setRenderTarget(a); r.clear(); r.render(scene, this.cam);
      if (frag) { dil.fragmentShader = frag; dil.needsUpdate = true; }
      this.quad.material = dil;
      for (let i = 0; i < passes; i++) { dil.uniforms.uTex.value = a.texture; r.setRenderTarget(b); r.clear(); r.render(this.quadScene, this.cam); [a, b] = [b, a]; }
      b.dispose();
      return a;
    };
    this.maskA = bake(ca); this.maskB = bake(cb);
    if (floatOK) {
      const cp = new Float32Array(B.nR * 4);
      for (let q = 0; q < B.nR; q++) { const v = B.vmap[q] * 3; cp[4 * q] = P[v]; cp[4 * q + 1] = P[v + 1]; cp[4 * q + 2] = P[v + 2]; cp[4 * q + 3] = 1; }
      rtType = THREE.HalfFloatType;
      this.posMap = bake(cp, 4, SPREAD);
    }
    r.setRenderTarget(prev); r.setClearColor(prevClear, prevAlpha);
    g.dispose(); mat.dispose(); dil.dispose();
  }

  _buildAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, 1024, 1024);
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '190px "Segoe UI Symbol","Noto Sans Symbols2","DejaVu Sans",sans-serif';
    TATTOO_GLYPHS.forEach((ch, i) => ctx.fillText(ch, (i % 4) * 256 + 128, Math.floor(i / 4) * 256 + 136));
    this.atlas = new THREE.CanvasTexture(c); this.atlas.colorSpace = THREE.NoColorSpace;
  }

  _skin(id) {
    let t = this.skinTex.get(id);
    if (t) return t;
    t = new THREE.Texture(); t.colorSpace = THREE.NoColorSpace; t.loaded = false;
    const img = new Image();
    img.onload = () => {
      t.image = img; t.needsUpdate = true; t.loaded = true;
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, 64, 64);
      const mean = (x, y, w, h) => { const d = ctx.getImageData(x, y, w, h).data; let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4 * 255; return [r / n, g / n, b / n]; };
      this.avg.set(id, mean(21, 16, 9, 12));            // chest
      this.avgFace.set(id, mean(50, 22, 5, 5));         // cheek (the face island sits on the right, turned sideways)
      if (this._last) this.apply(...this._last); else this.dirty = true;
    };
    img.src = url(`tex/skin_${id}.webp`);
    this.skinTex.set(id, t);
    return t;
  }

  oldVariant(id) {
    const m = id.match(/^(young|middleage|old)_(\w+?)_(female|male)(\d*)$/);
    if (!m) return id;
    const ids = new Set(this.D.skins.map((s) => s.id));
    for (const c of [`old_${m[2]}_${m[3]}${m[4]}`, `old_${m[2]}_${m[3]}`]) if (ids.has(c)) return c;
    return id;
  }

  // s: state.skin ; ctx: { hairColor, gender }
  apply(s, ctx) {
    this._last = [s, ctx];
    const u = this.material.uniforms;
    const a = this._skin(s.base), b = this._skin(this.oldVariant(s.base));
    u.uSkinA.value = a; u.uSkinB.value = b; u.uAgeMix.value = s.wrinkles;
    const avg = this.avg.get(s.base), avgOld = this.avg.get(this.oldVariant(s.base));
    if (avg && avgOld) u.uOldMul.value.set(avg[0] / avgOld[0], avg[1] / avgOld[1], avg[2] / avgOld[2]); else u.uOldMul.value.set(1, 1, 1);
    const fa = this.avgFace.get(s.base), fo = this.avgFace.get(this.oldVariant(s.base));
    if (fa && fo) u.uOldMulFace.value.set(fa[0] / fo[0], fa[1] / fo[1], fa[2] / fo[2]); else u.uOldMulFace.value.copy(u.uOldMul.value);
    if (s.tone && avg) { const t = new THREE.Color(s.tone).convertLinearToSRGB(); u.uToneMul.value.set(t.r / avg[0], t.g / avg[1], t.b / avg[2]); }
    else u.uToneMul.value.set(1, 1, 1);
    // THREE.Color parses hex as sRGB -> linear; the compositor works on raw sRGB values
    const raw = (hex, target) => { const c = new THREE.Color(hex); c.convertLinearToSRGB(); target.copy(c); };
    raw(s.lipColor, u.uLipColor.value); raw(s.blushColor, u.uBlushColor.value); raw(s.shadowColor, u.uShadowColor.value);
    raw(ctx.hairColor, u.uHairColor.value); raw(s.underColor, u.uUnderColor.value);
    u.uFreckles.value = s.freckles; u.uBodyFreckles.value = s.bodyFreckles; u.uSeed.value = s.freckleSeed;
    u.uLip.value = s.lipStrength; u.uBlush.value = s.blush; u.uShadow.value = s.shadow; u.uBeard.value = s.beard;
    u.uUnderBottom.value = CONFIG.underwear ? 1 : 0;
    u.uWaist.value = ctx.hipsCovered ? 0.45 : 0.9;   // stays below a low waistband
    // auto: only when nothing covers the chest, so it never peeks out of a neckline
    u.uUnderTop.value = CONFIG.underwear && (s.underTop === 'on' || (s.underTop === 'auto' && ctx.gender < 0.5 && !ctx.chestCovered)) ? 1 : 0;
    const moles = CONFIG.moles ? s.moles.slice(0, MAX_MOLES) : [];
    moles.forEach((m, i) => u.uMoles.value[i].set(m.u, m.v, m.r, m.d));
    u.uMoleCount.value = moles.length;
    const tats = CONFIG.tattoos ? s.tattoos.slice(0, MAX_TATTOOS) : [];
    tats.forEach((t, i) => { u.uTat.value[i].set(t.u, t.v, t.size, t.rot); u.uTatInfo.value[i].set(t.glyph, t.alpha ?? 1, 0, 0); });
    u.uTatCount.value = tats.length;
    this.ready = a.loaded && b.loaded;
    this.dirty = true;
  }

  render() {
    if (!this.dirty || !this.material.uniforms.uSkinA.value?.loaded || !this.material.uniforms.uSkinB.value?.loaded) return false;
    const r = this.renderer, prev = r.getRenderTarget();
    this.quad.material = this.material;
    r.setRenderTarget(this.rt); r.render(this.quadScene, this.cam); r.setRenderTarget(prev);
    this.dirty = false;
    return true;
  }

  // sRGB canvas copy for GLB export
  toCanvas(size = 1024) {
    const full = CONFIG.skinSize, px = new Uint8Array(full * full * 4);
    this.renderer.readRenderTargetPixels(this.rt, 0, 0, full, full, px);
    const src = document.createElement('canvas'); src.width = src.height = full;
    const id = new ImageData(full, full);
    for (let y = 0; y < full; y++) id.data.set(px.subarray((full - 1 - y) * full * 4, (full - y) * full * 4), y * full * 4);
    src.getContext('2d').putImageData(id, 0, 0);
    if (size === full) return src;
    const out = document.createElement('canvas'); out.width = out.height = size;
    out.getContext('2d').drawImage(src, 0, 0, size, size);
    return out;
  }
}
