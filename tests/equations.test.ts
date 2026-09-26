import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { captureFrame, cloneFrame, interpolateFrames, type VisualFrame } from '../src/physics/frame';
import { add, norm, sub } from '../src/physics/vec3';
import { OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { ENGINEER_EQUATIONS, EXPLORE_EQUATIONS, equations, type Equation, type EquationContext } from '../src/ui/equations-model';
import type { MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

function mission(model: 'sixDof' | 'pointMass'): MissionConfig {
  const vehicle = vehicleById('falcon9');
  return { vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicle, DEFAULT_GUIDANCE, model), guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    dynamics: model === 'sixDof' ? { model: 'sixDof', wind: 'crosswind', seed: 20260919 } : { model: 'pointMass', wind: 'calm', seed: 1 } } as MissionConfig;
}
const context = (sim: Simulation): EquationContext => ({ siteLatitudeDeg: sim.site.latitude, siteAltitudeM: sim.site.altitude,
  activeStage: sim.vehicle.active, usablePropellant: (stage) => sim.vehicle.usablePropellant(stage) });
const byId = (list: Equation[], id: Equation['id']) => list.find((e) => e.id === id)!;

describe('the equation record (roadmap E02)', () => {
  for (const model of ['sixDof', 'pointMass'] as const) {
    it(`balances Newton's law, the thrust and the Δv book over a Falcon 9 ascent (${model})`, { timeout: 120_000 }, () => {
      const sim = new Simulation(mission(model), { headless: true });
      const v0 = OMEGA_EARTH * (R_EARTH + sim.site.altitude) * Math.cos(sim.site.latitude * Math.PI / 180);
      let steps = 0, worstNewton = 0, worstThrust = 0, worstBudget = 0;
      while (sim.state.t < 150) {
        sim.step(sim.suggestedDt());
        const e = sim.state.eom;
        if (sim.state.t > 0.5 && sim.state.status === 'ascent') expect(e).toBeDefined();
        if (!e || (e.integrator !== 'rigid' && e.integrator !== 'pointMass')) continue;
        expect(e.integrator).toBe(model === 'sixDof' ? 'rigid' : 'pointMass');
        const sum = add(add(e.thrustAccel, e.aeroAccel), e.gravityAccel);
        worstNewton = Math.max(worstNewton, norm(sub(e.measuredAccel, sum)) / norm(e.measuredAccel));
        worstThrust = Math.max(worstThrust, Math.abs(e.vacuumThrust - e.pressure * e.exitArea - e.thrust) / Math.max(1, e.thrust));
        const l = e.losses;
        worstBudget = Math.max(worstBudget, Math.abs(l.dvThrust - l.gravity - l.drag - l.steering - (e.speedEnd - v0)) / Math.max(100, l.dvThrust));
        steps++;
      }
      expect(steps).toBeGreaterThan(model === 'sixDof' ? 10000 : 500);
      // The step's mean acceleration against its start: the integrator's own sub-step spread,
      // worst through staging and the slews (0.4 %); the panel calls a balance good under 1 %.
      expect(worstNewton).toBeLessThan(5e-3);
      // T = T_vac − p·A_e is how every engine's thrust is computed.
      expect(worstThrust).toBeLessThan(1e-12);
      expect(worstBudget).toBeLessThan(model === 'sixDof' ? 1e-3 : 5e-3);
    });
  }

  it('leaves the flight untouched: no record in the telemetry, and none outside flight steps', () => {
    const sim = new Simulation(mission('sixDof'), { headless: true });
    sim.step(sim.suggestedDt());
    expect(sim.state.status).toBe('prelaunch');
    expect(sim.state.eom).toBeUndefined();
    while (sim.state.t < 5) sim.step(sim.suggestedDt());
    expect(sim.telemetry.every((sample) => !('eom' in sample))).toBe(true);
  });

  it('is not written in a flight built without it (the tuner\'s), which flies the same', () => {
    const on = new Simulation(mission('pointMass'), { headless: true });
    const off = new Simulation(mission('pointMass'), { headless: true, equations: false });
    while (on.state.t < 60) {
      on.step(on.suggestedDt());
      off.step(off.suggestedDt());
      expect(off.state.eom).toBeUndefined();
    }
    expect(on.state.eom).toBeDefined();
    expect(off.state.t).toBe(on.state.t);
    expect(off.state.r).toEqual(on.state.r);
    expect(off.state.v).toEqual(on.state.v);
  });
});

describe('the equations panel\'s numbers', () => {
  const sim = new Simulation(mission('sixDof'), { headless: true });
  const frames: { t: number; frame: VisualFrame; list: Equation[]; gost: Equation[] }[] = [];
  const marks = [30, 62, 135, 200];
  let k = 0;
  while (k < marks.length) {
    sim.step(sim.suggestedDt());
    if (sim.state.t >= marks[k]) {
      const frame = captureFrame(sim);
      frames.push({ t: sim.state.t, frame, list: equations(frame, context(sim), 'engineer', 'iso'), gost: equations(frame, context(sim), 'engineer', 'gost') });
      k++;
    }
  }

  it('shows the Explore set in the Explore mode and the whole set in the Engineer mode', () => {
    expect(equations(frames[0].frame, context(sim), 'explore', 'iso').map((e) => e.id)).toEqual([...EXPLORE_EQUATIONS]);
    expect(frames[0].list.map((e) => e.id)).toEqual([...ENGINEER_EQUATIONS]);
    expect(EXPLORE_EQUATIONS).not.toContain('pressureThrust');
    expect(EXPLORE_EQUATIONS).not.toContain('visViva');
  });

  it('balances every equation that has an independent left-hand side, through max-q', () => {
    for (const { list } of frames.slice(0, 2)) {
      for (const e of list) {
        expect(e.available, e.id).toBe(true);
        if (e.check) expect(e.check.ok, `${e.id} ${e.check.relative}`).toBe(true);
      }
      for (const id of ['newton', 'budget', 'pressureThrust', 'visViva', 'gravity', 'euler', 'quaternion', 'control'] as const) expect(byId(list, id).check).toBeDefined();
    }
  });

  it('says when a limiter, not the gain, sets the rate command', () => {
    // T+135 s: the load relief switched off at T+133.5 s, and the stack slews at its rate limit
    // until T+137.2 s (see G03). It was T+127.3 s before the published first-stage masses and
    // T+130.5 s before the six-DOF pitch programme was fitted (docs/VALIDATION.md).
    const control = byId(frames[2].list, 'control');
    expect(control.check).toBeUndefined();
    expect(control.note).toBe('eq.note.rateLimited');
  });

  it('writes α and β alike in both standards, from each one\'s axes', () => {
    for (const { list, gost } of frames) {
      const iso = byId(list, 'aeroAngles'), g = byId(gost, 'aeroAngles');
      if (!iso.available) continue;
      expect(g.values.alpha).toBeCloseTo(iso.values.alpha, 12);
      expect(g.values.vy).toBeCloseTo(-iso.values.w, 9);
      expect(g.values.vz).toBeCloseTo(iso.values.v, 9);
      expect(Math.atan2(iso.values.w, iso.values.u)).toBeCloseTo(iso.values.alpha, 9);
      expect(-Math.atan2(g.values.vy, g.values.vx)).toBeCloseTo(g.values.alpha, 9);
    }
  });

  it('turns the Euler rows into each standard\'s axes and signs', () => {
    const iso = byId(frames[1].list, 'euler').rows!, gost = byId(frames[1].gost, 'euler').rows!;
    expect(gost.find((r) => r.axis === 'pitch')!.left).toBeCloseTo(iso.find((r) => r.axis === 'pitch')!.left, 9);
    expect(gost.find((r) => r.axis === 'yaw')!.right).toBeCloseTo(-iso.find((r) => r.axis === 'yaw')!.right, 9);
  });

  it('marks what does not apply on the second stage above the air, and the vacuum engine', () => {
    const upper = frames[3].list;
    expect(byId(upper, 'pressureThrust').note).toBe('eq.note.vacuumOnly');
    expect(byId(upper, 'rocket').values.isp).toBeGreaterThan(340);
  });

  it('copies the record with every frame handed out, live or interpolated', () => {
    const a = frames[0].frame, copy = cloneFrame(a);
    expect(copy.eom).toEqual(a.eom);
    copy.eom!.measuredAccel.x = 1e9;
    expect(a.eom!.measuredAccel.x).not.toBe(1e9);
    const later = { ...cloneFrame(a), t: a.t + 0.1 };
    const mid = interpolateFrames(a, later, a.t + 0.05);
    expect(mid.eom).toEqual(a.eom);
    expect(mid.eom).not.toBe(a.eom);
  });
});
