/**
 * O02: the planner's settings — the defaults read off an orbit make plans
 * that work, every kind is offered at the right level, and the Watch tour's
 * Hohmann step says what its plan does.
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { norm, sub } from '../src/physics/vec3';
import { orbitFacts, stateAt } from '../src/orbit/kepler';
import { presetOrbit } from '../src/orbit/presets';
import { isPlan, stateOnPlan } from '../src/orbit/maneuvers';
import {
  ENGINEER_KINDS, EXPLORE_KINDS, defaultSettings, makePlan, porkchopAxes, porkchopMinimum, rendezvousTarget,
} from '../src/orbit/maneuver-setup';
import { porkchop } from '../src/orbit/maneuvers';
import { TOUR } from '../src/orbit/tour';
import { orbitPath, tourSetup } from '../src/orbit/playground-model';

const JD = 2461309.5;

describe('the maneuver planner\'s settings (O02)', () => {
  it('offers Lambert\'s rendezvous at the Engineer level only', () => {
    expect(EXPLORE_KINDS).not.toContain('rendezvous');
    expect(ENGINEER_KINDS).toEqual([...EXPLORE_KINDS, 'rendezvous']);
  });

  it('makes a working plan from every default, from the space station\'s orbit', () => {
    const iss = presetOrbit('iss', JD);
    for (const kind of ENGINEER_KINDS) {
      let s = defaultSettings(kind, iss);
      expect(s.kind).toBe(kind);
      if (kind === 'rendezvous') {
        // as the playground does: the cheapest transfer on the porkchop plot
        const target = rendezvousTarget(s, iss);
        const { deps, tofs } = porkchopAxes(iss, target, 24, 20);
        const best = porkchopMinimum(porkchop(iss, target, deps, tofs, false))!;
        s = { ...s, dep: deps[best.i], tof: tofs[best.j] };
      }
      const plan = makePlan(s, iss, 0, false);
      expect(isPlan(plan), `${kind}: ${isPlan(plan) ? '' : plan.error}`).toBe(true);
      if (!isPlan(plan)) continue;
      expect(plan.totalDv, kind).toBeGreaterThan(0);
      expect(plan.segments[0].orbit).toBe(iss);
    }
  });

  it('reads sensible targets off the orbit', () => {
    const leo = presetOrbit('leo', JD), geo = presetOrbit('geo', JD);
    expect(defaultSettings('hohmann', leo).targetAlt).toBe(35_786e3);
    expect(defaultSettings('hohmann', geo).targetAlt).toBe(500e3);
    expect(defaultSettings('planeChange', leo).targetI / DEG).toBeCloseTo(18.5, 9);
    expect(defaultSettings('planeChange', geo).targetI / DEG).toBeCloseTo(10, 9);
    expect(defaultSettings('spiral', leo).targetI).toBe(0);
    // a rendezvous: a station 300 km up from a low orbit, down from a high one
    expect((defaultSettings('rendezvous', leo).targetAlt - 800e3) / 1e3).toBeCloseTo(0, 6);
    expect((defaultSettings('rendezvous', geo).targetAlt - 35_486e3) / 1e3).toBeCloseTo(0, 6);
    // the GTO default circularises into GEO
    const gto = presetOrbit('gto', JD);
    const circ = makePlan(defaultSettings('circularizeApogee', gto), gto, 0, false);
    expect(isPlan(circ) && (circ.final.a - R_EARTH) / 1e3).toBeCloseTo(35786, 3);
  });

  it('puts a rendezvous target in the chaser\'s plane, ahead of it, and finds the cheapest transfer on the plot', () => {
    const chaser = presetOrbit('leo', JD);
    const s = { ...defaultSettings('rendezvous', chaser), targetPhase: 30 * DEG };
    const target = rendezvousTarget(s, chaser);
    expect(target.i).toBe(chaser.i);
    expect(target.raan).toBe(chaser.raan);
    const c0 = stateAt(chaser, 0, false), t0 = stateAt(target, 0, false);
    expect(Math.acos((c0.r.x * t0.r.x + c0.r.y * t0.r.y + c0.r.z * t0.r.z) / (norm(c0.r) * norm(t0.r))) / DEG).toBeCloseTo(30, 6);
    const { deps, tofs } = porkchopAxes(chaser, target);
    expect(deps.length).toBe(64);
    // one synodic period (91 600 s for 500 and 800 km), capped at a day
    expect(deps[deps.length - 1]).toBe(86400);
    expect(tofs[0]).toBeGreaterThan(0);
    const grid = porkchop(chaser, target, deps, tofs, false);
    const best = porkchopMinimum(grid)!;
    expect(best).not.toBeNull();
    const plan = makePlan({ ...s, dep: deps[best.i], tof: tofs[best.j] }, chaser, 0, false);
    expect(isPlan(plan)).toBe(true);
    if (!isPlan(plan)) return;
    expect(plan.totalDv).toBeCloseTo(best.dv, 3);
    // coplanar circles 500 and 800 km: the cheapest is near Hohmann's 0.16 km/s
    expect(best.dv / 1e3).toBeLessThan(0.25);
    // and it arrives on the target
    const c = stateOnPlan(plan, plan.arrival + 1e-6, false), tg = stateAt(target, plan.arrival, false);
    expect(norm(sub(c.r, tg.r))).toBeLessThan(1);
    expect(porkchopMinimum([[NaN, NaN]])).toBeNull();
  });

  it('draws an orbit whole, and an escape out to twelve Earth radii', () => {
    const leo = presetOrbit('leo', JD);
    const pts = orbitPath(leo, 64);
    expect(pts.length).toBe(64);
    for (const p of pts) expect(Math.hypot(p.x, p.y, p.z) / leo.a).toBeCloseTo(1, 9);
    const esc = orbitPath({ ...leo, a: -20000e3, e: 1.4 }, 64);
    expect(Math.max(...esc.map((p) => Math.hypot(p.x, p.y, p.z))) / R_EARTH).toBeLessThan(12.01);
  });
});

describe('the Watch tour\'s Hohmann step (O02)', () => {
  it('flies from 500 km to geostationary height for about 3.8 km/s, in a little over five hours', () => {
    const step = TOUR.find((s) => s.id === 'hohmann')!;
    const setup = tourSetup(step, JD);
    const orbit = setup.orbit!;
    expect((orbit.a - R_EARTH) / 1e3).toBeCloseTo(500, 6);
    const plan = makePlan({ ...defaultSettings('hohmann', orbit), ...setup.maneuver! }, orbit, 0, false);
    expect(isPlan(plan)).toBe(true);
    if (!isPlan(plan)) return;
    expect(Math.round(plan.totalDv / 100) / 10).toBe(3.8);
    const hours = (plan.arrival - plan.burns[0].t) / 3600;
    expect(hours).toBeGreaterThan(5);
    expect(hours).toBeLessThan(5.5);
    expect((plan.final.a - R_EARTH) / 1e3).toBeCloseTo(35786, 3);
    // it stays in its plane: geostationary height, not the geostationary orbit
    expect(plan.final.i).toBeCloseTo(orbit.i, 9);
    expect(orbitFacts(plan.final, false).period / 86164.09).toBeCloseTo(1, 3);
  });
});
