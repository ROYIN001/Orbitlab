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
import { v3, type Vec3 } from '../physics/vec3';
import { stateFromElements, wrap2pi } from '../physics/orbital';
import { apsidesToAE, orbitFromState, repeatOrbit, stateAt, type Orbit } from './kepler';
import { presetOrbit } from './presets';
import type { TourStep } from './tour';
import type { ManeuverSettings, PlannerKind } from './maneuver-setup';
import type { HandoffSpacecraft, OrbitHandoff } from './handoff';
import type { Craft } from './budget';
import { spacecraftFor } from '../physics/propagator/spacecraft';
import { stateOnPlan, type Plan } from './maneuvers';
import { thaiSatelliteById } from '../data/thai-satellites';

/** The time warps the playground offers, orbit seconds per screen second. */
export const PG_WARPS: readonly number[] = [1, 10, 60, 300, 600, 1800, 3600, 21_600, 86_400];
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

/**
 * O03: the spacecraft the playground hands the lifetime analysis (P07) with
 * the orbit flown now: the one handed on, at the mass of the craft the plans
 * are flown with (lighter by what they burned) or else its own; with none
 * handed on, the science class's estimate (src/physics/propagator/
 * spacecraft.ts) at the craft's mass, else 1000 kg. Out of the playground's
 * DOM part so the Build → Orbit hand-off (D06, Phase 4 map §2.6 a) can be
 * held to reach the dialog with the design's area, C_D and C_R.
 */
export function playgroundLifetimeCraft(handoff: Pick<OrbitHandoff, 'spacecraft'> | null, craft: Pick<Craft, 'mass'> | null): HandoffSpacecraft {
  const kind = handoff?.spacecraft.kind ?? 'science';
  const mass = craft?.mass ?? handoff?.spacecraft.mass ?? 1000;
  return handoff ? { ...handoff.spacecraft, mass } : { ...spacecraftFor(kind, mass), kind, propulsion: null };
}

/**
 * S03: how the playground stands when a flight hands a new orbit on
 * ("Continue in Orbit", audit 2026-09-27 A6): on its own orbit, not the real
 * satellites it may have been left showing, and keeping nothing that
 * describes another satellite — the real one an orbit was taken from, or
 * the Thai one an application was showing (the applications' other
 * settings, a station and the like, stay).
 */
export function handoffEntry<A extends { thaiId: string | null }>(was: { mode: 'orbit' | 'sky'; apps: A | null }): {
  leaveSky: boolean; apps: A | null; skyLabel: null;
} {
  return { leaveSky: was.mode === 'sky', apps: appsOnOrbit(was.apps), skyLabel: null };
}

/**
 * M-ORBIT-002: the applications' settings as the playground takes an orbit.
 * A Thai satellite is named only with the orbit made from it (`thaiId`);
 * any other orbit — a preset, a slider, the repeat tool, a plan adopted, a
 * hand-off, a tour step — forgets it, so its published repeat cycle is never
 * reported for an orbit that is not its own. The rest of the settings stay.
 */
export function appsOnOrbit<A extends { thaiId: string | null }>(apps: A | null, thaiId: string | null = null): A | null {
  return apps && { ...apps, thaiId };
}

/** The published repeat cycle's revolutions of the Thai satellite the settings name, or null with none named. */
export function thaiRepeatRevs(apps: { thaiId: string | null } | null): number | null {
  return (apps?.thaiId ? thaiSatelliteById(apps.thaiId)?.repeat?.revs : null) ?? null;
}

/**
 * The orbit flown at `t` s, the time along it, and which of the plan's
 * segments it is (−1 while spiralling): the start orbit with no plan.
 * M-ORBIT-003: what the playground's readouts — the Watch tour card's
 * period among them — describe once a burn has been made.
 */
export function flownAt(plan: Plan | null, orbit: Orbit, t: number, j2: boolean): { orbit: Orbit; local: number; index: number } {
  if (!plan) return { orbit, local: t, index: 0 };
  const sp = plan.spiral;
  if (sp && t > sp.t0 && t < sp.t0 + sp.duration) {
    const s = stateOnPlan(plan, t, j2);
    return { orbit: orbitFromState(s.r, s.v, orbit.jd0 + t / 86400), local: 0, index: -1 };
  }
  let index = 0;
  plan.segments.forEach((seg, k) => { if (seg.t0 <= t) index = k; });
  return { orbit: plan.segments[index].orbit, local: t - plan.segments[index].t0, index };
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
  /** O02: a maneuver planned from the start */
  maneuver: (Partial<ManeuverSettings> & { kind: PlannerKind }) | null;
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
    maneuver: step.maneuver ?? null,
  };
}

/** The altitudes `repeatOrbit` searches between, m. */
export const REPEAT_SEARCH = { min: 150e3, max: 5000e3 } as const;

/** The repeat tool's fields: N revolutions in D days, whole numbers. */
export const REPEAT_LIMITS = { revs: { min: 1, max: 500 }, days: { min: 1, max: 60 } } as const;

/**
 * M-ORBIT-008: a repeat tool field's text as its count, or null when it is
 * not a whole number in the field's range (0, blank, 14.5, 501…) — a typing
 * slip, said beside the field, never a question answered "no such orbit".
 * Digits only, so it does not depend on how decimals are written.
 */
export function repeatCount(text: string, field: keyof typeof REPEAT_LIMITS): number | null {
  if (!/^\s*\d+\s*$/.test(text)) return null;
  const n = Number(text), { min, max } = REPEAT_LIMITS[field];
  return n >= min && n <= max ? n : null;
}

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

/**
 * Points along an orbit for drawing, m, ECI: the whole ellipse, or the part
 * of a hyperbola within twelve Earth radii (an escape planned by hand).
 */
export function orbitPath(o: Orbit, n = 256): Vec3[] {
  const pts: Vec3[] = [];
  if (o.e < 1) {
    for (let k = 0; k < n; k++) pts.push(stateFromElements(o.a, o.e, o.i, o.raan, o.argp, (2 * Math.PI * k) / n).r);
    return pts;
  }
  const p = o.a * (1 - o.e * o.e), far = 12 * R_EARTH;
  const cosFar = (p / far - 1) / o.e;
  const nuMax = Math.min(Math.acos(-1 / o.e) - 1e-3, cosFar >= -1 && cosFar <= 1 ? Math.acos(cosFar) : Math.PI);
  for (let k = 0; k < n; k++) pts.push(stateFromElements(o.a, o.e, o.i, o.raan, o.argp, -nuMax + (2 * nuMax * k) / (n - 1)).r);
  return pts;
}
