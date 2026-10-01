/**
 * A day's measured wind (src/data/measured-winds.ts, src/physics/measured-wind.ts;
 * C01: the wind over Saratov on 12 April 1961, which Vostok-1 comes home in):
 * the record as the archives give it, read linearly in height and in time,
 * the surface observer's wind at the bottom, calm above the record's top, and
 * nothing outside its hours. The flight in it is tests/vostok1-harness.ts.
 */
import { describe, expect, it } from 'vitest';
import { MEASURED_WINDS, SARATOV_1961_04_12 as SARATOV } from '../src/data/measured-winds';
import { measuredWindECI, measuredWindENU, windComponents } from '../src/physics/measured-wind';
import { geodetic, WGS84_A, WGS84_F } from '../src/physics/geodesy';
import { dot, norm, v3, type Vec3 } from '../src/physics/vec3';
import { watchMissionById, WATCH_MISSIONS } from '../src/ui/watch-missions';

const at = (iso: string) => Date.parse(iso);
const wind = (h: number, iso: string) => measuredWindENU(SARATOV, h, at(iso))!;
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

describe('the wind over Saratov, 12 April 1961', () => {
  it('blows toward the opposite of where it comes from', () => {
    const w = windComponents({ from: 270, speed: 10 });
    expect(w.east).toBeCloseTo(10, 12);
    expect(w.north).toBeCloseTo(0, 12);
    const nw = windComponents({ from: 315, speed: Math.SQRT2 });
    expect(nw.east).toBeCloseTo(1, 12);
    expect(nw.north).toBeCloseTo(-1, 12);
  });

  it('gives each ascent\'s own wind at its levels, at its hour', () => {
    for (const s of SARATOV.upper) {
      for (const l of s.levels) {
        const w = wind(l.height, s.time), c = windComponents(l);
        expect(w.x, `${s.time} ${l.hPa} hPa`).toBeCloseTo(c.east, 9);
        expect(w.y, `${s.time} ${l.hPa} hPa`).toBeCloseTo(c.north, 9);
        expect(w.z).toBe(0);
      }
    }
    // the strong westerly at 7 km the sources tell of: 42 m/s from 290° at 400 hPa at 00 UTC
    const w = wind(6830, '1961-04-12T00:00:00Z');
    expect(Math.hypot(w.x, w.y)).toBeCloseTo(42, 9);
  });

  it('gives the surface observer\'s wind at the vane and below it, between his hours', () => {
    const six = windComponents(SARATOV.surface[2]), nine = windComponents(SARATOV.surface[3]);
    for (const h of [0, 100, SARATOV.surfaceHeight]) {
      const w = wind(h, '1961-04-12T07:30:00Z');
      expect(w.x).toBeCloseTo(lerp(six.east, nine.east, 0.5), 9);
      expect(w.y).toBeCloseTo(lerp(six.north, nine.north, 0.5), 9);
    }
  });

  it('is linear in height between the levels and in time between the ascents', () => {
    // 6 km at 06 UTC: halfway between the two ascents, each read between its 500 and 400 hPa levels
    const [a, b] = SARATOV.upper;
    const within = (s: typeof a, h: number) => {
      const lo = s.levels.find((l) => l.hPa === 500)!, hi = s.levels.find((l) => l.hPa === 400)!;
      const f = (h - lo.height) / (hi.height - lo.height), cl = windComponents(lo), ch = windComponents(hi);
      return { east: lerp(cl.east, ch.east, f), north: lerp(cl.north, ch.north, f) };
    };
    const w = wind(6000, '1961-04-12T06:00:00Z'), wa = within(a, 6000), wb = within(b, 6000);
    expect(w.x).toBeCloseTo((wa.east + wb.east) / 2, 9);
    expect(w.y).toBeCloseTo((wa.north + wb.north) / 2, 9);
    // the 00 UTC ascent's winds end at 400 hPa: its last is held above it
    const top = windComponents(a.levels[a.levels.length - 1]);
    const high = wind(11000, '1961-04-12T00:00:00Z');
    expect(high.x).toBeCloseTo(top.east, 9);
    expect(high.y).toBeCloseTo(top.north, 9);
  });

  it('falls to calm above the highest level the balloons reached', () => {
    const top = Math.max(...SARATOV.upper.flatMap((s) => s.levels.map((l) => l.height)));
    expect(top).toBe(15900);
    const t = '1961-04-12T12:00:00Z', w0 = wind(top, t), half = wind((top + SARATOV.calmAt) / 2, t);
    expect(half.x).toBeCloseTo(w0.x / 2, 9);
    expect(half.y).toBeCloseTo(w0.y / 2, 9);
    expect(norm(wind(SARATOV.calmAt, t))).toBe(0);
    expect(norm(wind(60e3, t))).toBe(0);
  });

  it('says nothing outside the hours of its ascents', () => {
    expect(measuredWindENU(SARATOV, 3000, at('1961-04-11T23:59:59Z'))).toBeNull();
    expect(measuredWindENU(SARATOV, 3000, at('1961-04-12T12:00:01Z'))).toBeNull();
    expect(measuredWindECI(SARATOV, v3(WGS84_A + 3000, 0, 0), at('1962-04-12T08:00:00Z'))).toBeNull();
  });

  it('lies along the ellipsoid\'s east and north, at the height above it', () => {
    // over the landing, 51.27° N, 3 km up, at 07:50 UTC; the longitude in the inertial frame is any
    const lat = 51.27 * Math.PI / 180, lon = 1.1, h = 3000, e2 = WGS84_F * (2 - WGS84_F);
    const n = WGS84_A / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    const r = v3((n + h) * Math.cos(lat) * Math.cos(lon), (n + h) * Math.cos(lat) * Math.sin(lon), (n * (1 - e2) + h) * Math.sin(lat));
    expect(geodetic(r.x, r.y, r.z).h).toBeCloseTo(h, 3);
    const utc = at('1961-04-12T07:50:00Z'), w = measuredWindECI(SARATOV, r, utc)!, enu = measuredWindENU(SARATOV, h, utc)!;
    const up: Vec3 = v3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    const east: Vec3 = v3(-Math.sin(lon), Math.cos(lon), 0);
    const north: Vec3 = v3(-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat));
    expect(dot(w, up)).toBeCloseTo(0, 12);
    expect(dot(w, east)).toBeCloseTo(enu.x, 9);
    expect(dot(w, north)).toBeCloseTo(enu.y, 9);
  });
});

describe('the missions that name a measured wind', () => {
  it('name one on record, whose hours cover the return', () => {
    const naming = WATCH_MISSIONS.filter((m) => m.orbit?.deorbit?.wind !== undefined);
    expect(naming.map((m) => m.id)).toEqual(['vostok1']);
    const m = watchMissionById('vostok1')!, record = MEASURED_WINDS[m.orbit!.deorbit!.wind!];
    expect(record).toBe(SARATOV);
    // from the retro-fire to Gagarin on the ground, and some minutes more
    const launch = Date.parse(m.launchTime!), from = launch + m.orbit!.deorbit!.time * 1000;
    expect(measuredWindENU(record, 0, from)).not.toBeNull();
    expect(measuredWindENU(record, 0, from + 3600e3)).not.toBeNull();
  });
});
