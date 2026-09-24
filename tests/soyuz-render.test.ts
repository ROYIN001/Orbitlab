/**
 * The R-7 family as drawn (src/render/soyuz.ts, roadmap item V04): Blok A's
 * taper, the strap-ons hugging it, the truss, Blok I's aft skirt, the crewed
 * Soyuz's escape tower and the frost, against the published dimensions and
 * timeline. Geometry and animation only; the browser run covers the look.
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  AftSkirt, CrewedTop, FrostCoat, LES_JETTISON, R7_BOOSTER_GAP, R7_FLARE, R7_TRUSS_INSIDE,
  r7BoosterGeometry, r7BoosterTip, r7CoreBase, r7CoreRadius, r7CoreTop, r7TrussGeometry,
} from '../src/render/soyuz';
import { vehicleById } from '../src/data/vehicles';

const soyuz = vehicleById('soyuz21a');
const blokA = soyuz.stages[0];
const strapOn = blokA.boosters![0];
const R = blokA.diameter / 2, L = blokA.length, r0 = strapOn.diameter / 2, Lb = strapOn.length;

describe('Blok A', () => {
  it('is 2.05 m at its engines, 2.95 m at the strap-on tips and 2.66 m under the truss', () => {
    expect(2 * r7CoreRadius(R, L, 0)).toBeCloseTo(2.05, 6);
    expect(2 * r7CoreRadius(R, L, Lb)).toBeCloseTo(2.95, 6);
    expect(2 * r7CoreRadius(R, L, L - R7_TRUSS_INSIDE)).toBeCloseTo(2.66, 6);
    expect(R7_FLARE).toBeCloseTo(R - r7CoreBase(R), 9);
  });

  it('carries an open truss from inside its own length up to Blok I', () => {
    const top = L + 0.919;
    const box = new THREE.Box3().setFromBufferAttribute(r7TrussGeometry(r7CoreTop(R), L - R7_TRUSS_INSIDE, top).attributes.position as THREE.BufferAttribute);
    // the rings' tubes stand a few centimetres proud of the struts' ends
    expect(Math.abs(box.min.y - (L - R7_TRUSS_INSIDE))).toBeLessThan(0.1);
    expect(Math.abs(box.max.y - top)).toBeLessThan(0.1);
    expect(box.max.x).toBeCloseTo(r7CoreTop(R), 0);
  });
});

describe('the strap-ons', () => {
  const geo = r7BoosterGeometry(r0, Lb, R7_FLARE);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  // Where the drawn stack puts a strap-on's base centre from the core's axis.
  const off = r7CoreBase(R) + R7_BOOSTER_GAP + r0;

  it('hug the core all the way up: the inner side follows Blok A\'s taper a few centimetres off it', () => {
    for (let y = 0; y <= Lb; y += Lb / 8) {
      let inner = Infinity;
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - y) < 1e-6) inner = Math.min(inner, pos.getX(i));
      if (!Number.isFinite(inner)) continue;
      expect(off + inner).toBeCloseTo(r7CoreRadius(R, L, y) + R7_BOOSTER_GAP, 3);
    }
  });

  it('are 2.68 m at the base and lean in to a tip at the core\'s widest ring', () => {
    const base = new THREE.Box3();
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) === 0) base.expandByPoint(new THREE.Vector3(pos.getX(i), 0, pos.getZ(i)));
    expect(base.max.x - base.min.x).toBeCloseTo(2 * r0, 2);
    const tip = r7BoosterTip(r0, Lb, R7_FLARE);
    expect(tip.y).toBe(Lb);
    // the tip is inboard of the base centre, just outside the core at its widest
    expect(tip.x).toBeLessThan(-0.5);
    expect(off + tip.x - 0.1 * r0).toBeCloseTo(R + R7_BOOSTER_GAP, 3);
  });
});

describe("Blok I's aft skirt", () => {
  it('rides through the staging and falls away in three petals ten seconds after Blok A', () => {
    const skirt = new AftSkirt(1.33, 1.2, new THREE.MeshBasicMaterial());
    expect(skirt.group.children).toHaveLength(3);
    skirt.update(-1);
    expect(skirt.group.visible).toBe(true);
    skirt.update(9.5);
    for (const p of skirt.group.children) expect(p.rotation.x).toBe(0);
    skirt.update(11);
    for (const p of skirt.group.children) {
      expect(p.rotation.x).toBeLessThan(0);
      expect(p.position.y).toBeLessThan(0);
    }
    skirt.update(15);
    expect(skirt.group.visible).toBe(false);
    // scrubbed back before staging, it is whole again
    skirt.update(-1);
    expect(skirt.group.visible).toBe(true);
    for (const p of skirt.group.children) expect(p.position.y).toBe(0);
  });
});

describe("the crewed Soyuz's escape tower", () => {
  const mat = () => new THREE.MeshStandardMaterial();
  const top = new CrewedTop(1.85, 10.1, mat, new THREE.MeshBasicMaterial());

  it('stands on the fairing\'s nose until T+114.5 s, then pulls away on its motor and is gone', () => {
    expect(top.fins.children).toHaveLength(4);
    top.update(100, 10.1);
    expect(top.tower.visible).toBe(true);
    expect(top.tower.position.y).toBe(10.1);
    top.update(LES_JETTISON + 1, 10.1);
    expect(top.tower.position.y).toBeGreaterThan(10.1 + 10);
    top.update(LES_JETTISON + 2, 10.1);
    expect(top.tower.position.y).toBeGreaterThan(10.1 + 50);
    top.update(LES_JETTISON + 7, 10.1);
    expect(top.tower.visible).toBe(false);
    top.update(LES_JETTISON - 1, 10.1);
    expect(top.tower.visible).toBe(true);
    expect(top.tower.position.y).toBe(10.1);
  });
});

describe('the frost', () => {
  it('is all there on the pad and gone half a minute after liftoff', () => {
    // the frost map is painted on a canvas; a flat one is enough here
    const context = { createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: () => undefined };
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
    try {
      const frost = new FrostCoat(new THREE.BoxGeometry(), 0.5, 0.9, 1);
      frost.update(-5);
      expect(frost.mesh.visible).toBe(true);
      const onPad = frost.material.alphaTest;
      frost.update(10);
      expect(frost.material.alphaTest).toBeGreaterThan(onPad);
      frost.update(40);
      expect(frost.mesh.visible).toBe(false);
      frost.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
