/**
 * EO-PHY-6 (a) and (c): the long-term propagator, bit for bit (R0.4 step 4,
 * M-PHYSICS-002; plan S07 §07.4 step 4(a), (c)). Header, recording and the
 * hex format: tests/eo-phy-6/harness.ts.
 *
 * (a) Each case's whole result — every sample's eight fields, `steps` and
 * `lifetime` — in hex, hashed with SHA-256; the first and last samples are
 * kept in full so a mismatch says where it shows, and the short cases keep
 * every sample. The cases are the plan's: a 400 km LEO under every force for
 * 30 days; a GTO with the Sun, the Moon and sunlight; an eccentric orbit
 * carried with `untilDown` until it is down; step rejection forced by
 * tolerance 1e-12; a run stopped by `onProgress`; an equatorial orbit with
 * z = 0 and vz = 0 exactly, from +0 and from −0, with gravity, J2 and drag
 * only so it stays in its plane — the samples cannot show the sign: after
 * the first stage the sums start from +0 and −0 + (+0) is +0, so the two
 * runs hash alike today, and the sign is held by `acceleration()` there, in
 * hex; and the
 * non-finite forces of `mass = 0` and of a NaN input, pinned as they are
 * today (NaN by position) — pinned, not approved: making them an explicit
 * error is a bug-fix PR of its own, not an EQ change. One mean-element case
 * is added beside the plan's eight, so the other method is held too, and
 * `acceleration()` force by force on the equator's axes, where gravity
 * cannot hide a small force's last bit.
 *
 * (c) How many times each Cowell case calls the force model (`deriv`, one
 * `acceleration()` each), counted through a pass-through wrapper on
 * forces.ts. A measure for KPI-11 (EQ-9's FSAL would lower it): reported,
 * and gated on nothing: an identical-output change that calls the forces
 * another way must still pass. Calls above seven a step are rejected steps.
 */
import { describe, expect, it, vi } from 'vitest';
import { propagate, type OrbitSample, type PropagationOptions, type PropagationResult } from '../../src/physics/propagator/propagate';
import { acceleration, gravityAcceleration, ALL_FORCES, type ForceModel, type Spacecraft } from '../../src/physics/propagator/forces';
import { ECSS_LEVELS } from '../../src/physics/propagator/activity';
import type { V3 } from '../../src/physics/propagator/ephemeris';
import { MU_EARTH, R_EARTH } from '../../src/physics/constants';
import { RECORDING, hex, hexDeep, sha256, writeReference } from './harness';
import REF from './ref/propagator.json';

// (c): every call of the force model counted, its result passed through untouched
const counter = vi.hoisted(() => ({ calls: 0 }));
vi.mock('../../src/physics/propagator/forces', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/physics/propagator/forces')>();
  return {
    ...real,
    acceleration: (...args: Parameters<typeof real.acceleration>) => { counter.calls++; return real.acceleration(...args); },
  };
});

const DEG = Math.PI / 180;
/** 2026-09-25 0h UT, as tests/propagator.test.ts */
const JD = 2461310.5;
const SC: Spacecraft = { mass: 500, area: 4, cd: 2.2, cr: 1.3 };
const NONE: ForceModel = { j2: false, j3j4: false, drag: false, sun: false, moon: false, srp: false, activity: ECSS_LEVELS.moderate };
const DAY = 86400;

/** ECI state at perigee of an orbit `pe` × `ap` m high, inclined `inc`°, perigee on the x axis. */
function atPerigee(pe: number, ap: number, inc: number): { r: V3; v: V3 } {
  const rp = R_EARTH + pe, ra = R_EARTH + ap, a = (rp + ra) / 2;
  const vp = Math.sqrt(MU_EARTH * (2 / rp - 1 / a)), i = inc * DEG;
  return { r: [rp, 0, 0], v: [0, vp * Math.cos(i), vp * Math.sin(i)] };
}

interface Case {
  id: string;
  r: V3;
  v: V3;
  options: PropagationOptions;
  /** onProgress: the fractions it was called with, in hex */
  progress?: string[];
}

const leo = atPerigee(400e3, 400e3, 51.6);
const gto = atPerigee(250e3, 35786e3, 27);
const ecc = atPerigee(140e3, 1500e3, 51.6);
const rEq = R_EARTH + 400e3, vEq = Math.sqrt(MU_EARTH / rEq);
const EQUATORIAL: ForceModel = { ...NONE, j2: true, drag: true };

function cases(): Case[] {
  const progress: string[] = [];  // filled by the run; cases() is called afresh for each test
  return [
    { id: 'leo400-all-30d', ...leo, options: { method: 'cowell', duration: 30 * DAY, forces: ALL_FORCES, spacecraft: SC } },
    { id: 'gto-sun-moon-srp-10d', ...gto, options: { method: 'cowell', duration: 10 * DAY, forces: { ...ALL_FORCES, drag: false }, spacecraft: SC } },
    { id: 'eccentric-untilDown', ...ecc, options: { method: 'cowell', duration: 60 * DAY, forces: ALL_FORCES, spacecraft: SC, untilDown: true } },
    { id: 'leo400-tol1e-12-1d', ...leo, options: { method: 'cowell', duration: DAY, forces: ALL_FORCES, spacecraft: SC, tolerance: 1e-12 } },
    {
      id: 'leo400-onProgress-abort', ...leo, progress,
      options: { method: 'cowell', duration: 10 * DAY, forces: ALL_FORCES, spacecraft: SC, onProgress: (f) => { progress.push(hex(f)); return f < 0.3; } },
    },
    { id: 'inc0-plus-zero', r: [rEq, 0, 0], v: [0, vEq, 0], options: { method: 'cowell', duration: DAY, samples: 24, forces: EQUATORIAL, spacecraft: SC } },
    { id: 'inc0-minus-zero', r: [rEq, 0, -0], v: [0, vEq, -0], options: { method: 'cowell', duration: DAY, samples: 24, forces: EQUATORIAL, spacecraft: SC } },
    { id: 'nonfinite-mass0', ...leo, options: { method: 'cowell', duration: DAY, samples: 24, forces: ALL_FORCES, spacecraft: { ...SC, mass: 0 } } },
    { id: 'nonfinite-nan-input', r: [Number.NaN, 0, 0], v: leo.v, options: { method: 'cowell', duration: DAY, samples: 24, forces: ALL_FORCES, spacecraft: SC } },
    { id: 'mean-leo300-drag-2y', ...atPerigee(300e3, 320e3, 51.6), options: { method: 'mean', duration: 730 * DAY, forces: ALL_FORCES, spacecraft: SC } },
  ];
}

const FIELDS: readonly (keyof OrbitSample)[] = ['t', 'a', 'e', 'i', 'raan', 'argp', 'perigeeAlt', 'apogeeAlt'];
/** Samples kept in full up to this many; above it, the first, the last and the digest. */
const FULL = 30;

interface Recorded {
  count: number;
  steps: number;
  lifetime: string | null;
  digest: string;
  first: string[];
  last: string[];
  samples?: string[][];
  progress?: string[];
  derivCalls: number;
}

async function record(c: Case, result: PropagationResult, derivCalls: number): Promise<Recorded> {
  const rows = result.samples.map((s) => FIELDS.map((f) => hex(s[f])));
  const whole = { samples: rows, steps: result.steps, lifetime: result.lifetime === null ? null : hex(result.lifetime) };
  return {
    count: rows.length,
    steps: result.steps,
    lifetime: whole.lifetime,
    digest: await sha256(JSON.stringify(whole)),
    first: rows[0],
    last: rows[rows.length - 1],
    ...(rows.length <= FULL ? { samples: rows } : {}),
    ...(c.progress ? { progress: c.progress } : {}),
    derivCalls,
  };
}

const ref = REF as unknown as { cases: Record<string, Recorded>; acceleration: Record<string, unknown>; forceByForce: Record<string, unknown> };
const runs: Record<string, Recorded> = {};
const seconds: Record<string, number> = {};

/** `acceleration()` and gravity alone at the equatorial states, z = ±0 and vz = ±0, in hex. */
function equatorialAccelerations(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, z] of [['plus', 0], ['minus', -0]] as const) {
    for (const [at, r, v] of [['x', [rEq, 0, z], [0, vEq, z]], ['y', [0, rEq, z], [-vEq, 0, z]]] as const) {
      out[`${name}-${at}`] = hexDeep({
        acceleration: acceleration(r as V3, v as V3, JD, EQUATORIAL, SC),
        gravityJ2: gravityAcceleration(r as V3, true, false),
        gravityJ2J4: gravityAcceleration(r as V3, true, true),
      });
    }
  }
  // the non-finite force itself: A/m = ∞ in drag and sunlight (NaN by position)
  out['mass0-all-forces'] = hexDeep(acceleration(leo.r, leo.v, JD, ALL_FORCES, { ...SC, mass: 0 }));
  return out;
}

/**
 * `acceleration()` with one force at a time, at four points on the equator's
 * axes: there the central term's and J2's other two components are exactly
 * ±0, so each force shows in them at its own resolution instead of being lost
 * in the rounding of gravity's (a 1-ulp change of P_SUN moves no trajectory,
 * but moves these).
 */
function forceByForce(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const points: [string, V3, V3][] = [
    ['+x', [rEq, 0, 0], [0, vEq, 0]], ['-x', [-rEq, 0, 0], [0, -vEq, 0]],
    ['+y', [0, rEq, 0], [-vEq, 0, 0]], ['-y', [0, -rEq, 0], [vEq, 0, 0]],
  ];
  const alone: [string, Partial<ForceModel>][] = [['gravity', {}], ['j2', { j2: true }], ['j3j4', { j3j4: true }], ['drag', { drag: true }],
    ['sun', { sun: true }], ['moon', { moon: true }], ['srp', { srp: true }]];
  for (const [at, r, v] of points) {
    for (const [name, on] of alone) out[`${name}${at}`] = hexDeep(acceleration(r, v, JD, { ...NONE, ...on }, SC));
  }
  return out;
}

describe('EO-PHY-6 (a): propagate(), bit for bit as on the CO-6 base', () => {
  it.each(cases().map((c) => [c.id] as const))('%s', async (id) => {
    const c = cases().find((x) => x.id === id)!;
    counter.calls = 0;
    const t0 = performance.now();
    const result = propagate(c.r, c.v, JD, c.options);
    seconds[id] = (performance.now() - t0) / 1000;
    runs[id] = await record(c, result, counter.calls);
    if (RECORDING) return;
    const { derivCalls: _measure, ...got } = runs[id];
    const { derivCalls: _base, ...want } = ref.cases[id];
    expect(got).toEqual(want);
  }, 120_000);

  it('acceleration() at z = ±0, vz = ±0 (the sign of every zero)', () => {
    if (RECORDING) return;
    expect(equatorialAccelerations()).toEqual(ref.acceleration);
  });

  it('acceleration() force by force, where gravity leaves the other components at ±0', () => {
    if (RECORDING) return;
    expect(forceByForce()).toEqual(ref.forceByForce);
  });

  it('the plan\'s cases are all here, and the special ones do what they are for', () => {
    if (RECORDING) return;
    expect(Object.keys(ref.cases).sort()).toEqual(cases().map((c) => c.id).sort());
    // forced rejection: more calls than seven a step means steps were thrown away
    expect(ref.cases['leo400-tol1e-12-1d'].derivCalls).toBeGreaterThan(7 * ref.cases['leo400-tol1e-12-1d'].steps);
    // the abort stopped it early, and untilDown carried the eccentric orbit down
    expect(hex(10 * DAY)).not.toBe(ref.cases['leo400-onProgress-abort'].last[0]);
    expect(ref.cases['eccentric-untilDown'].lifetime).not.toBeNull();
    // the non-finite cases: a NaN error is accepted, h and t turn NaN and the loop ends by itself after two
    // steps, with the start sample only (its elements NaN, by position, for the NaN input)
    for (const id of ['nonfinite-mass0', 'nonfinite-nan-input']) expect([ref.cases[id].count, ref.cases[id].steps]).toEqual([1, 2]);
    expect(JSON.stringify(ref.cases['nonfinite-nan-input'].samples)).toContain('NaN');
  });
});

describe('EO-PHY-6 (c): deriv calls, a measure (KPI-11), not an equality gate', () => {
  it('counts every case\'s force-model calls', async () => {
    if (RECORDING) {
      await writeReference('propagator.json', { cases: runs, acceleration: equatorialAccelerations(), forceByForce: forceByForce() });
      return;
    }
    if (Object.keys(runs).length === 0) return; // run alone (-t): nothing measured
    const table = Object.entries(runs).map(([id, r]) => ({ id, steps: r.steps, derivCalls: r.derivCalls, base: ref.cases[id].derivCalls, s: +seconds[id].toFixed(2) }));
    console.info(`EO-PHY-6 (c) deriv calls:\n${table.map((r) => `${r.id}\t${r.steps} steps\t${r.derivCalls} calls (base ${r.base})\t${r.s} s`).join('\n')}`);
    // a measure only: an identical-output change may call the forces another way (EQ-9's allocation-free
    // variant would count 0 here) and must still pass; a count of 0 is only flagged
    for (const r of table) if (r.base > 0 && r.derivCalls === 0) console.warn(`EO-PHY-6 (c): ${r.id} no longer calls acceleration(); count deriv another way`);
    expect(table.length).toBe(Object.keys(ref.cases).length);
  });
});
