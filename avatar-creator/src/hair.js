// Generated hairstyles: clean sculpted hair built on the avatar's own scalp instead of alpha-card assets.
// A style is a thickness/offset field over the scalp, optional hanging lengths from the hairline, and
// optional attached pieces (bun, tail, braids, locks). The result is an ordinary "proxy" (every hair vertex
// rides on scalp vertices), so it follows all head sliders, the skeleton and the GLB export like any garment.
import * as THREE from 'three';
import { finishProxy } from './data.js';

const C = [0, 7.5, 0.5];                  // skull centre in base-mesh units (decimetres)
const DEG = 180 / Math.PI;
// hairline: elevation (deg, seen from the skull centre) below which there is no hair, by azimuth (0 = front, 180 = back).
// Measured from where the bundled short hairstyles sit on the base head.
const HAIRLINE = [[0, 10], [12, 10], [22, 5], [32, -4], [42, -14], [52, -23], [62, -30], [70, -31], [79, -12], [88, -5], [98, -9], [107, -32], [116, -50], [130, -54], [150, -57], [180, -58]];

// elevation (deg) of the lower edge of a cap, by azimuth: high over the forehead, lower at the ears and neck
export const CAPEDGE = (aphi) => (aphi < 50 ? lerp(12, 6, ss(0, 50, aphi)) : aphi < 90 ? lerp(6, -2, ss(50, 90, aphi)) : lerp(-2, -12, ss(90, 180, aphi)));
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function hairlineDeg(aphi) {
  for (let i = 1; i < HAIRLINE.length; i++) if (aphi <= HAIRLINE[i][0]) { const [a0, v0] = HAIRLINE[i - 1], [a1, v1] = HAIRLINE[i]; return lerp(v0, v1, ss(a0, a1, aphi)); }
  return HAIRLINE[HAIRLINE.length - 1][1];
}
function headInfo(x, y, z) {
  const dx = x - C[0], dy = y - C[1], dz = z - C[2], r = Math.hypot(dx, dy, dz) || 1;
  const phi = Math.atan2(dx, dz) * DEG, th = Math.asin(dy / r) * DEG;
  return { phi, aphi: Math.abs(phi), th, r, x: dx, y: dy, z: dz };
}
// value noise
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const n = (a, b, c) => hash3(ix + a, iy + b, iz + c);
  return lerp(lerp(lerp(n(0, 0, 0), n(1, 0, 0), u), lerp(n(0, 1, 0), n(1, 1, 0), u), v), lerp(lerp(n(0, 0, 1), n(1, 0, 1), u), lerp(n(0, 1, 1), n(1, 1, 1), u), v), w);
}

// ---------------------------------------------------------------- scalp (cached per data set)
// Per body vertex: hairline distance s (dm, > 0 = hair; used for the painted stubble) and elevation.
// Plus a refined copy of the skull surface: every refined vertex is a weighted mix of the three corners of one
// original triangle, which is exactly what a fitted proxy vertex is.
export function scalp(D) {
  if (D._scalp) return D._scalp;
  const nV = D.nV, P = D.pos, s = new Float32Array(nV).fill(-1), th = new Float32Array(nV), N = new Float32Array(nV * 3);
  const idx = D.body.idx, vm = D.body.vmap;
  for (let i = 0; i < idx.length; i += 3) {
    const a = vm[idx[i]] * 3, b = vm[idx[i + 1]] * 3, c = vm[idx[i + 2]] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const q of [a, b, c]) { N[q] += n[0]; N[q + 1] += n[1]; N[q + 2] += n[2]; }
  }
  // ears: how far the ear-size morph moves a vertex is a smooth "this is ear" measure
  const ear = new Float32Array(nV);
  for (const name of ['ears/l-ear-scale-incr', 'ears/r-ear-scale-incr']) {
    const t = D.target(name); if (!t) continue;
    for (let k = 0; k < t.n; k++) ear[t._i[k]] = Math.max(ear[t._i[k]], Math.hypot(t._d[3 * k], t._d[3 * k + 1], t._d[3 * k + 2]) * t.s);
  }
  const valid = new Uint8Array(nV);
  for (let v = 0; v < D.core.nBody; v++) {
    const l = Math.hypot(N[3 * v], N[3 * v + 1], N[3 * v + 2]) || 1; N[3 * v] /= l; N[3 * v + 1] /= l; N[3 * v + 2] /= l;
    const y = P[3 * v + 1]; if (y < 6.0) continue;
    const h = headInfo(P[3 * v], y, P[3 * v + 2]); th[v] = h.th;
    // only the outer skull surface: normals point away from the centre (drops mouth cavity, eye sockets, inner ear)
    const out = (N[3 * v] * h.x + N[3 * v + 1] * h.y + N[3 * v + 2] * h.z) / h.r;
    if (out < 0.2 || h.r < 0.55) continue;
    valid[v] = 1;
    s[v] = Math.min((h.th - hairlineDeg(h.aphi)) / DEG * 0.95, (EAR_CUT - ear[v]) * 6);
  }
  // refined skull: two rounds of 1-to-4 splits of every triangle that can carry hair
  const key = new Map(), verts = [], tris = [];
  const vert = (r, w) => {
    const pairs = []; for (let k = 0; k < 3; k++) if (w[k] > 1e-6) pairs.push([r[k], Math.round(w[k] * 64)]);
    pairs.sort((x, y) => x[0] - y[0]); const k = pairs.map((q) => q[0] + ':' + q[1]).join(',');
    let i = key.get(k); if (i === undefined) { i = verts.length; key.set(k, i); verts.push({ r, w }); } return i;
  };
  const mid = (r, a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const split = (r, a, b, c, n) => {
    if (n === 0) { tris.push(vert(r, a), vert(r, b), vert(r, c)); return; }
    const ab = mid(r, a, b), bc = mid(r, b, c), ca = mid(r, c, a);
    split(r, a, ab, ca, n - 1); split(r, ab, b, bc, n - 1); split(r, ca, bc, c, n - 1); split(r, ab, bc, ca, n - 1);
  };
  for (let i = 0; i < idx.length; i += 3) {
    const r = [vm[idx[i]], vm[idx[i + 1]], vm[idx[i + 2]]];
    if (!valid[r[0]] || !valid[r[1]] || !valid[r[2]]) continue;
    if (Math.max(s[r[0]], s[r[1]], s[r[2]]) < -0.45) continue;
    split(r, [1, 0, 0], [0, 1, 0], [0, 0, 1], 2);
  }
  const n = verts.length, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), earV = new Float32Array(n);
  verts.forEach((q, i) => {
    for (let k = 0; k < 3; k++) { const v = q.r[k], w = q.w[k]; if (!w) continue; for (let c = 0; c < 3; c++) { pos[3 * i + c] += P[3 * v + c] * w; nrm[3 * i + c] += N[3 * v + c] * w; } earV[i] += ear[v] * w; }
    const l = Math.hypot(nrm[3 * i], nrm[3 * i + 1], nrm[3 * i + 2]) || 1; nrm[3 * i] /= l; nrm[3 * i + 1] /= l; nrm[3 * i + 2] /= l;
  });
  // hairline distance evaluated at the refined position: a smooth contour even where the skull mesh is coarse
  const fs = new Float32Array(n);
  for (let i = 0; i < n; i++) { const h = headInfo(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); fs[i] = Math.min((h.th - hairlineDeg(h.aphi)) / DEG * 0.95, (EAR_CUT - earV[i]) * 6); }
  const fe = new Float32Array(n); for (let i = 0; i < n; i++) fe[i] = (EAR_CUT - earV[i]) * 6;
  return (D._scalp = { s, th, N, fine: { verts, tris: Uint32Array.from(tris), pos, nrm, s: fs, e: fe } });
}
const EAR_CUT = 0.2;

// ---------------------------------------------------------------- clip the refined skull to a field f (> 0 = hair)
function clipMesh(fine, f) {
  const src = fine.tris, verts = [], tris = [], keep = new Map(), cuts = new Map();
  const use = (i) => { let k = keep.get(i); if (k === undefined) { k = verts.length; keep.set(i, k); verts.push({ r: fine.verts[i].r, w: fine.verts[i].w, src: i, t: 0, src2: i }); } return k; };
  const basis = (q, r) => r.map((v) => { const k = q.r.indexOf(v); return k < 0 ? 0 : q.w[k]; });
  const cut = (i, j, r) => {                          // point on edge i-j where f crosses zero, in the weights of triangle r
    const k = i < j ? i * 1e6 + j : j * 1e6 + i;
    let c = cuts.get(k);
    if (c === undefined) {
      const t = f[i] / (f[i] - f[j]), wi = basis(fine.verts[i], r), wj = basis(fine.verts[j], r);
      c = verts.length; cuts.set(k, c); verts.push({ r, w: wi.map((x, q) => lerp(x, wj[q], t)), src: i, src2: j, t });
    }
    return c;
  };
  for (let i = 0; i < src.length; i += 3) {
    const t = [src[i], src[i + 1], src[i + 2]], inside = t.map((v) => f[v] > 0), n = inside[0] + inside[1] + inside[2];
    if (n === 0) continue;
    if (n === 3) { tris.push(use(t[0]), use(t[1]), use(t[2])); continue; }
    // all three corners live in one original triangle: take its corner list from the vertex with the most references
    const r = [...new Set(t.flatMap((v) => fine.verts[v].r.filter((x, q) => fine.verts[v].w[q] > 0)))];
    while (r.length < 3) r.push(r[0]);
    const poly = [];
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      if (inside[k]) poly.push(use(a));
      if (inside[k] !== inside[(k + 1) % 3]) poly.push(inside[k] ? cut(a, b, r) : cut(b, a, r));
    }
    for (let k = 1; k + 1 < poly.length; k++) tris.push(poly[0], poly[k], poly[k + 1]);
  }
  return { verts, tris };
}

// ---------------------------------------------------------------- style table
// h: { phi, aphi, th, x, y, z (relative to skull centre, dm), s (dm above hairline), top, front, back, side }
const top = (h) => ss(18, 58, h.th), front = (h) => ss(75, 25, h.aphi), back = (h) => ss(105, 155, h.aphi);
const part = (h, x0, w = 0.1) => 0.25 + 0.75 * ss(0, w, Math.abs(h.x - x0));           // a parting line dips the thickness
const FADE = { strength: 0.95, lo: -30, hi: 22 }, STUBBLE = { strength: 0.9, lo: -90, hi: -89 }, UNDER = { strength: 0.75, lo: -90, hi: -89 };

export const HAIR_STYLES = {
  gen_short: { label: 'Kurzhaarschnitt', tex: 'strand', scalp: UNDER, thick: (h) => 0.06 + 0.1 * top(h),
    hang: (h) => (h.aphi < 48 ? 0.14 * ss(48, 28, h.aphi) : 0), hangShape: { out: 0.2, curl: -0.05 } },
  gen_buzz: { label: 'Buzz Cut', tex: 'buzz', scalp: { strength: 1, lo: -90, hi: -89 }, shell: false, thick: () => 0.012 },
  gen_fade_crop: { label: 'Fade + Crop', tex: 'strand', scalp: FADE, region: (h) => (h.th - 20) * 0.02, edge: 'taper',
    thick: (h) => 0.13 + 0.12 * top(h) + 0.06 * front(h) * top(h), offset: (h) => [0, 0, 0.1 * front(h) * top(h)],
    hang: (h) => (h.aphi < 52 ? 0.24 * ss(52, 30, h.aphi) : 0), hangShape: { out: 0.25, curl: -0.08 } },
  gen_fade_quiff: { label: 'Tolle mit Fade', tex: 'strand', uv: 'back', scalp: FADE, region: (h) => (h.th - 20) * 0.02, edge: 'taper', vol: 1,
    thick: (h) => 0.12 + 0.08 * top(h) + 0.42 * ss(90, 20, h.aphi) * ss(22, 60, h.th) * ss(-0.3, 0.7, h.z), offset: (h) => { const k = front(h) * ss(22, 50, h.th); return [0, 0.07 * k, -0.03 * k]; } },
  gen_undercut: { label: 'Undercut, nach hinten', tex: 'strand', uv: 'back', scalp: STUBBLE, region: (h) => (h.th - 30) * 0.02, edge: 'step',
    thick: (h) => 0.2 + 0.08 * front(h), offset: (h) => [0, 0, -0.06] },
  gen_side_part: { label: 'Seitenscheitel', tex: 'strand', scalp: UNDER,
    thick: (h) => (0.07 + 0.17 * top(h)) * (h.th > 35 ? part(h, 0.36) : 1), offset: (h) => [-0.06 * top(h) * (h.x < 0.36 ? 1 : -0.4), 0, 0.03 * front(h) * top(h)] },
  gen_curtains: { label: 'Curtains', tex: 'strand', scalp: UNDER,
    thick: (h) => (0.09 + 0.14 * top(h)) * (h.th > 30 && h.z > -0.5 ? part(h, 0, 0.09) : 1),
    hang: (h) => (h.aphi < 70 ? 0.5 * ss(6, 24, h.aphi) * ss(72, 50, h.aphi) : 0), hangShape: { out: 0.6, curl: 0.12 } },
  gen_fluffy: { label: 'Locken oben + Fade', tex: 'curl', scalp: FADE, region: (h) => (h.th - 16) * 0.02, edge: 'taper',
    thick: (h) => 0.12 + 0.24 * top(h) + 0.08 * front(h) * top(h), offset: (h) => [0, 0, 0.1 * front(h) * top(h)], bumps: [0.1, 7.5] },
  gen_mohawk: { label: 'Iro', tex: 'strand', uv: 'up', scalp: STUBBLE, region: (h) => 0.3 - Math.abs(h.x), edge: 'taper',
    thick: (h) => 0.5 * ss(0.3, 0.08, Math.abs(h.x)) * (0.55 + 0.45 * ss(-40, 30, h.th)) },
  gen_afro_short: { label: 'Afro kurz', tex: 'curl', scalp: UNDER, vol: 0.85, thick: () => 0.28, bumps: [0.05, 12] },
  gen_afro_big: { label: 'Afro groß', tex: 'curl', scalp: UNDER, thick: (h) => 0.36 + 0.3 * ss(-35, 35, h.th), bumps: [0.07, 9] },
  gen_cornrows: { label: 'Cornrows', tex: 'rows', uv: 'back', scalp: { strength: 0.55, lo: -90, hi: -89 }, thick: () => 0.05,
    pieces: (m) => m.locks({ from: 128, every: 3, length: 0.9, radius: 0.045, th: [-60, -10] }) },
  gen_dreads: { label: 'Dreadlocks', tex: 'strand', uv: 'back', scalp: UNDER, vol: 1.3, thick: () => 0.1,
    pieces: (m) => m.locks({ from: 0, every: 1, length: 2.3, radius: 0.085, th: [-60, 90] }) },
  gen_man_bun: { label: 'Männer-Dutt', tex: 'strand', uv: 'back', scalp: UNDER, thick: (h) => 0.1 + 0.03 * top(h), pieces: (m) => m.ball({ phi: 180, th: 56, r: 0.36, lift: 0.22 }) },
  gen_mullet: { label: 'Vokuhila', tex: 'strand', scalp: UNDER, thick: (h) => 0.08 + 0.16 * top(h) + 0.1 * back(h),
    hang: (h) => (h.aphi > 118 ? 1.25 * ss(118, 150, h.aphi) : h.aphi < 50 ? 0.22 * ss(50, 30, h.aphi) : 0), hangShape: { out: 0.3, curl: 0.12 } },
  gen_long: { label: 'Lang, Mittelscheitel', tex: 'strand', scalp: UNDER, thick: (h) => 0.13 * (h.th > 30 && h.z > -0.6 ? part(h, 0, 0.08) : 1) + 0.04,
    hang: (h) => (h.aphi > 40 ? lerp(2.8, 3.3, ss(100, 150, h.aphi)) * ss(40, 58, h.aphi) : 0), hangShape: { out: 0.3, curl: -0.05, behind: true } },
  gen_long_fringe: { label: 'Lang mit Pony', tex: 'strand', scalp: UNDER, thick: (h) => 0.15 + 0.03 * top(h),
    hang: (h) => (h.aphi > 46 ? lerp(2.7, 3.0, ss(100, 150, h.aphi)) : 0.3 + 0.1 * ss(20, 46, h.aphi)), hangShape: { out: 0.28, curl: -0.06, behind: true } },
  gen_bob: { label: 'Bob-Schnitt', tex: 'strand', scalp: UNDER, vol: 1.7, thick: (h) => 0.15 * (h.th > 30 && h.z > -0.6 ? part(h, 0.3, 0.08) : 1) + 0.06,
    hang: (h) => (h.aphi > 36 ? lerp(0.78, 0.55, ss(100, 160, h.aphi)) * ss(36, 55, h.aphi) : 0), hangShape: { out: 0.7, curl: -0.4 } },
  gen_long_curly: { label: 'Lange Locken', tex: 'curl', scalp: UNDER, thick: (h) => 0.22 + 0.12 * top(h), bumps: [0.07, 9],
    hang: (h) => (h.aphi > 38 ? lerp(2.3, 2.6, ss(100, 150, h.aphi)) * ss(38, 56, h.aphi) : 0), hangShape: { out: 0.7, curl: 0.15, wave: [0.11, 5.5], behind: true } },
  gen_surfer: { label: 'Halblang, wellig', tex: 'strand', scalp: UNDER, thick: (h) => 0.14 + 0.08 * top(h),
    hang: (h) => (h.aphi > 52 ? lerp(0.95, 1.25, ss(100, 150, h.aphi)) * ss(52, 70, h.aphi) : h.aphi < 40 ? 0.2 * ss(40, 20, h.aphi) : 0), hangShape: { out: 0.5, curl: 0.2, wave: [0.07, 6] } },
  gen_pixie: { label: 'Pixie-Schnitt', tex: 'strand', scalp: UNDER, vol: 1.4, bumps: [0.03, 11], thick: (h) => 0.08 + 0.12 * top(h), offset: (h) => [0.06 * top(h), 0.03 * top(h), 0.06 * front(h) * top(h)],
    hang: (h) => (h.aphi < 60 ? (0.3 + 0.12 * Math.sin(h.x * 9)) * ss(60, 36, h.aphi) * (h.x < 0.2 ? 1 : 0.5) : 0), hangShape: { out: 0.3, curl: -0.1 } },
  gen_high_pony: { label: 'Pferdeschwanz', tex: 'strand', uv: 'back', scalp: UNDER, vol: 1.3, thick: () => 0.075,
    pieces: (m) => m.tail({ phi: 180, th: 40, length: 3.8, r: 0.3, up: 0.4, back: 0.5, side: 1, front: true }) },
  gen_low_pony: { label: 'Tiefer Pferdeschwanz', tex: 'strand', uv: 'back', scalp: UNDER, thick: (h) => 0.08 * (h.th > 25 ? part(h, 0, 0.07) : 1) + 0.02,
    pieces: (m) => m.tail({ phi: 180, th: -36, length: 2.3, r: 0.17, up: 0, back: 0.22 }) },
  gen_pigtails: { label: 'Zwei Pferdeschwänze', tex: 'strand', uv: 'back', scalp: UNDER, thick: (h) => 0.08 * (h.th > 25 ? part(h, 0, 0.07) : 1) + 0.02,
    pieces: (m) => { m.tail({ phi: 100, th: 22, length: 1.7, r: 0.15, up: 0.25, back: 0.05, side: 1.6 }); m.tail({ phi: -100, th: 22, length: 1.7, r: 0.15, up: 0.25, back: 0.05, side: -1.6 }); } },
  gen_bun: { label: 'Dutt', tex: 'strand', uv: 'back', scalp: UNDER, thick: () => 0.085, pieces: (m) => m.ball({ phi: 180, th: 68, r: 0.42, lift: 0.3 }) },
  gen_space_buns: { label: 'Space Buns', tex: 'strand', uv: 'back', scalp: UNDER, thick: (h) => 0.08 * (h.th > 30 ? part(h, 0, 0.07) : 1) + 0.02,
    pieces: (m) => { m.ball({ phi: 62, th: 58, r: 0.3, lift: 0.22 }); m.ball({ phi: -62, th: 58, r: 0.3, lift: 0.22 }); } },
  gen_braids: { label: 'Geflochtene Zöpfe', tex: 'strand', uv: 'back', scalp: UNDER, thick: (h) => 0.085 * (h.th > 20 ? part(h, 0, 0.07) : 1) + 0.02,
    pieces: (m) => { m.tail({ phi: 118, th: -20, length: 2.9, r: 0.15, up: 0, back: 0.05, braid: true, side: 1, front: true }); m.tail({ phi: -118, th: -20, length: 2.9, r: 0.15, up: 0, back: 0.05, braid: true, side: -1, front: true }); } },
  // ---- head wear (slot 'hat'): solid shell on the skull, cut along a cap line, plus a brim piece
  gen_cap: { slot: 'hat', label: 'Baseball-Kappe', defaultColor: '#2d6fb0', ignoreHairline: true, vol: 1, region: (h) => (h.th - CAPEDGE(h.aphi)) * 0.03,
    thick: (h) => 0.27 + 0.08 * ss(10, 70, h.th), pieces: (m) => m.brim({ phi: 0, span: 62, len: 0.85, droop: 0.2 }) },
  gen_cap_back: { slot: 'hat', label: 'Kappe verkehrt herum', defaultColor: '#c0392b', ignoreHairline: true, vol: 1, region: (h) => (h.th - CAPEDGE(h.aphi)) * 0.03,
    thick: (h) => 0.27 + 0.08 * ss(10, 70, h.th), pieces: (m) => m.brim({ phi: 180, span: 62, len: 0.85, droop: 0.2 }) },
  gen_snapback: { slot: 'hat', label: 'Snapback (flacher Schirm)', defaultColor: '#1d1d20', ignoreHairline: true, vol: 1, region: (h) => (h.th - CAPEDGE(h.aphi)) * 0.03,
    thick: (h) => 0.28 + 0.1 * ss(25, 62, h.th), pieces: (m) => m.brim({ phi: 0, span: 66, len: 0.95, droop: 0.04 }) },
  gen_beanie: { slot: 'hat', label: 'Mütze', defaultColor: '#6b7280', ignoreHairline: true, vol: 1,
    region: (h) => (h.th - (h.aphi < 60 ? lerp(-4, -22, ss(0, 60, h.aphi)) : -30 - 6 * ss(60, 180, h.aphi))) * 0.03,
    thick: (h) => 0.28 + 0.08 * ss(15, 75, h.th) + 0.07 * ss(0.5, 0, (h.th - (h.aphi < 60 ? -10 : -32)) * 0.03), bumps: [0.012, 22] },
  gen_headband: { slot: 'hat', label: 'Stirnband', defaultColor: '#e9e6e1', ignoreHairline: true, vol: 1, noCull: true,
    region: (h) => 0.32 - Math.abs(h.th - 15) * 0.04, thick: () => 0.1 },

  // ---- styles from the reference sheets
  gen_caesar: { label: 'Caesar Cut', tex: 'strand', scalp: UNDER, vol: 1.3, thick: (h) => 0.08 + 0.07 * top(h), bumps: [0.02, 12],
    hang: (h) => (h.aphi < 42 ? 0.2 * ss(42, 18, h.aphi) * (0.55 + 0.45 * Math.abs(Math.sin(h.x * 12 + 0.7))) : 0), hangShape: { out: 0.12, curl: -0.03 } },
  gen_slick_back: { label: 'Nach hinten', tex: 'strand', uv: 'back', scalp: { strength: 0, lo: -90, hi: -89 }, vol: 1.2, region: (h) => (h.aphi < 60 ? (h.th - 22) * 0.02 : 9), edge: 'taper',
    thick: (h) => 0.1 + 0.07 * top(h) + 0.08 * ss(90, 25, h.aphi) * ss(20, 55, h.th), offset: (h) => { const k = front(h) * ss(15, 50, h.th); return [0, 0.01 * k, -0.2 * k]; },
    hang: (h) => (h.aphi > 112 ? 0.5 * ss(112, 150, h.aphi) : 0), hangShape: { out: 0.15, curl: 0.08 } },
  gen_quiff: { label: 'Tolle', tex: 'strand', uv: 'back', scalp: UNDER, vol: 1,
    thick: (h) => 0.12 + 0.1 * top(h) + 0.5 * ss(90, 20, h.aphi) * ss(20, 58, h.th) * ss(-0.3, 0.7, h.z), offset: (h) => { const k = front(h) * ss(20, 50, h.th); return [0, 0.09 * k, -0.02 * k]; } },
  gen_textured_fringe: { label: 'Strukturiert', tex: 'strand', scalp: FADE, region: (h) => (h.th - 8) * 0.02, edge: 'taper', bumps: [0.06, 11], vol: 1.2,
    thick: (h) => 0.16 + 0.12 * top(h) + 0.1 * front(h), offset: (h) => [0, 0.03 * front(h) * top(h), 0.08 * front(h) * top(h)],
    hang: (h) => (h.aphi < 44 ? 0.34 * ss(44, 14, h.aphi) * (0.35 + 0.65 * Math.abs(Math.sin(h.x * 10 + 0.4))) : 0), hangShape: { out: 0.25, curl: -0.1 } },
  gen_shoulder: { label: 'Schulterlang', tex: 'strand', scalp: UNDER, thick: (h) => (0.12 + 0.07 * top(h)) * (h.th > 30 && h.z > -0.6 ? part(h, 0.2, 0.09) : 1) + 0.03,
    hang: (h) => (h.aphi > 38 ? lerp(1.9, 1.7, ss(100, 150, h.aphi)) * ss(38, 56, h.aphi) : 0.14 * ss(38, 20, h.aphi)), hangShape: { out: 0.45, curl: 0.1, wave: [0.05, 5], behind: true } },
  gen_curly_mid: { label: 'Wellig & lockig', tex: 'curl', scalp: UNDER, vol: 0.9, thick: (h) => 0.22 + 0.08 * top(h), bumps: [0.08, 8],
    hang: (h) => (h.aphi > 40 ? lerp(0.9, 1.15, ss(100, 150, h.aphi)) * ss(40, 58, h.aphi) : 0.14 * ss(40, 20, h.aphi)), hangShape: { out: 0.7, curl: 0.12, wave: [0.12, 6] } },
  gen_long_bob: { label: 'Langer Bob', tex: 'strand', scalp: UNDER, vol: 1.5, thick: (h) => 0.15 * (h.th > 30 && h.z > -0.6 ? part(h, 0.3, 0.08) : 1) + 0.05,
    hang: (h) => (h.aphi > 34 ? lerp(1.85, 1.35, ss(100, 160, h.aphi)) * ss(34, 52, h.aphi) : 0), hangShape: { out: 0.45, curl: -0.2, behind: true } },
  gen_long_wavy: { label: 'Langes welliges Haar', tex: 'strand', scalp: UNDER, vol: 1.6, bumps: [0.03, 7], thick: (h) => 0.13 * (h.th > 30 && h.z > -0.6 ? part(h, 0, 0.08) : 1) + 0.06,
    hang: (h) => (h.aphi > 40 ? lerp(3.0, 3.4, ss(100, 150, h.aphi)) * ss(40, 58, h.aphi) : 0), hangShape: { out: 0.7, curl: 0.05, wave: [0.22, 4.2], behind: true } },
  gen_messy_bun: { label: 'Unordentlicher Dutt', tex: 'strand', uv: 'back', scalp: UNDER, vol: 1.8, bumps: [0.05, 9],
    thick: (h) => 0.1 + 0.07 * top(h),
    hang: (h) => (h.aphi > 24 && h.aphi < 85 && h.th < 48 ? 0.5 * ss(24, 36, h.aphi) * ss(85, 62, h.aphi) * (0.4 + 0.6 * Math.abs(Math.sin(h.phi * 0.45 + h.y * 4))) : 0), hangShape: { out: 0.4, curl: 0.25, wave: [0.14, 5] },
    pieces: (m) => m.ball({ phi: 180, th: 58, r: 0.52, lift: 0.3 }) },
  gen_shaggy: { label: 'Zotteliges Haar', tex: 'strand', scalp: UNDER, vol: 2, bumps: [0.07, 6], thick: (h) => 0.2 + 0.1 * top(h),
    hang: (h) => (h.aphi > 34 ? lerp(1.9, 2.4, ss(100, 150, h.aphi)) * (0.6 + 0.5 * Math.abs(Math.sin(h.phi * 0.6 + h.y * 3))) * ss(34, 52, h.aphi) : 0.42 * ss(34, 14, h.aphi) * (0.5 + 0.5 * Math.abs(Math.sin(h.x * 11)))), hangShape: { out: 0.75, curl: 0.15, wave: [0.18, 6], behind: true } },
  gen_curly_bob: { label: 'Kurzes lockiges Haar', tex: 'curl', scalp: UNDER, vol: 0.85, thick: (h) => 0.26 + 0.06 * top(h), bumps: [0.09, 8],
    hang: (h) => (h.aphi > 34 ? lerp(0.95, 0.8, ss(100, 160, h.aphi)) * ss(34, 52, h.aphi) : 0), hangShape: { out: 0.85, curl: 0.1, wave: [0.1, 6] } },
};

// sex tag for the hair tab filter: m / f; everything else is shown for both
export const HAIR_SEX = {
  m: ['gen_short', 'gen_buzz', 'gen_caesar', 'gen_fade_crop', 'gen_fade_quiff', 'gen_undercut', 'gen_slick_back', 'gen_quiff', 'gen_textured_fringe', 'gen_side_part', 'gen_curtains', 'gen_fluffy', 'gen_mohawk', 'gen_man_bun', 'gen_mullet', 'gen_shoulder', 'gen_curly_mid', 'gen_afro_short'],
  f: ['gen_long', 'gen_long_fringe', 'gen_bob', 'gen_long_bob', 'gen_long_wavy', 'gen_long_curly', 'gen_shaggy', 'gen_curly_bob', 'gen_pixie', 'gen_high_pony', 'gen_low_pony', 'gen_pigtails', 'gen_bun', 'gen_messy_bun', 'gen_space_buns', 'gen_braids'],
};


export function registerHair(D) {
  for (const [id, st] of Object.entries(HAIR_STYLES)) D.proxies[id] = { slot: st.slot || 'hair', defaultColor: st.defaultColor, noCull: !!st.noCull, label: st.label, sex: HAIR_SEX.m.includes(id) ? 'm' : HAIR_SEX.f.includes(id) ? 'f' : 'u', gen: true, tex: st.tex, scalp: st.scalp, thumb: `thumbs/${id}.webp`, credit: 'Avatar-Studio (eigene Frisur)', tags: [] };
}

// ---------------------------------------------------------------- generator
export function buildHair(D, id) {
  let st = HAIR_STYLES[id]; const sc = scalp(D), fine = sc.fine;
  const info = (x, y, z, s) => { const h = headInfo(x, y, z); h.s = s; return h; };
  // 1) where the shell exists: hairline, optionally limited by the style's own region
  const nF = fine.verts.length, f = new Float32Array(nF);
  for (let i = 0; i < nF; i++) { const base = st.ignoreHairline ? fine.e[i] : fine.s[i]; f[i] = st.region ? Math.min(base, st.region(info(fine.pos[3 * i], fine.pos[3 * i + 1], fine.pos[3 * i + 2], fine.s[i]))) : base; }
  if (st.shell === false) f.fill(-1, 1);              // painted-only style: keep a single hidden vertex so the part stays a valid mesh
  if (!st.bumps && st.tex === 'strand') st = { ...st, bumps: [0.012, 14] };
  const mesh = clipMesh(fine, f), nS = mesh.verts.length;
  // 2) base position, normal, head info per shell vertex
  const bp = new Float32Array(nS * 3), bn = new Float32Array(nS * 3), hs = new Array(nS), reg = new Float32Array(nS);
  mesh.verts.forEach((q, i) => {
    for (let k = 0; k < 3; k++) { bp[3 * i + k] = lerp(fine.pos[3 * q.src + k], fine.pos[3 * q.src2 + k], q.t); bn[3 * i + k] = lerp(fine.nrm[3 * q.src + k], fine.nrm[3 * q.src2 + k], q.t); }
    const l = Math.hypot(bn[3 * i], bn[3 * i + 1], bn[3 * i + 2]) || 1; bn[3 * i] /= l; bn[3 * i + 1] /= l; bn[3 * i + 2] /= l;
    hs[i] = info(bp[3 * i], bp[3 * i + 1], bp[3 * i + 2], q.t ? Math.max(0, lerp(fine.s[q.src], fine.s[q.src2], q.t)) : fine.s[q.src]);
    reg[i] = st.region ? st.region(hs[i]) : 9;
  });
  // 3) outer surface
  const out = new Float32Array(nS * 3), fixed = new Float32Array(nS);
  for (let i = 0; i < nS; i++) {
    const h = hs[i], hangs = st.hang ? st.hang(h) > 0 : false;
    let t = st.thick(h) * (st.vol ?? (st.tex === 'curl' || st.tex === 'buzz' ? 1 : 1.55));
    if (!hangs && st.slot !== 'hat') t *= 0.06 + 0.94 * ss(0, 0.3, h.s);    // hair lies down toward the hairline (head wear keeps its edge)
    if (st.region && st.edge !== 'step' && st.slot !== 'hat') t *= 0.05 + 0.95 * ss(0, 0.4, reg[i]);   // fades out at the style's own edge
    t = Math.max(t, 0.012);
    const o = st.offset ? st.offset(h) : [0, 0, 0], k = ss(0, 0.35, h.s);
    out[3 * i] = bp[3 * i] + bn[3 * i] * t + o[0] * k; out[3 * i + 1] = bp[3 * i + 1] + bn[3 * i + 1] * t + o[1] * k; out[3 * i + 2] = bp[3 * i + 2] + bn[3 * i + 2] * t + o[2] * k;
    fixed[i] = h.s < 0.03 && !hangs && st.slot !== 'hat' ? 1 : 0;
  }
  // smooth the sculpted surface
  const nb = Array.from({ length: nS }, () => new Set());
  for (let i = 0; i < mesh.tris.length; i += 3) { const [a, b, c] = [mesh.tris[i], mesh.tris[i + 1], mesh.tris[i + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  for (let it = 0; it < 3; it++) {
    const nx = new Float32Array(out);
    for (let i = 0; i < nS; i++) { if (fixed[i] || !nb[i].size) continue; let x = 0, y = 0, z = 0; for (const j of nb[i]) { x += out[3 * j]; y += out[3 * j + 1]; z += out[3 * j + 2]; }
      const n = nb[i].size; nx[3 * i] = lerp(out[3 * i], x / n, 0.55); nx[3 * i + 1] = lerp(out[3 * i + 1], y / n, 0.55); nx[3 * i + 2] = lerp(out[3 * i + 2], z / n, 0.55); }
    out.set(nx);
  }
  if (st.bumps) for (let i = 0; i < nS; i++) {
    const [amp, fq] = st.bumps, k = ss(0, 0.3, hs[i].s) * (st.region ? ss(0, 0.3, reg[i]) : 1);
    const n = noise3(out[3 * i] * fq, out[3 * i + 1] * fq, out[3 * i + 2] * fq) * 0.65 + noise3(out[3 * i] * fq * 2.1 + 7, out[3 * i + 1] * fq * 2.1, out[3 * i + 2] * fq * 2.1) * 0.35;
    for (let c = 0; c < 3; c++) out[3 * i + c] += bn[3 * i + c] * amp * (n - 0.35) * 2 * k;
  }

  // 4) collect geometry: every vertex = (scalp ref, offset from it, uv)
  const R = [], B = [], O = [], UV = [], I = [], SH = [];
  const uvOf = (h, len = 0) => (st.uv === 'back' ? [h.x * 1.5, (0.9 - h.z) * 0.45 + len * 0.3] : st.uv === 'up' ? [h.z * 1.4, h.y * 0.6] : [h.phi / 52, (90 - h.th) / 75 + len * 0.3]);
  const add = (i, x, y, z, u, v, sh = 1) => { const q = mesh.verts[i]; R.push(q.r[0], q.r[1], q.r[2]); B.push(q.w[0], q.w[1], q.w[2]); O.push(x - bp[3 * i], y - bp[3 * i + 1], z - bp[3 * i + 2]); UV.push(u, v); SH.push(sh); return R.length / 3 - 1; };
  // roots are darker: the shell's thin front edge would otherwise catch the light as a pale band across the forehead
  for (let i = 0; i < nS; i++) { const [u, v] = uvOf(hs[i]); add(i, out[3 * i], out[3 * i + 1], out[3 * i + 2], u, v, st.slot === 'hat' ? 1 : 0.42 + 0.58 * ss(0, 0.5, hs[i].s)); }
  I.push(...mesh.tris);

  // open edges of the shell, in order
  const edgeCount = new Map(), ek = (a, b) => (a < b ? a * 1e6 + b : b * 1e6 + a);
  for (let i = 0; i < mesh.tris.length; i += 3) for (let k = 0; k < 3; k++) { const a = mesh.tris[i + k], b = mesh.tris[i + (k + 1) % 3]; edgeCount.set(ek(a, b), (edgeCount.get(ek(a, b)) || 0) + 1); }
  const border = [];
  for (let i = 0; i < mesh.tris.length; i += 3) for (let k = 0; k < 3; k++) { const a = mesh.tris[i + k], b = mesh.tris[i + (k + 1) % 3]; if (edgeCount.get(ek(a, b)) === 1) border.push([a, b]); }

  // 5) hanging lengths from the hairline (fringe, curtains, long hair), or a closing wall at a stepped edge
  const K = 9, shape = st.hangShape || {}, cols = new Map();
  const column = (i) => {
    if (cols.has(i)) return cols.get(i);
    const h = hs[i], L = st.hang ? st.hang(h) : 0; let col = null;
    if (L > 0.02) {
      col = [i];                                   // first entry: the shell vertex itself (index in the shared vertex list)
      const rl = Math.hypot(h.x, h.z) || 1, rx = h.x / rl, rz = h.z / rl, [u0, v0] = uvOf(h);
      for (let k = 1; k <= K; k++) {
        const u = k / K, y = out[3 * i + 1] - L * u;
        let o = (shape.out ?? 0.3) * 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + (shape.curl ?? 0) * u * u * 0.6;
        if (shape.wave) o += shape.wave[0] * Math.sin(u * L * shape.wave[1] + h.phi * 0.09) * u;
        let x = out[3 * i] + rx * o * Math.min(1, L), z = out[3 * i + 2] + rz * o * Math.min(1, L);
        if (shape.behind && y < 6.25) {
          // below the head the hair has to go somewhere: strands from the back settle behind the shoulders,
          // strands from the sides fall forward over the shoulders and chest (as in the reference photos)
          const k2 = ss(6.25, 5.3, y), side = ss(125, 90, h.aphi);               // side = 1 at the temples/ears, 0 at the back
          const bz = -0.95 - 0.25 * ss(5.9, 4.6, y), fz = 0.62 + 0.5 * ss(5.7, 4.5, y), sx = Math.sign(h.x || 1);
          const zb = Math.min(z, bz - 0.1 * Math.abs(rx)), zf = Math.max(z, fz);
          z = lerp(lerp(z, zb, k2), lerp(z, zf, k2), side);
          x = lerp(x, lerp(x * 0.82, sx * Math.max(Math.abs(x), 0.98 + 0.12 * ss(5.6, 4.6, y)), side), k2);
        }
        col.push(add(i, x, y, z, u0, v0 + L * u * 0.55));
      }
    }
    cols.set(i, col); return col;
  };
  const wall = new Map();
  for (const [a, b] of border) {
    const ca = column(a), cb = column(b);
    if (ca && cb) { for (let k = 0; k < K; k++) I.push(ca[k], ca[k + 1], cb[k], cb[k], ca[k + 1], cb[k + 1]); continue; }
    if (st.edge === 'step' && reg[a] < 0.05 && reg[b] < 0.05 && hs[a].s > 0.06 && hs[b].s > 0.06) {     // close the step down to the scalp
      const foot = (i) => { if (!wall.has(i)) { const [u, v] = uvOf(hs[i]); wall.set(i, add(i, bp[3 * i] + bn[3 * i] * 0.012, bp[3 * i + 1] + bn[3 * i + 1] * 0.012, bp[3 * i + 2] + bn[3 * i + 2] * 0.012, u, v + 0.08)); } return wall.get(i); };
      I.push(a, foot(a), b, b, foot(a), foot(b));
    }
  }

  // 6) attached pieces
  const nearest = (phi, th) => { let best = 0, bd = 1e9; for (let i = 0; i < nS; i++) { let d = Math.abs(hs[i].phi - phi); if (d > 180) d = 360 - d; const e = d * d * Math.cos(th / DEG) ** 2 + (hs[i].th - th) ** 2; if (e < bd) { bd = e; best = i; } } return best; };
  const tube = (anchor, pts, radii, sides, braid) => {
    const rings = [];
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k], a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      const n1 = new THREE.Vector3().crossVectors(t, Math.abs(t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), n2 = new THREE.Vector3().crossVectors(t, n1);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const ang = (j / sides) * Math.PI * 2, r = radii[k] * (braid ? 1 + 0.22 * Math.sin(k * 1.9 + j * Math.PI) : 1);
        ring.push(add(anchor, p[0] + (n1.x * Math.cos(ang) + n2.x * Math.sin(ang)) * r, p[1] + (n1.y * Math.cos(ang) + n2.y * Math.sin(ang)) * r, p[2] + (n1.z * Math.cos(ang) + n2.z * Math.sin(ang)) * r, (j / sides) * 2, k * 0.22));
      }
      rings.push(ring);
    }
    for (let k = 0; k + 1 < rings.length; k++) for (let j = 0; j < sides; j++) { const a = rings[k][j], b = rings[k][(j + 1) % sides], c = rings[k + 1][j], d = rings[k + 1][(j + 1) % sides]; I.push(a, c, b, b, c, d); }
  };
  const maker = {
    ball({ phi, th, r, lift }) {
      const i = nearest(phi, th), c = [out[3 * i] + bn[3 * i] * lift, out[3 * i + 1] + bn[3 * i + 1] * lift, out[3 * i + 2] + bn[3 * i + 2] * lift], seg = 14, rows = 10, ring = [];
      for (let y = 0; y <= rows; y++) { const row = []; for (let x = 0; x < seg; x++) {
        const a = (y / rows) * Math.PI, b = (x / seg) * Math.PI * 2, rr = r * (1 + 0.07 * Math.sin(b * 5 + a * 3));
        row.push(add(i, c[0] + Math.sin(a) * Math.cos(b) * rr, c[1] + Math.cos(a) * rr * 0.92, c[2] + Math.sin(a) * Math.sin(b) * rr, (x / seg) * 3, y / rows)); } ring.push(row); }
      for (let y = 0; y < rows; y++) for (let x = 0; x < seg; x++) { const a = ring[y][x], b = ring[y][(x + 1) % seg], c2 = ring[y + 1][x], d = ring[y + 1][(x + 1) % seg]; I.push(a, b, c2, b, d, c2); }
    },
    tail({ phi, th, length, r, up, back: bk, braid, side = 0, front = false }) {
      const i = nearest(phi, th), n = 12, pts = [], radii = [], s0 = [out[3 * i], out[3 * i + 1], out[3 * i + 2]];
      for (let k = 0; k <= n; k++) {
        const u = k / n, rise = up * Math.sin(Math.min(1, u * 2.2) * Math.PI) * 0.5, y = s0[1] + rise - length * u * u * (up ? 1 : 0.5) - (up ? 0 : length * u * 0.5);
        let z = s0[2] - bk * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) - 0.1 * u, x = s0[0] + side * 0.05 * u;
        if (front) { const k2 = ss(6.5, 5.5, y); x = lerp(x, side * 0.78, k2); z = lerp(z, 1.0 - 0.12 * ss(5.4, 3.9, y), k2); }
        else if (y < 6.2 && Math.abs(side) <= 1) { const k2 = ss(6.2, 5.2, y); z = Math.min(z, lerp(z, -1.05 - 0.25 * ss(5.9, 4.6, y), k2)); if (side) x = lerp(x, side * 0.42, k2); }
        if (Math.abs(side) > 1) x = s0[0] + Math.sign(side) * (0.28 * Math.sin(Math.min(1, u * 1.5) * Math.PI * 0.5) + 0.05 * u);
        pts.push([x, y, z]); radii.push(r * (braid ? 1 - 0.45 * u : (0.75 + 0.5 * Math.sin(Math.min(1, u * 1.4) * Math.PI)) * (1 - 0.75 * u * u)) + 0.012);
      }
      tube(i, pts, radii, 8, braid);
    },
    brim({ phi, span, len, droop }) {
      // a curved visor along the front (or back) of the cap edge: three rows from the edge outward, dipping toward the middle
      const N = 16, rows = 3, grid = [];
      for (let k = 0; k <= N; k++) {
        const c = Math.abs(k / N - 0.5) * 2, a = phi + (k / N - 0.5) * 2 * span, ap = Math.abs(((a + 540) % 360) - 180) >= 0 ? Math.abs((((a % 360) + 540) % 360) - 180) : 0;
        const aphi = Math.abs((((a % 360) + 540) % 360) - 180), i = nearest(a, CAPEDGE(aphi)), ar = (a * Math.PI) / 180;
        const L = len * (1 - 0.78 * Math.pow(c, 2.2)), dx = Math.sin(ar), dz = Math.cos(ar), row = [];
        for (let r = 0; r <= rows; r++) { const u = r / rows; row.push(add(i, out[3 * i] + dx * L * u, out[3 * i + 1] - droop * (1 + 0.7 * c * c) * u * u + 0.04 * Math.sin(u * Math.PI) * (1 - c), out[3 * i + 2] + dz * L * u, k / N * 2, u, 1)); }
        grid.push(row);
      }
      for (let k = 0; k < N; k++) for (let r = 0; r < rows; r++) { const a = grid[k][r], b = grid[k + 1][r], c = grid[k][r + 1], d = grid[k + 1][r + 1]; I.push(a, c, b, b, c, d); }
    },
    locks({ from, every, length, radius, th }) {
      let n = 0;
      for (let i = 0; i < nS; i++) {
        const h = hs[i]; if (mesh.verts[i].t !== 0 || mesh.verts[i].w.filter((x) => x > 0).length > 1 || h.aphi < from || h.th < th[0] || h.th > th[1] || h.s < 0.12) continue;
        if (n++ % every) continue;
        const L = length * (0.75 + 0.5 * hash3(i, 1, 2)), rl = Math.hypot(h.x, h.z) || 1, pts = [], radii = [], seg = 6;
        const sweep = ss(95, 35, h.aphi);                 // locks that start near the face are laid back over the head first
        for (let k = 0; k <= seg; k++) { const u = k / seg, o = 0.22 * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5) * ss(80, 20, h.th);
          let y = out[3 * i + 1] - L * u * (0.35 + 0.65 * u) * (1 - 0.35 * sweep) + 0.12 * sweep * Math.sin(u * Math.PI), x = out[3 * i] + (h.x / rl) * o + Math.sign(h.x || 1) * 0.5 * sweep * u, z = out[3 * i + 2] + (h.z / rl) * o - 1.1 * sweep * u;
          if (y < 6.2) { const k2 = ss(6.2, 5.4, y); if (h.z < 0.2) z = Math.min(z, lerp(z, -1.0, k2)); else { x += Math.sign(h.x) * 0.25 * k2; z = Math.max(z, lerp(z, 1.15, k2)); } }
          pts.push([x, y, z]); radii.push(radius * (1 - 0.3 * u)); }
        tube(i, pts, radii, 5, false);
      }
    },
  };
  if (st.pieces) st.pieces(maker);

  const nP = R.length / 3;
  const p = { id, meta: D.proxies[id], gen: true, nP, nR: nP, ref: Uint16Array.from(R), bary: Float32Array.from(B), off: Float32Array.from(O),
    vmap: Uint16Array.from({ length: nP }, (_, i) => i), shade: Float32Array.from(SH), uv: Float32Array.from(UV), idx: Uint32Array.from(I), del: new Uint16Array(0), scale: null };
  return finishProxy(D, p);
}

// ---------------------------------------------------------------- textures (grey, tinted by the hair colour)
const texCache = new Map();
export function hairTexture(kind) {
  if (texCache.has(kind)) return texCache.get(kind);
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); let seed = 5; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  g.fillStyle = '#b4b4b4'; g.fillRect(0, 0, S, S);
  if (kind === 'strand') {
    // clumps of different width and brightness instead of a uniform comb pattern
    for (let i = 0; i < 70; i++) { const x = rnd() * S, w = 5 + rnd() * 22, l = Math.round(120 + rnd() * 110); g.fillStyle = `rgba(${l},${l},${l},${0.18 + rnd() * 0.3})`; for (const dx of [-S, 0, S]) g.fillRect(x + dx, 0, w, S); }
    for (let i = 0; i < 380; i++) { const x = rnd() * S, w = 0.6 + rnd() * 1.8, l = Math.round(60 + rnd() * 190); g.strokeStyle = `rgba(${l},${l},${l},${0.15 + rnd() * 0.3})`; g.lineWidth = w;
      g.beginPath(); let px = x; g.moveTo(px, 0); for (let y = 64; y <= S; y += 64) { px += (rnd() - 0.5) * 16; g.lineTo(px, y); } g.stroke(); }
  } else if (kind === 'curl') {
    g.fillStyle = '#6e6e6e'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { const x = rnd() * S, y = rnd() * S, r = 7 + rnd() * 13, gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); gr.addColorStop(0, 'rgba(235,235,235,0.9)'); gr.addColorStop(1, 'rgba(90,90,90,0)');
      g.fillStyle = gr; for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill(); } }
  } else if (kind === 'rows') {
    g.fillStyle = '#4a4a4a'; g.fillRect(0, 0, S, S);
    for (let col = 0; col < 8; col++) for (let y = -8; y < S + 8; y += 15) { const x = col * 64 + 32 + ((y / 15) % 2 ? 5 : -5), gr = g.createRadialGradient(x, y, 2, x, y, 19); gr.addColorStop(0, 'rgba(240,240,240,1)'); gr.addColorStop(1, 'rgba(120,120,120,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 17, 11, 0, 0, 7); g.fill(); }
  } else {
    const id = g.getImageData(0, 0, S, S); for (let i = 0; i < id.data.length; i += 4) { const l = 120 + rnd() * 110; id.data[i] = id.data[i + 1] = id.data[i + 2] = l; } g.putImageData(id, 0, 0);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(kind, t); return t;
}

// which styles the "random" button and the presets draw from
export const HAIR_SETS = {
  male: ['gen_short', 'gen_buzz', 'gen_caesar', 'gen_fade_crop', 'gen_fade_quiff', 'gen_undercut', 'gen_slick_back', 'gen_quiff', 'gen_textured_fringe', 'gen_side_part', 'gen_curtains', 'gen_fluffy', 'gen_mohawk', 'gen_afro_short', 'gen_cornrows', 'gen_dreads', 'gen_man_bun', 'gen_mullet', 'gen_surfer', 'gen_shoulder', 'gen_curly_mid'],
  female: ['gen_long', 'gen_long_fringe', 'gen_bob', 'gen_long_bob', 'gen_long_wavy', 'gen_long_curly', 'gen_shaggy', 'gen_curly_bob', 'gen_surfer', 'gen_pixie', 'gen_high_pony', 'gen_low_pony', 'gen_pigtails', 'gen_bun', 'gen_messy_bun', 'gen_space_buns', 'gen_braids', 'gen_curtains', 'gen_afro_big', 'gen_dreads', 'gen_cornrows'],
};
