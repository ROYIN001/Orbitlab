/**
 * PSLV-XL's first stage is slow at separation (docs/VALIDATION.md, F12), and
 * the shape of the solid motors' thrust curve is not why: flown with the S139's
 * and the PSOM-XLs' peak factors set to 1 (flat), to the published ones and
 * to 2, the stack gets the same ideal delta-v and reaches PS1 separation
 * within about 90 m/s of the same speed, all of it well short of the
 * brochure's 2 143 m/s. What moves it is the ascent profile.
 */
import { describe, expect, it } from 'vitest';
import { flyMission, type FlownMission } from './flight-harness';
import { PSLV_C52, TOLERANCE } from './reference-data';
import { vehicleById } from '../../src/data/vehicles';
import type { EngineSpec } from '../../src/types';

const PS1_SEP_SPEED = 2143.3;

/** Flies C52 in the point-mass model with every PS1 solid at `peakFactor` (undefined: as shipped). */
function fly(peakFactor?: number): FlownMission {
  const spec = vehicleById('pslvxl');
  const ps1 = spec.stages[0];
  const core = ps1.engine;
  const boosters = ps1.boosters!.map((b) => b.engine);
  const set = (e: EngineSpec) => (peakFactor === undefined ? e : { ...e, peakFactor });
  ps1.engine = set(core);
  ps1.boosters!.forEach((b, i) => { b.engine = set(boosters[i]); });
  try {
    return flyMission(PSLV_C52.mission, 'pointMass', { until: 130 });
  } finally {
    ps1.engine = core;
    ps1.boosters!.forEach((b, i) => { b.engine = boosters[i]; });
  }
}

/** ideal delta-v from lift-off to `t`, m/s */
function idealDeltaV(f: FlownMission, t: number): number {
  let dv = 0;
  for (let s = 0; s < t; s += 0.25) { const x = f.at(s); dv += (x.thrust / x.mass) * 0.25; }
  return dv;
}

const sepSpeed = (f: FlownMission) => f.at(f.eventTime('evt.stageSep')!).vInertial;

describe('PSLV-XL first stage against the thrust-curve shape (F12)', () => {
  it('reaches PS1 separation at about the same speed whatever the solid-motor peak factor', { timeout: 60_000 }, () => {
    const flights = [fly(1), fly(), fly(2)];
    for (const f of flights) expect(f.failed).toBe(false);
    const dv = flights.map((f) => idealDeltaV(f, 107));
    const v = flights.map(sepSpeed);
    // the normalised profile keeps the impulse: the ideal delta-v agrees to 1 %
    expect(Math.max(...dv) - Math.min(...dv)).toBeLessThan(0.01 * dv[1]);
    // and the separation speed moves by less than half the tolerance
    const tol = TOLERANCE.speed(PS1_SEP_SPEED);
    expect(Math.max(...v) - Math.min(...v)).toBeLessThan(tol / 2);
    // every one of them still misses the brochure
    for (const s of v) expect(PS1_SEP_SPEED - s).toBeGreaterThan(tol);
  });
});
