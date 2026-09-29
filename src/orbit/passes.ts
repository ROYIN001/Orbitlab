/**
 * When a satellite passes over a place (roadmap R03): it rises above the
 * horizon, climbs to its highest, and sets — the times, the directions, how
 * high — and whether it can be seen: in sunlight itself while the sky where
 * the observer stands is dark. The place is entered by hand or picked from a
 * list, and never leaves the page.
 *
 * The satellite is where SGP4 puts it (src/orbit/real-sky.ts), turned into
 * the Earth-fixed frame by the sidereal time of UT1 and the pole's wander
 * (src/orbit/earth-orientation.ts, P2.5); a dish's look angles are
 * src/orbit/applications.ts's, on the WGS-84 ellipsoid. Heights are
 * geometric unless the search is asked for the air's refraction
 * (src/orbit/visibility.ts, P2.5): then a pass rises and sets at the horizon
 * one sees, the air lifting a satellite there by about half a degree, a few
 * seconds before and after the geometric one. How bright a pass is, where
 * the satellite has a standard magnitude, is `brightest`'s.
 *
 * The search samples the elevation finely enough not to step over a pass
 * (1/60 of a revolution, never more than a minute), refines each highest
 * point by golden section and each rise and set by bisection. The Earth's
 * shadow is a cylinder the Sun's width (the Sun at infinity; its parallax
 * moves the shadow's edge by a few hundred metres); the sky is dark when the
 * Sun is 6° or more below the horizon, the end of civil twilight.
 *
 * The search itself needs only an elevation and a period: `findPassesOf`
 * runs it on any orbit — a designed one for D07 (Phase 4) — and
 * `findPasses` runs it on SGP4's.
 *
 * DOM-free; tests/passes.test.ts holds it to Skyfield's passes of the same
 * element sets, and `findPassesOf` on a Kepler orbit to the closed form of an
 * overhead pass.
 */
import { R_EARTH } from '../physics/constants';
import { sunDirectionEci } from '../physics/orbital';
import { v3, type Vec3 } from '../physics/vec3';
import { geodeticToEcef, lookAngles, type GroundStation } from './applications';
import { temeToItrf } from './earth-orientation';
import { phaseAngle, refraction, visualMagnitude } from './visibility';
import { minutesSinceEpoch, sgp4 } from './sgp4';
import { skyFacts, type SkyObject } from './real-sky';

/** The Sun this far below the horizon, or more, and the sky is dark enough to see a satellite (civil twilight's end). */
export const DARK_SKY = -6 * Math.PI / 180;

export interface Look {
  /** Julian date (UTC) */
  jd: number;
  /** from north through east, rad */
  az: number;
  /** above the horizon, rad */
  el: number;
  /** m */
  range: number;
  /** the satellite in sunlight */
  sunlit: boolean;
  /** the Sun's elevation where the observer stands, rad */
  sunEl: number;
}

const R = [0, 0, 0], V = [0, 0, 0];

/** Where the satellite is at `jd`, TEME as inertial, m; null where SGP4 cannot place it. */
function positionAt(o: SkyObject, jd: number): Vec3 | null {
  if (sgp4(o.sat, minutesSinceEpoch(o.sat, jd), R, V) !== 0) return null;
  return v3(R[0] * 1e3, R[1] * 1e3, R[2] * 1e3);
}

/** Whether a point (inertial, m) is in sunlight at `jd`: outside the Earth's cylindrical shadow. */
export function inSunlight(r: Vec3, jd: number): boolean {
  const s = sunDirectionEci(jd);
  const along = r.x * s.x + r.y * s.y + r.z * s.z;
  if (along >= 0) return true;
  const px = r.x - along * s.x, py = r.y - along * s.y, pz = r.z - along * s.z;
  return Math.hypot(px, py, pz) > R_EARTH;
}

/** The Sun's elevation at a station at `jd`, rad. */
export function sunElevation(st: GroundStation, jd: number): number {
  const s = sunDirectionEci(jd);
  // the Sun's direction, far enough that the station's offset from the centre does not matter
  const far = 1.496e11;
  return lookAngles(st, temeToItrf(v3(s.x * far, s.y * far, s.z * far), jd)).elevation;
}

/** What an observer at `st` sees of the satellite at `jd`; null where SGP4 cannot place it. */
export function lookFrom(o: SkyObject, st: GroundStation, jd: number): Look | null {
  const r = positionAt(o, jd);
  if (!r) return null;
  const la = lookAngles(st, temeToItrf(r, jd));
  return { jd, az: la.azimuth, el: la.elevation, range: la.range, sunlit: inSunlight(r, jd), sunEl: sunElevation(st, jd) };
}

/** The elevation alone, for the search (−π/2 where SGP4 gives nothing); as seen, with refraction, when asked. */
function elevation(o: SkyObject, st: GroundStation, jd: number, refract: boolean): number {
  const r = positionAt(o, jd);
  if (!r) return -Math.PI / 2;
  const el = lookAngles(st, temeToItrf(r, jd)).elevation;
  return refract ? el + refraction(el) : el;
}

export interface Pass {
  /** above the minimum elevation from … to …; null when it already was, or still is, at the window's edge */
  rise: Look | null;
  set: Look | null;
  /** the highest points (usually one; a slow high orbit can dip and climb again without setting) */
  culminations: Look[];
  /** the highest of them; with none inside the window, the higher of the pass's two ends there */
  top: Look;
  /** when it can be seen — sunlit in a dark sky — within the pass; null if at no time (or for a pass of half a day or more) */
  visible: { from: number; to: number } | null;
}

const PHI = (Math.sqrt(5) - 1) / 2;


/** The time of the highest elevation in [a, b], by golden section to a millisecond. */
function peak(f: (jd: number) => number, a: number, b: number): number {
  let x1 = b - PHI * (b - a), x2 = a + PHI * (b - a);
  let f1 = f(x1), f2 = f(x2);
  while (b - a > 1e-3 / 86400) {
    if (f1 < f2) { a = x1; x1 = x2; f1 = f2; x2 = a + PHI * (b - a); f2 = f(x2); }
    else { b = x2; x2 = x1; f2 = f1; x1 = b - PHI * (b - a); f1 = f(x1); }
  }
  return (a + b) / 2;
}

/** Where `f` crosses `level` between `a` (below) and `b` (above), or the reverse, by bisection to a millisecond. */
function crossing(f: (jd: number) => number, level: number, a: number, b: number): number {
  const up = f(a) < level;
  while (b - a > 1e-3 / 86400) {
    const m = (a + b) / 2;
    if ((f(m) < level) === up) a = m; else b = m;
  }
  return (a + b) / 2;
}

/** A pass as times alone, Julian dates (UTC): what `findPassesOf` finds on any elevation. */
export interface PassTimes {
  /** above the minimum elevation from … to …; null when it already was, or still is, at the window's edge */
  rise: number | null;
  set: number | null;
  /** the highest points inside the window (usually one) */
  culminations: number[];
  /** the highest of them; with none inside the window, the higher of the pass's two ends there */
  top: number;
}

/**
 * Every pass above `minEl` (rad; 0 is the horizon) between Julian dates
 * `jd0` and `jd1`, of whatever `elevation` (rad, at a Julian date) describes,
 * for an orbit of `period` s — the search `findPasses` runs, apart from SGP4.
 * Roadmap D07 (docs/ROADMAP-PART2-3.md; Phase 4 map §3 item 1) needs it for a
 * designed orbit, whose elevation comes from `stateAt` (src/orbit/kepler.ts)
 * through `eciToEcef` and `lookAngles`: contact time and revisit are found by
 * the same search, held to Skyfield through `findPasses`, rather than by a
 * second one.
 *
 * The samples are 1/60 of the period apart, never more than a minute, so no
 * pass is stepped over; each highest point is refined by golden section and
 * each rise and set by bisection, to a millisecond. Something that never goes
 * below `minEl` over the window gives one pass with neither rise nor set; one
 * that never rises above it gives none.
 */
export function findPassesOf(elevation: (jd: number) => number, period: number, jd0: number, jd1: number, minEl = 0): PassTimes[] {
  const f = elevation;
  const step = Math.min(60, period / 60) / 86400;
  const n = Math.ceil((jd1 - jd0) / step);
  const ts: number[] = [], es: number[] = [];
  for (let k = 0; k <= n; k++) { const jd = Math.min(jd1, jd0 + k * step); ts.push(jd); es.push(f(jd)); }
  const up = (e: number) => e > minEl;

  // the rises and sets: where the samples cross the minimum, refined
  const spans: { from: number | null; to: number | null }[] = [];
  let open: { from: number | null; to: number | null } | null = up(es[0]) ? { from: null, to: null } : null;
  for (let k = 0; k < ts.length - 1; k++) {
    if (up(es[k]) === up(es[k + 1])) continue;
    const at = crossing(f, minEl, ts[k], ts[k + 1]);
    if (up(es[k + 1])) open = { from: at, to: null };
    else if (open) { open.to = at; spans.push(open); open = null; }
  }
  if (open) spans.push(open);

  // the highest points: local maxima of the samples, refined, above the minimum; one between two
  // samples both below it is a short pass the samples stepped over, with its rise and set around it
  const tops: number[] = [];
  for (let k = 1; k < ts.length - 1; k++) {
    if (!(es[k] >= es[k - 1] && es[k] > es[k + 1])) continue;
    const jd = peak(f, ts[k - 1], ts[k + 1]);
    if (!up(f(jd))) continue;
    tops.push(jd);
    if (!spans.some((sp) => (sp.from ?? -Infinity) <= jd && jd <= (sp.to ?? Infinity))) {
      spans.push({ from: crossing(f, minEl, ts[k - 1], jd), to: crossing(f, minEl, jd, ts[k + 1]) });
    }
  }
  spans.sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity));

  return spans.map((sp) => {
    const a = sp.from ?? jd0, b = sp.to ?? jd1;
    const culminations = tops.filter((jd) => jd >= a && jd <= b);
    // no highest point inside the window: the pass's highest is at one of its edges
    const top = culminations.length ? culminations.reduce((m, c) => (f(c) > f(m) ? c : m)) : (f(a) >= f(b) ? a : b);
    return { rise: sp.from, set: sp.to, culminations, top };
  });
}

/**
 * Every pass of the satellite over `st` between Julian dates `jd0` and `jd1`
 * above `minEl` (rad; 0 is the horizon), the elevation geometric or, with
 * `refraction`, as seen. A satellite that never sets over the window — a
 * geostationary one — gives one pass with neither rise nor set; one that
 * never rises gives none. The search is `findPassesOf`'s, on SGP4's
 * elevation and the element set's period.
 */
export function findPasses(o: SkyObject, st: GroundStation, jd0: number, jd1: number, minEl = 0, opts: { refraction?: boolean } = {}): Pass[] {
  const f = (jd: number) => elevation(o, st, jd, !!opts.refraction);
  return findPassesOf(f, skyFacts(o).period, jd0, jd1, minEl).map((p) => {
    const a = p.rise ?? jd0, b = p.set ?? jd1;
    const culminations = p.culminations.map((jd) => lookFrom(o, st, jd)!);
    // the highest by the geometric elevation the looks carry, as it always was
    const top = culminations.length ? culminations.reduce((m, c) => (c.el > m.el ? c : m)) : lookFrom(o, st, p.top)!;
    return {
      rise: p.rise === null ? null : lookFrom(o, st, p.rise),
      set: p.set === null ? null : lookFrom(o, st, p.set),
      // a pass of half a day or more is a high orbit's: too faint to see, and not worth ten-second steps across days
      culminations, top, visible: b - a < 0.5 ? visibleWithin(o, st, a, b) : null,
    };
  });
}

/**
 * The satellite's magnitude seen from `st` at `jd` for its standard
 * magnitude (fully lit at 1000 km): null when it is in the Earth's shadow.
 */
export function magnitudeAt(o: SkyObject, st: GroundStation, jd: number, standard: number): number | null {
  const r = positionAt(o, jd);
  if (!r || !inSunlight(r, jd)) return null;
  const sat = temeToItrf(r, jd), site = geodeticToEcef(st);
  const s = sunDirectionEci(jd);
  // the Sun's direction turned with the Earth, as a far point
  const far = 1.496e11, sun = temeToItrf(v3(s.x * far, s.y * far, s.z * far), jd);
  const sn = Math.hypot(sun.x, sun.y, sun.z);
  const range = Math.hypot(site.x - sat.x, site.y - sat.y, site.z - sat.z);
  return visualMagnitude(standard, range, phaseAngle(sat, site, v3(sun.x / sn, sun.y / sn, sun.z / sn)));
}

/** The brightest moment of a pass's visible stretch, sampled every 10 s, for a standard magnitude; null when it is never seen. */
export function brightest(o: SkyObject, st: GroundStation, p: Pass, standard: number): { jd: number; magnitude: number } | null {
  if (!p.visible) return null;
  let best: { jd: number; magnitude: number } | null = null;
  const { from, to } = p.visible;
  const n = Math.max(2, Math.ceil((to - from) * 86400 / 10));
  for (let k = 0; k <= n; k++) {
    const jd = from + ((to - from) * k) / n;
    const m = magnitudeAt(o, st, jd, standard);
    if (m !== null && (!best || m < best.magnitude)) best = { jd, magnitude: m };
  }
  return best;
}

/** The first stretch, between `a` and `b`, when the satellite is sunlit and the observer's sky is dark. */
function visibleWithin(o: SkyObject, st: GroundStation, a: number, b: number): { from: number; to: number } | null {
  const seen = (jd: number): number => {
    const r = positionAt(o, jd);
    return r && inSunlight(r, jd) && sunElevation(st, jd) < DARK_SKY ? 1 : 0;
  };
  const step = Math.min(10 / 86400, (b - a) / 20);
  if (step <= 0) return null;
  let from: number | null = null, to: number | null = null;
  let prev = seen(a);
  if (prev) from = a;
  for (let t = a + step; t <= b + 1e-12; t += step) {
    const now = seen(Math.min(t, b));
    if (now && !prev && from === null) from = crossing(seen, 0.5, t - step, Math.min(t, b));
    if (!now && prev && from !== null) { to = crossing(seen, 0.5, t - step, Math.min(t, b)); break; }
    prev = now;
  }
  if (from === null) return null;
  return { from, to: to ?? b };
}
