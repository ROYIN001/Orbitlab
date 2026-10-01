/**
 * D07 (docs/ROADMAP-PART2-3.md; Phase 4 map §3 item 4 and its validation
 * table): the D06 cores turned round (src/design/requirement-inverses.ts).
 *
 * TOLERANCES, fixed before the first run:
 * - round trips: every answer fed back into its D06 or O04 function gives
 *   the requirement to 1e-9 relative (1e-9 of the larger of 1 and the value,
 *   for decibels, which can be near zero);
 * - TU Delft reader p. 200: 8 Mbit/s over a 120-minute orbit is 57.6 Gbit
 *   (7.2 GB), 96 Mbit/s over a 10-minute pass — exact;
 * - THEOS-2 (0.5 m, 385/26 sun-synchronous): 621 km within 1 km and 97.91°
 *   within 0.1° (as tests/applications.test.ts holds them), and with a 13 µm
 *   pitch the focal length of O04's example camera, 16.1 m, within 0.08 m —
 *   0.05 m for the one decimal it is printed to, and 0.026 m for the 1 km;
 * - the worst β: no hourly sample of the year nearer zero; a low orbit that
 *   is not sun-synchronous reaches β = 0 (within 1e-4 rad);
 * - the closed-form eclipse at the worst β against D06's sampled worst
 *   eclipse of the year (`worstEclipse`): within 0.5 % (they part by the
 *   Sun's motion and J2's period, some 0.1 %, src/orbit/eclipse.ts).
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { julianDate } from '../src/physics/orbital';
import { groundSampleDistance } from '../src/orbit/applications';
import { betaAngle, eclipseDuration, worstEclipse } from '../src/orbit/eclipse';
import { diffractionGsd } from '../src/orbit/imaging';
import { raanForLocalTime, type Orbit } from '../src/orbit/kepler';
import { designControlTable, eirp, slantRange } from '../src/orbit/link';
import { MOUNT_FACTOR, PATH_EFFICIENCY, arrayPowerRequired } from '../src/orbit/power';
import { repeatGroundTrack } from '../src/orbit/playground-model';
import {
  apertureForGsd, focalLengthForGsd, maxRateAtMargin, powerAtWorstBeta, requiredDataRate, requiredEirp, txPowerForEirp, worstBeta,
} from '../src/design/requirement-inverses';

const JD0 = julianDate(new Date(Date.UTC(2026, 8, 21)));
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.max(1, Math.abs(b));

/** THEOS-2's 385/26 orbit, its descending node at 10:15 (catalogue: 22:15 ascending). */
function theos2(): Orbit {
  const o = repeatGroundTrack(385, 26, true, 0)!;
  return { ...o, raan: raanForLocalTime(22.25, JD0), jd0: JD0 };
}

/** Palo et al.'s X-band CubeSat downlink as the D06 link test reads it (NTRS 20150000169, Table 1), without its range and rate. */
const PALO = { eirp: 0, frequency: 8.16e9, rxGain: 57.476, systemTemperature: 189.7, losses: 1.993, requiredEbN0: 5.52, implementationLoss: 0 };

describe('the camera for a ground sample distance (D07)', () => {
  it('gives back the GSD asked, through O04\'s and D06\'s own functions', () => {
    for (const [h, p, g, lambda] of [[621e3, 13e-6, 0.5, 0.9e-6], [786e3, 7.5e-6, 10, 0.665e-6], [500e3, 5.5e-6, 3, 0.8e-6], [35_786e3, 20e-6, 1000, 11e-6]]) {
      const f = focalLengthForGsd(h, p, g);
      expect(rel(groundSampleDistance(h, p, f), g)).toBeLessThanOrEqual(1e-9);
      const d = apertureForGsd(h, lambda, g);
      expect(rel(diffractionGsd(h, d, lambda), g)).toBeLessThanOrEqual(1e-9);
    }
    expect(() => focalLengthForGsd(621e3, 13e-6, 0)).toThrow(RangeError);
    expect(() => apertureForGsd(-1, 1e-6, 1)).toThrow(RangeError);
  });

  it('works THEOS-2\'s case: 0.5 m from 385/26 is 621 km, 97.91°, and 16.1 m of focal length at 13 µm', () => {
    const o = theos2();
    const h = o.a - R_EARTH;
    expect(Math.abs(h / 1e3 - 621)).toBeLessThanOrEqual(1);
    expect(Math.abs(o.i / DEG - 97.91)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(focalLengthForGsd(h, 13e-6, 0.5) - 16.1)).toBeLessThanOrEqual(0.08);
  });
});

describe('the downlink for a day\'s data (D07)', () => {
  it('works TU Delft\'s p. 200 example exactly: 57.6 Gbit an orbit, 96 Mbit/s over a 10-minute pass', () => {
    const volume = 8e6 * 120 * 60;
    expect(volume).toBe(57.6e9);
    expect(volume / 8).toBe(7.2e9);
    expect(requiredDataRate(volume, 10 * 60)).toBe(96e6);
    expect(requiredDataRate(0, 0)).toBe(0);
    expect(requiredDataRate(1, 0)).toBe(Infinity);
  });

  it('closes the link at the margin asked, and the power gives back the EIRP', () => {
    for (const [range, rate, margin] of [[2566e3, 12.5e6, 3], [1000e3, 1e6, 0], [3000e3, 100e6, 6.5]]) {
      const link = { ...PALO, range, dataRate: rate };
      const e = requiredEirp(link, margin);
      expect(rel(designControlTable({ ...link, eirp: e }).margin, margin)).toBeLessThanOrEqual(1e-9);
      for (const [lineLoss, gain, pointing] of [[1, 6, 0], [2.5, 20.3, 0.4], [0, 0, 0]]) {
        const p = txPowerForEirp(e, lineLoss, gain, pointing);
        expect(rel(eirp(p, lineLoss, gain, pointing), e)).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it('carries its highest rate at the margin, at the lowest elevation\'s slant range', () => {
    const link = { ...PALO, eirp: 3, altitude: 600e3, minEl: 10 * DEG };
    for (const margin of [0, 3, 6]) {
      const rate = maxRateAtMargin(link, margin);
      const t = designControlTable({ ...PALO, eirp: 3, range: slantRange(R_EARTH + 600e3, 10 * DEG), dataRate: rate });
      expect(rel(t.margin, margin)).toBeLessThanOrEqual(1e-9);
    }
    expect(maxRateAtMargin(link, 3)).toBeLessThan(maxRateAtMargin({ ...link, minEl: 30 * DEG }, 3));
  });
});

describe('the array and the battery at the worst β (D07)', () => {
  it('finds the β nearest zero of the year: none of its hours nearer, and zero for an orbit that is not sun-synchronous', () => {
    const sso = theos2();
    const w = worstBeta(sso, JD0);
    let hourly = Infinity;
    for (let k = 0; k <= 365.25 * 24; k++) hourly = Math.min(hourly, Math.abs(betaAngle(sso, JD0 + k / 24, true)));
    expect(Math.abs(w.beta)).toBeLessThanOrEqual(hourly + 1e-12);
    expect(w.beta).toBeCloseTo(betaAngle(sso, w.jd, true), 12);
    const iss: Orbit = { a: R_EARTH + 420e3, e: 0, i: 51.6 * DEG, raan: 1, argp: 0, m0: 0, jd0: JD0 };
    expect(Math.abs(worstBeta(iss, JD0).beta)).toBeLessThan(1e-4);
  });

  it('sizes them so that they give back the loads, and its eclipse is D06\'s sampled worst of the year', () => {
    const o = theos2();
    const input = {
      orbit: o, dayLoad: 700, eclipseLoad: 300, regulation: 'PPT' as const, cellEff: 0.28, Id: 0.77, degPerYear: 0.005, years: 7,
      mount: 'tracking' as const, dod: 0.3, batteryEff: 0.9,
    };
    const s = powerAtWorstBeta(input);
    const h = o.a - R_EARTH;
    expect(s.eclipse).toBe(eclipseDuration(h, s.beta));
    expect(s.eclipse + s.daylight).toBeCloseTo(s.period, 9);
    const { Xd, Xe } = PATH_EFFICIENCY.PPT;
    expect(s.arrayPower).toBe(arrayPowerRequired({ dayLoad: 700, eclipseLoad: 300, Td: s.daylight, Te: s.eclipse, Xd, Xe }));
    // the array gives that power at the end of life; the battery holds the eclipse over its depth and efficiency
    expect(rel((s.array.area * s.array.pEol) / MOUNT_FACTOR.tracking, s.arrayPower)).toBeLessThanOrEqual(1e-9);
    expect(rel(s.battery * 0.3 * 0.9, 300 * s.eclipse)).toBeLessThanOrEqual(1e-9);
    expect(s.batteryWh).toBe(s.battery / 3600);
    // body panels see the Sun 23.5° off at worst, and need more
    expect(powerAtWorstBeta({ ...input, mount: 'body' }).array.area).toBeGreaterThan(s.array.area);
    // D06's sampled eclipse of the year
    const sampled = worstEclipse(o, JD0, 365.25);
    expect(Math.abs(s.eclipse - sampled.duration) / s.eclipse).toBeLessThanOrEqual(0.005);
    expect(() => powerAtWorstBeta({ ...input, orbit: { ...o, e: 0.1 } })).toThrow(RangeError);
  });
});
