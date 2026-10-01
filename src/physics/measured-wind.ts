/**
 * A day's measured wind as the air a body flies in (C01: Vostok-1 home in
 * the wind over Saratov that morning; src/data/measured-winds.ts;
 * docs/PHYSICS.md §13.6).
 *
 * The record is one station's: its radiosonde ascents (twice a day) and its
 * surface observer's winds (every three hours). At a time and a height the
 * wind is built from them in three pieces, each linear:
 *
 * - the surface wind at that time, between the two observations either side
 *   of it, at the vane's height and held below it;
 * - each ascent's wind at that height, between its two levels either side
 *   (from the surface wind up to its lowest level), and its highest held
 *   above it; then the two ascents either side of the time, weighted by it;
 * - above the highest level of any ascent, falling off to calm (`calmAt`).
 *
 * The east and north components are interpolated, not the direction and
 * speed. The station's wind is taken for the whole area around it (the
 * landing is 32 km from Saratov), and the levels' geopotential heights above
 * sea level as heights above the ellipsoid: geopotential and geometric
 * height differ by under 10 m at 7 km, and the geoid lies within a hundred
 * metres of the ellipsoid, small beside the 1.5 km between the levels.
 * Outside the span of the ascents the record does not apply, and the caller
 * flies its own air.
 */
import type { MeasuredWind, WindReport } from '../data/measured-winds';
import { geodetic } from './geodesy';
import { v3, type Vec3 } from './vec3';

const DEG = Math.PI / 180;

interface Components { east: number; north: number }
interface Point extends Components { height: number }

/** A wind's east and north components, m/s: it blows toward `from` + 180°. */
export function windComponents(w: WindReport): Components {
  return { east: -w.speed * Math.sin(w.from * DEG), north: -w.speed * Math.cos(w.from * DEG) };
}

/** A record read once: its times, ms, and its winds as components. */
interface Compiled {
  surfaceTimes: number[];
  surface: Components[];
  upperTimes: number[];
  upper: Point[][];
  /** the highest level with a wind, m */
  top: number;
}

const COMPILED = new WeakMap<MeasuredWind, Compiled>();

function compile(w: MeasuredWind): Compiled {
  let c = COMPILED.get(w);
  if (!c) {
    c = {
      surfaceTimes: w.surface.map((s) => Date.parse(s.time)), surface: w.surface.map(windComponents),
      upperTimes: w.upper.map((s) => Date.parse(s.time)),
      upper: w.upper.map((s) => s.levels.map((l) => ({ height: l.height, ...windComponents(l) }))),
      top: Math.max(...w.upper.map((s) => s.levels[s.levels.length - 1].height)),
    };
    COMPILED.set(w, c);
  }
  return c;
}

/** Linear in height through `points` (sorted by it), held beyond either end. */
function profile(points: readonly Point[], h: number): Components {
  if (h <= points[0].height) return points[0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (h <= b.height) return mix(a, b, (h - a.height) / (b.height - a.height));
  }
  return points[points.length - 1];
}

/** Where `t` falls among `times` (sorted): the index before it and the weight of the one after. */
function bracket(times: readonly number[], t: number): { i: number; f: number } {
  if (t <= times[0]) return { i: 0, f: 0 };
  for (let i = 1; i < times.length; i++) if (t <= times[i]) return { i: i - 1, f: (t - times[i - 1]) / (times[i] - times[i - 1]) };
  return { i: times.length - 1, f: 0 };
}

function mix(a: Components, b: Components, f: number): Components {
  return { east: a.east + (b.east - a.east) * f, north: a.north + (b.north - a.north) * f };
}

/**
 * The record's wind at `height` m and `utc` (ms since 1970), m/s, x east, y
 * north, z up (0); null outside the span of its ascents.
 */
export function measuredWindENU(w: MeasuredWind, height: number, utc: number): Vec3 | null {
  const c = compile(w), times = c.upperTimes;
  if (!(utc >= times[0] && utc <= times[times.length - 1])) return null;
  const s = bracket(c.surfaceTimes, utc);
  const surface: Point = { height: w.surfaceHeight, ...mix(c.surface[s.i], c.surface[Math.min(s.i + 1, c.surface.length - 1)], s.f) };
  const ascent = (k: number) => profile([surface, ...c.upper[k]], height);
  const u = bracket(times, utc);
  let wind = u.f > 0 ? mix(ascent(u.i), ascent(u.i + 1), u.f) : ascent(u.i);
  if (height > c.top) {
    const k = Math.max(0, (w.calmAt - height) / (w.calmAt - c.top));
    wind = { east: wind.east * k, north: wind.north * k };
  }
  return v3(wind.east, wind.north, 0);
}

/**
 * The record's wind at the inertial position `r` (m) and `utc`, ECI, m/s:
 * along the ellipsoid's east and north there, at the height above it. Null
 * outside the span of its ascents.
 */
export function measuredWindECI(w: MeasuredWind, r: Vec3, utc: number): Vec3 | null {
  const { lat, h } = geodetic(r.x, r.y, r.z);
  const enu = measuredWindENU(w, h, utc);
  if (!enu) return null;
  const lon = Math.atan2(r.y, r.x), sl = Math.sin(lat), cl = Math.cos(lat), so = Math.sin(lon), co = Math.cos(lon);
  // east (−sin λ, cos λ, 0) and north (−sin φ cos λ, −sin φ sin λ, cos φ), φ geodetic
  return v3(-so * enu.x - sl * co * enu.y, co * enu.x - sl * so * enu.y, cl * enu.y);
}
