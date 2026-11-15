// Stand-alone check of an exported GLB: loads it with the stock GLTFLoader and plays its clips.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.75;
const key = new THREE.DirectionalLight(0xfff1e2, 2.4); key.position.set(1.6, 3.4, 3.2); scene.add(key);
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60); camera.position.set(0.9, 1.2, 4.4);
const controls = new OrbitControls(camera, canvas); controls.target.set(0, 0.9, 0); controls.enableDamping = true;

let mixer = null, model = null, current = null;
const bar = document.getElementById('bar'), meta = document.getElementById('meta');
const state = { loaded: false, clips: [], bones: 0, meshes: 0, playing: null };
window.__viewer = state;

export async function load(buffer) {
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  if (model) scene.remove(model);
  model = gltf.scene; scene.add(model);
  let bones = 0, meshes = 0, tris = 0;
  model.traverse((o) => { if (o.isBone) bones++; if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; o.frustumCulled = false; } });
  const box = new THREE.Box3().setFromObject(model);
  mixer = new THREE.AnimationMixer(model);
  bar.querySelectorAll('button').forEach((b) => b.remove());
  const play = (clip, btn) => {
    if (current) current.stop();
    current = mixer.clipAction(clip); current.reset().play(); state.playing = clip.name;
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
  };
  gltf.animations.forEach((clip, i) => {
    const b = document.createElement('button'); b.textContent = clip.name; b.onclick = () => play(clip, b); bar.append(b);
    if (i === 0) play(clip, b);
  });
  Object.assign(state, { loaded: true, clips: gltf.animations.map((c) => c.name), bones, meshes, height: box.max.y - box.min.y, model });
  meta.textContent = `${meshes} Meshes · ${Math.round(tris).toLocaleString('de')} Dreiecke · ${bones} Knochen · ${gltf.animations.length} Animationen · ${(box.max.y - box.min.y).toFixed(2)} m`;
}
window.__load = load;

document.getElementById('file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) load(await f.arrayBuffer()); });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', async (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(await f.arrayBuffer()); });
const src = new URLSearchParams(location.search).get('src');
if (src) fetch(src).then((r) => r.arrayBuffer()).then(load);

const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const dt = clock.getDelta(); if (mixer) mixer.update(dt); controls.update(); renderer.render(scene, camera); });
window.__ready = true;
