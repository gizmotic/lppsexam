// Procedural animation clips, sampled to keyframes so they play in the mixer and export to GLB.
// Poses are authored as world directions for limbs (aim) plus small local rotations.
import * as THREE from 'three';

const FPS = 30;
const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const ARM = ['clavicle', 'shoulder01', 'upperarm01', 'upperarm02', 'lowerarm01', 'lowerarm02', 'wrist'];
const LEG = ['pelvis', 'upperleg01', 'upperleg02', 'lowerleg01', 'lowerleg02', 'foot'];
const FINGERS = [];
for (let f = 1; f <= 5; f++) for (let s = 1; s <= 3; s++) FINGERS.push(`finger${f}-${s}`);
export const ANIM_BONES = ['root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'neck03', 'head', 'eye.L', 'eye.R',
  ...['L', 'R'].flatMap((s) => [...ARM, ...LEG, ...FINGERS].map((b) => `${b}.${s}`))];

export const CLIPS = [
  ['idle', 'Stehen', 8], ['wave', 'Winken', 3], ['walk', 'Gehen', 1.1], ['dance', 'Tanzen', 2.4], ['pose', 'A-Pose', 1],
];

class Pose {
  constructor(avatar) {
    this.av = avatar; this.names = avatar.D.bones.map((b) => b.name);
    this.index = new Map(this.names.map((n, i) => [n, i]));
    this.local = new Map(); this.world = new Map(); this.move = new THREE.Vector3(); this.morph = {};
  }
  reset() { this.local.clear(); this.world.clear(); this.move.set(0, 0, 0); this.morph = {}; }
  q(name) { let q = this.local.get(name); if (!q) { q = new THREE.Quaternion(); this.local.set(name, q); } return q; }
  parentWorld(name) {
    const p = this.av.D.bones[this.index.get(name)].parent;
    return p < 0 ? new THREE.Quaternion() : this.wq(this.names[p]);
  }
  wq(name) { // world rotation = parents' locals composed
    const p = this.av.D.bones[this.index.get(name)].parent;
    const q = this.q(name).clone();
    return p < 0 ? q : this.wq(this.names[p]).multiply(q);
  }
  // rotate in the parent's frame (applied after what is already there)
  rot(name, axis, angle) { this.q(name).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis).normalize(), angle)); return this; }
  dir(a, b) { const r = this.av.rest, i = this.index.get(a) * 3, j = this.index.get(b) * 3; return new THREE.Vector3(r[j] - r[i], r[j + 1] - r[i + 1], r[j + 2] - r[i + 2]).normalize(); }
  // point the segment bone->child along a world direction
  aim(name, child, d) {
    const w = new THREE.Quaternion().setFromUnitVectors(this.dir(name, child), new THREE.Vector3(...d).normalize());
    this.q(name).copy(this.parentWorld(name).invert().multiply(w)); return this;
  }
  // set an absolute world rotation
  setWorld(name, w) { this.q(name).copy(this.parentWorld(name).invert().multiply(w)); return this; }
}

const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const ID = new THREE.Quaternion();

function arm(P, s, upper, fore, curl = 0.25) {
  const sg = s === 'L' ? 1 : -1;
  P.aim(`upperarm01.${s}`, `lowerarm01.${s}`, [upper[0] * sg, upper[1], upper[2]]);
  P.aim(`lowerarm01.${s}`, `wrist.${s}`, [fore[0] * sg, fore[1], fore[2]]);
  // relaxed finger curl around each finger's own bend axis
  for (let f = 2; f <= 5; f++) for (let k = 1; k <= 3; k++) {
    const a = `finger${f}-${k}.${s}`, b = k < 3 ? `finger${f}-${k + 1}.${s}` : null;
    const d = b ? P.dir(a, b) : P.dir(`finger${f}-2.${s}`, a);
    const axis = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 0, 1)).normalize();
    P.q(a).setFromAxisAngle(axis, -curl * (k === 1 ? 0.7 : 1));
  }
}
function leg(P, s, thigh, shin, footPitch = 0) {
  const sg = s === 'L' ? 1 : -1;
  P.aim(`upperleg01.${s}`, `lowerleg01.${s}`, [thigh[0] * sg, thigh[1], thigh[2]]);
  P.aim(`lowerleg01.${s}`, `foot.${s}`, [shin[0] * sg, shin[1], shin[2]]);
  P.setWorld(`foot.${s}`, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), footPitch));
}
function stand(P, t, T, amt = 1) {
  const w = (k, ph = 0) => Math.sin((TAU * k * t) / T + ph);
  const br = w(2);                         // breathing, two breaths per loop
  P.rot('spine03', X, deg(-0.9) * br * amt).rot('spine02', X, deg(-0.7) * br * amt).rot('spine01', X, deg(0.9) * br * amt);
  P.rot('clavicle.L', Z, deg(1.2) * br * amt).rot('clavicle.R', Z, deg(-1.2) * br * amt);
  P.rot('root', Z, deg(1.1) * w(1) * amt).rot('spine04', Z, deg(-1.0) * w(1) * amt);
  P.move.set(0.006 * w(1) * amt, -0.002 * (1 - br) * amt, 0);
  P.rot('neck03', Y, deg(5) * w(1, 0.7) * amt).rot('head', Y, deg(4) * w(1, 0.7) * amt).rot('head', X, deg(1.6) * w(2, 1.3) * amt);
  P.rot('eye.L', Y, deg(4) * w(1, 1.4)).rot('eye.R', Y, deg(4) * w(1, 1.4));
}
const blinkAt = (t, at) => { const x = Math.abs(t - at) / 0.085; return x < 1 ? 1 - x * x : 0; };

const POSES = {
  pose() {},
  idle(P, t, T) {
    stand(P, t, T);
    const s = Math.sin((TAU * t) / T);
    arm(P, 'L', [0.17 + 0.015 * s, -1, 0.02], [0.10, -1, 0.26 + 0.03 * s]);
    arm(P, 'R', [0.17 - 0.015 * s, -1, 0.02], [0.10, -1, 0.26 - 0.03 * s]);
    leg(P, 'L', [0.055, -1, 0.0], [0.035, -1, -0.02]); leg(P, 'R', [0.055, -1, 0.0], [0.035, -1, -0.02]);
    const b = Math.max(blinkAt(t, 1.4), blinkAt(t, 4.9), blinkAt(t, 5.25));
    P.morph.blinkL = b; P.morph.blinkR = b; P.morph.smile = 0.12 + 0.08 * s;
  },
  wave(P, t, T) {
    stand(P, t, T, 0.6);
    const s = Math.sin((TAU * 3 * t) / T);
    arm(P, 'L', [0.17, -1, 0.02], [0.10, -1, 0.26]);
    arm(P, 'R', [0.72, 0.42, 0.18], [0.22 + 0.34 * s, 1, 0.22], 0.05);
    leg(P, 'L', [0.055, -1, 0], [0.035, -1, -0.02]); leg(P, 'R', [0.055, -1, 0], [0.035, -1, -0.02]);
    P.rot('head', Z, deg(-5)).rot('spine02', Z, deg(-2));
    const b = blinkAt(t, 1.9); P.morph.blinkL = b; P.morph.blinkR = b; P.morph.smile = 0.85; P.morph.browUp = 0.35; P.morph.mouthOpen = 0.12;
  },
  walk(P, t, T) {
    const ph = (TAU * t) / T, s = Math.sin(ph), c = Math.cos(ph);
    P.move.set(0, 0.012 * Math.cos(2 * ph) - 0.012, 0);
    P.rot('root', Y, deg(4) * s).rot('spine03', Y, deg(-5) * s).rot('spine02', Y, deg(-4) * s).rot('root', X, deg(2));
    P.rot('neck03', Y, deg(3) * s);
    for (const [side, k] of [['L', 1], ['R', -1]]) {
      const sw = s * k, lift = Math.max(0, c * k);       // leg swings forward on +sw, knee lifts on the way
      leg(P, side, [0.05, -1, 0.42 * sw], [0.03, -1, 0.42 * sw - 0.75 * lift - 0.08], deg(18) * lift - deg(8) * Math.max(0, sw));
      arm(P, side, [0.16, -1, -0.33 * sw], [0.10, -1, 0.3 - 0.38 * sw], 0.35);
    }
    P.morph.smile = 0.15;
  },
  dance(P, t, T) {
    const ph = (TAU * t) / T, s = Math.sin(ph), s2 = Math.sin(2 * ph), c2 = Math.cos(2 * ph);
    P.move.set(0.03 * s, -0.035 * (0.5 - 0.5 * c2), 0);
    P.rot('root', Z, deg(7) * s).rot('spine04', Z, deg(-5) * s).rot('spine02', Z, deg(-4) * s).rot('spine03', Y, deg(10) * s);
    P.rot('head', Z, deg(5) * s).rot('neck03', Y, deg(-8) * s).rot('head', X, deg(3) * s2);
    const bend = 0.16 * (0.5 - 0.5 * c2);
    leg(P, 'L', [0.10 - 0.12 * s, -1, bend], [0.04, -1, -bend * 1.6], 0);
    leg(P, 'R', [0.10 + 0.12 * s, -1, bend], [0.04, -1, -bend * 1.6], 0);
    arm(P, 'L', [0.75, -0.25 + 0.3 * s, 0.25], [0.15 + 0.25 * s2, 0.9, 0.45], 0.4);
    arm(P, 'R', [0.75, -0.25 - 0.3 * s, 0.25], [0.15 - 0.25 * s2, 0.9, 0.45], 0.4);
    const b = blinkAt(t, 1.1); P.morph.blinkL = b; P.morph.blinkR = b; P.morph.smile = 0.7; P.morph.mouthOpen = 0.1;
  },
};

// Build all clips against the avatar's current rest skeleton and morph meshes.
export function buildClips(avatar) {
  const P = new Pose(avatar);
  const morphMeshes = avatar.morphMeshes();
  const exprNames = avatar.body.geometry.userData.targetNames || [];
  const out = {};
  for (const [id, , T] of CLIPS) {
    const n = Math.round(T * FPS) + 1;
    const times = new Float32Array(n);
    const rot = new Map(ANIM_BONES.map((b) => [b, new Float32Array(n * 4)]));
    const pos = new Float32Array(n * 3);
    const mor = new Map(exprNames.map((e) => [e, new Float32Array(n)]));
    const last = new Map();
    for (let f = 0; f < n; f++) {
      const t = f === n - 1 ? 0 : (f / (n - 1)) * T;   // last key equals the first: seamless loop
      times[f] = (f / (n - 1)) * T;
      P.reset(); POSES[id](P, t, T);
      for (const b of ANIM_BONES) {
        const q = P.local.get(b) || ID; const arr = rot.get(b); const prev = last.get(b);
        let x = q.x, y = q.y, z = q.z, w = q.w;
        if (prev && prev[0] * x + prev[1] * y + prev[2] * z + prev[3] * w < 0) { x = -x; y = -y; z = -z; w = -w; }
        arr[4 * f] = x; arr[4 * f + 1] = y; arr[4 * f + 2] = z; arr[4 * f + 3] = w; last.set(b, [x, y, z, w]);
      }
      pos[3 * f] = P.move.x; pos[3 * f + 1] = P.move.y; pos[3 * f + 2] = P.move.z;
      for (const e of exprNames) mor.get(e)[f] = P.morph[e] || 0;
    }
    const tracks = [new THREE.VectorKeyframeTrack('Motion.position', times, pos)];
    for (const b of ANIM_BONES) tracks.push(new THREE.QuaternionKeyframeTrack(`${b.replace(/\./g, '_')}.quaternion`, times, rot.get(b)));
    for (const m of morphMeshes) for (const e of exprNames) tracks.push(new THREE.NumberKeyframeTrack(`${m.name}.morphTargetInfluences[${e}]`, times, mor.get(e)));
    out[id] = new THREE.AnimationClip(id, T, tracks);
  }
  return out;
}

export class Animator {
  constructor(avatar) {
    this.avatar = avatar; this.mixer = new THREE.AnimationMixer(avatar.root);
    this.clips = {}; this.action = null; this.current = null;
  }
  rebuild() {
    const time = this.action ? this.action.time : 0, cur = this.current;
    this.mixer.stopAllAction();
    for (const c of Object.values(this.clips)) this.mixer.uncacheClip(c);
    this.clips = buildClips(this.avatar);
    this.action = null; this.current = null;
    if (cur) { this.play(cur, 0); this.action.time = time; }
  }
  play(id, fade = 0.35) {
    if (this.current === id || !this.clips[id]) return;
    const next = this.mixer.clipAction(this.clips[id]);
    next.reset().play();
    if (this.action && fade > 0) next.crossFadeFrom(this.action, fade, false); else if (this.action) this.action.stop();
    this.action = next; this.current = id;
  }
  update(dt) { this.mixer.update(dt); }
}
