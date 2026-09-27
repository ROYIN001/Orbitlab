/**
 * The agencies'-way re-entry test's method (roadmap M03, P2.5), shared by
 * the heavy test that holds it to its criteria
 * (tests/heavy/reentry-agencies.test.ts) and the light one that checks the
 * pipeline (tests/ballistic.test.ts). Fixed in docs/VALIDATION.md §7 before
 * any prediction (commit edc9b49): for each lead time, B fitted to the two
 * sets (`ballisticFromSets`) and the prediction carried from the later one
 * with the Sun as measured (GFZ), by the mean elements, or by Cowell with the
 * Sun and the Moon for an eccentric orbit — the app's own worker function,
 * with the app's horizon of 365 days. The re-entry is GCAT's `DDate`, noon
 * for a day (make_agencies.py).
 */
import fixture from './agencies.json';
import HISTORY from '../../../src/data/solar-daily.json';
import { measuredActivity, type SolarDaily } from '../../../src/physics/propagator/activity';
import { predictFromRequest } from '../../../src/orbit/reentry-job';
import { parseTle } from '../../../src/orbit/tle';
import type { ElementSet } from '../../../src/orbit/tle';

export const LEADS = ['30', '10', '5'] as const;
export type Lead = (typeof LEADS)[number];
export type AgencyObject = (typeof fixture.objects)[number];
export interface BundledSet { epoch: string; line1: string; line2: string; line3: string }

export const AGENCY_OBJECTS: AgencyObject[] = fixture.objects;
export const AGENCY_POOL = fixture.pool;

/** The criteria as fixed: the fraction inside the ±20 % window at each lead time. */
export const AGENCY_CRITERIA: Record<Lead, number> = { '30': 0.7, '10': 0.8, '5': 0.8 };

const measured = measuredActivity(HISTORY as SolarDaily, null).series;
export const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;
export const epochOf = (el: ElementSet): number => el.jdEpoch + el.jdEpochFrac;

/** A bundled set read by the app's TLE reader; throws if it cannot be read. */
export function readSet(s: BundledSet): ElementSet {
  const res = parseTle(s.line1, s.line2);
  if (!res.elements) throw new Error(`unreadable set ${s.line1}: ${JSON.stringify(res.problems)}`);
  return res.elements;
}

export interface AgencyPrediction {
  /** the fitted B, m²/kg; null when no B could be fitted */
  b: number | null;
  /** the later set's epoch, Julian date */
  from: number;
  /** the predicted re-entry, Julian date; null with no B or when it stays up past the horizon */
  jd: number | null;
  /** GCAT's re-entry, Julian date */
  actual: number;
  inside: boolean;
  /** error of the time left, (predicted − from)/(actual − from) − 1; null with no prediction */
  error: number | null;
}

/** One object at one lead time, as fixed. */
export function predictAgencyWay(o: AgencyObject, lead: Lead): AgencyPrediction {
  const pair = (o.sets as Record<Lead, BundledSet[]>)[lead].map(readSet);
  const later = pair.reduce((p, q) => (epochOf(q) > epochOf(p) ? q : p));
  const actual = jdOf(o.reentry);
  const answer = predictFromRequest(
    { sets: pair, from: 'history', craft: { mass: 1, area: 1, cd: 1 }, activity: measured, horizonDays: 365 },
    () => true,
  );
  const from = epochOf(later);
  const jd = answer.reentry?.jd ?? null;
  const w = answer.reentry?.window ?? null;
  return {
    b: answer.b, from, jd, actual,
    inside: w !== null && actual >= w[0] && actual <= w[1],
    error: jd === null ? null : (jd - from) / (actual - from) - 1,
  };
}

/** The p-quantile (0–1) of a list, by linear interpolation between order statistics. */
export function quantile(xs: readonly number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const k = (s.length - 1) * p, lo = Math.floor(k), hi = Math.ceil(k);
  return s[lo] + (s[hi] - s[lo]) * (k - lo);
}
