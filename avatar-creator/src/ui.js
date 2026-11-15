// Panel UI (German). Plain DOM, no framework.
import { GROUPS, MACROS, ETHNIC, sliderKey, DEFAULT_STATE } from './modifiers.js';
import { SKIN_TONES, TATTOO_GLYPHS, MAX_MOLES, MAX_TATTOOS } from './skin.js';
import { CLIPS } from './anim.js';
import { HAIR_SETS } from './hair.js';
import { CONFIG } from './config.js';
import { url } from './data.js';
import { download } from './export.js';

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
};

const ICON = {
  body: '<circle cx="12" cy="4" r="3"/><path d="M5.500 9.200h13l-1.300 7.300h-2l-.9 6.500H9.700l-.9-6.500h-2z"/>',
  face: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10.5" r="1.2"/><circle cx="15" cy="10.5" r="1.2"/><path d="M8.5 14.5c1.8 2 5.2 2 7 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  skin: '<path d="M12 3c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0C6 10.4 8.5 7.2 12 3z"/>',
  hair: '<path d="M4 20V11a8 8 0 0 1 16 0v9h-3v-8c-3 0-5.500-1.2-7-3.500C9 10.500 8 11.500 7 12v8z"/>',
  clothes: '<path d="M8.500 3 3 6.500l2 3.500 2-1v11h10V9l2 1 2-3.500L15.500 3c-.7 1.500-2 2.300-3.500 2.300S9.200 4.500 8.500 3z"/>',
  deco: '<path d="m12 2.500 2.700 5.800 6.300.8-4.600 4.400 1.200 6.300L12 16.700l-5.600 3.100 1.200-6.300L3 9.100l6.300-.8z"/>',
  move: '<path d="M7 4.500v15l12.500-7.500z"/>',
  export: '<path d="M11 3h2v9.200l3.300-3.300 1.400 1.400L12 16l-5.700-5.700 1.400-1.400 3.300 3.300zM4 18h16v3H4z"/>',
};
const icon = (name) => h('span', { class: 'ico', html: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON[name]}</svg>` });

const HAIR_COLORS = ['#17120f', '#2e2119', '#4a3323', '#6a4127', '#8a3b1f', '#b5592a', '#9c7a4b', '#c9a567', '#e6d6b0', '#8d8d8d', '#e9e9e9', '#2d5fa8', '#d457a0', '#3d8f5a', '#6b3fa0'];
const EYE_COLORS = ['#3b2212', '#6b4226', '#8a6a2f', '#b07a2a', '#5d7a3a', '#3f8079', '#3f6fa8', '#7aa7d1', '#7d8a94', '#4c4c7a'];
const CLOTH_COLORS = ['#f4f1ec', '#1d1d20', '#6b7280', '#b23b3b', '#d97a2b', '#e3c14a', '#3f8f5a', '#2d6fb0', '#31407a', '#7b4aa8', '#d16a9a', '#7a5a3c'];
const LIP_COLORS = ['#b0564f', '#c2413f', '#9c2f3a', '#d4766f', '#8a4a3f', '#b03a6a', '#6e2b3a', '#d98f80'];
const SHADOW_COLORS = ['#5b4a6b', '#3a3a44', '#6a4a36', '#2f5a6b', '#7a3f5a', '#3f6a4a', '#8a6a2f', '#1f1f24'];

export function buildUI(app) {
  const { state, D } = app;
  const panel = document.getElementById('panel');
  const syncers = [];
  app.listeners.add(() => syncers.forEach((f) => f()));
  const sync = (f) => { syncers.push(f); f(); };

  // ------------------------------------------------------------------ widgets
  function slider(label, get, set, { min = -1, max = 1, def = 0, fmt, lo, hi } = {}) {
    const val = h('output', { class: 'val' });
    const input = h('input', { type: 'range', min, max, step: (max - min) / 200, 'aria-label': label });
    const show = (v) => { val.textContent = fmt ? fmt(v) : Math.round(((v - min) / (max - min)) * 100 - (min < 0 ? 50 : 0)) * (min < 0 ? 2 : 1); input.style.setProperty('--p', ((v - min) / (max - min)) * 100 + '%'); };
    input.addEventListener('input', () => { const v = +input.value; set(v); show(v); });
    const row = h('label', { class: 'slider' }, h('span', { class: 'lab' }, label, val), input, lo || hi ? h('span', { class: 'ends' }, h('i', {}, lo || ''), h('i', {}, hi || '')) : null);
    row.addEventListener('dblclick', () => { input.value = def; set(def); show(def); });
    row.title = 'Doppelklick setzt zurück';
    sync(() => { const v = get(); input.value = v; show(v); });
    return row;
  }
  function swatches(colors, get, set, { none, custom = true } = {}) {
    const wrap = h('div', { class: 'swatches' });
    const btns = [];
    const mark = () => { const cur = get(); btns.forEach(([b, c]) => b.classList.toggle('on', (c || null) === (cur || null))); if (picker) picker.value = cur || '#888888'; };
    if (none) { const b = h('button', { class: 'sw none', title: none, onclick: () => { set(null); mark(); } }, '∅'); btns.push([b, null]); wrap.append(b); }
    for (const c of colors) { const b = h('button', { class: 'sw', style: { background: c }, title: c, 'aria-label': 'Farbe ' + c, onclick: () => { set(c); mark(); } }); btns.push([b, c]); wrap.append(b); }
    let picker = null;
    if (custom) { picker = h('input', { type: 'color', class: 'sw pick', title: 'Eigene Farbe', oninput: () => { set(picker.value); mark(); } }); wrap.append(picker); }
    sync(mark);
    return wrap;
  }
  function grid(items, get, set, { none } = {}) {
    const wrap = h('div', { class: 'grid' });
    const btns = [];
    const mark = () => { const cur = get(); btns.forEach(([b, id]) => b.classList.toggle('on', id === cur)); };
    if (none) { const b = h('button', { class: 'tile none', onclick: () => { set(null); mark(); } }, h('span', { class: 'ph' }, '∅'), h('span', { class: 'cap' }, none)); btns.push([b, null]); wrap.append(b); }
    for (const it of items) {
      const b = h('button', { class: 'tile', 'data-sex': it.sex, title: it.title || it.label, onclick: () => { set(it.id); mark(); } },
        it.thumb ? h('img', { src: it.thumb, alt: '', loading: 'lazy' }) : h('span', { class: 'ph ' + (it.cls || ''), style: it.style || {} }, it.glyph || ''),
        h('span', { class: 'cap' }, it.label));
      btns.push([b, it.id]); wrap.append(b);
    }
    sync(mark);
    return wrap;
  }
  const section = (title, cam, ...kids) => {
    const d = h('details', { class: 'sec' }, h('summary', {}, title), h('div', { class: 'sec-body' }, ...kids));
    d.addEventListener('toggle', () => { if (d.open) { if (cam) app.frame(cam); for (const o of d.parentElement.querySelectorAll('details[open]')) if (o !== d) o.open = false; } });
    return d;
  };
  const note = (t) => h('p', { class: 'note' }, t);
  const sub = (t) => h('h4', {}, t);
  const modSliders = (g) => g.sliders.map((s) => {
    const key = sliderKey(s), single = !s[2] && !s[3];
    return slider(s[0], () => state.mods[key] || 0, (v) => { if (v) state.mods[key] = v; else delete state.mods[key]; app.shapeChanged(); }, single ? { min: 0, max: 1 } : {});
  });
  const group = (id) => GROUPS.find((g) => g.id === id);
  // brows and lashes: the stroke texture itself reads better than the tiny bundled preview
  const partItems = (slot) => Object.entries(D.proxies).filter(([id, p]) => p.slot === slot && !CONFIG.hiddenParts.includes(id)).map(([id, p]) => (slot === 'brows' || slot === 'lashes'
    ? { id, label: p.label, cls: 'stroke', style: { backgroundImage: `url(${url(p.map)})` }, title: `${p.label} — ${p.credit}` }
    : { id, label: p.label, sex: p.sex, thumb: p.thumb ? url(p.thumb) : null, title: `${p.label} — ${p.credit}` }));
  const partGrid = (slot, opts = {}) => grid(partItems(slot), () => state.parts[slot], (id) => {
    state.parts[slot] = id;
    if ((slot === 'top' || slot === 'bottom') && id) state.parts.full = null;
    app.partsChanged(); syncers.forEach((f) => f());
  }, opts);
  const colorRow = (slot, colors, noneLabel) => swatches(colors, () => state.colors[slot], (c) => { state.colors[slot] = c; app.colorsChanged(); }, { none: noneLabel });
  const skinSlider = (label, key, opts = { min: 0, max: 1 }) => slider(label, () => state.skin[key], (v) => { state.skin[key] = v; app.skinChanged(); }, opts);

  // ------------------------------------------------------------------ tabs
  const TABS = [
    { id: 'body', label: 'Körper', cam: 'full', build: () => [
      h('div', { class: 'quick' },
        h('button', { class: 'btn', onclick: () => preset('f') }, 'Vorlage Frau'),
        h('button', { class: 'btn', onclick: () => preset('m') }, 'Vorlage Mann')),
      sub('Grundform'),
      ...MACROS.map(([k, label, lo, hi]) => slider(label, () => state.macro[k], (v) => { state.macro[k] = v; app.shapeChanged(); if (k === 'gender') app.skinChanged(); }, { min: 0, max: 1, def: k === 'age' ? 0 : 0.5, lo, hi })),
      section('Körperbau-Typ', 'full', note('Mischung der Grundformen – die Summe wird automatisch ausgeglichen.'),
        ...ETHNIC.map(([k, label]) => slider(label, () => state.macro[k], (v) => { state.macro[k] = v; app.shapeChanged(); }, { min: 0, max: 1, def: k === 'caucasian' ? 1 : 0 }))),
      section('Oberkörper', 'upper', ...modSliders(group('torso'))),
      section('Brust', 'upper',
        slider('Größe', () => state.macro.cup, (v) => { state.macro.cup = v; app.shapeChanged(); }, { min: 0, max: 1, def: 0.5 }),
        slider('Festigkeit', () => state.macro.firmness, (v) => { state.macro.firmness = v; app.shapeChanged(); }, { min: 0, max: 1, def: 0.5 }),
        ...modSliders(group('breast')), note('Größe und Festigkeit wirken mit dem weiblichen Anteil der Grundform.')),
      section('Bauch & Hüfte', 'mid', ...modSliders(group('belly'))),
      section('Arme & Hände', 'upper', ...modSliders(group('arms'))),
      section('Beine & Füße', 'lower', ...modSliders(group('legs'))),
    ] },
    { id: 'face', label: 'Gesicht', cam: 'face', build: () => [
      ...['head', 'forehead'].map((id) => section(group(id).label, group(id).cam, ...modSliders(group(id)))),
      section('Augen', 'eyes', sub('Augenfarbe'), swatches(EYE_COLORS, () => state.eyes.color, (c) => { state.eyes.color = c; app.colorsChanged(); }), sub('Form'), ...modSliders(group('eyes')),
        sub('Wimpern'), partGrid('lashes', { none: 'Keine' })),
      section('Augenbrauen', 'eyes', partGrid('brows', { none: 'Keine' }), sub('Farbe'), colorRow('brows', HAIR_COLORS), sub('Form'), ...modSliders(group('brows'))),
      ...['nose', 'mouth', 'cheek', 'chin', 'ears', 'neck'].map((id) => section(group(id).label, group(id).cam, ...modSliders(group(id)))),
    ] },
    { id: 'skin', label: 'Haut', cam: 'face', build: () => [
      sub('Hauttyp'),
      grid(D.skins.map((s) => ({ id: s.id, label: `${{ young: 'jung', middleage: 'mittel', old: 'älter' }[s.age]} ${s.sex === 'female' ? '♀' : '♂'}`, cls: 'skin', style: { backgroundImage: `url(${url(`tex/skin_${s.id}.webp`)})` }, title: s.id })),
        () => state.skin.base, (id) => { state.skin.base = id; app.skinChanged(); }),
      sub('Hautton'), swatches(SKIN_TONES, () => state.skin.tone, (c) => { state.skin.tone = c; app.skinChanged(); }, { none: 'Original' }),
      skinSlider('Falten & Alterung', 'wrinkles'),
      CONFIG.faceTexture && section('Eigene Gesichtstextur', 'face', (() => {
        const file = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, id: 'face-file', onchange: async () => {
          const f = file.files[0]; if (!f) return; file.value = '';
          try {
            const img = new Image(); const url = URL.createObjectURL(f); img.src = url; await img.decode(); URL.revokeObjectURL(url);
            if (!app.skin.setFaceTexture(img)) { app.toast('Das Bild passt nicht: Kopf-Abwicklung (Gesicht in der Mitte, Querformat) erwartet'); return; }
            app.skinChanged(); state.skin.freckles = 0; state.skin.beard = 0; syncers.forEach((fn) => fn()); status.textContent = 'Geladen: ' + f.name; app.toast('Gesichtstextur geladen');
          } catch { app.toast('Bild konnte nicht gelesen werden'); }
        } });
        const status = h('p', { class: 'note' }, 'Keine eigene Textur.');
        return [note('Kopf-Abwicklung als Bild (Gesicht in der Mitte, Ohren links und rechts, Querformat). Haare, Augenbrauen und Wimpern aus dem Bild werden übermalt – Frisur, Brauen und Augen kommen aus dem Baukasten. Nase und Mund formst du mit den Reglern. Das Bild bleibt auf diesem Gerät: es wird nicht hochgeladen und nicht gespeichert.'),
          h('div', { class: 'quick' }, h('button', { class: 'btn', onclick: () => file.click() }, 'Bild wählen'), h('button', { class: 'btn', onclick: () => { app.skin.setFaceTexture(null); app.skinChanged(); status.textContent = 'Keine eigene Textur.'; } }, 'Entfernen')), file, status,
          note('Nur Bilder verwenden, an denen du die Rechte hast – bei echten Personen (vor allem Kindern) nur mit Einverständnis.')];
      })()),
      section('Sommersprossen', 'face', skinSlider('Gesicht', 'freckles'), skinSlider('Schultern & Arme', 'bodyFreckles'),
        h('button', { class: 'btn', onclick: () => { state.skin.freckleSeed = 1 + Math.floor(Math.random() * 97); app.skinChanged(); } }, 'Neu verteilen')),
      CONFIG.moles && section('Punkterl & Muttermale', 'face', (() => {
        const st = { size: 1.6, dark: 0.85 };
        const count = h('span', { class: 'count' });
        const btn = h('button', { class: 'btn toggle' }, 'Punkterl setzen');
        const upd = () => { count.textContent = `${state.skin.moles.length} / ${MAX_MOLES}`; };
        btn.addEventListener('click', () => placeMode(btn, 'Auf die Haut klicken, um ein Punkterl zu setzen', (hit) => {
          if (state.skin.moles.length >= MAX_MOLES) { app.toast('Maximal ' + MAX_MOLES + ' Punkterl'); return; }
          state.skin.moles.push({ u: hit.u, v: hit.v, r: (st.size / 2000) * hit.uvPerMetre, d: st.dark }); app.skinChanged(); upd();
        }));
        sync(upd);
        return [note('Modus einschalten, dann direkt auf Gesicht oder Körper klicken.'), h('div', { class: 'quick' }, btn, count),
          slider('Größe', () => st.size, (v) => { st.size = v; }, { min: 0.6, max: 6, def: 1.6, fmt: (v) => v.toFixed(1) + ' mm' }),
          slider('Dunkelheit', () => st.dark, (v) => { st.dark = v; }, { min: 0.3, max: 1, def: 0.85 }),
          h('div', { class: 'quick' },
            h('button', { class: 'btn', onclick: () => { state.skin.moles.pop(); app.skinChanged(); upd(); } }, 'Letztes entfernen'),
            h('button', { class: 'btn', onclick: () => { state.skin.moles.length = 0; app.skinChanged(); upd(); } }, 'Alle entfernen'))];
      })()),
      section('Make-up', 'face',
        sub('Lippen'), swatches(LIP_COLORS, () => state.skin.lipColor, (c) => { state.skin.lipColor = c; if (!state.skin.lipStrength) state.skin.lipStrength = 0.6; app.skinChanged(); syncers.forEach((f) => f()); }), skinSlider('Stärke', 'lipStrength'),
        sub('Rouge'), skinSlider('Stärke', 'blush'),
        sub('Lidschatten'), swatches(SHADOW_COLORS, () => state.skin.shadowColor, (c) => { state.skin.shadowColor = c; if (!state.skin.shadow) state.skin.shadow = 0.5; app.skinChanged(); syncers.forEach((f) => f()); }), skinSlider('Stärke', 'shadow')),
      section('Bartschatten', 'face', skinSlider('Stoppeln', 'beard'), note('Farbe folgt der Haarfarbe.')),
    ] },
    { id: 'hair', label: 'Haare', cam: 'hair', build: () => {
      const g = partGrid('hair', { none: 'Glatze' });
      const chips = [['', 'Alle'], ['m', 'Männlich'], ['f', 'Weiblich']].map(([k, label]) => h('button', { class: 'chip' + (k === '' ? ' on' : ''), onclick: (e) => { g.dataset.filter = k; chips.forEach((c) => c.classList.toggle('on', c === e.currentTarget)); } }, label));
      return [sub('Frisur'), h('div', { class: 'chips inline' }, ...chips), g, sub('Haarfarbe'), colorRow('hair', HAIR_COLORS)];
    } },
    { id: 'clothes', label: 'Kleidung', cam: 'full', build: () => [
      section('Oberteile', 'upper', partGrid('top', CONFIG.schoolSafe ? {} : { none: 'Keines' }), sub('Farbe'), colorRow('top', CLOTH_COLORS, 'Original')),
      section('Hosen & Röcke', 'lower', partGrid('bottom', CONFIG.schoolSafe ? {} : { none: 'Keine' }), sub('Farbe'), colorRow('bottom', CLOTH_COLORS, 'Original')),
      section('Kleider & Outfits', 'full', note('Ein Outfit ersetzt Oberteil und Hose.'), partGrid('full', { none: 'Keines' }), sub('Farbe'), colorRow('full', CLOTH_COLORS, 'Original')),
      section('Schuhe', 'feet', partGrid('shoes', { none: 'Barfuß' }), sub('Farbe'), colorRow('shoes', CLOTH_COLORS, 'Original')),
      CONFIG.paintedBase && section('Grundkleidung', 'full', note('Unterhemd und Shorts sind fest Teil jeder Figur.'),
        sub('Farbe'), swatches(['#e4e1dc', '#1d1d20', '#6b7280', '#b23b3b', '#2d6fb0', '#3f8f5a', '#d16a9a', '#e3c14a'], () => state.skin.underColor, (c) => { state.skin.underColor = c; app.skinChanged(); })),
    ] },
    { id: 'deco', label: 'Deko', cam: 'upper', build: () => [
      section('Hüte', 'hair', partGrid('hat', { none: 'Keiner' }), sub('Farbe'), colorRow('hat', CLOTH_COLORS, 'Original')),
      section('Brille', 'face', partGrid('glasses', { none: 'Keine' })),
      section('Extras', 'upper', partGrid('extra', { none: 'Keine' }), sub('Farbe'), colorRow('extra', CLOTH_COLORS, 'Original')),
      CONFIG.tattoos && section('Tattoos', 'upper', (() => {
        const st = { glyph: 0, size: 6, rot: 0 };
        const count = h('span', { class: 'count' });
        const upd = () => { count.textContent = `${state.skin.tattoos.length} / ${MAX_TATTOOS}`; };
        const btn = h('button', { class: 'btn toggle' }, 'Tattoo platzieren');
        btn.addEventListener('click', () => placeMode(btn, 'Auf die Haut klicken, um das Tattoo zu setzen', (hit) => {
          if (state.skin.tattoos.length >= MAX_TATTOOS) { app.toast('Maximal ' + MAX_TATTOOS + ' Tattoos'); return; }
          state.skin.tattoos.push({ u: hit.u, v: hit.v, size: (st.size / 100) * hit.uvPerMetre, rot: (st.rot * Math.PI) / 180, glyph: st.glyph, alpha: 1 }); app.skinChanged(); upd();
        }));
        const live = () => { const t = state.skin.tattoos[state.skin.tattoos.length - 1]; if (t) { t.rot = (st.rot * Math.PI) / 180; app.skinChanged(); } };
        sync(upd);
        return [grid(TATTOO_GLYPHS.map((g, i) => ({ id: i, label: '', glyph: g })), () => st.glyph, (i) => { st.glyph = i; }),
          h('div', { class: 'quick' }, btn, count),
          slider('Größe', () => st.size, (v) => { st.size = v; }, { min: 2, max: 20, def: 6, fmt: (v) => v.toFixed(0) + ' cm' }),
          slider('Drehung', () => st.rot, (v) => { st.rot = v; live(); }, { min: -180, max: 180, def: 0, fmt: (v) => v.toFixed(0) + '°' }),
          note('Die Drehung wirkt auch auf das zuletzt gesetzte Tattoo.'),
          h('div', { class: 'quick' },
            h('button', { class: 'btn', onclick: () => { state.skin.tattoos.pop(); app.skinChanged(); upd(); } }, 'Letztes entfernen'),
            h('button', { class: 'btn', onclick: () => { state.skin.tattoos.length = 0; app.skinChanged(); upd(); } }, 'Alle entfernen'))];
      })()),
    ] },
    { id: 'move', label: 'Bewegung', cam: 'full', build: () => {
      const btns = CLIPS.map(([id, label]) => [id, h('button', { class: 'btn wide', onclick: () => { app.setAnim(id); mark(); } }, label)]);
      const mark = () => btns.forEach(([id, b]) => b.classList.toggle('on', state.anim === id));
      sync(mark);
      return [sub('Animation'), h('div', { class: 'stack' }, ...btns.map((b) => b[1])), note('Alle Animationen (außer A-Pose) werden beim GLB-Export mitgespeichert.')];
    } },
    { id: 'export', label: 'Export', cam: 'full', build: () => {
      const file = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: async () => {
        const f = file.files[0]; if (!f) return;
        try { await app.setState(JSON.parse(await f.text())); app.toast('Avatar geladen'); } catch { app.toast('Datei konnte nicht gelesen werden'); }
        file.value = '';
      } });
      const busy = async (btn, fn) => { btn.disabled = true; const t = btn.textContent; btn.textContent = 'Wird erstellt …'; try { await fn(); } catch (e) { console.error(e); app.toast('Export fehlgeschlagen'); } btn.textContent = t; btn.disabled = false; };
      const b1 = h('button', { class: 'btn primary wide', id: 'export-glb' }, 'GLB mit Animationen');
      b1.addEventListener('click', () => busy(b1, async () => { await app.exportGLB({ animations: true }); app.toast('avatar.glb gespeichert'); }));
      const b2 = h('button', { class: 'btn wide' }, 'GLB nur Rig (ohne Animation)');
      b2.addEventListener('click', () => busy(b2, async () => { await app.exportGLB({ animations: false }); app.toast('avatar.glb gespeichert'); }));
      return [sub('3D-Modell'), h('div', { class: 'stack' }, b1, b2),
        note('Enthält Skelett (163 Knochen), Skinning, Mimik-Morphs, Texturen und die Animationen. Lässt sich in Blender, Unity, Unreal, Godot oder three.js weiter animieren.'),
        sub('Bild & Datei'), h('div', { class: 'stack' },
          h('button', { class: 'btn wide', onclick: () => app.screenshot() }, 'Foto als PNG'),
          h('button', { class: 'btn wide', onclick: () => download(new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }), 'avatar.json') }, 'Avatar speichern (.json)'),
          h('button', { class: 'btn wide', onclick: () => file.click() }, 'Avatar laden'), file),
        sub('Quellen'), note('Körper, Morphs, Skelett, Haut, Haare und Kleidung: ' + D.core.credits.join(' · ') + '.')];
    } },
  ];

  // ------------------------------------------------------------------ placing mode
  let activeBtn = null;
  function placeMode(btn, hint, fn) {
    const off = () => { app.placing = null; activeBtn?.classList.remove('on'); activeBtn = null; document.body.classList.remove('placing'); };
    if (activeBtn === btn) { off(); return; }
    off(); activeBtn = btn; btn.classList.add('on'); app.placing = fn; document.body.classList.add('placing'); app.toast(hint);
  }

  // ------------------------------------------------------------------ presets / random
  function preset(kind) {
    const s = DEFAULT_STATE();
    if (kind === 'f') {
      Object.assign(s.macro, { gender: 0.0, cup: 0.5 });
      Object.assign(s.parts, { hair: 'gen_long', brows: 'eyebrow005', top: 'vnecktop', bottom: 'tightjeans', shoes: 'shoes05' });
      Object.assign(s.skin, { base: 'young_lightskinned_female', lipStrength: 0.3, blush: 0.15 });
      s.colors.hair = '#4a3323'; s.colors.brows = '#4a3323';
    } else {
      Object.assign(s.macro, { gender: 1.0 });
    }
    s.anim = state.anim;
    app.setState(s);
  }
  function randomize() {
    const s = DEFAULT_STATE(), R = Math.random, pick = (a) => a[Math.floor(R() * a.length)];
    const gauss = () => (R() + R() + R() - 1.5) / 1.5;                 // roughly normal, -1..1
    const female = R() < 0.5;
    const age = R() < 0.6 ? R() * 0.25 : R() < 0.6 ? 0.25 + R() * 0.35 : 0.6 + R() * 0.4;
    // weight mostly near the middle (it dominates jaw and cheeks), with the odd slim or heavy build
    const weight = Math.max(0.05, Math.min(0.95, 0.45 + gauss() * (R() < 0.25 ? 0.45 : 0.16)));
    Object.assign(s.macro, { gender: female ? R() * 0.3 : 0.7 + R() * 0.3, age, muscle: 0.25 + R() * 0.6, weight, height: 0.25 + R() * 0.5, cup: 0.25 + R() * 0.55, proportions: 0.3 + R() * 0.5 });
    // one dominant build type with a varying share of the others
    const e = [R() * 0.5, R() * 0.5, R() * 0.5]; e[Math.floor(R() * 3)] += 0.6 + R();
    Object.assign(s.macro, { caucasian: e[0], african: e[1], asian: e[2] });
    // every face slider gets its own draw: most move a little, a few move a lot -> faces differ in many small ways
    for (const g of GROUPS) {
      if (!['head', 'forehead', 'eyes', 'brows', 'nose', 'mouth', 'cheek', 'chin', 'ears', 'neck'].includes(g.id)) continue;
      for (const sl of g.sliders) {
        if (!sl[2] && !sl[3]) continue;
        // mouth, chin and nose carry most of a face's identity: they get a wider spread; the base mouth is small, so width leans up
        const key = g.id === 'mouth' || g.id === 'chin' || g.id === 'nose';
        const strong = R() < (key ? 0.35 : 0.18);
        let v = gauss() * (strong ? 1.0 : key ? 0.55 : 0.42);
        if (sl[1] === 'mouth/mouth-scale-horiz') v += 0.3;
        if (sl[1] === 'mouth/mouth-angles') v += 0.15;
        if (Math.abs(v) > 0.05) s.mods[sliderKey(sl)] = Math.max(-1, Math.min(1, v));
      }
    }
    // one head-shape type, sometimes blended with a second
    const shapes = group('head').sliders.filter((sl) => !sl[2] && !sl[3]);
    s.mods[sliderKey(pick(shapes))] = 0.35 + R() * 0.55;
    if (R() < 0.35) s.mods[sliderKey(pick(shapes))] = 0.2 + R() * 0.4;
    const ids = (slot) => Object.entries(D.proxies).filter(([id, p]) => p.slot === slot && !CONFIG.hiddenParts.includes(id)).map(([id]) => id);
    const ageTag = age > 0.62 ? 'old' : age > 0.3 ? 'middleage' : 'young';
    const skins = D.skins.filter((k) => k.sex === (female ? 'female' : 'male') && k.age === ageTag);
    const darkish = s.macro.african > Math.max(s.macro.caucasian, s.macro.asian);
    s.skin.base = pick(skins.filter((k) => (k.tone === 'darkskinned') === darkish).length ? skins.filter((k) => (k.tone === 'darkskinned') === darkish) : skins).id;
    s.skin.tone = R() < 0.55 ? null : pick(darkish ? SKIN_TONES.slice(5) : SKIN_TONES.slice(0, 6));
    s.skin.wrinkles = age > 0.3 ? Math.min(1, (age - 0.3) * 1.5) : 0;
    s.skin.freckles = R() < 0.25 ? 0.3 + R() * 0.7 : 0; s.skin.freckleSeed = 1 + Math.floor(R() * 97);
    if (female) { s.skin.lipStrength = R() < 0.6 ? R() * 0.7 : 0; s.skin.lipColor = pick(LIP_COLORS); s.skin.blush = R() * 0.3; s.skin.shadow = R() < 0.3 ? R() * 0.6 : 0; s.skin.shadowColor = pick(SHADOW_COLORS); }
    else s.skin.beard = R() < 0.45 ? 0.3 + R() * 0.7 : 0;
    s.parts.hair = !female && R() < 0.06 ? null : pick(HAIR_SETS[female ? 'female' : 'male']);
    s.parts.brows = pick(ids('brows')); s.parts.lashes = pick(ids('lashes'));
    s.colors.hair = age > 0.7 && R() < 0.7 ? pick(['#8d8d8d', '#b9b9b9', '#e9e9e9']) : pick(darkish ? HAIR_COLORS.slice(0, 3) : HAIR_COLORS.slice(0, 9));
    s.colors.brows = /^#(8d|b9|e9)/.test(s.colors.hair) ? '#6a6a6a' : s.colors.hair;
    s.eyes.color = pick(darkish ? EYE_COLORS.slice(0, 3) : EYE_COLORS);
    const tops = ids('top').filter((i) => female || i.startsWith('male')), bottoms = ids('bottom').filter((i) => female || i.startsWith('male'));
    s.parts.top = pick(tops); s.parts.bottom = pick(bottoms); s.parts.shoes = pick(ids('shoes')); s.parts.full = female && R() < 0.25 ? pick(ids('full').filter((i) => !i.startsWith('male'))) : null;
    s.parts.glasses = R() < 0.18 ? 'glasses' : null;
    s.anim = state.anim;
    return app.setState(s);
  }

  // ------------------------------------------------------------------ assemble
  const rail = h('nav', { class: 'rail', 'aria-label': 'Bereiche' });
  const body = h('div', { class: 'panel-body' });
  const title = h('h2', {});
  const pages = new Map();
  let active = null;
  function open(id) {
    const tab = TABS.find((t) => t.id === id);
    if (!pages.has(id)) pages.set(id, h('div', { class: 'page' }, ...tab.build().filter(Boolean)));
    for (const [pid, el] of pages) el.hidden = pid !== id;
    if (!pages.get(id).isConnected) body.append(pages.get(id));
    title.textContent = tab.label; active = id;
    rail.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    app.frame(tab.cam);
    body.scrollTop = 0;
  }
  for (const t of TABS) rail.append(h('button', { 'data-id': t.id, onclick: () => open(t.id), 'aria-label': t.label }, icon(t.id), h('span', {}, t.label)));
  panel.append(rail, h('div', { class: 'panel-main' }, h('header', {}, h('div', { class: 'brand' }, 'Avatar', h('b', {}, 'Studio')), title), body));

  const toolbar = document.getElementById('toolbar');
  const views = [['full', 'Ganz'], ['upper', 'Oberkörper'], ['face', 'Gesicht']];
  toolbar.append(
    h('div', { class: 'chips', id: 'views' }, ...views.map(([id, label]) => h('button', { class: 'chip', 'data-view': id, onclick: () => app.frame(id) }, label))),
    h('div', { class: 'chips' },
      h('button', { class: 'chip', onclick: randomize, id: 'btn-random' }, 'Zufall'),
      (() => { let armed = 0; const b = h('button', { class: 'chip' }, 'Zurücksetzen');
        b.addEventListener('click', () => {   // second click within 3 s confirms (no browser dialog: those are blocked in embedded views)
          if (Date.now() - armed < 3000) { armed = 0; b.textContent = 'Zurücksetzen'; app.setState({ ...DEFAULT_STATE(), anim: state.anim }); return; }
          armed = Date.now(); b.textContent = 'Wirklich? Nochmal klicken'; setTimeout(() => { if (armed) { armed = 0; b.textContent = 'Zurücksetzen'; } }, 3000);
        }); return b; })(),
      h('button', { class: 'chip primary', onclick: () => open('export') }, 'Exportieren')));

  app.panelWidth = innerWidth > 760 ? panel.getBoundingClientRect().width : 0;
  addEventListener('resize', () => { app.panelWidth = innerWidth > 760 ? panel.getBoundingClientRect().width : 0; });
  app.ui = { open, randomize, preset };
  open('body');
}
