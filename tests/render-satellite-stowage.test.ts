/**
 * Where render/satellite.ts folds its deployable parts away. Stowed, a
 * CubeSat's panels lie flat on its sides inside the deployer tube; a comsat's
 * Z-folded wing lies flat on itself, the outer panel outside the inner one and
 * neither in the bus, and its reflectors hang on the bus's faces, above its
 * base, whatever its proportions; a Starlink's folded array lies on its own
 * plate, under the satellite above. And the generic crew vehicle's engine bell
 * stays clear of the stage it stands on. Geometry only, no pixels.
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildSatellite } from '../src/render/satellite';
import { solarCellTexture } from '../src/render/spacecraft-surfaces';
import { satelliteById } from '../src/data/satellites';

/** The cells, blanket and radiator textures are painted on canvases; nothing here looks at them. */
const ctx: object = new Proxy({}, { get: (_t, k) => (k === 'getImageData' || k === 'createImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => ctx), set: () => true });
const build = (id: string, size?: { width: number; height: number; depth: number }) => {
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) });
  try {
    const spec = satelliteById(id);
    const view = buildSatellite(size ? { ...spec, size } : spec);
    view.group.updateMatrixWorld(true);
    return { view, size: (size ?? spec.size)!, cells: solarCellTexture() };
  } finally { vi.unstubAllGlobals(); }
};

/** The solar panels (render/spacecraft-surfaces.ts `cellPanel`): one face of cells, unlike a body with cells on several. */
const panels = (root: THREE.Object3D, cells: THREE.Texture): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && Array.isArray(m.material) && m.material.filter((x) => (x as THREE.MeshStandardMaterial).map === cells).length === 1) out.push(m);
  });
  return out;
};
/** A mesh's vertices, in the frame of `frame` (the model's own when omitted). */
const vertices = (m: THREE.Object3D, frame?: THREE.Object3D): THREE.Vector3[] => {
  const toFrame = frame ? frame.matrixWorld.clone().invert() : new THREE.Matrix4();
  const out: THREE.Vector3[] = [];
  m.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toFrame));
  });
  return out;
};

describe('stowed for launch', () => {
  it.each([undefined, { width: 2, height: 3, depth: 2 }])('a CubeSat’s panels lie on its sides, inside the deployer tube (size %o)', (sz) => {
    const { view, size, cells } = build('cubesats', sz);
    const w = size.width, tubeL = size.height * 0.34;
    const wings = panels(view.group, cells);
    expect(wings).toHaveLength(12);
    for (const wing of wings) {
      // the CubeSat on its rails (the panel's hinge's parent), its axis along the tube's
      const holder = wing.parent!.parent!;
      for (const p of vertices(wing, holder)) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(w * 0.1);
        expect(Math.abs(p.z)).toBeLessThanOrEqual(w * 0.1);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(tubeL / 2);
        // and outside the CubeSat's own 0.15 w body
        expect(Math.abs(p.x)).toBeGreaterThanOrEqual(w * 0.075 - 1e-9);
      }
    }
  });

  it.each([['comsat', undefined], ['weather', undefined], ['comsat', { width: 2, height: 3, depth: 2 }]] as const)('%s: the outer wing panel folds flat back over the inner one, clear of it and of the bus (size %o)', (id, sz) => {
    const { view, size, cells } = build(id, sz);
    const { width: w, height: h, depth: d } = size;
    const all = panels(view.group, cells);
    expect(all).toHaveLength(4);
    const inBus = (p: THREE.Vector3) => Math.abs(p.x) < w / 2 && Math.abs(p.y) < h / 2 && Math.abs(p.z) < d / 2;
    for (const inner of all.filter((m) => m.parent!.parent === view.group)) {
      const outer = all.find((m) => m.parent!.parent === inner.parent)!;
      const side = Math.sign(inner.parent!.position.x);
      const innerX = vertices(inner).map((p) => side * p.x), outerX = vertices(outer).map((p) => side * p.x);
      const innerFace = Math.max(...innerX), halfSpan = Math.max(...vertices(outer).map((p) => p.y)) - inner.parent!.position.y;
      // face to face: never inside the inner panel, at most 0.02π open at the far end
      expect(Math.min(...outerX)).toBeGreaterThanOrEqual(innerFace - 1e-9);
      expect(Math.max(...outerX) - innerFace).toBeLessThan(halfSpan * Math.sin(0.02 * Math.PI) + 0.1);
      for (const p of [...vertices(inner), ...vertices(outer)]) expect(inBus(p)).toBe(false);
    }
  });

  it.each([undefined, { width: 2, height: 3, depth: 2 }, { width: 2.5, height: 2, depth: 2.5 }, { width: 3, height: 1, depth: 2 }])('a comsat’s reflectors hang on the bus’s faces, above its base and out of it (size %o)', (sz) => {
    const { view, size } = build('comsat', sz);
    const { width: w, height: h, depth: d } = size;
    // the booms' pivots: on the ±z faces, on the axis
    const arms = view.group.children.filter((c) => c.type === 'Group' && c.position.x === 0 && c.position.z !== 0);
    expect(arms).toHaveLength(2);
    for (const arm of arms) {
      expect(Math.abs(arm.position.z)).toBeCloseTo(d / 2, 9);
      expect(Math.abs(arm.position.y)).toBeLessThan(h / 2);
      // the dish, its sub-reflector and struts (all but the boom, whose root is the hinge)
      for (const part of arm.children.slice(1)) {
        for (const p of vertices(part)) {
          expect(p.y).toBeGreaterThanOrEqual(-h / 2);
          expect(Math.abs(p.x) < w / 2 && Math.abs(p.y) < h / 2 && Math.abs(p.z) < d / 2).toBe(false);
        }
      }
    }
  });

  it('the generic crew vehicle’s engine bell stays within the half metre it stands above the stage', () => {
    for (const id of ['crew', 'apollo']) {
      const { view, size } = build(id);
      const low = Math.min(...vertices(view.group).map((p) => p.y));
      expect(low).toBeGreaterThan(-size.height / 2 - 0.5);
    }
  });

  it('a Starlink’s folded array lies on its own plate, under the satellite above', () => {
    const { view, size, cells } = build('starlink');
    const sats = view.group.children.filter((c) => c.type === 'Group');
    expect(sats).toHaveLength(10);
    for (let i = 0; i < sats.length; i++) {
      const leaves = panels(sats[i], cells);
      expect(leaves.length).toBeGreaterThan(0);
      const own = leaves.flatMap((m) => vertices(m, sats[i]));
      for (const p of own) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(size.width / 2);
        expect(Math.abs(p.z)).toBeLessThanOrEqual(size.depth / 2);
      }
      if (i + 1 < sats.length) {
        const top = Math.max(...leaves.flatMap((m) => vertices(m)).map((p) => p.y));
        expect(top).toBeLessThan(Math.min(...vertices(sats[i + 1]).map((p) => p.y)));
      }
    }
  });
});
