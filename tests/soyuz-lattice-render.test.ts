/**
 * The crewed Soyuz's details as drawn (src/render/soyuz.ts, src/render/escape.ts):
 * the strap-ons' closed tips, the grid fins as lattices in the stack and in the
 * abort, the escape tower's plumes out of its canted nozzles, and the Soyuz MS
 * standing on its aft end. Geometry only; the browser run covers the look.
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CrewedTop, R7_FLARE, buildSoyuzMs, gridFinGeometry, r7BoosterGeometry } from '../src/render/soyuz';
import { EscapeView } from '../src/render/escape';
import type { VisualFrame } from '../src/physics/frame';

describe('a strap-on', () => {
  it('closes its tip on a point on its inner side, and is lit without a seam or a blank normal', () => {
    const r0 = 1.34, L = 19.6, sides = 28;
    const geo = r7BoosterGeometry(r0, L, R7_FLARE, 40, sides);
    const pos = geo.attributes.position as THREE.BufferAttribute, nrm = geo.attributes.normal as THREE.BufferAttribute;
    const n = new THREE.Vector3(), m = new THREE.Vector3();
    let top = 0;
    for (let i = 0; i < pos.count; i++) {
      expect(n.fromBufferAttribute(nrm, i).length()).toBeCloseTo(1, 5);
      if (Math.abs(pos.getY(i) - L) < 1e-4) {
        top++;
        expect(pos.getX(i)).toBeCloseTo(R7_FLARE - r0, 5);
        expect(pos.getZ(i)).toBeCloseTo(0, 5);
      }
    }
    expect(top).toBe(sides + 1);
    // the body's rows come first, sides + 1 to a row; the seam's two columns light alike
    const rows = (pos.count - sides - 2) / (sides + 1);
    for (let j = 0; j < rows; j++) {
      const i0 = j * (sides + 1);
      expect(n.fromBufferAttribute(nrm, i0).angleTo(m.fromBufferAttribute(nrm, i0 + sides))).toBeLessThan(1e-6);
    }
  });
});

describe('the grid fins', () => {
  it('are lattices of walls with depth, at ±45° in a frame, in the size the textured plates had', () => {
    const w = 1.5 * 0.75, h = 9.5 * 0.16;
    const geo = gridFinGeometry(w, h);
    expect(geo.attributes.uv).toBeUndefined();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(w, 6);
    expect(box.max.y - box.min.y).toBeCloseTo(h, 6);
    expect(box.max.z - box.min.z).toBeGreaterThan(0.05);
    const nrm = geo.attributes.normal as THREE.BufferAttribute;
    let diagonal = 0;
    for (let i = 0; i < nrm.count; i++) if (Math.abs(Math.abs(nrm.getX(i)) - Math.SQRT1_2) < 1e-6 && Math.abs(Math.abs(nrm.getY(i)) - Math.SQRT1_2) < 1e-6) diagonal++;
    expect(diagonal).toBeGreaterThan(100);
    expect(geo.index!.count / 3).toBeLessThan(1000);
  });

  it('open in an abort by swinging out, away from the fairing', () => {
    const context = new Proxy({}, { get: () => () => ({ addColorStop: () => undefined }) });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
    try {
      const R = 1.5, view = new EscapeView(R, 9.5, 'soyuz', 1.3);
      const motors = { main: 0, control: 0, fairing: 0, softLanding: 0 };
      const frame = (t: number) => ({ t, pressure: 0, abort: { t0: 0, body: 'head', mode: 'tower', finsOpen: true, motors } }) as unknown as VisualFrame;
      const span = () => {
        view.group.updateMatrixWorld(true);
        const fins = (view as unknown as { fins: THREE.Group[] }).fins;
        let min = Infinity, max = 0;
        const v = new THREE.Vector3();
        for (const hinge of fins) hinge.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const p = mesh.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
            min = Math.min(min, Math.hypot(v.x, v.z));
            max = Math.max(max, Math.hypot(v.x, v.z));
          }
        });
        return { min, max };
      };
      view.update(frame(1));
      const stowed = span();
      expect(stowed.min).toBeGreaterThan(R);
      view.update(frame(10));
      const open = span();
      expect(open.min).toBeGreaterThan(R);
      expect(open.max).toBeGreaterThan(R + 9.5 * 0.16);
      view.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("the escape tower's motor", () => {
  it('fires each plume out of a nozzle\'s exit along its canted axis, out and down', () => {
    const top = new CrewedTop(1.5, 9.5, () => new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial());
    top.tower.position.set(0, 0, 0);
    top.tower.updateMatrixWorld(true);
    expect(top.exits).toHaveLength(8);
    const flame = (top as unknown as { flame: THREE.Mesh }).flame;
    const fp = flame.geometry.attributes.position as THREE.BufferAttribute, per = fp.count / 8;
    const o = new THREE.Vector3(), axis = new THREE.Vector3(), v = new THREE.Vector3();
    for (const [k, exit] of top.exits.entries()) {
      exit.getWorldPosition(o);
      axis.set(0, -1, 0).transformDirection(exit.matrixWorld);
      const out = new THREE.Vector3(o.x, 0, o.z).normalize();
      expect(axis.dot(out)).toBeCloseTo(Math.sin(0.47), 6);
      expect(axis.y).toBeCloseTo(-Math.cos(0.47), 6);
      // the plume's narrow end is the exit's 0.1 m rim, and it runs on down the axis
      let near = Infinity;
      for (let i = k * per; i < (k + 1) * per; i++) {
        v.fromBufferAttribute(fp, i).sub(o);
        const along = v.dot(axis);
        expect(along).toBeGreaterThan(-1e-6);
        if (along < 1e-6) near = Math.min(near, v.length());
      }
      expect(near).toBeCloseTo(0.1, 5);
    }
    // it frees every geometry it made: the abort view frees only its own
    const geos = new Set<THREE.BufferGeometry>(), freed = new Set<THREE.BufferGeometry>();
    for (const root of [top.tower, top.fins]) root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geos.add((o as THREE.Mesh).geometry); });
    for (const g of geos) g.addEventListener('dispose', () => freed.add(g));
    top.dispose();
    expect(freed.size).toBe(geos.size);
  });
});

describe('the Soyuz MS', () => {
  it('is centred on its group, as a payload is, with nothing below its aft end', () => {
    const ms = buildSoyuzMs();
    ms.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ms.group);
    expect(box.min.y).toBeCloseTo(-ms.height / 2, 6);
    expect(box.max.y).toBeCloseTo(ms.height / 2, 6);
    ms.setDeploy(1);
    ms.group.updateMatrixWorld(true);
    const open = new THREE.Box3().setFromObject(ms.group);
    expect(open.max.x - open.min.x).toBeCloseTo(10.7, 1);
    // the Kurs booms reach out from the orbital module, not up past the probe's tip
    expect(open.max.y).toBeCloseTo(ms.height / 2, 6);
    ms.dispose();
  });
});
