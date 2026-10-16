/**
 * M-LAUNCH-031 residual (FX-5, lane P): the verdict's completion event carries
 * the numbers it was judged on, unrounded — `apJudgedM`, `peJudgedM` (m above
 * the equatorial radius, the physical apsides where six-DOF judged on them),
 * `incJudgedRad`, `raanJudgedRad` — beside the rounded `ap`/`pe`/`inc`/`raan`
 * the event line prints. Before, the result table could only re-judge from the
 * rounded ones (1 km, 0.01°, 0.1°), and an off-target verdict they rounded back
 * inside fell back to the displayed orbit's flags (#117 review;
 * docs/development/HANDOVER-K1.md §9).
 */
import { describe, expect, it } from 'vitest';
import { allCases, caseKey, flyCase } from './fleet-harness';
import { flyMr3 } from './mr3-harness';
import { orbitResiduals } from '../src/physics/mission';
import { RAD } from '../src/physics/constants';
import type { Simulation } from '../src/physics/simulation';

const VERDICTS = ['evt.targetOrbit', 'evt.offTargetOrbit', 'evt.suborbitalTarget', 'evt.suborbitalOffTarget'];
const verdict = (sim: Simulation) => sim.events.find((e) => VERDICTS.includes(e.key))!;
const num = (v: unknown): number => { expect(typeof v).toBe('number'); return v as number; };

describe('the completion event keeps the judged numbers unrounded (M-LAUNCH-031 residual)', () => {
  it('an orbit: the four values, their rounded twins, and the verdict they give', () => {
    const c = allCases().find((x) => caseKey(x) === 'falcon9/leo/50')!;
    const sim = flyCase(c);
    const e = verdict(sim);
    expect(e.key).toBe('evt.targetOrbit');
    const p = e.params!;
    const ap = num(p.apJudgedM), pe = num(p.peJudgedM), inc = num(p.incJudgedRad), raan = num(p.raanJudgedRad);
    expect(Math.round(ap / 1000)).toBe(p.ap);
    expect(Math.round(pe / 1000)).toBe(p.pe);
    expect(+(inc * RAD).toFixed(2)).toBe(p.inc);
    expect(+(raan * RAD).toFixed(1)).toBe(p.raan);
    // the recorded numbers give the recorded verdict, as the simulation judged it
    const res = orbitResiduals(sim.plan.target, { apoapsisAlt: ap, periapsisAlt: pe, i: inc, raan, e: 0 }, true);
    expect(res.onTarget).toBe(true);
    // point-mass judges on the conic: no physical apsides, so the basis stays osculating
    expect(p.apAltM).toBeUndefined();
  }, 60_000);

  it('a suborbital cut-off (Mercury-Redstone 3): inclination and node unrounded too', () => {
    const sim = flyMr3('pointMass');
    const e = verdict(sim);
    expect(e.key).toBe('evt.suborbitalTarget');
    const p = e.params!;
    expect(+(num(p.incJudgedRad) * RAD).toFixed(2)).toBe(p.inc);
    expect(Number.isFinite(num(p.raanJudgedRad))).toBe(true);
    expect(num(p.apJudgedM)).toBe(p.apAltM);
    expect(num(p.peJudgedM)).toBe(p.peAltM);
  }, 60_000);
});
