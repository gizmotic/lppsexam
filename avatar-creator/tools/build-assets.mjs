// Packs MakeHuman data into compact web assets under public/assets.
//
//   MH_DATA=<makehuman repo>/makehuman/data  MH_MIRROR=<makehuman-data npm pkg>/public/data  node tools/build-assets.mjs
//
// Sources and licences are listed in ASSETS.md. Only items whose licence allows
// redistribution (CC0, CC-BY with credit) are packed.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MH = process.env.MH_DATA;
const NP = process.env.MH_MIRROR;
if (!MH || !NP) throw new Error('set MH_DATA and MH_MIRROR');
const OUT = path.resolve(import.meta.dirname, '../public/assets');
for (const d of ['proxies', 'tex']) { fs.rmSync(path.join(OUT, d), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, d), { recursive: true }); }
fs.mkdirSync(path.join(OUT, 'thumbs'), { recursive: true });   // rendered by tools/make-thumbs.mjs, kept between builds

// ---------------------------------------------------------------- helpers
class Bin {
  constructor() { this.parts = []; this.len = 0; }
  add(typed) {
    const pad = (4 - (this.len % 4)) % 4;
    if (pad) { this.parts.push(Buffer.alloc(pad)); this.len += pad; }
    const off = this.len;
    const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    this.parts.push(b); this.len += b.length;
    return { o: off, n: typed.length, t: typed.constructor.name };
  }
  write(file) { fs.writeFileSync(file, Buffer.concat(this.parts)); return this.len; }
}

function parseObj(file) {
  const v = [], vt = [], faces = []; let group = '';
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('v ')) { const p = line.split(/\s+/); v.push(+p[1], +p[2], +p[3]); }
    else if (line.startsWith('vt ')) { const p = line.split(/\s+/); vt.push(+p[1], +p[2]); }
    else if (line.startsWith('g ')) group = line.slice(2).trim();
    else if (line.startsWith('f ')) {
      const p = line.trim().split(/\s+/).slice(1).map((s) => { const a = s.split('/'); return [+a[0] - 1, a[1] ? +a[1] - 1 : -1]; });
      faces.push({ group, c: p });
    }
  }
  return { v, vt, faces };
}

// corners: array of faces, each a list of [posIndex, uvIndex]. Returns split render verts.
function buildRender(faces, uvSrc) {
  const key = new Map(); const vmap = [], uvs = [], index = [];
  const get = (pi, ui) => {
    const k = pi * 65536 * 4 + ui;
    let r = key.get(k);
    if (r === undefined) { r = vmap.length; key.set(k, r); vmap.push(pi); uvs.push(ui >= 0 ? uvSrc[2 * ui] : 0, ui >= 0 ? uvSrc[2 * ui + 1] : 0); }
    return r;
  };
  for (const f of faces) {
    const r = f.map(([pi, ui]) => get(pi, ui));
    for (let i = 1; i + 1 < r.length; i++) index.push(r[0], r[i], r[i + 1]);
  }
  return { vmap, uvs, index };
}

// MakeHuman logo prints on some garments: the logo is a trademark, so paint it out.
// [x0, y0, x1, y1] boxes (normalised, top-left origin). Inside a box, pixels that differ from the
// cloth's median colour (orange figure, pale ring, dark lettering) are replaced by that median plus grain.
const LOGO_BOXES = {
  male_casualsuit02: [[0.485, 0.10, 0.655, 0.25]], male_casualsuit04: [[0.47, 0.095, 0.64, 0.245]], male_casualsuit06: [[0.16, 0.10, 0.82, 0.22]],
  female_casualsuit01: [[0.69, 0.14, 0.885, 0.37]], female_casualsuit02: [[0.69, 0.14, 0.885, 0.37]], female_sportsuit01: [[0.69, 0.14, 0.885, 0.37]],
};
async function removeLogo(src, boxes) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (const [x0, y0, x1, y1] of boxes) {
    const X0 = Math.round(x0 * W), X1 = Math.round(x1 * W), Y0 = Math.round(y0 * H), Y1 = Math.round(y1 * H);
    const R = [], G = [], B = [];
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) { const i = 4 * (y * W + x); R.push(data[i]); G.push(data[i + 1]); B.push(data[i + 2]); }
    const m = [med(R), med(G), med(B)], ml = 0.3 * m[0] + 0.59 * m[1] + 0.11 * m[2], mrb = m[0] - m[2];
    const bw = X1 - X0, bh = Y1 - Y0, flag = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = 4 * ((y + Y0) * W + x + X0), l = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      if (Math.abs(l - ml) > 22 || Math.abs(data[i] - data[i + 2] - mrb) > 24) flag[y * bw + x] = 1;
    }
    const grown = new Uint8Array(flag);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (flag[y * bw + x]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < bw && yy < bh) grown[yy * bw + xx] = 1;
    }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (grown[y * bw + x]) {
      const i = 4 * ((y + Y0) * W + x + X0), n = (rnd() - 0.5) * 7;
      for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, m[c] + n));
    }
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } });
}

async function tex(src, dst, opts = {}) {
  if (!fs.existsSync(src)) return null;
  let img = opts.logo ? await removeLogo(src, opts.logo) : sharp(src);
  if (opts.clearLens) {
    // the lens area is authored half-opaque and dark (sunglasses): make it a faint clear tint
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 60 && data[i + 3] < 215) { data[i + 3] = 12; data[i] = 150; data[i + 1] = 170; data[i + 2] = 185; }
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  if (opts.size) img = img.resize(opts.size, opts.size, { fit: 'inside' });
  await img.webp({ quality: opts.q ?? 88, alphaQuality: 95, effort: 5 }).toFile(path.join(OUT, dst));
  return dst;
}

// ---------------------------------------------------------------- base mesh
const base = parseObj(path.join(MH, '3dobjs/base.obj'));
const NV = base.v.length / 3;
const bodyFaces = base.faces.filter((f) => f.group === 'body').map((f) => f.c);
const body = buildRender(bodyFaces, base.vt);
console.log('base verts', NV, 'body render verts', body.vmap.length, 'tris', body.index.length / 3);

// ---------------------------------------------------------------- skeleton
const skel = JSON.parse(fs.readFileSync(path.join(MH, 'rigs/default.mhskel'), 'utf8'));
const wfile = JSON.parse(fs.readFileSync(path.join(MH, 'rigs/default_weights.mhw'), 'utf8'));
const boneOrder = [];
(function order() {
  const done = new Set();
  const names = Object.keys(skel.bones).sort();
  const visit = (n) => { if (done.has(n)) return; const p = skel.bones[n].parent; if (p) visit(p); done.add(n); boneOrder.push(n); };
  visit('root'); names.forEach(visit);
})();
const boneIdx = new Map(boneOrder.map((n, i) => [n, i]));
const bones = boneOrder.map((n) => {
  const b = skel.bones[n];
  return { name: n, parent: b.parent ? boneIdx.get(b.parent) : -1, head: skel.joints[b.head], tail: skel.joints[b.tail] };
});
// top-4 weights per base vertex
const wlist = Array.from({ length: NV }, () => []);
for (const [bn, arr] of Object.entries(wfile.weights)) {
  const bi = boneIdx.get(bn); if (bi === undefined) throw new Error('weight for unknown bone ' + bn);
  for (const [vi, w] of arr) wlist[vi].push([bi, w]);
}
const skinIdx = new Uint8Array(NV * 4), skinW = new Float32Array(NV * 4);
let unweighted = 0;
for (let i = 0; i < NV; i++) {
  const l = wlist[i].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const s = l.reduce((a, x) => a + x[1], 0);
  if (!l.length || s <= 0) { unweighted++; skinW[4 * i] = 1; continue; }
  l.forEach(([b, w], k) => { skinIdx[4 * i + k] = b; skinW[4 * i + k] = w / s; });
}
console.log('bones', bones.length, 'base verts without weights', unweighted);

// ---------------------------------------------------------------- targets
function parseTarget(file) {
  const idx = [], d = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line || line[0] === '#') continue;
    const p = line.trim().split(/\s+/); if (p.length < 4) continue;
    idx.push(+p[0]); d.push(+p[1], +p[2], +p[3]);
  }
  return { idx, d };
}
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else if (e.name.endsWith('.target')) out.push(p);
  }
  return out;
}
const tRoot = path.join(MH, 'targets');
const keep = (rel) => {
  if (/-(baby|child)[-.]/.test(rel) || /-(baby|child)$/.test(rel)) return false;
  const top = rel.split('/')[0];
  if (['genitals', 'measure', 'bodyshapes', 'asym'].includes(top)) return false;
  if (top === 'expression') return rel.startsWith('expression/units/caucasian/');
  if (rel.startsWith('macrodetails/height/') || rel.startsWith('macrodetails/proportions/')) return rel.includes('averagemuscle-averageweight');
  if (top === 'pelvis') return rel.includes('pelvis-tone');
  return true;
};
const tbin = new Bin(); const targets = {}; let tcount = 0;
for (const file of walk(tRoot).sort()) {
  const rel = path.relative(tRoot, file).replace(/\\/g, '/').replace(/\.target$/, '');
  if (!keep(rel)) continue;
  const t = parseTarget(file);
  let max = 0; for (const x of t.d) max = Math.max(max, Math.abs(x));
  const scale = max / 32767 || 1;
  const idx = [], q = [];
  for (let i = 0; i < t.idx.length; i++) {
    const a = Math.round(t.d[3 * i] / scale), b = Math.round(t.d[3 * i + 1] / scale), c = Math.round(t.d[3 * i + 2] / scale);
    if (Math.abs(t.d[3 * i]) < 2e-4 && Math.abs(t.d[3 * i + 1]) < 2e-4 && Math.abs(t.d[3 * i + 2]) < 2e-4) continue;
    idx.push(t.idx[i]); q.push(a, b, c);
  }
  targets[rel] = { i: tbin.add(new Uint16Array(idx)).o, d: tbin.add(new Int16Array(q)).o, n: idx.length, s: scale };
  tcount++;
}
const tbytes = tbin.write(path.join(OUT, 'targets.bin'));
console.log('targets', tcount, (tbytes / 1e6).toFixed(1) + ' MB');

// ---------------------------------------------------------------- proxies
// three.js JSON v3 face stream -> list of faces with [pos, uv] corners
function jsonFaces(j) {
  const f = j.faces; let i = 0; const out = [];
  while (i < f.length) {
    const t = f[i++]; const n = t & 1 ? 4 : 3;
    const vs = f.slice(i, i + n); i += n;
    if (t & 2) i++; if (t & 4) i++;
    let uv = null; if (t & 8) { uv = f.slice(i, i + n); i += n; }
    if (t & 16) i++; if (t & 32) i += n; if (t & 64) i++; if (t & 128) i += n;
    out.push(vs.map((v, k) => [v, uv ? uv[k] : -1]));
  }
  return out;
}
// pick, per axis, the pair of referenced base verts that spans the item: stands in for mhclo x/y/z_scale
function scaleRefs(refs) {
  const used = [...new Set(refs)];
  const r = [];
  for (let a = 0; a < 3; a++) {
    let lo = used[0], hi = used[0];
    for (const v of used) { if (base.v[3 * v + a] < base.v[3 * lo + a]) lo = v; if (base.v[3 * v + a] > base.v[3 * hi + a]) hi = v; }
    r.push([lo, hi, Math.max(1e-4, base.v[3 * hi + a] - base.v[3 * lo + a])]);
  }
  return r;
}
async function writeProxy(id, p) {
  // p: {ref[], bary[], off[], faces[[pos,uv]..], uvSrc, del[], scale?}
  const r = buildRender(p.faces, p.uvSrc);
  const bin = new Bin();
  const nP = p.ref.length / 3;
  const meta = {
    nP, nR: r.vmap.length,
    ref: bin.add(new Uint16Array(p.ref)).o,
    bary: bin.add(new Float32Array(p.bary)).o,
    off: bin.add(new Float32Array(p.off)).o,
    vmap: bin.add(new Uint16Array(r.vmap)).o,
    uv: bin.add(new Float32Array(r.uvs)).o,
    idx: bin.add(new Uint32Array(r.index)).o, nI: r.index.length,
    del: bin.add(new Uint16Array(p.del)).o, nDel: p.del.length,
    scale: p.scale ?? scaleRefs(p.ref),
  };
  bin.write(path.join(OUT, 'proxies', id + '.bin'));
  return meta;
}

// Catalogue: [mirror category, name, slot, label, credit]
const MHC = 'MakeHuman (CC0)';
const PD = 'punkduck (CC BY 3.0)', MF = 'Mindfront (CC BY 4.0)', DN = 'DredNicolson (CC BY)', WG = 'wolgade (CC0)';
const CATALOG = [
  ['hair', 'short01', 'hair', 'Kurz 1', MHC], ['hair', 'short02', 'hair', 'Kurz 2', MHC], ['hair', 'short03', 'hair', 'Kurz 3', MHC],
  ['hair', 'short04', 'hair', 'Kurz 4', MHC], ['hair', 'bob01', 'hair', 'Bob 1', MHC], ['hair', 'bob02', 'hair', 'Bob 2', MHC],
  ['hair', 'long01', 'hair', 'Lang', MHC], ['hair', 'ponytail01', 'hair', 'Pferdeschwanz', MHC], ['hair', 'Braid01', 'hair', 'Zopf', MHC],
  ['hair', 'afro01', 'hair', 'Kurze Locken', MHC],
  ...Array.from({ length: 12 }, (_, i) => ['eyebrows', 'eyebrow' + String(i + 1).padStart(3, '0'), 'brows', 'Braue ' + (i + 1), MHC]),
  ['eyelashes', 'Eyelashes01', 'lashes', 'Wimpern 1', MHC], ['eyelashes', 'eyelashes02', 'lashes', 'Wimpern 2', MHC],
  ['eyelashes', 'eyelashes03', 'lashes', 'Wimpern 3', MHC], ['eyelashes', 'eyelashes04', 'lashes', 'Wimpern 4', MHC],
  ['teeth', 'Teeth_Base', 'teeth', 'Zähne', MHC], ['tongue', 'tongue01', 'tongue', 'Zunge', MHC],
  // outfits: split into top/bottom where the mesh has separate parts
  ['clothes', 'male_casualsuit01', 'suit', 'Freizeit M1', MHC], ['clothes', 'male_casualsuit02', 'suit', 'Freizeit M2', MHC],
  ['clothes', 'male_casualsuit03', 'suit', 'Freizeit M3', MHC], ['clothes', 'male_casualsuit04', 'suit', 'Freizeit M4', MHC],
  ['clothes', 'male_casualsuit05', 'suit', 'Freizeit M5', MHC], ['clothes', 'male_casualsuit06', 'suit', 'Freizeit M6', MHC],
  ['clothes', 'male_elegantsuit01', 'suit', 'Anzug', MHC], ['clothes', 'male_worksuit01', 'suit', 'Arbeit', MHC],
  ['clothes', 'female_casualsuit01', 'suit', 'Freizeit F1', MHC], ['clothes', 'female_casualsuit02', 'suit', 'Freizeit F2', MHC],
  ['clothes', 'female_elegantsuit01', 'suit', 'Elegant', MHC], ['clothes', 'female_sportsuit01', 'suit', 'Sport', MHC],
  ['clothes', 'female_top_01', 'top', 'Top', WG], ['clothes', 'Tank_Top_01', 'top', 'Tanktop', MF],
  ['clothes', 'Sleeveless', 'top', 'Ärmellos', PD], ['clothes', 'TubeTop', 'top', 'Bandeau-Top', PD],
  ['clothes', 'VNeckTop', 'top', 'V-Ausschnitt', PD], ['clothes', 'spaghetti-top', 'top', 'Trägertop', PD],
  ['clothes', 'short_tail_camo_tee', 'top', 'Camo-Shirt', DN], ['clothes', 'Coat', 'top', 'Mantel', PD],
  ['clothes', 'Tightjeans', 'bottom', 'Jeans', PD], ['clothes', 'ShortJeans', 'bottom', 'Jeans-Shorts', PD],
  ['clothes', 'JeansSkirt', 'bottom', 'Jeansrock', PD], ['clothes', 'miniskirt', 'bottom', 'Minirock', PD],
  ['clothes', 'F_Dress_01', 'full', 'Kleid 1', MF], ['clothes', 'F_Dress_02', 'full', 'Kleid 2', MF],
  ['clothes', 'F_Dress_03', 'full', 'Kleid 3', MF], ['clothes', 'F_Dress_04', 'full', 'Kleid 4', MF],
  ['clothes', 'F_Beach_Dress_01', 'full', 'Strandkleid', MF], ['clothes', 'TubeDress', 'full', 'Schlauchkleid', PD],
  ['clothes', 'Asymmetric_Tunic_and_Sash', 'full', 'Tunika', DN], ['clothes', 'F_One-piece_Swimsuit_01', 'full', 'Badeanzug', MF],
  ...[1, 2, 3, 4, 5, 6].map((i) => ['clothes', 'shoes0' + i, 'shoes', 'Schuhe ' + i, MHC]),
  ['clothes', 'WinterBoots', 'shoes', 'Winterstiefel', PD],
  ['clothes', 'fedora', 'hat', 'Fedora', MHC], ['clothes', 'Fishing_Hat_01', 'hat', 'Anglerhut', MF], ['clothes', 'pith_helmet', 'hat', 'Tropenhelm', DN],
  ['clothes', 'glasses', 'glasses', 'Brille', PD],
  ['clothes', 'armsleeve_white_s', 'extra', 'Armstulpen', 'V0rT3X (CC0)'],
];

function components(nP, faces, pos) {
  const par = Array.from({ length: nP }, (_, i) => i);
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (const f of faces) for (let k = 1; k < f.length; k++) par[find(f[k][0])] = find(f[0][0]);
  const seen = new Map();
  for (let i = 0; i < nP; i++) {
    const k = [0, 1, 2].map((a) => Math.round(pos[3 * i + a] * 500)).join(',');
    if (seen.has(k)) par[find(i)] = find(seen.get(k)); else seen.set(k, i);
  }
  return Array.from({ length: nP }, (_, i) => find(i));
}

const proxies = {};
const credits = new Set();
for (const [cat, name, slot, label, credit] of CATALOG) {
  const dir = path.join(NP, 'proxies', cat, name);
  const j = JSON.parse(fs.readFileSync(path.join(dir, name + '.json'), 'utf8'));
  const m = j.metadata; const mat = j.materials[0] || {};
  const nP = j.vertices.length / 3;
  const faces = jsonFaces(j);
  const del = []; m.deleteVerts.forEach((x, i) => { if (x) del.push(i); });
  const id0 = name.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase();
  const texDiff = mat.mapDiffuse ? await tex(path.join(dir, mat.mapDiffuse), `tex/${id0}_d.webp`, { q: 90, logo: LOGO_BOXES[name], clearLens: name === 'glasses' }) : null;
  const texNorm = mat.mapNormal ? await tex(path.join(dir, mat.mapNormal), `tex/${id0}_n.webp`, { q: 86 }) : null;
  credits.add(credit);

  // parts
  let parts = [{ suffix: '', slot, sel: null }];
  if (slot === 'suit') {
    const comp = components(nP, faces, j.vertices);
    const info = new Map();
    for (let i = 0; i < nP; i++) {
      const c = comp[i]; const y = j.vertices[3 * i + 1];
      const e = info.get(c) || { lo: 1e9, hi: -1e9, n: 0 }; e.lo = Math.min(e.lo, y); e.hi = Math.max(e.hi, y); e.n++; info.set(c, e);
    }
    const cls = new Map(); let nTop = 0, nBot = 0, nMix = 0;
    for (const [c, e] of info) {
      const mid = (e.lo + e.hi) / 2;
      let k;
      if (e.lo > -0.3 && mid > 1.5) k = 'top'; else if (e.hi < 2.6 && mid < 1.2) k = 'bottom'; else k = 'mix';
      cls.set(c, k); if (k === 'top') nTop += e.n; else if (k === 'bottom') nBot += e.n; else nMix += e.n;
    }
    if (nMix === 0 && nTop > 50 && nBot > 50) {
      parts = [
        { suffix: '_top', slot: 'top', sel: (i) => cls.get(comp[i]) === 'top' },
        { suffix: '_bottom', slot: 'bottom', sel: (i) => cls.get(comp[i]) === 'bottom' },
      ];
    } else parts = [{ suffix: '', slot: 'full', sel: null }];
  }
  for (const part of parts) {
    const id = id0 + part.suffix;
    const remap = new Int32Array(nP).fill(-1); const ref = [], bary = [], off = []; let lo = 1e9, hi = -1e9;
    for (let i = 0; i < nP; i++) {
      if (part.sel && !part.sel(i)) continue;
      remap[i] = ref.length / 3;
      ref.push(...j.ref_vIdxs[i]); bary.push(...j.weights[i]); off.push(...j.offsets[i]);
      lo = Math.min(lo, j.vertices[3 * i + 1]); hi = Math.max(hi, j.vertices[3 * i + 1]);
    }
    const pf = faces.filter((f) => f.every(([v]) => remap[v] >= 0)).map((f) => f.map(([v, u]) => [remap[v], u]));
    // a split part only hides the body verts inside its own height band
    const pdel = part.sel ? del.filter((v) => base.v[3 * v + 1] >= lo - 0.15 && base.v[3 * v + 1] <= hi + 0.15) : del;
    const meta = await writeProxy(id, { ref, bary, off, faces: pf, uvSrc: j.uvs[0], del: pdel });
    // own rendered thumbnail if present, else the bundled preview
    const thumb = `thumbs/${id}.webp`;
    if (!fs.existsSync(path.join(OUT, thumb))) await tex(path.join(dir, name + '.thumb.png'), thumb, { size: 128, q: 80 });
    proxies[id] = { ...meta, slot: part.slot, label, map: texDiff, normal: texNorm, thumb, credit, tags: m.tags || [] };
  }
}

// eyes: official files carry the real mhclo scale lines
{
  const dir = path.join(MH, 'eyes/high-poly');
  const obj = parseObj(path.join(dir, 'high-poly.obj'));
  const ref = [], bary = [], off = []; const scale = [null, null, null]; let inVerts = false;
  for (const line of fs.readFileSync(path.join(dir, 'high-poly.mhclo'), 'utf8').split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p[0] === 'x_scale') scale[0] = [+p[1], +p[2], +p[3]];
    else if (p[0] === 'y_scale') scale[1] = [+p[1], +p[2], +p[3]];
    else if (p[0] === 'z_scale') scale[2] = [+p[1], +p[2], +p[3]];
    else if (p[0] === 'verts') inVerts = true;
    else if (inVerts && p.length === 9) { ref.push(+p[0], +p[1], +p[2]); bary.push(+p[3], +p[4], +p[5]); off.push(+p[6], +p[7], +p[8]); }
    else if (inVerts && p.length === 1 && /^\d+$/.test(p[0])) { ref.push(+p[0], +p[0], +p[0]); bary.push(1, 0, 0); off.push(0, 0, 0); }
  }
  if (ref.length / 3 !== obj.v.length / 3) throw new Error(`eyes: mhclo ${ref.length / 3} vs obj ${obj.v.length / 3}`);
  const meta = await writeProxy('eyes', { ref, bary, off, faces: obj.faces.map((f) => f.c), uvSrc: obj.vt, del: [], scale });
  proxies.eyes = { ...meta, slot: 'eyes', label: 'Augen', credit: MHC, tags: [] };
}
// iris colour is applied at runtime from this one official 1024px texture
await tex(path.join(MH, 'eyes/materials/brown_eye.png'), 'tex/eye_base.webp', { q: 93 });
const eyeColors = [];

// ---------------------------------------------------------------- skins
const skins = [];
for (const d of fs.readdirSync(path.join(NP, 'skins')).sort()) {
  const tdir = path.join(NP, 'skins', d, 'textures');
  if (!fs.existsSync(tdir) || d === 'toon01') continue;
  for (const f of fs.readdirSync(tdir).sort()) {
    if (!/_diffuse\d*\.png$/.test(f)) continue;
    const id = f.replace(/_diffuse(\d*)\.png$/, '$1');
    await tex(path.join(tdir, f), `tex/skin_${id}.webp`, { q: 92 });
    const [age, tone, sex] = id.replace(/\d+$/, '').split('_');
    skins.push({ id, age, tone, sex });
  }
}

// ---------------------------------------------------------------- core
const cbin = new Bin();
const core = {
  nV: NV, nBody: 13380, unit: 0.1,
  pos: cbin.add(new Float32Array(base.v)).o,
  body: {
    nR: body.vmap.length, nI: body.index.length,
    vmap: cbin.add(new Uint16Array(body.vmap)).o, uv: cbin.add(new Float32Array(body.uvs)).o, idx: cbin.add(new Uint32Array(body.index)).o,
  },
  skinIdx: cbin.add(skinIdx).o, skinW: cbin.add(skinW).o,
  bones, targets, proxies, skins, eyeColors, credits: [...credits].sort(),
};
const cbytes = cbin.write(path.join(OUT, 'core.bin'));
fs.writeFileSync(path.join(OUT, 'core.json'), JSON.stringify(core));
const du = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? du(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log('core.bin', (cbytes / 1e6).toFixed(1), 'MB · proxies', Object.keys(proxies).length, '· skins', skins.length, '· total', (du(OUT) / 1e6).toFixed(1), 'MB');
console.log('slots', Object.values(proxies).reduce((a, p) => { a[p.slot] = (a[p.slot] || 0) + 1; return a; }, {}));
