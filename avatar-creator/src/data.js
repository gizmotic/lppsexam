// Loads the packed assets (see tools/build-assets.mjs).
const BASE = import.meta.env.BASE_URL + 'assets/';

export const url = (p) => BASE + p;

async function bin(p) {
  const r = await fetch(url(p));
  if (!r.ok) throw new Error('asset missing: ' + p);
  return r.arrayBuffer();
}

export async function loadCore() {
  const [core, cbuf, tbuf] = await Promise.all([fetch(url('core.json')).then((r) => r.json()), bin('core.bin'), bin('targets.bin')]);
  const nV = core.nV;
  const D = {
    core, nV, unit: core.unit,
    pos: new Float32Array(cbuf, core.pos, nV * 3),
    body: {
      nR: core.body.nR,
      vmap: new Uint16Array(cbuf, core.body.vmap, core.body.nR),
      uv: new Float32Array(cbuf, core.body.uv, core.body.nR * 2),
      idx: new Uint32Array(cbuf, core.body.idx, core.body.nI),
    },
    skinIdx: new Uint8Array(cbuf, core.skinIdx, nV * 4),
    skinW: new Float32Array(cbuf, core.skinW, nV * 4),
    bones: core.bones,
    targets: core.targets,
    proxies: core.proxies,
    skins: core.skins,
    eyeColors: core.eyeColors,
    tbuf,
    _proxyCache: new Map(),
  };
  D.target = (name) => {
    const t = core.targets[name];
    if (!t) return null;
    if (!t._i) { t._i = new Uint16Array(tbuf, t.i, t.n); t._d = new Int16Array(tbuf, t.d, t.n * 3); }
    return t;
  };
  D.proxy = (id) => {
    let p = D._proxyCache.get(id);
    if (!p) { p = loadProxy(D, id); D._proxyCache.set(id, p); }
    return p;
  };
  return D;
}

async function loadProxy(D, id) {
  const m = D.proxies[id];
  if (!m) throw new Error('unknown proxy ' + id);
  const buf = await bin('proxies/' + id + '.bin');
  const p = {
    id, meta: m, nP: m.nP, nR: m.nR,
    ref: new Uint16Array(buf, m.ref, m.nP * 3),
    bary: new Float32Array(buf, m.bary, m.nP * 3),
    off: new Float32Array(buf, m.off, m.nP * 3),
    vmap: new Uint16Array(buf, m.vmap, m.nR),
    uv: new Float32Array(buf, m.uv, m.nR * 2),
    idx: new Uint32Array(buf, m.idx, m.nI),
    del: new Uint16Array(buf, m.del, m.nDel),
    scale: m.scale,
  };
  // skin weights: blend the base weights of the three reference verts, keep the top four
  const si = new Uint16Array(m.nR * 4), sw = new Float32Array(m.nR * 4);
  const pi = new Uint16Array(m.nP * 4), pw = new Float32Array(m.nP * 4);
  const acc = new Map();
  for (let i = 0; i < m.nP; i++) {
    acc.clear();
    for (let k = 0; k < 3; k++) {
      const v = p.ref[3 * i + k], b = Math.max(0, p.bary[3 * i + k]);
      if (b === 0) continue;
      for (let q = 0; q < 4; q++) {
        const w = D.skinW[4 * v + q];
        if (w > 0) { const bi = D.skinIdx[4 * v + q]; acc.set(bi, (acc.get(bi) || 0) + w * b); }
      }
    }
    const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const s = top.reduce((a, x) => a + x[1], 0) || 1;
    if (!top.length) { pw[4 * i] = 1; continue; }
    top.forEach(([bi, w], k) => { pi[4 * i + k] = bi; pw[4 * i + k] = w / s; });
  }
  for (let r = 0; r < m.nR; r++) {
    const v = p.vmap[r];
    for (let k = 0; k < 4; k++) { si[4 * r + k] = pi[4 * v + k]; sw[4 * r + k] = pw[4 * v + k]; }
  }
  p.skinIdx = si; p.skinW = sw;
  return p;
}
