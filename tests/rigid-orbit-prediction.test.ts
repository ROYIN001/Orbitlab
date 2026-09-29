import { describe, expect, it } from 'vitest';
import { propagateJ2Coast, nextJ2Apsis, physicalApsides, shootJ2ApsisVelocity, shootJ2Altitude } from '../src/physics/rigid/orbit-prediction';
import { J2_EARTH, MU_EARTH, R_EARTH } from '../src/physics/constants';
import { norm, sub, v3 } from '../src/physics/vec3';
import { elementsFromState, propagateKepler, timeToApoapsis } from '../src/physics/orbital';

// Accepted physical SECO snapshot from the bounded Falcon probe, 2026-09-19.
// The full logged coast and reproducible script live outside the product in
// audit-2026-09-19/sixdof-falcon-j2-coast.{json,mjs}.
const cutoff = {
  r: { x: -1911760.9277536185, y: 5531958.611252583, z: 3002423.2014054745 },
  v: { x: -7529.928274189406, y: -1983.8878754978946, z: -1141.0086645731217 },
};
const potentialEquator = (r: number) => -MU_EARTH / r * (1 + 0.5 * J2_EARTH * (R_EARTH / r) ** 2);

describe('J2 coast prediction for finite-attitude orbital planning', () => {
  it('matches the independently analytic circular equatorial J2 solution and leaves inputs unchanged', () => {
    const r = R_EARTH + 500e3;
    const speed = Math.sqrt(MU_EARTH / r * (1 + 1.5 * J2_EARTH * (R_EARTH / r) ** 2));
    const initial = { r: v3(r, 0, 0), v: v3(0, speed, 0) };
    const saved = structuredClone(initial);
    const duration = 3000, angle = speed / r * duration;
    const expected = { r: v3(r * Math.cos(angle), r * Math.sin(angle), 0), v: v3(-speed * Math.sin(angle), speed * Math.cos(angle), 0) };
    const forecast = propagateJ2Coast(initial, duration)!;
    expect(norm(sub(forecast.r, expected.r))).toBeLessThan(0.03);
    expect(norm(sub(forecast.v, expected.v))).toBeLessThan(0.00004);
    expect(initial).toEqual(saved);
    expect(propagateJ2Coast(initial, 0)).toEqual(initial);
    expect(propagateJ2Coast(initial, 0)?.r).not.toBe(initial.r);
  });

  it('finds the physical apex absent from the frozen osculating conic and converges under 40-fold refinement', () => {
    const element = elementsFromState(cutoff.r, cutoff.v);
    const conicAt = propagateKepler(cutoff.r, cutoff.v, timeToApoapsis(element));
    const apex = nextJ2Apsis(cutoff, 'apoapsis')!;
    const fine = nextJ2Apsis(cutoff, 'apoapsis', { stepS: 0.25 })!;
    expect(apex.radiusM - R_EARTH).toBeGreaterThan(488000);
    expect(apex.radiusM - R_EARTH).toBeLessThan(488040);
    expect(norm(conicAt.r) - apex.radiusM).toBeGreaterThan(10e3);
    expect(Math.abs(apex.radiusM - fine.radiusM)).toBeLessThan(0.02);
    expect(Math.abs(apex.timeS - fine.timeS)).toBeLessThan(0.001);
    expect(Math.abs(apex.radialSpeedMS)).toBeLessThan(0.00001);
    const before = propagateJ2Coast(cutoff, apex.timeS - 10)!;
    const after = propagateJ2Coast(cutoff, apex.timeS + 10)!;
    expect(norm(before.r)).toBeLessThan(apex.radiusM);
    expect(norm(after.r)).toBeLessThan(apex.radiusM);
  });

  it('shoots an apex against independent conserved J2 energy and axial angular momentum', () => {
    const peri = R_EARTH + 200e3, apo = R_EARTH + 500e3;
    const exactSpeed = Math.sqrt(2 * (potentialEquator(apo) - potentialEquator(peri)) / (1 - (peri / apo) ** 2));
    const initial = { r: v3(peri, 0, 0), v: v3(0, exactSpeed - 20, 0) };
    const shot = shootJ2ApsisVelocity(initial, v3(0, 1, 0), apo, 'apoapsis', {
      minSpeedMS: exactSpeed - 25, maxSpeedMS: exactSpeed + 25, radiusToleranceM: 0.05,
    })!;
    expect(shot).not.toBeNull();
    expect(Math.abs(shot.speedMS - exactSpeed)).toBeLessThan(0.00003);
    expect(Math.abs(shot.missM)).toBeLessThanOrEqual(0.05);
    const fine = nextJ2Apsis({ r: initial.r, v: shot.velocity }, 'apoapsis', { stepS: 0.25 })!;
    expect(Math.abs(fine.radiusM - apo)).toBeLessThan(0.07);
    expect(Math.abs(norm(fine.v) - peri / apo * exactSpeed)).toBeLessThan(0.001);
    // At apoapsis the equatorial orbit is on the opposite side, so h_z=r×v
    // remains positive although both x and the transverse y velocity are negative.
    expect(fine.v.y).toBeLessThan(0);
  });

  it('predicts an accepted long coast checkpoint within the omitted small aero/RCS perturbation budget', () => {
    // Same loaded-source probe as the cutoff above; still coasting, before the
    // first thrust tick. The forecast deliberately excludes aero and RCS loads.
    const time = 3180.008046782618 - 476.0780467593383;
    const observed = {
      r: v3(1729004.5284566535, -5840649.753604865, -3168342.9868914364),
      v: v3(7299.10483753357, 1628.94500752685, 961.154192163563),
    };
    const forecast = propagateJ2Coast(cutoff, time)!;
    expect(norm(sub(forecast.r, observed.r))).toBeLessThan(5);
    expect(norm(sub(forecast.v, observed.v))).toBeLessThan(0.01);
  });

  it('can include an initial apsis explicitly, or find the following one', () => {
    const peri = R_EARTH + 200e3, apo = R_EARTH + 500e3;
    const speed = Math.sqrt(2 * (potentialEquator(apo) - potentialEquator(peri)) / (1 - (peri / apo) ** 2));
    const initial = { r: v3(peri, 0, 0), v: v3(0, speed, 0) };
    expect(nextJ2Apsis(initial, 'periapsis', { includeInitial: true })?.timeS).toBe(0);
    const next = nextJ2Apsis(initial, 'periapsis')!;
    expect(next.timeS).toBeGreaterThan(5000);
    expect(Math.abs(next.radiusM - peri)).toBeLessThan(0.03);
  });

  it('gives the lowest and highest altitude of the next revolution, which the osculating apsides are not', () => {
    // Brute force: every second of one revolution.
    const extremes = (initial: { r: ReturnType<typeof v3>; v: ReturnType<typeof v3> }) => {
      const period = elementsFromState(initial.r, initial.v).period;
      let state = initial, low = Infinity, high = -Infinity;
      for (let t = 0; t < period; t++) {
        state = propagateJ2Coast(state, 1, { stepS: 1 })!;
        low = Math.min(low, norm(state.r)); high = Math.max(high, norm(state.r));
      }
      return { periapsisAlt: low - R_EARTH, apoapsisAlt: high - R_EARTH };
    };
    // Falcon 9's cut-off: its physical apex is the one `nextJ2Apsis` finds.
    const falcon = physicalApsides(cutoff)!, falconFine = extremes(cutoff);
    expect(Math.abs(falcon.apoapsisAlt - falconFine.apoapsisAlt)).toBeLessThan(2);
    expect(Math.abs(falcon.periapsisAlt - falconFine.periapsisAlt)).toBeLessThan(2);
    expect(Math.abs(falcon.apoapsisAlt - (nextJ2Apsis(cutoff, 'apoapsis')!.radiusM - R_EARTH))).toBeLessThan(2);
    // A circle at 500 km and 51.6°, set up from its osculating elements: under
    // J2 it rises and falls by kilometres, and the osculating apsides of the
    // instant are off both extremes.
    const r = R_EARTH + 500e3, speed = Math.sqrt(MU_EARTH / r), inc = 51.6 * Math.PI / 180;
    const circle = { r: v3(r, 0, 0), v: v3(0, speed * Math.cos(inc), speed * Math.sin(inc)) };
    const physical = physicalApsides(circle)!, fine = extremes(circle), osculating = elementsFromState(circle.r, circle.v);
    expect(Math.abs(physical.apoapsisAlt - fine.apoapsisAlt)).toBeLessThan(2);
    expect(Math.abs(physical.periapsisAlt - fine.periapsisAlt)).toBeLessThan(2);
    expect(physical.apoapsisAlt - physical.periapsisAlt).toBeGreaterThan(2e3);
    expect(Math.abs(osculating.periapsisAlt - physical.periapsisAlt)).toBeGreaterThan(1e3);
    // Unbound or through the surface: no orbit to judge.
    expect(physicalApsides({ r: v3(R_EARTH + 300e3, 0, 0), v: v3(0, 12000, 0) })).toBeNull();
    expect(physicalApsides({ r: v3(R_EARTH + 100e3, 0, 0), v: v3(0, 5000, 0) })).toBeNull();
  });

  it('shoots the speed whose next revolution puts its lowest, highest or mean altitude on a target', () => {
    // A 51.6° orbit whose lowest point is 489 km, at its highest point.
    const r = R_EARTH + 500e3, inc = 51.6 * Math.PI / 180;
    const speed = Math.sqrt(MU_EARTH * (2 / r - 2 / (r + R_EARTH + 489e3)));
    const orbit = { r: v3(r, 0, 0), v: v3(0, speed * Math.cos(inc), speed * Math.sin(inc)) };
    const extremes = physicalApsides(orbit)!;
    const top = propagateJ2Coast(orbit, extremes.apoapsisTimeS)!;
    // The time of the highest point is where the highest point is.
    expect(Math.abs(norm(top.r) - R_EARTH - extremes.apoapsisAlt)).toBeLessThan(1);
    const bracket = { minSpeedMS: norm(top.v) - 30, maxSpeedMS: norm(top.v) + 30 };
    const lowest = shootJ2Altitude(top, top.v, 'lowest', 494e3, bracket)!;
    expect(Math.abs(physicalApsides({ r: top.r, v: lowest.velocity })!.periapsisAlt - 494e3)).toBeLessThan(1);
    // Raising the lowest point costs speed: prograde and a few m/s.
    expect(lowest.speedMS - norm(top.v)).toBeGreaterThan(0.5);
    expect(lowest.speedMS - norm(top.v)).toBeLessThan(10);
    // The middle of the swing can always be put on a target near the burn
    // point; the lowest point cannot be lifted to the burn point's own height.
    const mean = shootJ2Altitude(top, top.v, 'mean', extremes.apoapsisAlt, bracket)!;
    const after = physicalApsides({ r: top.r, v: mean.velocity })!;
    expect(Math.abs((after.periapsisAlt + after.apoapsisAlt) / 2 - extremes.apoapsisAlt)).toBeLessThan(1);
    expect(shootJ2Altitude(top, top.v, 'lowest', extremes.apoapsisAlt + 2e3, bracket)).toBeNull();
  });

  it('does not manufacture a solution for a missing root, unbracketed target or surface crossing', () => {
    const escape = { r: v3(R_EARTH + 300e3, 0, 0), v: v3(12000, 0, 0) };
    expect(nextJ2Apsis(escape, 'apoapsis', { maxTimeS: 1000 })).toBeNull();
    const fall = { r: v3(R_EARTH + 1, 0, 0), v: v3(-100, 0, 0) };
    expect(propagateJ2Coast(fall, 1)).toBeNull();
    expect(nextJ2Apsis(fall, 'periapsis')).toBeNull();
    expect(shootJ2ApsisVelocity(cutoff, cutoff.v, R_EARTH + 2000e3, 'apoapsis', {
      minSpeedMS: 7869, maxSpeedMS: 7871,
    })).toBeNull();
    // A revolution longer than the forecast budget — Apollo 11's translunar
    // ellipse, 186 × 370 000 km, ten days round — is not forecast (C01): no
    // apsides, and no throw from a burn sequencer that asks.
    const rp = R_EARTH + 186e3, ra = R_EARTH + 370000e3;
    const translunar = { r: v3(rp, 0, 0), v: v3(0, Math.sqrt(MU_EARTH * (2 / rp - 2 / (rp + ra))), 0) };
    expect(physicalApsides(translunar)).toBeNull();
    expect(() => propagateJ2Coast(cutoff, Infinity)).toThrow(RangeError);
    expect(() => nextJ2Apsis(cutoff, 'apoapsis', { stepS: 0 })).toThrow(RangeError);
  });
});
