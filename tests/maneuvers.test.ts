/**
 * O02: the maneuver planner, held to worked examples and closed forms.
 *
 * - Hohmann: Vallado, *Fundamentals of Astrodynamics and Applications*,
 *   Example 6-1 (191.344 11 km to 35 781.348 57 km: Δv_a 2.457 038 km/s,
 *   Δv_b 1.478 187 km/s, 3.935 224 km/s in all, 5.256 713 h).
 * - Bi-elliptic: Vallado Example 6-2 (from 191.344 11 km through
 *   503 873 km to 376 310 km: Δv_a 3.156 233 km/s, Δv_b 0.677 358 km/s,
 *   593.919 h), and the classic ratios at which it beats Hohmann —
 *   11.94 with the far point at infinity, 15.58 for any far point.
 * - Lambert: Vallado Example 7-5 and Curtis, *Orbital Mechanics for
 *   Engineering Students*, Example 5.2.
 * - Plane changes, the GTO→GEO combined burn, phasing, deorbit and
 *   Edelbaum's spiral against their closed forms, and every plan against
 *   the orbit it claims to reach, flown.
 */
import { describe, expect, it } from 'vitest';
import { DEG, MU_EARTH, R_EARTH } from '../src/physics/constants';
import { propagateKepler } from '../src/physics/orbital';
import { norm, sub, v3 } from '../src/physics/vec3';
import { orbitFacts, orbitFromState, stateAt, type Orbit } from '../src/orbit/kepler';
import { presetOrbit } from '../src/orbit/presets';
import {
  ENTRY_ALTITUDE, biElliptic, biEllipticDv, circularizeAtApogee, combinedDv, deorbit, edelbaumAt, edelbaumDv, fromVnb, hohmann,
  hohmannDv, isPlan, lambert, manual, phasing, planeChange, planeChangeDv, porkchop, rendezvous, spiral, stateOnPlan, toVnb,
  type Plan, type PlanError,
} from '../src/orbit/maneuvers';

const JD = 2461309.5;
const circle = (alt: number, i = 0, extra: Partial<Orbit> = {}): Orbit => ({ a: R_EARTH + alt, e: 0, i, raan: 0.3, argp: 0, m0: 0.2, jd0: JD, ...extra });
const ok = (p: Plan | PlanError): Plan => {
  if (!isPlan(p)) throw new Error(`no plan: ${p.error}`);
  return p;
};
const km = 1e3;

describe('burns in the orbit\'s own axes (O02)', () => {
  it('turn a burn into prograde, normal and radial, and back', () => {
    const s = stateAt(circle(500e3, 51.6 * DEG), 1234, false);
    const dv = v3(12, -34, 56);
    const b = toVnb(dv, s.r, s.v);
    expect(norm(sub(fromVnb(b, s.r, s.v), dv))).toBeLessThan(1e-9);
    // on a circle, radial is straight out
    const up = fromVnb({ prograde: 0, normal: 0, radial: 1 }, s.r, s.v);
    expect(norm(sub(up, v3(s.r.x / norm(s.r), s.r.y / norm(s.r), s.r.z / norm(s.r))))).toBeLessThan(1e-9);
  });

  it('keeps the state continuous across every burn and jumps the velocity by the burn', () => {
    const plan = ok(hohmann(circle(400e3, 28.5 * DEG), 100, 2000e3, true));
    for (const b of plan.burns) {
      const before = stateOnPlan(plan, b.t - 1e-6, true), after = stateOnPlan(plan, b.t + 1e-6, true);
      expect(norm(sub(after.r, before.r))).toBeLessThan(0.1);
      expect(norm(sub(sub(after.v, before.v), b.dv))).toBeLessThan(1e-3);
    }
  });
});

describe('Hohmann and bi-elliptic transfers (O02)', () => {
  it('matches Vallado\'s Example 6-1, as a closed form and as a plan flown', () => {
    const r1 = R_EARTH + 191.34411e3, r2 = R_EARTH + 35781.34857e3;
    const cf = hohmannDv(r1, r2);
    expect(cf.dv1 / km).toBeCloseTo(2.457038, 5);
    expect(cf.dv2 / km).toBeCloseTo(1.478187, 5);
    expect(cf.total / km).toBeCloseTo(3.935224, 5);
    expect(cf.time / 3600).toBeCloseTo(5.256713, 4);
    const plan = ok(hohmann(circle(191.34411e3), 0, 35781.34857e3, false));
    expect(plan.burns.map((b) => b.point)).toEqual(['perigee', 'apogee']);
    expect(plan.totalDv / cf.total).toBeCloseTo(1, 9);
    expect((plan.burns[1].t - plan.burns[0].t) / cf.time).toBeCloseTo(1, 9);
    expect(plan.final.a / r2).toBeCloseTo(1, 9);
    expect(plan.final.e).toBeLessThan(1e-9);
    // both burns along the velocity
    for (const b of plan.burns) expect(Math.abs(b.vnb.normal) + Math.abs(b.vnb.radial)).toBeLessThan(1e-6);
  });

  it('goes down as well as up, from an ellipse\'s apsis', () => {
    const down = ok(hohmann(circle(2000e3), 0, 400e3, false));
    expect(down.burns.every((b) => b.vnb.prograde < 0)).toBe(true);
    expect(down.totalDv / hohmannDv(R_EARTH + 2000e3, R_EARTH + 400e3).total).toBeCloseTo(1, 9);
    const gto = presetOrbit('gto', JD);
    const up = ok(hohmann(gto, 0, 35786e3, false));
    expect(up.burns[0].point).toBe('perigee');
    expect(up.final.e).toBeLessThan(1e-6);
    expect((up.final.a - R_EARTH) / km).toBeCloseTo(35786, 3);
    expect(isPlan(hohmann({ ...gto, e: 1.2 }, 0, 400e3, false))).toBe(false);
  });

  it('matches Vallado\'s Example 6-2', () => {
    const r1 = R_EARTH + 191.34411e3, rb = R_EARTH + 503873e3, r2 = R_EARTH + 376310e3;
    const cf = biEllipticDv(r1, r2, rb);
    expect(cf.dv1 / km).toBeCloseTo(3.156233, 5);
    expect(cf.dv2 / km).toBeCloseTo(0.677358, 5);
    expect(cf.time / 3600).toBeCloseTo(593.919, 1);
    const plan = ok(biElliptic(circle(191.34411e3), 0, 503873e3, 376310e3, false));
    expect(plan.burns.length).toBe(3);
    expect(plan.totalDv / cf.total).toBeCloseTo(1, 8);
    expect((plan.arrival - plan.burns[0].t) / cf.time).toBeCloseTo(1, 8);
    expect(plan.final.a / r2).toBeCloseTo(1, 8);
    expect(plan.burns[2].vnb.prograde).toBeLessThan(0); // the last is a braking burn
  });

  it('beats Hohmann past the classic ratios, 11.94 and 15.58', () => {
    const r1 = R_EARTH + 300e3;
    const cheaper = (ratio: number, rbOverR2: number) => biEllipticDv(r1, ratio * r1, rbOverR2 * ratio * r1).total < hohmannDv(r1, ratio * r1).total;
    expect(cheaper(11.8, 1e5)).toBe(false);
    expect(cheaper(12.1, 1e5)).toBe(true);
    expect(cheaper(15.0, 1.05)).toBe(false);
    expect(cheaper(16.0, 1.05)).toBe(true);
    // and from a circle to GEO it never pays (ratio about 6)
    expect(cheaper(42164e3 / r1, 10)).toBe(false);
  });
});

describe('plane changes (O02)', () => {
  it('turns the plane at the node, 2v sin(Δi/2), keeping the orbit\'s size', () => {
    const start = circle(500e3, 51.6 * DEG);
    const plan = ok(planeChange(start, 0, 45 * DEG, false));
    expect(plan.final.i / DEG).toBeCloseTo(45, 9);
    expect(plan.final.a / start.a).toBeCloseTo(1, 9);
    expect(plan.final.e).toBeLessThan(1e-7);
    expect(plan.totalDv / planeChangeDv(Math.sqrt(MU_EARTH / start.a), 6.6 * DEG)).toBeCloseTo(1, 9);
    expect(['ascendingNode', 'descendingNode']).toContain(plan.burns[0].point);
    // the burn is at the equator
    const at = stateOnPlan(plan, plan.burns[0].t, false);
    expect(Math.abs(at.lat)).toBeLessThan(1e-7);
  });

  it('chooses the node farther from the Earth on an ellipse', () => {
    // perigee at the ascending node: the descending node is the apogee, the cheap one
    const e = { a: R_EARTH + 10000e3, e: 0.4, i: 30 * DEG, raan: 0, argp: 0, m0: 0, jd0: JD };
    const plan = ok(planeChange(e, 0, 20 * DEG, false));
    expect(plan.burns[0].point).toBe('descendingNode');
    expect(plan.final.i / DEG).toBeCloseTo(20, 9);
    expect(plan.final.e).toBeCloseTo(0.4, 9);
    // an equatorial orbit has no node to turn at
    expect(isPlan(planeChange(circle(500e3, 0), 0, 10 * DEG, false))).toBe(false);
  });

  it('circularises a Cape Canaveral GTO at apogee into GEO: one combined burn of about 1.83 km/s, or several adding up to it', () => {
    const gto = presetOrbit('gto', JD); // 250 × 35 786 km, 28.5°, perigee at the ascending node
    const ra = gto.a * (1 + gto.e), rp = gto.a * (1 - gto.e);
    const va = Math.sqrt(2 * MU_EARTH * rp / (ra * (ra + rp))), vc = Math.sqrt(MU_EARTH / ra);
    const cf = combinedDv(va, vc, 28.5 * DEG);
    expect(cf / km).toBeCloseTo(1.833, 2);
    const one = ok(circularizeAtApogee(gto, 0, 1, false));
    expect(one.totalDv / cf).toBeCloseTo(1, 9);
    expect(one.final.i).toBeLessThan(1e-9);
    expect(one.final.e).toBeLessThan(1e-9);
    expect((one.final.a - R_EARTH) / km).toBeCloseTo(35786, 3);
    const three = ok(circularizeAtApogee(gto, 0, 3, false));
    expect(three.burns.length).toBe(3);
    expect(three.totalDv / cf).toBeCloseTo(1, 9);
    expect(three.final.i).toBeLessThan(1e-7);
    expect(three.final.e).toBeLessThan(1e-7);
    // the perigee climbs from burn to burn, a revolution of each orbit apart
    const perigees = three.segments.map((s) => s.orbit.a * (1 - s.orbit.e));
    for (let k = 1; k < perigees.length; k++) expect(perigees[k]).toBeGreaterThan(perigees[k - 1]);
    for (let k = 1; k < 3; k++) {
      expect((three.burns[k].t - three.burns[k - 1].t) / orbitFacts(three.segments[k].orbit, false).period).toBeCloseTo(1, 6);
    }
  });
});

describe('phasing and deorbit (O02)', () => {
  it('catches a target 20° ahead in three revolutions and meets it', () => {
    const start = circle(400e3, 51.6 * DEG);
    const theta = 20 * DEG;
    const plan = ok(phasing(start, 0, theta, 3, false));
    const target = { ...start, m0: start.m0 + theta };
    const c = stateOnPlan(plan, plan.arrival + 1e-6, false), tg = stateAt(target, plan.arrival, false);
    expect(norm(sub(c.r, tg.r))).toBeLessThan(1);
    expect(norm(sub(c.v, tg.v))).toBeLessThan(1e-3);
    // closed form: the phasing orbit's period is T(1 − θ/2πk), the two burns equal and opposite
    const T = 2 * Math.PI * Math.sqrt(start.a ** 3 / MU_EARTH), Tph = T * (1 - theta / (6 * Math.PI));
    const aPh = Math.cbrt(MU_EARTH * (Tph / (2 * Math.PI)) ** 2);
    const dv = Math.abs(Math.sqrt(MU_EARTH * (2 / start.a - 1 / aPh)) - Math.sqrt(MU_EARTH / start.a));
    expect(plan.totalDv / (2 * dv)).toBeCloseTo(1, 9);
    expect(plan.burns[0].vnb.prograde).toBeLessThan(0); // to catch up, go lower and faster
    // 30° in two would take the phasing perigee down to 21 km, into the air
    expect(isPlan(phasing(start, 0, 30 * DEG, 2, false))).toBe(false);
  });

  it('brings the perigee down to 50 km with a retrograde burn and says when it reaches 100 km', () => {
    const start = circle(400e3, 51.6 * DEG);
    const plan = ok(deorbit(start, 0, 50e3, false));
    expect((plan.final.a * (1 - plan.final.e) - R_EARTH) / km).toBeCloseTo(50, 6);
    const ra = start.a, rp = R_EARTH + 50e3;
    expect(plan.totalDv).toBeCloseTo(Math.sqrt(MU_EARTH / ra) - Math.sqrt(MU_EARTH * (2 / ra - 2 / (ra + rp))), 6);
    expect(plan.burns[0].vnb.prograde).toBeLessThan(0);
    expect(plan.entry! - plan.burns[0].t).toBeGreaterThan(0);
    expect(plan.entry! - plan.burns[0].t).toBeLessThan(orbitFacts(plan.final, false).period / 2);
    expect((stateOnPlan(plan, plan.entry!, false).alt - ENTRY_ALTITUDE) / km).toBeCloseTo(0, 3);
  });
});

describe('manual burns (O02)', () => {
  it('raises the apogee with a prograde burn by vis-viva, and tilts the plane with a normal one', () => {
    const start = circle(400e3, 51.6 * DEG);
    const plan = ok(manual(start, 0, [{ point: 'now', vnb: { prograde: 100, normal: 0, radial: 0 } }], false));
    const v = Math.sqrt(MU_EARTH / start.a) + 100, a = 1 / (2 / start.a - v * v / MU_EARTH);
    expect(plan.final.a / a).toBeCloseTo(1, 9);
    expect((plan.final.a * (1 - plan.final.e) - start.a) / km).toBeCloseTo(0, 6);
    const tilt = ok(manual(start, 0, [{ point: 'ascendingNode', vnb: { prograde: 0, normal: 200, radial: 0 } }], false));
    expect(Math.abs(tilt.final.i - start.i) / DEG).toBeGreaterThan(1);
    // two nodes: out at perigee now, back half an orbit later at apogee
    const two = ok(manual(start, 0, [
      { point: 'now', vnb: { prograde: 100, normal: 0, radial: 0 } },
      { point: 'apogee', vnb: { prograde: 50, normal: 0, radial: 0 } },
    ], false));
    expect(two.burns[1].point).toBe('apogee');
    expect(two.burns[1].t - two.burns[0].t).toBeCloseTo(orbitFacts(plan.final, false).period / 2, 3);
  });
});

describe("Edelbaum's low-thrust spiral (O02)", () => {
  it('costs |v₀ − v₁| between coplanar circles and takes Δv/a', () => {
    const start = circle(500e3, 28.5 * DEG);
    const plan = ok(spiral(start, 0, 35786e3, 28.5 * DEG, 1e-4, false));
    const v0 = Math.sqrt(MU_EARTH / start.a), v1 = Math.sqrt(MU_EARTH / (R_EARTH + 35786e3));
    expect(plan.totalDv).toBeCloseTo(v0 - v1, 6);
    expect(plan.arrival).toBeCloseTo((v0 - v1) / 1e-4, 3);
    expect((plan.final.a - R_EARTH) / km).toBeCloseTo(35786, 1);
    expect(plan.final.i / DEG).toBeCloseTo(28.5, 6);
    // half-way in time the radius is between, and the satellite is on a circle there
    const mid = stateOnPlan(plan, plan.arrival / 2, false);
    expect(norm(mid.r)).toBeGreaterThan(start.a);
    expect(norm(mid.r)).toBeLessThan(R_EARTH + 35786e3);
    expect(norm(mid.v) / Math.sqrt(MU_EARTH / norm(mid.r))).toBeCloseTo(1, 9);
  });

  it('reaches the target speed and inclination exactly when its Δv runs out', () => {
    const v0 = 7.6e3, v1 = 3.07e3, di = 28.5 * DEG;
    const { dv, beta0 } = edelbaumDv(v0, v1, di);
    const f = 2e-4, T = dv / f;
    const end = edelbaumAt({ v0, accel: f, beta0, coplanar: false }, T);
    expect(end.v / v1).toBeCloseTo(1, 9);
    expect(end.di / di).toBeCloseTo(1, 9);
    const start = edelbaumAt({ v0, accel: f, beta0, coplanar: false }, 0);
    expect(start.v).toBeCloseTo(v0, 6);
    expect(start.di).toBeCloseTo(0, 12);
    // LEO to GEO with the Cape's 28.5° folded in: about 5.9 km/s, against 4.2 km/s impulsively
    expect(dv / km).toBeCloseTo(5.9, 0);
  });

  it('turns a plane at constant radius for π/2 times the impulsive cost', () => {
    const v = 7.5e3, di = 1 * DEG;
    expect(edelbaumDv(v, v, di).dv / planeChangeDv(v, di)).toBeCloseTo(Math.PI / 2, 3);
  });

  it('flies the spiral with a plane change to its target plane', () => {
    const plan = ok(spiral(circle(700e3, 28.5 * DEG), 0, 20000e3, 10 * DEG, 5e-4, false));
    expect(plan.final.i / DEG).toBeCloseTo(10, 6);
    expect((plan.final.a - R_EARTH) / km).toBeCloseTo(20000, 1);
    expect(plan.final.e).toBeLessThan(1e-6);
    expect(isPlan(spiral(presetOrbit('gto', JD), 0, 35786e3, 0, 1e-4, false))).toBe(false);
  });
});

describe("Lambert's problem and the rendezvous (O02)", () => {
  it('solves Vallado\'s Example 7-5', () => {
    const r1 = v3(15945.34e3, 0, 0), r2 = v3(12214.83899e3, 10249.46731e3, 0);
    const sol = lambert(r1, r2, 76 * 60)!;
    expect(sol).not.toBeNull();
    expect(sol.v1.x / km).toBeCloseTo(2.058913, 4);
    expect(sol.v1.y / km).toBeCloseTo(2.915965, 4);
    expect(sol.v2.x / km).toBeCloseTo(-3.451565, 4);
    expect(sol.v2.y / km).toBeCloseTo(0.910315, 4);
  });

  it('solves Curtis\'s Example 5.2', () => {
    const r1 = v3(5000e3, 10000e3, 2100e3), r2 = v3(-14600e3, 2500e3, 7000e3);
    const sol = lambert(r1, r2, 3600)!;
    expect(sol.v1.x / km).toBeCloseTo(-5.9925, 3);
    expect(sol.v1.y / km).toBeCloseTo(1.9254, 3);
    expect(sol.v1.z / km).toBeCloseTo(3.2456, 3);
    expect(sol.v2.x / km).toBeCloseTo(-3.3125, 3);
    expect(sol.v2.y / km).toBeCloseTo(-4.1966, 3);
    expect(sol.v2.z / km).toBeCloseTo(-0.38529, 3);
  });

  it('flies from r1 to r2 in the time asked, the short way and the long way', () => {
    const r1 = v3(7000e3, 0, 0), r2 = v3(-2000e3, 9000e3, 1000e3);
    for (const [dt, longWay] of [[2000, false], [5000, false], [9000, true], [14000, true]] as const) {
      const sol = lambert(r1, r2, dt, longWay)!;
      expect(sol, `${dt} ${longWay}`).not.toBeNull();
      const end = propagateKepler(r1, sol.v1, dt);
      expect(norm(sub(end.r, r2))).toBeLessThan(1);
      expect(norm(sub(end.v, sol.v2))).toBeLessThan(1e-3);
    }
  });

  it('plans a two-burn rendezvous that ends on the target, and a porkchop no better than Hohmann', () => {
    const chaser = circle(400e3, 0, { raan: 0, m0: 0 });
    // placed so that the transfer turns about 165°, a little short of Hohmann's half orbit
    const target = circle(800e3, 0, { raan: 0, m0: -6 * DEG });
    const plan = ok(rendezvous(chaser, target, 600, 2800, false));
    const c = stateOnPlan(plan, plan.arrival + 1e-6, false), tg = stateAt(target, plan.arrival, false);
    expect(norm(sub(c.r, tg.r))).toBeLessThan(1);
    expect(norm(sub(c.v, tg.v))).toBeLessThan(1e-3);
    expect(orbitFromState(c.r, c.v, JD).a / target.a).toBeCloseTo(1, 6);
    // over a grid, the cheapest transfer between the two circles is no cheaper than Hohmann's, and close to it.
    // The target leads by 30° at first; Hohmann wants it 0.8° ahead, which the lower, faster chaser brings
    // about within two of its revolutions
    const Tc = orbitFacts(chaser, false).period;
    const ahead = circle(800e3, 0, { raan: 0, m0: 30 * DEG });
    const deps = Array.from({ length: 48 }, (_, k) => (k / 48) * 4 * Tc);
    const tofs = Array.from({ length: 40 }, (_, k) => (0.25 + (0.75 * k) / 40) * Tc);
    const grid = porkchop(chaser, ahead, deps, tofs, false);
    const best = Math.min(...grid.flat().filter(Number.isFinite));
    const h = hohmannDv(chaser.a, target.a).total;
    expect(best).toBeGreaterThanOrEqual(h * 0.999);
    expect(best).toBeLessThan(h * 1.25);
    expect(grid.flat().some((x) => Number.isNaN(x))).toBe(true); // the transfers through the Earth are left out
  });
});
