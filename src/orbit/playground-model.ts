/**
 * The orbit playground's rules (roadmap O01), apart from its drawing: the
 * ranges of its sliders and how a slider's travel maps onto them, what
 * happens when one apsis is dragged past the other, how an orbit handed on
 * from a flight (S03) becomes a playground orbit, how a step of the Watch
 * tour sets the playground up, and the repeat-ground-track tool of the
 * Engineer level.
 *
 * DOM-free, SI units and radians; src/ui/orbit/playground.ts is the thin
 * part that puts it on screen, tests/orbit-playground.test.ts holds it here.
 */
import { DEG, R_EARTH } from '../physics/constants';
import { v3 } from '../physics/vec3';
import { wrap2pi } from '../physics/orbital';
import { apsidesToAE, orbitFromState, repeatOrbit, stateAt, type Orbit } from './kepler';
import { presetOrbit } from './presets';
import type { TourStep } from './tour';
import type { OrbitHandoff } from './handoff';

/** The time warps the playground offers, orbit seconds per screen second. */
export const PG_WARPS: readonly number[] = [1, 10, 60, 300, 600, 1800, 3600];
export const PG_DEFAULT_WARP = 300;
export const PG_DEFAULT_PRESET = 'iss';

/**
 * The sliders' ranges. Altitudes run from the lowest a satellite lasts a few
 * days at to past the Moon's distance a quarter; the semi-major axis of the
 * Engineer level may go below the surface, so that an orbit which hits the
 * Earth can be made and seen (drawn red).
 */
export const PG_LIMITS = {
  altitude: { min: 150e3, max: 100_000e3 },
  a: { min: 0.5 * R_EARTH, max: R_EARTH + 100_000e3 },
  e: { min: 0, max: 0.95 },
  cannonSpeed: { min: 0, max: 12_000 },
  cannonAltitude: { min: 10e3, max: 2_000e3 },
  cannonElevation: { min: 0, max: 60 * DEG },
} as const;

/** A slider's travel, 0…`SLIDER_STEPS`, mapped onto a range. */
export const SLIDER_STEPS = 1000;

export interface SliderScale {
  toValue(position: number): number;
  toPosition(value: number): number;
}

export function linearScale(min: number, max: number): SliderScale {
  return {
    toValue: (p) => min + ((max - min) * clamp(p, 0, SLIDER_STEPS)) / SLIDER_STEPS,
    toPosition: (v) => Math.round((SLIDER_STEPS * (clamp(v, min, max) - min)) / (max - min)),
  };
}

/**
 * Evenly spaced in the logarithm: an altitude slider covers 150 km to
 * 100 000 km and still moves a low orbit by kilometres, not by hundreds.
 */
export function logScale(min: number, max: number): SliderScale {
  const l0 = Math.log(min), l1 = Math.log(max);
  return {
    toValue: (p) => Math.exp(l0 + ((l1 - l0) * clamp(p, 0, SLIDER_STEPS)) / SLIDER_STEPS),
    toPosition: (v) => Math.round((SLIDER_STEPS * (Math.log(clamp(v, min, max)) - l0)) / (l1 - l0)),
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * The orbit with one apsis moved to `altitude`, m above the equatorial
 * radius. Dragged past the other, it takes the other along: a perigee is
 * never above the apogee, so the orbit becomes a circle at that height
 * rather than the two swapping names under the user's finger.
 */
export function withApsis(o: Orbit, which: 'perigee' | 'apogee', altitude: number): Orbit {
  const pe = o.a * (1 - o.e) - R_EARTH, ap = o.a * (1 + o.e) - R_EARTH;
  const next = which === 'perigee' ? { pe: altitude, ap: Math.max(ap, altitude) } : { pe: Math.min(pe, altitude), ap: altitude };
  return { ...o, ...apsidesToAE(next.pe, next.ap) };
}

/** S03: an orbit handed on from a flight, as the playground's, its epoch the moment of the hand-off. */
export function handoffOrbit(h: Pick<OrbitHandoff, 'r' | 'v' | 'jd'>): Orbit {
  return orbitFromState(v3(h.r[0], h.r[1], h.r[2]), v3(h.v[0], h.v[1], h.v[2]), h.jd);
}

/** How the playground stands for one step of the Watch tour. */
export interface TourSetup {
  view: TourStep['view'];
  /** the orbit on show; null on a Newton's-cannon step */
  orbit: Orbit | null;
  warp: number;
  sectors: boolean;
  j2: boolean;
  cannon: { speed: number; altitude: number } | null;
}

export function tourSetup(step: TourStep, jd0: number): TourSetup {
  let orbit = step.preset ? presetOrbit(step.preset, jd0) : null;
  if (orbit && step.lon !== undefined) {
    // turned about the pole: the node moves by as much as the point under the satellite must
    orbit = { ...orbit, raan: wrap2pi(orbit.raan + step.lon - stateAt(orbit, 0, false).lon) };
  }
  return {
    view: step.view,
    orbit,
    warp: step.warp,
    sectors: step.sectors ?? false,
    j2: step.j2 ?? false,
    cannon: step.cannonSpeed !== undefined ? { speed: step.cannonSpeed, altitude: step.cannonAltitude ?? 100e3 } : null,
  };
}

/** The altitudes `repeatOrbit` searches between, m. */
export const REPEAT_SEARCH = { min: 150e3, max: 5000e3 } as const;

/**
 * The Engineer's repeat-ground-track tool: the circular orbit whose track
 * repeats after `revs` revolutions in `days` days, sun-synchronous or at
 * inclination `i`. Null when no such orbit lies between 150 and 5 000 km, or
 * a sun-synchronous one cannot exist at that height.
 */
export function repeatGroundTrack(revs: number, days: number, sso: boolean, i: number): Orbit & { found: true } | null {
  if (!Number.isInteger(revs) || !Number.isInteger(days) || revs < 1 || days < 1) return null;
  const res = repeatOrbit(revs, days, sso, i);
  const alt = res.a - R_EARTH;
  // the bisection pins to an end of its bracket when the root is outside it
  if (alt < REPEAT_SEARCH.min + 1e3 || alt > REPEAT_SEARCH.max - 1e3) return null;
  if (!Number.isFinite(res.i) || (sso && Math.abs(Math.cos(res.i)) >= 1 - 1e-9)) return null;
  return { a: res.a, e: 0, i: res.i, raan: 0, argp: 0, m0: 0, jd0: 0, found: true };
}
