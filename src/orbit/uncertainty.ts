/**
 * How far off an element set's satellite may be (roadmap R04): an element
 * set carries no statement of its own accuracy (Kelso, "Validation of SGP4
 * and IS-GPS-200D Against GPS Precision Ephemerides", AAS 07-127, 2007), so
 * the uncertainty is estimated from two published studies, and is shown as
 * an estimate:
 *
 * - at the epoch, the standard deviations Flohrer, Krag and Klinkrad found
 *   for the whole catalogue of 2008 January 1, by class of orbit — radial,
 *   along-track and cross-track ("Assessment and Categorization of TLE Orbit
 *   Errors for the US SSN Catalogue", AMOS Conference 2008, Tables 1 and 2);
 * - after the epoch, growth of about 1.5 km a day, which Levit and Marshall
 *   measured against laser-ranging ephemerides for satellites from 800 to
 *   19 100 km ("Improved orbit predictions using two-line elements",
 *   Advances in Space Research 47, 2011). The along-track error dominates it
 *   (Kelso 2007), so the growth is put there.
 *
 * Simplifications, stated as such: the growth is taken as the same before
 * and after the epoch (Kelso found it is not), with no bias (he found one),
 * and the same for every orbit (low orbits, where the air's drag is hard to
 * foresee, and satellites that manoeuvre can do much worse).
 *
 * DOM-free; tests/uncertainty.test.ts holds it to the published tables.
 */
import { elementAge, skyFacts, type SkyObject } from './real-sky';

/** One standard deviation, m: radial, along-track, cross-track (Flohrer's U, V, W). */
export interface Sigma { radial: number; along: number; cross: number }

/** Levit and Marshall (2011): the typical growth of SGP4's error with an element set's age, m/day. */
export const GROWTH_PER_DAY = 1500;

export type Band = 'low' | 'mid' | 'high';
/** Flohrer et al. (2008), Table 2, m: by eccentricity (below or above 0.1), perigee height and inclination. */
const TABLE2: Record<'circular' | 'eccentric', Record<Band, readonly (Sigma | null)[]>> = {
  circular: {
    // perigee below 800 km; i < 30°, 30–60°, > 60°
    low: [{ radial: 67, along: 118, cross: 75 }, { radial: 107, along: 308, cross: 169 }, { radial: 115, along: 517, cross: 137 }],
    // 800–25 000 km
    mid: [{ radial: 191, along: 256, cross: 203 }, { radial: 71, along: 228, cross: 95 }, { radial: 91, along: 428, cross: 114 }],
    // above 25 000 km: only the low inclinations (geostationary orbits) are tabulated
    high: [{ radial: 357, along: 432, cross: 83 }, null, null],
  },
  eccentric: {
    low: [{ radial: 2252, along: 4270, cross: 1421 }, { radial: 629, along: 909, cross: 2057 }, { radial: 494, along: 814, cross: 1337 }],
    mid: [{ radial: 1748, along: 3119, cross: 971 }, { radial: 1832, along: 1878, cross: 1454 }, { radial: 529, along: 817, cross: 1570 }],
    high: [{ radial: 402, along: 418, cross: 83 }, { radial: 4712, along: 6223, cross: 1208 }, null],
  },
};

/** Flohrer et al. (2008), Table 1: the averages by regime, m, where Table 2 has no entry. */
const TABLE1: Record<'LEO' | 'MEO' | 'GTO' | 'HEO' | 'GEO', Sigma> = {
  LEO: { radial: 102, along: 471, cross: 126 },
  MEO: { radial: 73, along: 131, cross: 54 },
  GTO: { radial: 1960, along: 3897, cross: 1808 },
  HEO: { radial: 824, along: 1367, cross: 1059 },
  GEO: { radial: 359, along: 432, cross: 86 },
};

/**
 * Flohrer's regimes, by perigee and apogee heights, m. The paper writes the
 * geostationary bounds, 40 164 and 44 164 km, as altitudes; they are the
 * geostationary radius ± 2 000 km, and are read here as radii (heights of
 * 33 786 to 37 786 km).
 */
function regime(hp: number, ha: number): keyof typeof TABLE1 {
  const geoLow = 40164e3 - 6378e3, geoHigh = 44164e3 - 6378e3;
  if (ha < 2000e3) return 'LEO';
  if (hp > geoLow && ha < geoHigh) return 'GEO';
  if (hp > 2000e3 && ha < geoLow) return 'MEO';
  if (hp < 2000e3 && ha > geoLow) return 'GTO';
  return 'HEO';
}

/**
 * The standard deviations at the epoch for an orbit of perigee `hp` and
 * apogee `ha` (m above the equatorial radius), eccentricity `e` and
 * inclination `i` (rad): Table 2's cell, or Table 1's regime where Table 2
 * has none. `from` names which.
 */
export function epochSigma(hp: number, ha: number, e: number, i: number): { sigma: Sigma; from: SigmaSource } {
  const deg = i * 180 / Math.PI;
  const band: Band = hp < 800e3 ? 'low' : hp < 25000e3 ? 'mid' : 'high';
  const col: 0 | 1 | 2 = deg < 30 ? 0 : deg < 60 ? 1 : 2;
  const shape = e < 0.1 ? 'circular' : 'eccentric';
  const cell = TABLE2[shape][band][col];
  if (cell) return { sigma: cell, from: { table: 2, shape, band, inclination: col } };
  const r = regime(hp, ha);
  return { sigma: TABLE1[r], from: { table: 1, regime: r } };
}

/** Which of Flohrer's entries: Table 2's cell, or Table 1's regime. */
export type SigmaSource =
  | { table: 2; shape: 'circular' | 'eccentric'; band: Band; inclination: 0 | 1 | 2 }
  | { table: 1; regime: keyof typeof TABLE1 };

export interface Uncertainty {
  /** days from the element set's epoch (negative before it) */
  age: number;
  /** one standard deviation, m, at that age */
  sigma: Sigma;
  /** their combination, m */
  total: number;
  /** the along-track part as time: how early or late the satellite may be, s */
  timing: number;
  /** which of Flohrer's entries the epoch's values are */
  from: SigmaSource;
}

/** The estimated uncertainty of a satellite's position at `jd`, from its element set's orbit and age. */
export function uncertaintyAt(o: SkyObject, jd: number): Uncertainty {
  const f = skyFacts(o);
  const s0 = epochSigma(f.perigeeAlt, f.apogeeAlt, o.sat.ecco, f.inclination);
  const age = elementAge(o.el, jd);
  const sigma: Sigma = { ...s0.sigma, along: s0.sigma.along + GROWTH_PER_DAY * Math.abs(age) };
  const total = Math.hypot(sigma.radial, sigma.along, sigma.cross);
  // the mean speed along the orbit: its circumference over its period
  const a = (f.perigeeAlt + f.apogeeAlt) / 2 + 6378135;
  const speed = (2 * Math.PI * a) / f.period;
  return { age, sigma, total, timing: sigma.along / speed, from: s0.from };
}
