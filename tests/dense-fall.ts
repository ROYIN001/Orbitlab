/**
 * A passive spent body of a point-mass flight between two of the simulation's
 * steps. The simulation holds its state between them (steps of up to 30 s in
 * orbit), so the truth at the instants between is the body re-flown densely
 * from the earlier step's state with the simulation's own forces
 * (`pointMassAcceleration`, RK4 at 0.02 s), which lands within metres of the
 * later step's. Shared by tests/falling-frames.test.ts and
 * tests/debris-replay.test.ts.
 */
import { expect } from 'vitest';
import type { Debris } from '../src/physics/sim/types';
import { rk4Step } from '../src/physics/integrator';
import { pointMassAcceleration } from '../src/physics/sim/forces';
import { dist, type Vec3 } from '../src/physics/vec3';

/** A body's state at one step of the simulation, with what its forces need. */
export interface BodyStep { t: number; id: number; r: Vec3; v: Vec3; dir: Vec3; mass: number; area: number; cd: number }

export const bodyStep = (t: number, d: Debris): BodyStep =>
  ({ t, id: d.id, r: { ...d.r }, v: { ...d.v }, dir: { ...d.dir }, mass: d.mass, area: d.area, cd: d.cd });

/** The body re-flown from step `p` to step `q`, at every whole second strictly between them. */
export function refly(p: BodyStep, q: BodyStep): { t: number; r: Vec3 }[] {
  const acc = pointMassAcceleration(0, p.dir, p.mass, 0, 0, p.area, false, p.cd);
  const out: { t: number; r: Vec3 }[] = [];
  let y = { r: p.r, v: p.v }, t = p.t;
  const stops: number[] = [];
  for (let s = Math.floor(p.t) + 1; s < q.t - 1e-6; s++) stops.push(s);
  for (const s of [...stops, q.t]) {
    const n = Math.max(1, Math.ceil((s - t) / 0.02)), h = (s - t) / n;
    for (let k = 0; k < n; k++) y = rk4Step(0, y, h, acc);
    t = s;
    if (s < q.t) out.push({ t: s, r: y.r });
  }
  // the re-flown body lands where the simulation had it at the later step
  expect(dist(y.r, q.r)).toBeLessThan(5);
  return out;
}
