/**
 * Real satellites in the Orbit section (roadmap R02): the element sets of a
 * catalogue group, or of a file the user brought, made ready for SGP4
 * (src/orbit/sgp4.ts) once, and asked where they are at any moment — one
 * satellite as the playground's orbit state, a whole group as points for the
 * 3-D view and the map.
 *
 * TEME is taken as the program's inertial frame, and Greenwich mean sidereal
 * time (src/physics/orbital.ts `gmst`) turns the Earth under it, as it turns
 * it under the playground's own orbits; the two frames differ by the
 * equation of the equinoxes (about a second of time), which moves nothing a
 * screen can show.
 *
 * DOM-free: tests/real-sky.test.ts holds it.
 */
import { R_EARTH } from '../physics/constants';
import { gmst, wrapPi } from '../physics/orbital';
import { v3 } from '../physics/vec3';
import { orbitFromState, type Orbit, type OrbitState } from './kepler';
import { minutesSinceEpoch, satrecFrom, sgp4, type Satrec, type Sgp4Error } from './sgp4';
import type { ElementSet } from './tle';
import type { SatGroupId } from '../provider/satellites';

/** Where the satellites on screen came from: a catalogue group, or the user's own file. */
export type SkySourceId = SatGroupId | 'imported';

export interface SkyObject {
  /** unique within the page: the source and the catalogue number */
  key: string;
  source: SkySourceId;
  el: ElementSet;
  sat: Satrec;
}

/** The element sets of one source, ready to propagate; a set SGP4 refuses at its epoch is kept, and fails when asked. */
export function skyObjects(sets: readonly ElementSet[], source: SkySourceId): SkyObject[] {
  const seen = new Set<string>();
  const out: SkyObject[] = [];
  for (const el of sets) {
    let key = `${source}:${el.satnum}`;
    // a file may hold several sets of one satellite (a history): each is its own object
    for (let k = 2; seen.has(key); k++) key = `${source}:${el.satnum}#${k}`;
    seen.add(key);
    out.push({ key, source, el, sat: satrecFrom(el) });
  }
  return out;
}

const scratchR = [0, 0, 0], scratchV = [0, 0, 0];

/** Days from the element set's epoch to `jd`: how old the set is at that moment (negative before it). */
export const elementAge = (el: ElementSet, jd: number): number => (jd - el.jdEpoch) - el.jdEpochFrac;

/**
 * Where one satellite is at Julian date `jd` (UTC), as the playground's orbit
 * state: position and velocity in m and m/s, the point below, the height
 * above the equatorial radius. Null when SGP4 cannot give it (the set's error
 * code in `error`) — decayed, or elements that do not hold at that time.
 */
export function skyState(o: SkyObject, jd: number): (OrbitState & { error: 0 }) | { error: Exclude<Sgp4Error, 0> } {
  const e = sgp4(o.sat, minutesSinceEpoch(o.sat, jd), scratchR, scratchV);
  if (e !== 0) return { error: e as Exclude<Sgp4Error, 0> };
  const r = v3(scratchR[0] * 1e3, scratchR[1] * 1e3, scratchR[2] * 1e3);
  const v = v3(scratchV[0] * 1e3, scratchV[1] * 1e3, scratchV[2] * 1e3);
  const theta = gmst(jd), rm = Math.hypot(r.x, r.y, r.z);
  // the angles an orbit state carries are the osculating orbit's, for the playground's readouts
  const o2 = orbitFromState(r, v, jd);
  return {
    error: 0, t: 0, r, v, nu: 0, raan: o2.raan, argp: o2.argp, theta,
    lat: Math.asin(r.z / rm), lon: wrapPi(Math.atan2(r.y, r.x) - theta), alt: rm - R_EARTH,
  };
}

/** The osculating orbit at `jd`: the Kepler ellipse through where SGP4 puts the satellite, for drawing and for the playground. */
export function skyOrbit(o: SkyObject, jd: number): Orbit | null {
  const s = skyState(o, jd);
  return s.error === 0 ? orbitFromState(s.r, s.v, jd) : null;
}

export interface SkyFacts {
  /** the mean motion's period, s */
  period: number;
  revsPerDay: number;
  /** the mean orbit's perigee and apogee above the equatorial radius, m */
  perigeeAlt: number;
  apogeeAlt: number;
  /** rad */
  inclination: number;
  /** SDP4 (deep space): a period of 225 minutes or more */
  deepSpace: boolean;
}

/** What the element set says of the orbit (its mean elements, not the moment's). */
export function skyFacts(o: SkyObject): SkyFacts {
  const s = o.sat;
  const period = (2 * Math.PI) / s.no_unkozai * 60;
  // SGP4's own: in earth radii above its (WGS-72) equatorial radius
  return {
    period, revsPerDay: 86400 / period,
    perigeeAlt: s.altp * s.radiusearthkm * 1e3,
    apogeeAlt: s.alta * s.radiusearthkm * 1e3,
    inclination: s.inclo, deepSpace: s.method === 'd',
  };
}

/**
 * Every satellite's position at `jd` into `xyz` (m, three numbers each) and
 * the point below it into `latlon` (rad, two each), the ones SGP4 cannot
 * place left out; returns how many were written. The arrays are the caller's,
 * reused frame after frame.
 */
export function skyPositions(objs: readonly SkyObject[], jd: number, xyz: Float32Array, latlon: Float32Array): number {
  const theta = gmst(jd);
  let n = 0;
  for (const o of objs) {
    if (sgp4(o.sat, minutesSinceEpoch(o.sat, jd), scratchR, scratchV) !== 0) continue;
    const x = scratchR[0] * 1e3, y = scratchR[1] * 1e3, z = scratchR[2] * 1e3;
    xyz[3 * n] = x; xyz[3 * n + 1] = y; xyz[3 * n + 2] = z;
    latlon[2 * n] = Math.asin(z / Math.hypot(x, y, z));
    latlon[2 * n + 1] = wrapPi(Math.atan2(y, x) - theta);
    n++;
  }
  return n;
}

/** The satellites whose name, catalogue number or international designator has `query` in it; all of them for an empty query. */
export function searchSky(objs: readonly SkyObject[], query: string): SkyObject[] {
  const q = query.trim().toUpperCase();
  if (!q) return [...objs];
  const digits = /^\d+$/.test(q);
  return objs.filter((o) => (o.el.name ?? '').toUpperCase().includes(q)
    || (digits ? String(o.el.satnum).startsWith(q.replace(/^0+(?=\d)/, '')) : false)
    || o.el.intldesg.toUpperCase().includes(q.replace(/-/g, '').replace(/^(19|20)(?=\d{5})/, '')));
}
