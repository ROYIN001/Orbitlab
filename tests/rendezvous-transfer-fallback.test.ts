/**
 * PF-04, the first suspect: the station transfer that keeps its first guess.
 *
 * `src/physics/sim/rendezvous.ts` solves the transfer burn with
 * `interceptImpulse` (tolerance 5 m) and, when that returns null, flies the
 * first guess from `raiseImpulse` instead, with no flag, event or message.
 * These cases measure how often the nominal flights reach that branch (never,
 * on the 36 flown here), how far the solver is from giving up, and what the
 * flight does when it does give up.
 *
 * The case titled `known defect (PF-04)` pins what the app does today. W-L,
 * the batch that owns the station transfer, replaces its assertion with its
 * own failing test when it fixes the fallback. The report is
 * docs/development/reports/PF-04-silent-answers.md.
 */
import { describe, expect, it, vi } from 'vitest';
import type { PointState } from '../src/physics/rendezvous/station';
import type { Vec3 } from '../src/physics/vec3';

type Shot = [s: PointState, duration: number, target: Vec3, dv0: Vec3, tolerance?: number, maxIterations?: number];

/** The transfer calls (tolerance 5 m) the flight makes, and whether the wrapper is to answer null for them. */
const rec = vi.hoisted(() => ({
  fail: false,
  calls: [] as { args: Shot; solved: boolean; iterations: number; miss: number }[],
}));

vi.mock('../src/physics/rendezvous/targeting', async (original) => {
  const m = await original<typeof import('../src/physics/rendezvous/targeting')>();
  return {
    ...m,
    interceptImpulse: (...a: Parameters<typeof m.interceptImpulse>) => {
      // tolerance 5 m is what the transfer burn of the station flight passes
      if (a[4] !== 5) return m.interceptImpulse(...a);
      const r = rec.fail ? null : m.interceptImpulse(...a);
      rec.calls.push({ args: structuredClone(a) as Shot, solved: r !== null, iterations: r ? r.iterations : -1, miss: r ? r.miss : NaN });
      return r;
    },
  };
});

import { Simulation } from '../src/physics/simulation';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { launchWindows } from '../src/physics/mission';
import { PROFILE_IDS, type RendezvousProfileId } from '../src/physics/rendezvous/profiles';
import { interceptImpulse } from '../src/physics/rendezvous/targeting';
import { add, cross, norm, normalize, scale, sub } from '../src/physics/vec3';
import type { MissionConfig } from '../src/types';

const WINDOWS = launchWindows(orbitById('iss'), siteById('baikonur'), new Date('2026-09-20T00:00:00Z'), 12);

/** The mission of tests/rendezvous.test.ts, at a given profile and launch time. */
function mission(profile: RendezvousProfileId, launchTime: Date): MissionConfig {
  return {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: orbitById('iss'), launchTime,
    guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 7150,
    dynamics: { model: 'pointMass', wind: 'calm', seed: 1 }, rendezvous: { profile, port: 'rassvet' },
  };
}

/** A pinned number: within 10 % of the value measured. */
const within10 = (x: number, measured: number) => expect(Math.abs(x / measured - 1)).toBeLessThanOrEqual(0.1);

/** Fly until `until` holds or the flight is over. */
function fly(sim: Simulation, until: (sim: Simulation) => boolean = () => false, limit = 60 * 3600): void {
  let guard = 0;
  while (!sim.done && sim.state.t < limit && !until(sim) && guard++ < 3e6) sim.step(sim.suggestedDt());
}

/** A flight flown in point mass to the transfer burn's solution. */
function toTransfer(profile: RendezvousProfileId, launchTime: Date): Simulation {
  rec.calls.length = 0;
  const sim = new Simulation(mission(profile, launchTime), { headless: true });
  fly(sim, () => rec.calls.length > 0);
  return sim;
}

describe('the station transfer on the nominal flights', () => {
  it('the transfer is solved on every nominal flight', () => {
    const outcomes: { flight: string; calls: number; solved: boolean; iterations: number }[] = [];
    for (const profile of PROFILE_IDS) {
      for (const [k, w] of WINDOWS.entries()) {
        toTransfer(profile, w.time);
        const c = rec.calls[0];
        outcomes.push({ flight: `${profile} window ${k + 1}`, calls: rec.calls.length, solved: !!c?.solved, iterations: c ? c.iterations : -1 });
      }
    }
    expect(outcomes).toHaveLength(36);
    // measured: every flight reached the transfer and called the solver once
    expect(outcomes.filter((o) => o.calls === 1).map((o) => o.flight)).toHaveLength(36);
    // measured: 36 of 36 solved, in 2 passes (two-orbit, two-day) or 3 (four-orbit), to 0.50 m or better
    expect(outcomes.filter((o) => o.solved).map((o) => o.flight)).toHaveLength(36);
    expect(outcomes.filter((o) => o.iterations > 5)).toEqual([]);
  }, 30_000);
});

describe('how far the solver is from failing', () => {
  it('where the solver gives up', () => {
    toTransfer('twoOrbit', WINDOWS[0].time);
    const [s, duration, target, guess] = rec.calls[0].args;
    // the burn's own frame: radial, along-track, cross-track
    const R = normalize(s.r), N = normalize(cross(s.r, s.v)), T = cross(N, R);
    const solve = (st: PointState, dt = duration) => interceptImpulse(st, dt, target, guess, 5);
    const pos = (e: Vec3, m: number) => solve({ r: add(s.r, scale(e, m)), v: s.v });
    const vel = (e: Vec3, ms: number) => solve({ r: s.r, v: add(s.v, scale(e, ms)) });

    // the smallest displacement of the task's grid that returns null, each direction and sign (null: none up to the largest tried)
    const KM = [1, 3, 10, 30, 100, 300].map((x) => x * 1e3), MS = [1, 3, 10, 30, 100], SEC = [10, 30, 100, 300, 1000];
    const smallestNull = (grid: number[], f: (x: number) => unknown) => grid.find((x) => f(x) === null) ?? null;
    const table: Record<string, number | null> = {};
    for (const [name, e] of [['radial', R], ['along-track', T], ['cross-track', N]] as const) {
      for (const sign of [1, -1]) {
        const tag = sign > 0 ? '+' : '-';
        table[`position ${name} ${tag}`] = smallestNull(KM, (x) => pos(e, sign * x));
        table[`velocity ${name} ${tag}`] = smallestNull(MS, (x) => vel(e, sign * x));
      }
    }
    table['duration +'] = smallestNull(SEC, (x) => solve(s, duration + x));
    table['duration -'] = smallestNull(SEC, (x) => solve(s, duration - x));
    // measured: only a cross-track offset in position (1 km, the smallest tried, either sign) and the duration
    // (+300 s, -1,000 s) give up; every other direction is solved up to the largest tried
    expect(table).toEqual({
      'position radial +': null, 'position radial -': null, 'velocity radial +': null, 'velocity radial -': null,
      'position along-track +': null, 'position along-track -': null, 'velocity along-track +': null, 'velocity along-track -': null,
      'position cross-track +': 1e3, 'position cross-track -': 1e3, 'velocity cross-track +': null, 'velocity cross-track -': null,
      'duration +': 300, 'duration -': 1000,
    });

    // the duration: 300 s longer returns null, 100 s longer is solved (measured 10 passes, 531.6 m/s against 41.8 undisplaced)
    expect(solve(s, duration + 300)).toBeNull();
    const longer = solve(s, duration + 100)!;
    expect(longer.iterations).toBeGreaterThanOrEqual(9);
    expect(longer.iterations).toBeLessThanOrEqual(11);
    within10(norm(longer.dv), 531.6);
    // and 1,000 s shorter returns null, 300 s shorter is solved (measured 12 passes, 1,141.4 m/s)
    expect(solve(s, duration - 1000)).toBeNull();
    const shorter = solve(s, duration - 300)!;
    expect(shorter.iterations).toBeGreaterThanOrEqual(11);
    within10(norm(shorter.dv), 1141.4);

    // cross-track below the grid: 300 m returns null, 100 m is solved (measured 6 passes, at 139.0 m/s: the transfer turns
    // about half an orbit, where an impulse barely moves the arrival out of the plane)
    expect(pos(N, 300)).toBeNull();
    const across = pos(N, 100)!;
    expect(across.iterations).toBe(6);
    within10(norm(across.dv), 139.0);
  }, 30_000);
});

describe('a failed transfer solution, flown', () => {
  /** The two-orbit flight of the first window, flown to its end; the distance to the station measured at the plan's arrival. */
  function flight(fail: boolean) {
    rec.fail = fail;
    try {
      const sim = toTransfer('twoOrbit', WINDOWS[0].time);
      const call = rec.calls[0];
      const plan = sim.rendezvous.plan!;
      const from = sim.events.length - 1;
      // the first step that ends at or after the plan's arrival (measured 0.43 to 0.46 s after it)
      fly(sim, (x) => x.state.t >= plan.tArrive);
      const atArrival = norm(sub(sim.state.r, plan.station.at(sim.state.t).r));
      const late = sim.state.t - plan.tArrive;
      fly(sim);
      return { sim, call, transfer: sim.events[from], after: sim.events.slice(from + 1), atArrival, late };
    } finally {
      rec.fail = false;
    }
  }

  it('with the solver left alone, the flight docks', () => {
    const f = flight(false);
    expect(f.transfer.key).toBe('evt.rendezvousBurn');
    expect(f.transfer.params).toEqual({ burn: 'dv3', dv: 41.8 }); // measured 41.8 m/s, solved in 2 passes to 0.17 m
    expect(f.late).toBeLessThan(1);
    // measured 2,145 m at the arrival: the aim point, where the braking burn hands over to Kurs
    within10(f.atArrival, 2145);
    expect(f.sim.state.note).toBe('docked');
    expect(f.after.some((e) => e.key === 'evt.docked')).toBe(true);
  }, 30_000);

  it('known defect (PF-04): a failed transfer solution is flown as the first guess, and nothing says so', () => {
    const f = flight(true);
    expect(f.call.solved).toBe(false);
    const guess = norm(f.call.args[3]);
    // the transfer burn's event carries the first guess's size (measured 30.35 m/s, shown 30.3) where the solution was 41.8
    expect(f.transfer.key).toBe('evt.rendezvousBurn');
    expect(f.transfer.params!.burn).toBe('dv3');
    expect(f.transfer.params!.dv).toBe(+guess.toFixed(1));
    within10(guess, 30.35);
    // what follows, to the end: no event names the solver, and none is a warning; the one failure is the propellant's,
    // 6,163 s after Kurs takes over 107 km out (measured)
    expect(f.after.map((e) => `${e.key} ${e.severity}`)).toEqual([
      'evt.rendezvousBurnDone info', 'evt.rendezvousBurn info', 'evt.rendezvousBurnDone info', 'evt.kursApproach info', 'evt.rendezvousFuelDepleted fail',
    ]);
    expect(f.after.filter((e) => /solv|intercept|target|guess/i.test(e.key))).toEqual([]);
    expect(f.after.filter((e) => e.severity === 'warn')).toEqual([]);
    // the braking burn measured 29.9 m/s (5.2 on the solved flight); Kurs takes over 107,296 m out (2,128)
    within10(Number(f.after[1].params!.dv), 29.9);
    within10(Number(f.after[3].params!.range), 107296);
    // the end: measured 107,195 m from the station at the arrival, propellant spent, no docking
    expect(f.late).toBeLessThan(1);
    within10(f.atArrival, 107195);
    expect(f.sim.state.note).toBe('rendezvousFuelDepleted');
    expect(f.sim.state.rendezvous?.phase).toBe('aborted');
    expect(f.after.some((e) => e.key === 'evt.docked')).toBe(false);
  }, 30_000);
});
