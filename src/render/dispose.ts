import * as THREE from 'three';

/**
 * Recursively dispose the geometries, materials and material-owned textures of
 * a subtree. Materials/geometries that are shared between views must be marked
 * with `userData.shared = true` so that they survive a mission re-preview.
 */
export function disposeObject(root: THREE.Object3D): void {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.geometry.userData.shared) geos.add(m.geometry);
    const mat = (m as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(mat)) for (const x of mat) { if (!x.userData.shared) mats.add(x); }
    else if (mat && !mat.userData.shared) mats.add(mat);
  });
  for (const g of geos) g.dispose();
  for (const m of mats) {
    for (const key of ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap'] as const) {
      const tex = (m as unknown as Record<string, unknown>)[key];
      if (tex instanceof THREE.Texture && !tex.userData.shared) tex.dispose();
    }
    const uniforms = (m as THREE.ShaderMaterial).uniforms;
    if (uniforms) {
      for (const u of Object.values(uniforms)) {
        if (u && u.value instanceof THREE.Texture && !u.value.userData.shared) u.value.dispose();
      }
    }
    m.dispose();
  }
  root.clear();
}
