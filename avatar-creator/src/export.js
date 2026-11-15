// GLB export: rigged, skinned avatar in rest pose with baked skin texture and animation clips.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { CONFIG } from './config.js';
import { buildClips } from './anim.js';

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Returns an ArrayBuffer. opts: { animations: bool, textureSize: number, save: bool }
export async function exportGLB(app, opts = {}) {
  const { avatar, skin, animator } = app;
  const withAnim = (opts.animations ?? true) && CONFIG.glbAnimations;
  avatar.update(); skin.render();
  // rest pose
  animator.mixer.stopAllAction();
  for (const b of avatar.bones) b.quaternion.identity();
  avatar.motion.position.set(0, 0, 0);
  for (const m of avatar.morphMeshes()) m.morphTargetInfluences.fill(0);
  // the live skin is a render target; glTF needs an image
  const liveMap = avatar.skinMaterial.map;
  const baked = new THREE.CanvasTexture(skin.toCanvas(opts.textureSize || 1024));
  baked.colorSpace = THREE.SRGBColorSpace;
  avatar.skinMaterial.map = baked;
  const hidden = []; avatar.root.traverse((o) => { if (o.userData.noExport && o.visible) { o.visible = false; hidden.push(o); } });
  avatar.root.updateMatrixWorld(true);
  try {
    const clips = withAnim ? Object.values(buildClips(avatar)).filter((c) => c.name !== 'pose') : [];
    const glb = await new GLTFExporter().parseAsync(avatar.root, { binary: true, animations: clips, onlyVisible: true });
    if (opts.save !== false) download(new Blob([glb], { type: 'model/gltf-binary' }), 'avatar.glb');
    return glb;
  } finally {
    avatar.skinMaterial.map = liveMap; baked.dispose(); hidden.forEach((o) => { o.visible = true; });
    const cur = animator.current; animator.action = null; animator.current = null;
    animator.play(cur || 'idle', 0);
  }
}
