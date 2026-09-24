/**
 * Starship's flaps as drawn (src/render/ship.ts) against the flaps the six-DOF
 * model pushes on (src/physics/rigid/surfaces.ts): same ids, same places on
 * the hull, belly side, and folded back into the lee on the recorded
 * deflection.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildShipFlaps, foldShipFlaps, FLAP_FOLD, SHIP_NOSE_FRACTION, tangentOgiveRadius, type FlapVisual } from '../src/render/ship';
import { shipFlapSurfaces } from '../src/physics/rigid/surfaces';
import { vehicleById } from '../src/data/vehicles';
import type { RigidTelemetry } from '../src/physics/rigid/telemetry';

const ship = vehicleById('starship').stages.find((s) => s.id === 'ship')!;
const noseH = ship.length * SHIP_NOSE_FRACTION;

function built() {
  const { group, flaps } = buildShipFlaps(ship, noseH, new THREE.MeshBasicMaterial());
  return { group, flaps };
}

/** World position of the flap plate's outer edge, in the stage's model frame. */
function tip(group: THREE.Group, f: FlapVisual): THREE.Vector3 {
  group.updateMatrixWorld(true);
  const plate = f.hinge.children[0] as THREE.Mesh;
  const span = (plate.geometry as THREE.BoxGeometry).parameters.width;
  return new THREE.Vector3(span, 0, 0).applyMatrix4(f.hinge.matrixWorld);
}

function hingePoint(group: THREE.Group, f: FlapVisual): THREE.Vector3 {
  group.updateMatrixWorld(true);
  return new THREE.Vector3().setFromMatrixPosition(f.hinge.matrixWorld);
}

function deflections(value: number): RigidTelemetry {
  const surfaceDeflections = Object.fromEntries(shipFlapSurfaces(ship.id, ship.length, ship.diameter).map((s) => [s.id, value]));
  return { surfaceDeflections } as unknown as RigidTelemetry;
}

describe("Starship's nose", () => {
  it('meets the hull flush at its base and closes to a point at the tip', () => {
    const R = ship.diameter / 2;
    expect(tangentOgiveRadius(R, noseH, 0)).toBeCloseTo(R, 12);
    expect(tangentOgiveRadius(R, noseH, noseH)).toBeCloseTo(0, 9);
    // tangent to the hull: no step in slope where the barrel ends
    expect((R - tangentOgiveRadius(R, noseH, 0.01)) / 0.01).toBeLessThan(0.01);
    let last = R;
    for (let y = 0.5; y <= noseH; y += 0.5) {
      const r = tangentOgiveRadius(R, noseH, y);
      expect(r).toBeLessThan(last);
      last = r;
    }
  });
});

describe("Starship's flaps, drawn", () => {
  it('are the physics flaps: same ids, at the same stations along the hull, on the belly side', () => {
    const { group, flaps } = built();
    const specs = shipFlapSurfaces(ship.id, ship.length, ship.diameter);
    expect(flaps.map((f) => f.id)).toEqual(specs.map((s) => s.id));
    for (let i = 0; i < flaps.length; i++) {
      const h = hingePoint(group, flaps[i]);
      expect(h.y).toBeCloseTo(specs[i].positionBody.x, 9);
      // body +z is model +z, body y is model -x
      expect(h.z).toBeGreaterThan(0);
      expect(Math.sign(h.x)).toBe(-Math.sign(specs[i].positionBody.y));
    }
  });

  it('hinge on the hull, the forward pair on the nose where it has narrowed', () => {
    const { group, flaps } = built();
    const R = ship.diameter / 2, barrel = ship.length - noseH;
    for (const f of flaps) {
      const h = hingePoint(group, f);
      const hull = h.y > barrel ? tangentOgiveRadius(R, noseH, h.y - barrel) : R;
      expect(Math.hypot(h.x, h.z)).toBeCloseTo(hull, 9);
    }
    const fwd = hingePoint(group, flaps[0]);
    expect(Math.hypot(fwd.x, fwd.z)).toBeLessThan(R);
    expect(Math.hypot(fwd.x, fwd.z)).toBeGreaterThan(0.6 * R);
  });

  it('stand straight out fully deployed and fold back into the lee as they retract', () => {
    const { group, flaps } = built();
    foldShipFlaps(flaps, deflections(0.6));
    for (const f of flaps) expect(f.hinge.rotation.y).toBeCloseTo(0, 12);
    const out = flaps.map((f) => tip(group, f).z);
    foldShipFlaps(flaps, deflections(-0.6));
    for (const f of flaps) expect(Math.abs(f.hinge.rotation.y)).toBeCloseTo(FLAP_FOLD, 12);
    const folded = flaps.map((f) => tip(group, f).z);
    // Away from the belly, and the left and right pair alike.
    for (let i = 0; i < flaps.length; i++) expect(folded[i]).toBeLessThan(out[i] - 1);
    for (const f of flaps) {
      const h = hingePoint(group, f), t = tip(group, f);
      // still hinged on the outside of the hull, not swung into it
      expect(Math.hypot(t.x, t.z)).toBeGreaterThan(Math.hypot(h.x, h.z));
    }
  });

  it('sit at the half-open trim without six-DOF telemetry', () => {
    const { flaps } = built();
    foldShipFlaps(flaps, undefined);
    for (const f of flaps) expect(Math.abs(f.hinge.rotation.y)).toBeCloseTo(FLAP_FOLD / 2, 12);
  });
});
