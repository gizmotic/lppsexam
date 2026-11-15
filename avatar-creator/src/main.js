import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';
import { loadCore } from './data.js';
import { Avatar } from './avatar.js';
import { SkinCompositor } from './skin.js';
import { Animator } from './anim.js';
import { DEFAULT_STATE, GROUPS, sliderKey, targetWeights } from './modifiers.js';
import { buildUI } from './ui.js';
import { exportGLB, download } from './export.js';

const STORE_KEY = 'avatar-studio-state-v1';
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.maxPixelRatio));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = CONFIG.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.75;

// one studio for every view: warm key with shadows, cool rim, environment as fill
const key = new THREE.DirectionalLight(0xfff1e2, 2.4);
key.position.set(1.6, 3.4, 3.2); key.castShadow = CONFIG.shadows;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = 5;
Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 2.3, bottom: -0.3, near: 0.5, far: 9 });
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xcfe0ff, 1.5); rim.position.set(-2.2, 2.4, -2.6); scene.add(rim);
const fillLight = new THREE.DirectionalLight(0xffe9dc, 0.35); fillLight.position.set(-2.5, 1.2, 2.2); scene.add(fillLight);

const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 0.3; controls.maxDistance = 9; controls.maxPolarAngle = Math.PI * 0.56; controls.minPolarAngle = Math.PI * 0.12;

function loadState() {
  const def = DEFAULT_STATE();
  if (!CONFIG.autosave || new URLSearchParams(location.search).has('fresh')) return def;
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!s) return def;
    return mergeState(def, s);
  } catch { return def; }
}
export function mergeState(def, s) {
  for (const k of ['macro', 'parts', 'colors', 'eyes', 'skin']) Object.assign(def[k], s[k] || {});
  def.mods = { ...(s.mods || {}) }; def.anim = s.anim || def.anim;
  return def;
}

const D = await loadCore();
const state = loadState();
const skin = new SkinCompositor(renderer, D);
const avatar = new Avatar(D, state, skin.texture, renderer);
scene.add(avatar.root);
const animator = new Animator(avatar);

const app = {
  THREE, D, state, avatar, skin, animator, camera, controls, scene, renderer, modifiers: { GROUPS, sliderKey, targetWeights },
  panelWidth: 0, placing: null, listeners: new Set(),
  // ---- change notifications from the UI
  shapeChanged() { avatar.dirty.shape = true; app.save(); },
  skinChanged() { skin.apply(state.skin, { hairColor: state.colors.hair || '#3a2a1f', gender: state.macro.gender, chestCovered: !!(state.parts.full || state.parts.top), hipsCovered: !!(state.parts.full || state.parts.bottom) }); app.save(); },
  colorsChanged() { avatar.applyColors(); app.skinChanged(); },
  async partsChanged() { await avatar.syncParts(); avatar.update(); animator.rebuild(); app.skinChanged(); },
  setAnim(id) { state.anim = id; animator.play(id); app.save(); },
  async setState(next) {
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, mergeState(DEFAULT_STATE(), next));
    await avatar.syncParts(); avatar.applyColors(); app.skinChanged(); avatar.dirty.shape = true; avatar.update();
    animator.rebuild(); animator.current = null; animator.play(state.anim, 0);
    app.listeners.forEach((f) => f());
    app.save();
  },
  save: (() => { let t; return () => { if (!CONFIG.autosave) return; clearTimeout(t); t = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ } }, 300); }; })(),
  toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(app._tt); app._tt = setTimeout(() => el.classList.remove('show'), 2600); },

  // ---- camera framing
  frame(name, instant = false) {
    const H = avatar.bodyHeight || 1.7;
    const head = avatar.anchor('head'), eye = avatar.anchor('eye.L'), jaw = avatar.anchor('special04');
    const faceMid = (eye.y + jaw.y) / 2 + 0.035;
    const F = {
      full: [H * 0.5, 0, H * 1.2, 0.18, 0.02], upper: [H * 0.74, 0, H * 0.66, 0.25, 0.02], mid: [H * 0.56, 0, H * 0.62, 0.3, 0.02],
      lower: [H * 0.28, 0, H * 0.64, 0.3, 0.05], feet: [0.09, 0.05, 0.62, 0.55, 0.3],
      face: [faceMid, eye.z - 0.06, 0.40, 0.2, 0.02], eyes: [eye.y - 0.005, eye.z - 0.04, 0.2, 0.12, 0.0], mouth: [jaw.y + 0.055, eye.z - 0.02, 0.2, 0.12, 0.0],
      side: [faceMid, head.z, 0.42, 1.25, 0.02], hair: [head.y + 0.07, head.z, 0.5, 0.45, 0.08],
    }[name] || null;
    if (!F) return;
    const [cy, cz, size, az, el] = F;
    const aspectFit = Math.min(1, (app.viewW() / innerHeight) / 0.62);
    const dist = (size / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / aspectFit;
    const target = new THREE.Vector3(0, cy, cz);
    const pos = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(target);
    app.currentFrame = name;
    if (instant) { camera.position.copy(pos); controls.target.copy(target); app._tween = null; return; }
    app._tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target };
  },
  viewW() { return Math.max(200, innerWidth - app.panelWidth); },
  resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    // keep the avatar centred in the area right of the panel
    if (app.panelWidth && innerWidth > 760) camera.setViewOffset(innerWidth, innerHeight, -app.panelWidth / 2, 0, innerWidth, innerHeight); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  },

  // ---- click-to-place (moles, tattoos)
  pick(ev) {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, camera);
    const hit = rc.intersectObject(avatar.body, false)[0];
    if (!hit || !hit.uv) return null;
    // local texture scale at the hit: uv units per metre
    const g = avatar.body.geometry, f = hit.face, P = g.attributes.position, U = g.attributes.uv;
    const a = new THREE.Vector3().fromBufferAttribute(P, f.a), b = new THREE.Vector3().fromBufferAttribute(P, f.b), c = new THREE.Vector3().fromBufferAttribute(P, f.c);
    const area3 = b.sub(a).cross(c.sub(a)).length() / 2;
    const ua = new THREE.Vector2().fromBufferAttribute(U, f.a), ub = new THREE.Vector2().fromBufferAttribute(U, f.b), uc = new THREE.Vector2().fromBufferAttribute(U, f.c);
    const areaU = Math.abs((ub.x - ua.x) * (uc.y - ua.y) - (uc.x - ua.x) * (ub.y - ua.y)) / 2;
    return { u: hit.uv.x, v: hit.uv.y, uvPerMetre: Math.sqrt(areaU / Math.max(area3, 1e-9)) };
  },

  // debug: show a region mask on the body (null restores the skin)
  debugMask(which) { avatar.skinMaterial.map = which ? skin[which].texture : skin.texture; avatar.skinMaterial.needsUpdate = true; },
  async exportGLB(opts) { return exportGLB(app, opts); },
  screenshot() {
    renderer.render(scene, camera);
    canvas.toBlob((b) => download(b, 'avatar.png'), 'image/png');
  },
};
window.__app = app;

// click vs drag: only a still click places a mark
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || !app.placing) return;
  if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const hit = app.pick(e);
  if (hit) app.placing(hit); else app.toast('Bitte direkt auf die Haut klicken');
});

await avatar.syncParts();
app.skinChanged();
avatar.update();
animator.rebuild();
animator.play(state.anim || 'idle', 0);
buildUI(app);
app.resize();
app.frame('full', true);
addEventListener('resize', app.resize);

const clock = new THREE.Clock();
let frames = 0, fpsT = 0;
app.stats = { fps: 0, ms: 0 };
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t0 = performance.now();
  if (app._tween) {
    const w = app._tween; w.t = Math.min(1, w.t + dt / 0.55);
    const k = 1 - Math.pow(1 - w.t, 3);
    camera.position.lerpVectors(w.p0, w.p1, k); controls.target.lerpVectors(w.t0, w.t1, k);
    if (w.t >= 1) app._tween = null;
  }
  avatar.update();
  skin.render();
  animator.update(dt);
  controls.update();
  renderer.render(scene, camera);
  app.stats.ms = performance.now() - t0;
  frames++; fpsT += dt; if (fpsT >= 1) { app.stats.fps = frames / fpsT; frames = 0; fpsT = 0; }
});

// warm every shader before the first interaction, then reveal
await renderer.compileAsync(scene, camera);
document.getElementById('loading').classList.add('hidden');
window.__ready = true;
