/**
 * Eclipses and the β angle (roadmap D06; Phase 4 map §2.2 A), held to
 * published tables and curves and to the Skyfield-checked shadow:
 *
 * - V-E1: SMAD's "Earth Satellite Parameters" table (Larson & Wertz, *Space
 *   Mission Analysis and Design*), as reproduced in B.T.C. Zandbergen,
 *   *Spacecraft bus design and sizing*, TU Delft 2020, App. H, book p. 274
 *   (PDF p. 288): https://repository.tudelft.nl/file/File_124a068a-158f-4b40-a44f-9ba407a14845
 * - V-E2: S.L. Rickman (NASA JSC), "Introduction to On-Orbit Thermal
 *   Environments", TFAWS 2023, slides 96–97 (β), 116–118 (eclipse):
 *   https://tfaws.nasa.gov/wp-content/uploads/16.On-Orbit-Thermal-Environments-TFAWS-2023_SRickman.pdf
 * - V-E3: `inSunlight` (src/orbit/passes.ts, held to Skyfield's ISS shadow
 *   edges within ±3 s in tests/passes.test.ts) sampled along `stateAt`, with
 *   the propagator's own `inShadow` (forces.ts) asserted alongside.
 * - Dates: the 2027 March equinox (20 March 20:25 UTC) and June solstice
 *   (21 June 14:11 UTC) from the US Naval Observatory,
 *   https://aa.usno.navy.mil/api/seasons?year=2027
 *
 * Each tolerance is written in the comment before its first comparison; a
 * bound changed after seeing a result says so.
 */
import { describe, expect, it } from 'vitest';
import {
  betaAngle, circularPeriod, criticalBeta, eclipseCore, eclipseDuration, eclipseFraction, sampledEclipse, worstEclipse,
} from '../src/orbit/eclipse';
import { orbitFacts, stateAt, type Orbit } from '../src/orbit/kepler';
import { inSunlight } from '../src/orbit/passes';
import { GEO_RADIUS } from '../src/orbit/applications';
import { inShadow } from '../src/physics/propagator/forces';
import { sunPosition } from '../src/physics/propagator/ephemeris';
import { julianDate, planeNormal, sunDirectionEci, sunRightAscension } from '../src/physics/orbital';
import { DEG, R_EARTH } from '../src/physics/constants';
import { cross, dot, v3 } from '../src/physics/vec3';

const JD = 2461309.5; // 2026-09-26 00:00 UTC
const MIN = 60;

/** A circular orbit whose revolution from `jd` starts at orbit noon (the point nearest the Sun), so its eclipse falls in the middle. */
function noonStart(h: number, i: number, raan: number, jd: number): Orbit {
  const s = sunDirectionEci(jd);
  const x = v3(Math.cos(raan), Math.sin(raan), 0), y = cross(planeNormal(i, raan), x);
  return { a: R_EARTH + h, e: 0, i, raan, argp: 0, m0: Math.atan2(dot(s, y), dot(s, x)), jd0: jd };
}

describe('the eclipse closed form against SMAD (V-E1)', () => {
  // App. H, book p. 274, every row as printed: altitude km, period min, max eclipse min (β = 0).
  // The map (§2.2 A) named 14 of these rows; all 41 are held here, to the same bound.
  const TABLE: [number, number, number][] = [
    [0, 84.49, 42.24], [100, 86.48, 38.40], [150, 87.49, 37.76], [200, 88.49, 37.28], [250, 89.50, 36.90],
    [300, 90.52, 36.59], [350, 91.54, 36.33], [400, 92.56, 36.11], [450, 93.59, 35.92], [500, 94.62, 35.75],
    [550, 95.65, 35.61], [600, 96.69, 35.49], [650, 97.73, 35.38], [700, 98.77, 35.29], [750, 99.82, 35.20],
    [800, 100.87, 35.13], [850, 101.93, 35.07], [900, 102.99, 35.02], [950, 104.05, 34.97], [1000, 105.12, 34.94],
    [1250, 110.51, 34.83], [1500, 115.98, 34.83], [2000, 127.20, 35.03], [2500, 138.75, 35.40], [3000, 150.64, 35.86],
    [3500, 162.84, 36.38], [4000, 175.36, 36.94], [4500, 188.19, 37.53], [5000, 201.31, 38.13], [6000, 228.42, 39.36],
    [7000, 256.66, 40.60], [8000, 285.97, 41.84], [9000, 316.31, 43.06], [10000, 347.66, 44.27], [15000, 518.46, 50.00],
    [20000, 710.60, 55.24], [20184, 718.05, 55.42], [25000, 921.94, 60.07], [30000, 1150.85, 64.56], [35000, 1396.10, 68.77],
    [35786, 1436.07, 69.41],
  ];

  it('reproduces every row of the table, period and maximum eclipse', () => {
    // Tolerance, fixed before the first run (map V-E1): ±0.01 min in both columns — the table's
    // half-unit rounding (0.005 min) plus as much again for SMAD's constants against the code's
    // μ = 3.986004418e14 m³/s² and R = 6 378 137 m.
    expect(TABLE).toHaveLength(41);
    for (const [km, period, eclipse] of TABLE) {
      expect(Math.abs(circularPeriod(km * 1e3) / MIN - period), `${km} km period`).toBeLessThanOrEqual(0.01);
      expect(Math.abs(eclipseDuration(km * 1e3, 0) / MIN - eclipse), `${km} km eclipse`).toBeLessThanOrEqual(0.01);
    }
  });

  it('is one half on the ground, and the period is the kepler module’s', () => {
    // Exact identities, to rounding (1e-12): acos(0)/π; eclipseDuration uses orbitFacts' two-body period.
    expect(Math.abs(eclipseFraction(0, 0) - 0.5)).toBeLessThan(1e-12);
    const o: Orbit = { a: R_EARTH + 500e3, e: 0, i: 1, raan: 2, argp: 0, m0: 0, jd0: JD };
    expect(Math.abs(circularPeriod(500e3) - orbitFacts(o, false).period)).toBeLessThan(1e-9);
  });

  it('refuses an altitude below the ground or a β that is not a number', () => {
    expect(() => eclipseFraction(-1, 0)).toThrow(RangeError);
    expect(() => eclipseFraction(400e3, Number.NaN)).toThrow(RangeError);
    expect(() => criticalBeta(Number.NaN)).toThrow(RangeError);
  });
});

describe('the eclipse closed form against TFAWS’s 408 km curve (V-E2)', () => {
  // Slide 118's "Fraction Spent in Eclipse" curve, read off the slide's embedded chart (1052 × 617 px) by
  // pixel: the axes calibrated on the gridlines (0.1 of the fraction = 54 px, 10° = 108.4 px), the red
  // curve's centre taken in the columns either side of each β. One pixel is 0.0019 in the fraction.
  const PLOT: [number, number][] = [
    [0, 0.3885], [10, 0.3867], [20, 0.3811], [30, 0.3700], [40, 0.3534], [50, 0.3215], [60, 0.2604], [65, 0.1998],
  ];

  it('follows the curve', () => {
    // Tolerance, fixed before the first run (map V-E2): ±0.005 in the fraction, read off a plot.
    for (const [deg, f] of PLOT) {
      expect(Math.abs(eclipseFraction(408e3, deg * DEG) - f), `β = ${deg}°`).toBeLessThanOrEqual(0.005);
    }
  });

  it('ends where the curve reaches zero', () => {
    // The curve meets the axis between pixel columns at 70.08° and 70.17°: 70.1°. Tolerance, fixed
    // before the first run: ±0.3° (three pixels: the line is three wide). β* = asin(R/(R + h)).
    expect(Math.abs(criticalBeta(408e3) / DEG - 70.1)).toBeLessThanOrEqual(0.3);
    // Either side of β*, exactly: some shadow just inside, none from β* on.
    const bStar = criticalBeta(408e3);
    expect(eclipseFraction(408e3, bStar - 1e-6)).toBeGreaterThan(0);
    expect(eclipseFraction(408e3, bStar)).toBe(0);
    expect(eclipseFraction(408e3, -bStar)).toBe(0);
    expect(eclipseFraction(408e3, Math.PI / 2)).toBe(0);
  });

  it('is even in β', () => {
    for (const deg of [5, 30, 60]) expect(eclipseFraction(408e3, -deg * DEG)).toBe(eclipseFraction(408e3, deg * DEG));
  });
});

describe('the β angle (D06)', () => {
  /** Rickman's slide 96: β = asin(cos Γ sin Ω sin i − sin Γ cos ε cos Ω sin i + sin Γ sin ε cos i), Γ the Sun's ecliptic longitude. */
  function rickmanBeta(i: number, raan: number, jd: number): number {
    // Γ and ε from the Astronomical Almanac's low-precision formulas, the ones sunDirectionEci uses
    const n = jd - 2451545.0;
    const L = (280.46 + 0.9856474 * n) * DEG, g = (357.528 + 0.9856003 * n) * DEG;
    const G = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
    const eps = (23.439 - 0.0000004 * n) * DEG;
    return Math.asin(Math.cos(G) * Math.sin(raan) * Math.sin(i) - Math.sin(G) * Math.cos(eps) * Math.cos(raan) * Math.sin(i)
      + Math.sin(G) * Math.sin(eps) * Math.cos(i));
  }

  it('is Rickman’s closed form, with the node held and with it drifting under J2', () => {
    // An identity: the same unit vectors dotted two ways. Tolerance fixed before the first run: 1e-12 rad.
    // Slide 96 writes "β = φ − (π/2)" for cos φ = ô·ŝ, then β = sin⁻¹(ô·ŝ), which is (π/2) − φ: the
    // intermediate step has its sign reversed (a source defect); the final formula, used here, is right,
    // and matches slide 97's sign (Sun north of the orbit plane positive).
    for (const i of [0, 28.5, 51.6, 98.2, 150]) {
      for (const raan of [0, 75, 200, 330]) {
        const o: Orbit = { a: R_EARTH + 408e3, e: 0, i: i * DEG, raan: raan * DEG, argp: 0, m0: 0, jd0: JD };
        const raanDot = orbitFacts(o, true).raanDot;
        for (const days of [0, 17.3, 91.25, 250]) {
          const jd = JD + days;
          expect(Math.abs(betaAngle(o, jd, false) - rickmanBeta(o.i, o.raan, jd))).toBeLessThan(1e-12);
          // the node drifted over (jd − jd0)·86400 s, the time betaAngle itself takes: a Julian date near 2.46e6
          // holds only ~40 µs, and a first run that drifted it over days·86400 missed 1e-12 by 8.5e-12 rad
          // (the reference's time corrected after that run; the bound unchanged)
          expect(Math.abs(betaAngle(o, jd, true) - rickmanBeta(o.i, o.raan + raanDot * (jd - o.jd0) * 86400, jd))).toBeLessThan(1e-12);
        }
      }
    }
  });

  it('is the Sun’s declination for an equatorial orbit, +ε at the June solstice', () => {
    // 2027 June solstice, 21 June 14:11 UTC (USNO; the Sun's declination at its maximum). Slide 97: |β| ≤ ε + |i|,
    // Sun north positive. Tolerance fixed before the first run: 0.01°, the Almanac formula's own accuracy.
    const jd = julianDate(new Date(Date.UTC(2027, 5, 21, 14, 11)));
    const eps = 23.439 - 0.0000004 * (jd - 2451545.0);
    const geo: Orbit = { a: GEO_RADIUS, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0: jd };
    expect(Math.abs(betaAngle(geo, jd, true) / DEG - eps)).toBeLessThanOrEqual(0.01);
  });

  it('stays within ε + i over a year at the ISS’s orbit, and comes close to it', () => {
    // Slide 97: β is limited to ±(ε + |i|) = ±75.04° at 51.6°. Over a year the node sweeps past each solstice
    // several times (β's cycle is about 60 days), so a daily sweep comes within a degree of the limit;
    // tolerance fixed before the first run: the bound to 1e-9°, the approach to within 1°. ε is the
    // Almanac's at the start (it shrinks by 0.00015° over the year, so that is the largest).
    const o: Orbit = { a: R_EARTH + 408e3, e: 0, i: 51.6 * DEG, raan: 0, argp: 0, m0: 0, jd0: JD };
    const limit = 23.439 - 0.0000004 * (JD - 2451545.0) + 51.6;
    let most = 0;
    for (let d = 0; d <= 365; d++) most = Math.max(most, Math.abs(betaAngle(o, JD + d, true)));
    expect(most / DEG).toBeLessThanOrEqual(limit + 1e-9);
    expect(most / DEG).toBeGreaterThanOrEqual(limit - 1);
  });
});

describe('the shadow sampled against the closed form (V-E3)', () => {
  const ORBITS = [
    { h: 408e3, i: 51.6 * DEG },
    { h: 700e3, i: 98.19 * DEG },
  ];
  const RAANS = [0, 45, 90, 135, 180, 225, 270, 315];

  it('agrees within 2 s a revolution in low orbit, with inShadow asserted alongside', () => {
    // Tolerance, fixed before the first run (map V-E3): 2 s per orbit, for inSunlight sampled at 1 s (its
    // edges then bisected to 1 ms) against eclipseDuration(h, β), with β taken in the middle of the
    // revolution (its eclipse is placed there). Two-body motion, as the closed form assumes; what is
    // left is the Sun's own motion, about eclipse × P/year = 0.4 s. (First run: within 0.47 s everywhere.)
    //
    // inShadow(r, s), the propagator's copy of the cylinder, with the opposite polarity, sampled at the same
    // 1 s steps:
    // - fed inSunlight's Sun (sunDirectionEci at 1 AU), it is exactly !inSunlight at every sample (0);
    // - fed its own Sun, sunPosition(jd), its shadow (samples × 1 s) is within the same 2 s of the closed
    //   form at that Sun's β.
    // CHANGED AFTER THE FIRST RUN. The first run held inShadow with its own Sun to the closed form at
    // sunDirectionEci's β (2 s) and to at most 4 samples of disagreement with inSunlight a revolution, on
    // the map's word that the two Suns differ by arc-minutes. They are 0.45° apart in 2026 (the next test
    // says why): the edges moved by up to 11 samples each (22 disagreeing samples a revolution) and, the
    // offset tilting β by up to 0.45°, the eclipse by up to 12.8 s at 700 km and β ≈ 47°. Both checks were
    // replaced by the two above, which the first run's numbers already met (0 samples; within 1.1 s): the
    // same Sun for the same-Sun comparison, and each Sun's own β for the closed form.
    let eclipsed = 0;
    const AU_M = 1.495978707e11;
    for (const { h, i } of ORBITS) {
      for (const raan of RAANS) {
        const o = noonStart(h, i, raan * DEG, JD);
        const period = orbitFacts(o, false).period;
        const mid = JD + period / 2 / 86400;
        const beta = betaAngle(o, mid, false);
        const closed = eclipseDuration(h, beta);
        const sampled = sampledEclipse(o, JD, 1, false);
        const label = `${h / 1e3} km, Ω ${raan}°, β ${(beta / DEG).toFixed(2)}°`;
        expect(Math.abs(sampled.duration - closed), label).toBeLessThanOrEqual(2);
        expect(Math.abs(sampled.fraction - closed / period), label).toBeLessThanOrEqual(2 / period);
        const own = sunPosition(mid), n = planeNormal(i, raan * DEG);
        const betaOwn = Math.asin((own[0] * n.x + own[1] * n.y + own[2] * n.z) / Math.hypot(...own));
        let shadow = 0, disagree = 0;
        for (let t = 0; t < period; t += 1) {
          const jd = JD + t / 86400, r = stateAt(o, t, false).r, rv: [number, number, number] = [r.x, r.y, r.z];
          const s = sunDirectionEci(jd);
          if (inShadow(rv, [s.x * AU_M, s.y * AU_M, s.z * AU_M]) === inSunlight(r, jd)) disagree += 1;
          if (inShadow(rv, sunPosition(jd))) shadow += 1;
        }
        expect(disagree, `${label}, predicates on one Sun`).toBe(0);
        expect(Math.abs(shadow - eclipseDuration(h, betaOwn)), `${label}, inShadow`).toBeLessThanOrEqual(2);
        if (closed > 0) eclipsed += 1;
      }
    }
    // the set covers orbits in shadow and orbits out of it
    expect(eclipsed).toBeGreaterThanOrEqual(4);
    expect(eclipsed).toBeLessThan(ORBITS.length * RAANS.length);
  });

  it('the propagator’s Sun is 0.45° from sunDirectionEci’s in 2026, and why (map risk R7)', () => {
    // Written after the V-E3 first run, to explain it. sunPosition (Montenbruck & Gill §3.3.2) gives the
    // ecliptic longitude 282.9400° + M, M = 357.5256° + 35 999.049°/century, in the equinox of J2000 with
    // the perihelion held at its J2000 longitude; sunDirectionEci (Astronomical Almanac) gives
    // L = 280.460° + 0.9856474°/day, in the equinox of date. Their longitudes part by
    // (0.9856474 − 0.98560026)°/day × (JD − J2000) − 0.0056°: 0.4547° on 2026-09-26, of which the
    // precession of the equinox since 2000 (1.3972°/century) is 0.3735° and the perihelion's own motion
    // (the series holds it still) the rest. The two series' equation-of-centre terms agree to 0.0006° and
    // the Almanac's obliquity of date differs from J2000's by 0.004°: tolerance, 0.01°.
    const p = sunPosition(JD), s = sunDirectionEci(JD);
    const angle = Math.acos((p[0] * s.x + p[1] * s.y + p[2] * s.z) / Math.hypot(...p)) / DEG;
    const predicted = (0.9856474 - (99.9973583 * 360) / 36525) * (JD - 2451545.0) - (0.7790711 * 360 - 280.46);
    expect(Math.abs(angle - predicted)).toBeLessThanOrEqual(0.01);
    expect(angle).toBeGreaterThan(0.4);
  });

  it('at GEO is the closed form lengthened by the Sun’s motion', () => {
    // At the March 2027 equinox (20 March 20:25 UTC, USNO) a geostationary orbit crosses the middle of the shadow.
    // The shadow moves east with the Sun at its right ascension's rate ṡ while the satellite goes round at
    // n, so the arc the closed form takes n to cross takes n − ṡ: expected = eclipseDuration(h, β)/(1 − ṡ/n),
    // about 10 s longer than SMAD's 69.41 min. Tolerance, fixed before the first run: 2 s, as V-E3.
    const jd = julianDate(new Date(Date.UTC(2027, 2, 20, 20, 25)));
    const h = GEO_RADIUS - R_EARTH;
    const o = noonStart(h, 0, 0, jd);
    const period = orbitFacts(o, false).period;
    const mid = jd + period / 2 / 86400;
    const sDot = (sunRightAscension(mid + 1 / 24) - sunRightAscension(mid - 1 / 24)) / 7200;
    const expected = eclipseDuration(h, betaAngle(o, mid, false)) / (1 - sDot / (2 * Math.PI / period));
    expect(Math.abs(sampledEclipse(o, jd, 60, false).duration - expected)).toBeLessThanOrEqual(2);
    expect(expected - eclipseDuration(h, 0)).toBeGreaterThan(5);
  });

  it('does not depend on the step, the edges being bisected', () => {
    // Tolerance fixed before the first run: 0.01 s (each edge placed to 1 ms).
    const o = noonStart(550e3, 97.6 * DEG, 40 * DEG, JD);
    const fine = sampledEclipse(o, JD, 1).duration;
    expect(fine).toBeGreaterThan(0);
    for (const step of [10, 60, 120]) expect(Math.abs(sampledEclipse(o, JD, step).duration - fine)).toBeLessThanOrEqual(0.01);
  });

  it('follows Kepler’s second law on an ellipse', () => {
    // No closed form: an equatorial ellipse at the equinox, its apogee then its perigee turned away from the
    // Sun. Slower at apogee, the satellite spends longer crossing the shadow there.
    const jd = julianDate(new Date(Date.UTC(2027, 2, 20, 20, 25)));
    const antiSun = sunRightAscension(jd) + Math.PI;
    const ellipse = (argp: number): Orbit => ({ a: R_EARTH + 10000e3, e: 0.4, i: 0, raan: 0, argp, m0: 0, jd0: jd });
    const apogeeInShadow = sampledEclipse(ellipse(antiSun + Math.PI), jd, 60).duration;
    const perigeeInShadow = sampledEclipse(ellipse(antiSun), jd, 60).duration;
    expect(perigeeInShadow).toBeGreaterThan(0);
    expect(apogeeInShadow).toBeGreaterThan(perigeeInShadow);
  });

  it('refuses an open orbit or a step that is not a positive number', () => {
    const o: Orbit = { a: R_EARTH + 500e3, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0: JD };
    expect(() => sampledEclipse({ ...o, a: -1e7, e: 1.5 }, JD, 10)).toThrow(RangeError);
    expect(() => sampledEclipse(o, JD, 0)).toThrow(RangeError);
    expect(() => sampledEclipse(o, JD, Number.NaN)).toThrow(RangeError);
  });
});

describe('the worst eclipse of a season (D06)', () => {
  it('at the ISS’s orbit is the β = 0 closed form, found where β crosses zero', () => {
    // β's cycle at 51.6° is about 60 days, so 70 days hold a crossing of zero. With J2 on, the sampled
    // eclipse differs from the two-body closed form at β = 0 by J2's change of the argument-of-latitude rate
    // (7.8e-4 of the eclipse, −1.7 s) and by the shadow moving in the plane as the node regresses and the Sun
    // moves (≤ 2.3 s). Tolerance, fixed before the first run: 5 s; and the worst at |β| ≤ 3°, where the
    // closed form is already 1 s short of its β = 0 value.
    const o: Orbit = { a: R_EARTH + 408e3, e: 0, i: 51.6 * DEG, raan: 0, argp: 0, m0: 0, jd0: JD };
    const w = worstEclipse(o, JD, 70);
    expect(Math.abs(w.duration - eclipseDuration(408e3, 0))).toBeLessThanOrEqual(5);
    expect(Math.abs(w.beta) / DEG).toBeLessThanOrEqual(3);
    expect(w.jd).toBeGreaterThanOrEqual(JD);
    expect(w.jd).toBeLessThanOrEqual(JD + 70);
    // its own numbers hang together
    expect(Math.abs(w.duration - sampledEclipse(o, w.jd, orbitFacts(o, true).nodalPeriod / 360).duration)).toBeLessThan(1e-9);
    expect(Math.abs(w.fraction - w.duration / orbitFacts(o, true).nodalPeriod)).toBeLessThan(1e-12);
  });

  it('at GEO is the equinox’s, and there is none at the solstice', () => {
    // As the GEO test above: SMAD's 69.41 min lengthened by the Sun's motion. Tolerance, fixed before the
    // first run: 2 s, and the worst at |β| ≤ 0.3° (0.3° off the equinox the closed form is already 2.5 s
    // short). At the June solstice β ≈ 23.4°, far above GEO's β* of 8.7°: no eclipse at all.
    const eq = julianDate(new Date(Date.UTC(2027, 2, 20, 20, 25)));
    const geo: Orbit = { a: GEO_RADIUS, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0: eq - 15 };
    const w = worstEclipse(geo, eq - 15, 30);
    const h = GEO_RADIUS - R_EARTH, period = orbitFacts(geo, true).nodalPeriod;
    const sDot = (sunRightAscension(w.jd + 1 / 24) - sunRightAscension(w.jd - 1 / 24)) / 7200;
    expect(Math.abs(w.duration - eclipseDuration(h, 0) / (1 - sDot / (2 * Math.PI / period)))).toBeLessThanOrEqual(2);
    expect(Math.abs(w.beta) / DEG).toBeLessThanOrEqual(0.3);
    const sol = julianDate(new Date(Date.UTC(2027, 5, 21, 14, 11)));
    const none = worstEclipse({ ...geo, jd0: sol - 20 }, sol - 20, 40);
    expect(none.duration).toBe(0);
    expect(none.fraction).toBe(0);
  });

  it('begins each revolution on the day side, so a span that starts in an eclipse still finds a whole one', () => {
    // Added in review. A revolution begun in the shadow adds the tail of one eclipse to the head of the next,
    // which the shadow has moved on from; at GEO the revolution is locked to the Sun's day, so every sample of
    // a sweep is cut the same way. Before the fix, a GEO satellite 6° into the shadow at the 2027 March
    // equinox gave 3951.7 s for a span of no days (one revolution) where the eclipse is 4175 s. Tolerance,
    // fixed before the fix was run: 2 s, as the GEO checks above, at every phase listed (170°–188° are in the
    // shadow at the start, its edge being 8.7° either side of the anti-Sun point at 180°).
    const eq = julianDate(new Date(Date.UTC(2027, 2, 20, 20, 25)));
    const h = GEO_RADIUS - R_EARTH;
    for (const deg of [0, 90, 170, 172, 174, 177, 180, 183, 186, 188, 270]) {
      const geo: Orbit = { a: GEO_RADIUS, e: 0, i: 0, raan: 0, argp: 0, m0: deg * DEG, jd0: eq };
      const period = orbitFacts(geo, true).nodalPeriod;
      const w = worstEclipse(geo, eq, 0);
      const mid = w.jd + period / 2 / 86400;
      const sDot = (sunRightAscension(mid + 1 / 24) - sunRightAscension(mid - 1 / 24)) / 7200;
      const expected = eclipseDuration(h, w.beta) / (1 - sDot / (2 * Math.PI / period));
      expect(Math.abs(w.duration - expected), `m0 ${deg}°`).toBeLessThanOrEqual(2);
      // the revolution it names is lit at its start and holds that eclipse
      expect(inSunlight(stateAt(geo, (w.jd - eq) * 86400, true).r, w.jd), `m0 ${deg}°`).toBe(true);
      expect(Math.abs(sampledEclipse(geo, w.jd, period / 360).duration - w.duration)).toBeLessThan(1e-9);
    }
  });

  it('refuses a span that is not a number of days', () => {
    const o: Orbit = { a: R_EARTH + 500e3, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0: JD };
    expect(() => worstEclipse(o, JD, -1)).toThrow(RangeError);
    expect(() => worstEclipse(o, JD, Number.NaN)).toThrow(RangeError);
  });

  it('is the module the satellite model is written against', () => {
    expect(eclipseCore.worstEclipse).toBe(worstEclipse);
    expect(eclipseCore.eclipseFraction).toBe(eclipseFraction);
  });
});
