/**
 * From SGP4's frame to the Earth's (roadmap P2.5): the real satellites'
 * positions over the ground, turned by the Earth's actual rotation and pole.
 *
 * SGP4 gives positions in TEME, the "true equator, mean equinox" frame of
 * its own date; the Earth-fixed frame follows by the Greenwich mean sidereal
 * time of UT1 (IAU 1982), then the polar motion, as Vallado, Crawford,
 * Hujsak and Kelso set out ("Revisiting Spacetrack Report #3", AIAA
 * 2006-6753, Appendix C). Until P2.5 the app turned TEME by the sidereal time
 * of UTC and left the pole alone: UT1 − UTC is up to 0.9 s, which is up to
 * 0.4 km of the Earth's turning at a low satellite's distance, and the pole
 * wanders by about 10 m.
 *
 * UT1 − UTC and the pole's x_p, y_p come from the IERS (the Earth-orientation
 * dataset, src/provider/earth-orientation.ts), read between its days; beyond
 * its first or last day the nearest is held, and without the dataset UT1 is
 * taken for UTC and the pole left alone, as before. A leap second is a jump of
 * one second in UT1 − UTC between two days: the day before it keeps its own
 * value to its end rather than running down to the next one.
 *
 * The dataset is set once for the page (`setEarthOrientation`), as the app
 * loads it; everything that places a real satellite over the ground reads it.
 * DOM-free; tests/earth-orientation.test.ts holds it to the paper's example.
 */
import { gmst } from '../physics/orbital';
import { v3, type Vec3 } from '../physics/vec3';
import type { EarthOrientation } from '../provider/earth-orientation';

/** Arcseconds to radians. */
const ARCSEC = Math.PI / (180 * 3600);

let current: EarthOrientation | null = null;
let fromJd = 0;

/** Set the Earth-orientation data every later call reads (null: UT1 = UTC, no polar motion). */
export function setEarthOrientation(e: EarthOrientation | null): void {
  current = e;
  fromJd = e ? Date.parse(`${e.from}T00:00:00Z`) / 86400000 + 2440587.5 : 0;
}

/** The data set, if any. */
export const earthOrientation = (): EarthOrientation | null => current;

export interface Eop {
  /** UT1 − UTC, s */
  dut1: number;
  /** the pole's position, rad */
  xp: number;
  yp: number;
}

/** UT1 − UTC and the pole at a Julian date (UTC). */
export function eopAt(jd: number, e: EarthOrientation | null = current): Eop {
  if (!e) return { dut1: 0, xp: 0, yp: 0 };
  const start = e === current ? fromJd : Date.parse(`${e.from}T00:00:00Z`) / 86400000 + 2440587.5;
  const n = e.dut1.length;
  const x = jd - start;
  if (x <= 0) return { dut1: e.dut1[0], xp: e.xp[0] * ARCSEC, yp: e.yp[0] * ARCSEC };
  if (x >= n - 1) return { dut1: e.dut1[n - 1], xp: e.xp[n - 1] * ARCSEC, yp: e.yp[n - 1] * ARCSEC };
  const k = Math.floor(x), f = x - k;
  const lerp = (a: number[]) => a[k] + (a[k + 1] - a[k]) * f;
  // a leap second: the day keeps its own UT1 − UTC
  const dut1 = Math.abs(e.dut1[k + 1] - e.dut1[k]) > 0.5 ? e.dut1[k] : lerp(e.dut1);
  return { dut1, xp: lerp(e.xp) * ARCSEC, yp: lerp(e.yp) * ARCSEC };
}

/** The Greenwich mean sidereal time of UT1 at a Julian date (UTC), rad: the angle that turns TEME into the pseudo-Earth-fixed frame. */
export function earthAngle(jd: number, e: EarthOrientation | null = current): number {
  return gmst(jd + eopAt(jd, e).dut1 / 86400);
}

/**
 * A position in TEME at a Julian date (UTC) in the Earth-fixed frame (ITRF),
 * same units: turned by the sidereal time of UT1, then by the pole's offset
 * (x_p, y_p, small angles).
 */
export function temeToItrf(r: Vec3, jd: number, e: EarthOrientation | null = current): Vec3 {
  const { dut1, xp, yp } = eopAt(jd, e);
  const th = gmst(jd + dut1 / 86400);
  const c = Math.cos(th), s = Math.sin(th);
  const px = c * r.x + s * r.y, py = -s * r.x + c * r.y, pz = r.z;
  return v3(px + xp * pz, py - yp * pz, pz - xp * px + yp * py);
}
