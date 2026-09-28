/**
 * The Moon and the Sun for Apollo 11 (roadmap C01, src/physics/lunar/ephemeris.ts):
 * JPL's DE441 states, interpolated, precessed to the simulation's mean equator of
 * date — checked against the table itself, the precession against its own
 * rates, and the low-precision series against the table; and the way the Moon
 * faces (src/physics/lunar/orientation.ts). The whole chain, frames and forces,
 * is checked in tests/historical-vehicles.test.ts, where the flown injection
 * state, propagated, meets the Moon where the Mission Report said it would.
 */
import { describe, expect, it } from 'vitest';
import { MOON_1969 } from '../src/data/ephemeris-1969';
import { inEphemerisTable, moonState, precessionFromJ2000, sunState, TDB_MINUS_UTC_1969 } from '../src/physics/lunar/ephemeris';
import { moonPosition } from '../src/physics/propagator/ephemeris';
import { eciToSelenographic, moonBodyToEci, selenographicToEci } from '../src/physics/lunar/orientation';

const utc = (jdTdb: number) => jdTdb - TDB_MINUS_UTC_1969 / 86400;
const norm = (x: number, y: number, z: number) => Math.hypot(x, y, z);

describe('the Moon for Apollo 11', () => {
  it('interpolates the DE441 states to the metre at the table\'s own hours, and smoothly between them', () => {
    for (const i of [0, 50, 120, 196]) {
      const k = i * 6, jd = MOON_1969.jd0 + i / 24;
      const s = moonState(utc(jd));
      // back to the ICRF: the precession is a rotation, so its transpose
      const p = precessionFromJ2000(utc(jd));
      const x = p[0] * s.r.x + p[3] * s.r.y + p[6] * s.r.z, y = p[1] * s.r.x + p[4] * s.r.y + p[7] * s.r.z, z = p[2] * s.r.x + p[5] * s.r.y + p[8] * s.r.z;
      expect(norm(x - MOON_1969.data[k] * 1e3, y - MOON_1969.data[k + 1] * 1e3, z - MOON_1969.data[k + 2] * 1e3)).toBeLessThan(1);
    }
    // halfway between two hours, the interpolated velocity is the derivative of the interpolated position
    const jd = utc(MOON_1969.jd0 + 10.5 / 24), d = 1 / 86400;
    const a = moonState(jd - d), b = moonState(jd + d), m = moonState(jd);
    expect(norm((b.r.x - a.r.x) / 2 - m.v.x, (b.r.y - a.r.y) / 2 - m.v.y, (b.r.z - a.r.z) / 2 - m.v.z)).toBeLessThan(1e-2);
    expect(inEphemerisTable(2440423.5)).toBe(true);
    expect(inEphemerisTable(2451545)).toBe(false);
  });

  it('precesses the ICRF to the mean equator of 1969 by the IAU 1976 angles: a rotation, the 30 years since 1969', () => {
    const jd = 2440419.0, p = precessionFromJ2000(jd);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const dot = p[i * 3] * p[j * 3] + p[i * 3 + 1] * p[j * 3 + 1] + p[i * 3 + 2] * p[j * 3 + 2];
      expect(dot).toBeCloseTo(i === j ? 1 : 0, 12);
    }
    // the J2000 pole seen from 1969's equator: 30.46 years of 20.04″ a year in declination
    expect(Math.acos(p[8]) / (Math.PI / 180 / 3600)).toBeCloseTo(30.461 * 20.043, -1);
    // the J2000 equinox in 1969's frame: 30.46 years of ζ + z, 46.12″ a year in right ascension, backwards
    const ra = Math.atan2(p[3], p[0]) / (Math.PI / 180);
    expect(ra).toBeCloseTo(-(46.1244 * 30.461) / 3600, 3);
  });

  it('keeps the low-precision series (the drawing\'s, outside the table) within a few hundred kilometres', () => {
    const jd = utc(MOON_1969.jd0 + 3), s = moonState(jd);
    const p = precessionFromJ2000(jd), q = moonPosition(jd);
    const r = { x: p[0] * q[0] + p[1] * q[1] + p[2] * q[2], y: p[3] * q[0] + p[4] * q[1] + p[5] * q[2], z: p[6] * q[0] + p[7] * q[1] + p[8] * q[2] };
    expect(norm(r.x - s.r.x, r.y - s.r.y, r.z - s.r.z)).toBeLessThan(1500e3);
    // the Sun an astronomical unit away, the Moon 356–407 thousand km
    expect(norm(sunState(jd).r.x, sunState(jd).r.y, sunState(jd).r.z) / 1.496e11).toBeCloseTo(1.016, 2);
    expect(norm(s.r.x, s.r.y, s.r.z)).toBeGreaterThan(356e6);
    expect(norm(s.r.x, s.r.y, s.r.z)).toBeLessThan(407e6);
  });
});

describe('which way the Moon faces', () => {
  it('turns its near side to the Earth, within the librations, through Apollo 11\'s week', () => {
    for (let jd = MOON_1969.jd0; jd < MOON_1969.jd0 + 8; jd += 0.5) {
      const m = moonBodyToEci(jd);
      // a rotation
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const dot = m[i] * m[j] + m[3 + i] * m[3 + j] + m[6 + i] * m[6 + j];
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 10);
      }
      // the sub-Earth point: the Earth seen from the Moon's centre, within 8° of 0° N 0° E
      const r = moonState(jd).r;
      const sub = eciToSelenographic({ x: -r.x, y: -r.y, z: -r.z }, jd);
      expect(Math.abs(sub.lat)).toBeLessThan(7.5);
      expect(Math.abs(sub.lon)).toBeLessThan(8.5);
    }
  });

  it('puts Tranquility Base back where it was', () => {
    const jd = 2440423.2, p = selenographicToEci(0.67408, 23.47297, 1737.4e3, jd);
    const back = eciToSelenographic(p, jd);
    expect(back.lat).toBeCloseTo(0.67408, 9);
    expect(back.lon).toBeCloseTo(23.47297, 9);
    expect(back.r).toBeCloseTo(1737.4e3, 3);
  });
});
