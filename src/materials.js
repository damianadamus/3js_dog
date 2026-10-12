import * as THREE from 'three';

const steps = new Uint8Array([90, 180, 255]);
export const gradientMap = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

const cache = new Map();

export function toon(color, outline = 0.004) {
  const key = `${color}|${outline}`;
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap });
  m.userData.outlineParameters = outline > 0
    ? { thickness: outline, color: [0.07, 0.07, 0.07], alpha: 1 }
    : { visible: false };
  cache.set(key, m);
  return m;
}
