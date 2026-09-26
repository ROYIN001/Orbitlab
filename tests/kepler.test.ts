/**
 * The orbit playground's physics (roadmap O01), held to closed forms and to
 * published figures:
 *
 * - elements ↔ state round-trips (src/physics/orbital.ts);
 * - Kepler's laws as numbers: equal areas in equal times, T²/a³ the same for
 *   every orbit, the orbit a conic with the Earth at its focus;
 * - the geostationary radius 42 164 km (one turn per sidereal day) and GPS's
 *   semi-synchronous 26 560 km, 11 h 58 min;
 * - the repeat cycles Earth-observation satellites are designed to, found from
 *   J2's secular rates alone: the Landsat WRS-2 orbit, 233 revolutions in 16
 *   days — nodal period 5933.0472 s and inclination 98.2096° in the USGS
 *   calibration parameter file (LT05CPF_19900101_19900331), mean semi-major
 *   axis 7077.44 km and 7077.95 km measured either side of Landsat 5's 1995
 *   orbit correction (NASA, Landsat Program Chronology); its "705 km" is a
 *   nominal altitude, not above the equatorial radius — and Sentinel-2, 143
 *   revolutions in 10 days, 786 km mean altitude, 98.62° (ESA, SentiWiki
 *   "S2 Mission");
 * - Newton's cannon: the first and second cosmic velocities (7.9 and
 *   11.2 km/s), and a slow shot landing where a flat-Earth projectile would.
 */
import { describe, expect, it } from 'vitest';
import {
  SUN_RATE, apsidesToAE, equalTimeCuts, groundTrack, hitsEarth, newtonsCannon, orbitFacts, orbitFromState, repeatOrbit,
  secularRates, sectorArea, stateAt, sunSynchronousInclination, type Orbit,
} from '../src/orbit/kepler';
import { elementsFromState, stateFromElements } from '../src/physics/orbital';
import { DEG, MU_EARTH, R_EARTH, SIDEREAL_DAY } from '../src/physics/constants';

const JD = 2461309.5; // 2026-09-26 00:00 UTC
const orbit = (o: Partial<Orbit>): Orbit => ({ a: R_EARTH + 500e3, e: 0, i: 51.6 * DEG, raan: 0, argp: 0, m0: 0, jd0: JD, ...o });
const G0 = MU_EARTH / R_EARTH ** 2;

describe('orbit elements (O01)', () => {
  it('round-trip between elements and state', () => {
    for (const a of [R_EARTH + 300e3, 26560e3, 42164e3]) {
      for (const e of [0.001, 0.1, 0.72]) {
        for (const i of [0.1, 51.6 * DEG, 98 * DEG, 170 * DEG]) {
          for (const nu of [0.3, 2.5, 5.9]) {
            const { r, v } = stateFromElements(a, e, i, 1.2, 2.1, nu);
            const el = elementsFromState(r, v);
            expect(el.a / a).toBeCloseTo(1, 10);
            expect(el.e).toBeCloseTo(e, 10);
            expect(el.i).toBeCloseTo(i, 10);
            expect(el.raan).toBeCloseTo(1.2, 9);
            expect(el.argp).toBeCloseTo(2.1, 8);
            expect(el.nu).toBeCloseTo(nu, 8);
          }
        }
      }
    }
  });

  it('turn perigee and apogee altitudes into a and e, and back', () => {
    const { a, e } = apsidesToAE(600e3, 39750e3); // Molniya
    const f = orbitFacts(orbit({ a, e }), false);
    expect(f.perigeeAlt).toBeCloseTo(600e3, 3);
    expect(f.apogeeAlt).toBeCloseTo(39750e3, 3);
    expect(apsidesToAE(39750e3, 600e3)).toEqual({ a, e });
    expect(hitsEarth(apsidesToAE(-10e3, 400e3))).toBe(true);
  });

  it('read an orbit off a state vector, epoch and all', () => {
    const o = orbit({ e: 0.2, a: 12000e3, argp: 1, raan: 2, m0: 0.7 });
    const s = stateAt(o, 0, false);
    const back = orbitFromState(s.r, s.v, JD);
    expect(back.a).toBeCloseTo(o.a, 3);
    expect(back.m0).toBeCloseTo(0.7, 9);
    expect(back.jd0).toBe(JD);
  });
});

describe("Kepler's laws (O01)", () => {
  it('sweeps equal areas in equal times (second law)', () => {
    for (const e of [0, 0.3, 0.74]) {
      const o = orbit({ a: 26600e3, e });
      const cuts = equalTimeCuts(e, 12);
      const areas = cuts.slice(1).map((nu, k) => sectorArea(o, cuts[k], nu));
      const total = Math.PI * o.a * o.a * Math.sqrt(1 - e * e); // the ellipse, πab
      for (const area of areas) expect(area / (total / 12)).toBeCloseTo(1, 9);
      // and the areas are the ellipse's, measured geometrically: a fan of thin triangles from the focus
      const nu1 = cuts[1], steps = 20000;
      let fan = 0;
      for (let k = 0; k < steps; k++) {
        const a1 = (nu1 * k) / steps, a2 = (nu1 * (k + 1)) / steps;
        const r = (nu: number) => (o.a * (1 - e * e)) / (1 + e * Math.cos(nu));
        fan += 0.5 * r(a1) * r(a2) * Math.sin(a2 - a1);
      }
      expect(fan / areas[0]).toBeCloseTo(1, 6);
      // the cuts crowd round perigee, where the satellite is fast
      if (e > 0) expect(cuts[1] - cuts[0]).toBeGreaterThan(cuts[7] - cuts[6]);
    }
  });

  it('keeps T²/a³ the same for every orbit (third law)', () => {
    const k = 4 * Math.PI ** 2 / MU_EARTH;
    for (const a of [R_EARTH + 400e3, 26560e3, 42164e3, 384400e3]) {
      expect(orbitFacts(orbit({ a, e: 0.1 }), false).keplerConstant / k).toBeCloseTo(1, 12);
    }
  });

  it('puts the Earth at a focus: the radius runs from a(1−e) to a(1+e) (first law)', () => {
    const o = orbit({ a: 24500e3, e: 0.73 });
    const radii = Array.from({ length: 360 }, (_, k) => stateAt(o, (k / 360) * orbitFacts(o, false).period, false))
      .map((s) => Math.hypot(s.r.x, s.r.y, s.r.z));
    expect(Math.min(...radii) / (o.a * (1 - o.e))).toBeCloseTo(1, 5);
    expect(Math.max(...radii) / (o.a * (1 + o.e))).toBeCloseTo(1, 4);
  });
});

describe('orbits with published figures (O01)', () => {
  it('stands still once a sidereal day: the geostationary radius is 42 164 km (42 166 km as a mean element)', () => {
    const a = Math.cbrt(MU_EARTH * (SIDEREAL_DAY / (2 * Math.PI)) ** 2);
    expect(a / 1e3).toBeCloseTo(42164.2, 0);
    // two-body, the sub-satellite point does not move
    const geo = orbit({ a, i: 0 });
    const track = groundTrack(geo, 0, 3 * 86400, 200, false);
    const lons = track.map((p) => p.lon);
    expect(Math.max(...lons) - Math.min(...lons)).toBeLessThan(1e-4);
    // With J2, the mean longitude runs at n(1 + 3·J2(R/a)²): the two-body radius drifts 0.027°/day east, and the
    // mean semi-major axis that stands still is 2 km larger — the 42 166 km of a geostationary satellite's element set
    const drift = groundTrack(geo, 0, 86400, 2, true);
    expect((drift[1].lon - drift[0].lon) / DEG).toBeCloseTo(0.0268, 3);
    const k = 1.08262668e-3 * (R_EARTH / a) ** 2;
    const still = orbit({ a: a * (1 + 3 * k) ** (2 / 3), i: 0 });
    expect(still.a / 1e3).toBeCloseTo(42166.3, 0);
    const held = groundTrack(still, 0, 10 * 86400, 2, true);
    expect(Math.abs(held[1].lon - held[0].lon) / DEG).toBeLessThan(0.002);
  });

  it('has GPS at 26 560 km going round twice a sidereal day, 11 h 58 min', () => {
    const f = orbitFacts(orbit({ a: 26560e3, i: 55 * DEG }), false);
    expect(f.period / 60).toBeCloseTo(717.9, 0);
    expect(Math.abs(f.period - SIDEREAL_DAY / 2)).toBeLessThan(20);
  });

  it('designs the Landsat and Sentinel-2 orbits from their repeat cycles', () => {
    // Landsat WRS-2: 233 orbits in 16 days, sun-synchronous
    const landsat = repeatOrbit(233, 16, true);
    expect(landsat.a / 1e3).toBeGreaterThan(7077.44 - 0.5); // measured 7077.44–7077.95 km (NASA)
    expect(landsat.a / 1e3).toBeLessThan(7077.95 + 0.5);
    expect(Math.abs(landsat.i / DEG - 98.2096)).toBeLessThan(0.05); // USGS: 98.2096°
    const lf = orbitFacts(orbit({ a: landsat.a, i: landsat.i }), true);
    expect(Math.abs(lf.nodalPeriod - 5933.0472)).toBeLessThan(0.1); // USGS: 5933.0472 s
    expect(lf.sunSynchronous).toBe(true);
    // Sentinel-2: 143 orbits in 10 days, 786 km mean altitude, 98.62° (ESA)
    const s2 = repeatOrbit(143, 10, true);
    expect(Math.abs((s2.a - R_EARTH) / 1e3 - 786)).toBeLessThan(3);
    expect(Math.abs(s2.i / DEG - 98.62)).toBeLessThan(0.1);
    // and the track closes on itself: after 233 revolutions the node is back over the same longitude
    const o = orbit({ a: landsat.a, i: landsat.i });
    const tn = lf.nodalPeriod;
    const first = groundTrack(o, 0, 0, 1, true)[0], again = groundTrack(o, 233 * tn, 233 * tn, 1, true)[0];
    expect(Math.abs(again.lon - first.lon) * R_EARTH / 1e3).toBeLessThan(1);
    expect(Math.abs(again.lat - first.lat) * R_EARTH / 1e3).toBeLessThan(1);
  });

  it('turns a sun-synchronous node with the Sun, and a polar one not at all', () => {
    const a = R_EARTH + 600e3;
    const i = sunSynchronousInclination({ a, e: 0 })!;
    expect(i / DEG).toBeCloseTo(97.8, 1);
    expect(secularRates({ a, e: 0, i }, true).raanDot / SUN_RATE).toBeCloseTo(1, 6);
    expect(secularRates({ a, e: 0, i: Math.PI / 2 }, true).raanDot).toBeCloseTo(0, 15);
    // far out, J2 is too weak for any inclination to keep pace
    expect(sunSynchronousInclination({ a: R_EARTH + 7000e3, e: 0 })).toBeNull();
  });
});

describe("Newton's cannon (O01)", () => {
  it('names the cosmic velocities at the surface: 7.9 km/s round, 11.2 km/s away', () => {
    const shot = newtonsCannon(0, 1000);
    expect(shot.vCircular / 1e3).toBeCloseTo(7.905, 3);
    expect(shot.vEscape / 1e3).toBeCloseTo(11.18, 2);
  });

  it('falls short, goes round, or leaves, as Newton drew it', () => {
    const h = 100e3; // a very tall mountain, above the air
    const vc = Math.sqrt(MU_EARTH / (R_EARTH + h)), ve = Math.sqrt(2 * MU_EARTH / (R_EARTH + h));
    expect(newtonsCannon(h, 0.5 * vc).outcome).toBe('impact');
    // a little under the circular speed still clears the ground: the perigee sinks, but not to the surface;
    // the least speed that does is where the perigee is the Earth's radius
    const r0 = R_EARTH + h, vGraze = Math.sqrt(2 * MU_EARTH * R_EARTH / (r0 * (R_EARTH + r0)));
    expect(newtonsCannon(h, 0.999 * vGraze).outcome).toBe('impact');
    expect(newtonsCannon(h, 1.001 * vGraze).outcome).toBe('orbit');
    const round = newtonsCannon(h, 1.001 * vc);
    expect(round.outcome).toBe('orbit');
    expect(round.period! / 60).toBeGreaterThan(86);
    // the orbit closes: the last point is the cannon again
    expect(Math.hypot(round.path.at(-1)!.x, round.path.at(-1)!.y - (R_EARTH + h))).toBeLessThan(1);
    expect(newtonsCannon(h, 1.05 * ve).outcome).toBe('escape');
    // faster shots land further round the world
    const ranges = [0.3, 0.6, 0.9].map((f) => newtonsCannon(h, f * vc).range!);
    expect(ranges[0]).toBeLessThan(ranges[1]);
    expect(ranges[1]).toBeLessThan(ranges[2]);
    // every impact path ends on the ground
    const end = newtonsCannon(h, 0.9 * vc).path.at(-1)!;
    expect(Math.hypot(end.x, end.y) / R_EARTH).toBeCloseTo(1, 6);
  });

  it('lands a slow shot where a flat-Earth projectile would', () => {
    // 100 m/s from 1 km: x = v √(2h/g) ≈ 1428 m, t ≈ 14.3 s
    const h = 1000, v = 100;
    const shot = newtonsCannon(h, v);
    expect(shot.outcome).toBe('impact');
    expect(shot.range! / (v * Math.sqrt(2 * h / G0))).toBeCloseTo(1, 2);
    expect(shot.flightTime! / Math.sqrt(2 * h / G0)).toBeCloseTo(1, 2);
    // and a shot upwards at 45° from the ground, the textbook range v² sin 2θ / g
    const lob = newtonsCannon(0, 300, Math.PI / 4);
    expect(lob.range! / (300 ** 2 / G0)).toBeCloseTo(1, 2);
  });

  it("times the ball along its path by Kepler's second law", () => {
    const h = 100e3, vc = Math.sqrt(MU_EARTH / (R_EARTH + h));
    // an impact: the last time is the flight time Kepler's equation gives
    const fall = newtonsCannon(h, 0.9 * vc);
    expect(fall.times.length).toBe(fall.path.length);
    expect(fall.times.at(-1)! / fall.flightTime!).toBeCloseTo(1, 4);
    // an orbit: once round is one period; faster than a circle, the cannon is its perigee, where the ball is quickest
    const round = newtonsCannon(h, 1.1 * vc);
    expect(round.times.at(-1)! / round.period!).toBeCloseTo(1, 4);
    const dt = round.times.slice(1).map((t, k) => t - round.times[k]);
    expect(dt[0]).toBeLessThan(dt[Math.floor(dt.length / 2)]);
    for (let k = 1; k < round.times.length; k++) expect(round.times[k]).toBeGreaterThan(round.times[k - 1]);
  });
});
