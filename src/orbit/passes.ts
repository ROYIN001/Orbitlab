/**
 * When a satellite passes over a place (roadmap R03): it rises above the
 * horizon, climbs to its highest, and sets — the times, the directions, how
 * high — and whether it can be seen: in sunlight itself while the sky where
 * the observer stands is dark. The place is entered by hand or picked from a
 * list, and never leaves the page.
 *
 * The satellite is where SGP4 puts it (src/orbit/real-sky.ts); a dish's look
 * angles are src/orbit/applications.ts's, on the WGS-84 ellipsoid. Heights
 * are geometric, without refraction, as an almanac prints them: near the
 * horizon the air lifts a satellite by about half a degree, so it is seen a
 * few seconds before its listed rise.
 *
 * The search samples the elevation finely enough not to step over a pass
 * (1/60 of a revolution, never more than a minute), refines each highest
 * point by golden section and each rise and set by bisection. The Earth's
 * shadow is a cylinder the Sun's width (the Sun at infinity; its parallax
 * moves the shadow's edge by a few hundred metres); the sky is dark when the
 * Sun is 6° or more below the horizon, the end of civil twilight.
 *
 * DOM-free; tests/passes.test.ts holds it to Skyfield's passes of the same
 * element sets.
 */
import { R_EARTH } from '../physics/constants';
import { gmst, sunDirectionEci } from '../physics/orbital';
import { v3, type Vec3 } from '../physics/vec3';
import { eciToEcef, lookAngles, type GroundStation } from './applications';
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
  return lookAngles(st, eciToEcef(v3(s.x * far, s.y * far, s.z * far), gmst(jd))).elevation;
}

/** What an observer at `st` sees of the satellite at `jd`; null where SGP4 cannot place it. */
export function lookFrom(o: SkyObject, st: GroundStation, jd: number): Look | null {
  const r = positionAt(o, jd);
  if (!r) return null;
  const la = lookAngles(st, eciToEcef(r, gmst(jd)));
  return { jd, az: la.azimuth, el: la.elevation, range: la.range, sunlit: inSunlight(r, jd), sunEl: sunElevation(st, jd) };
}

/** The elevation alone, for the search (−π/2 where SGP4 gives nothing). */
function elevation(o: SkyObject, st: GroundStation, jd: number): number {
  const r = positionAt(o, jd);
  return r ? lookAngles(st, eciToEcef(r, gmst(jd))).elevation : -Math.PI / 2;
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

/**
 * Every pass of the satellite over `st` between Julian dates `jd0` and `jd1`
 * above `minEl` (rad; 0 is the geometric horizon). A satellite that never
 * sets over the window — a geostationary one — gives one pass with neither
 * rise nor set; one that never rises gives none.
 */
export function findPasses(o: SkyObject, st: GroundStation, jd0: number, jd1: number, minEl = 0): Pass[] {
  const f = (jd: number) => elevation(o, st, jd);
  const step = Math.min(60, skyFacts(o).period / 60) / 86400;
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
    let culminations = tops.filter((jd) => jd >= a && jd <= b).map((jd) => lookFrom(o, st, jd)!);
    // no highest point inside the window: the pass's highest is at one of its edges
    const edge = culminations.length ? null : (f(a) >= f(b) ? a : b);
    const top = culminations.length ? culminations.reduce((m, c) => (c.el > m.el ? c : m)) : lookFrom(o, st, edge!)!;
    if (!culminations.length) culminations = [];
    return {
      rise: sp.from === null ? null : lookFrom(o, st, sp.from),
      set: sp.to === null ? null : lookFrom(o, st, sp.to),
      // a pass of half a day or more is a high orbit's: too faint to see, and not worth ten-second steps across days
      culminations, top, visible: b - a < 0.5 ? visibleWithin(o, st, a, b) : null,
    };
  });
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
