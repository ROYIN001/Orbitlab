/**
 * When the imaging satellites of the public catalogue pass over a place
 * (roadmap M02): the public-source planning question of when a site is
 * overflown, and how well it can be seen then.
 *
 * Each satellite's passes are R03's (src/orbit/passes.ts); what M02 adds is
 * the view from the satellite at the highest point of each: how far off its
 * straight-down the place is (the off-nadir angle a camera must look at), how
 * far the place is from the point below the satellite, whether the place is
 * in daylight (an optical camera needs it; a radar does not), the local mean
 * solar time there, and whether the satellite is going north or south.
 *
 * The satellites are those whose element sets are published: civil and
 * commercial imagers, and the military ones whose sets are public. The times
 * are as good as the sets (R04): seconds for a fresh one.
 *
 * DOM-free; tests/overflights.test.ts holds it to R03's passes and to the
 * published local times of sun-synchronous imagers.
 */
import { gmst } from '../physics/orbital';
import { v3, type Vec3 } from '../physics/vec3';
import { eciToEcef, geodeticToEcef, type GroundStation } from './applications';
import { findPasses, sunElevation, type Pass } from './passes';
import type { SkyObject } from './real-sky';
import { minutesSinceEpoch, sgp4 } from './sgp4';

export interface Overflight {
  object: SkyObject;
  pass: Pass;
  /** at the highest point: the angle at the satellite between straight down (to the Earth's centre) and the place, rad */
  offNadir: number;
  /** from the place to the point below the satellite then, along the ground, m */
  groundRange: number;
  /** the place's Sun above the horizon then */
  daylight: boolean;
  /** the local mean solar time at the place then, hours (0–24) */
  solarTime: number;
  /** the satellite heading north (ascending) or south then */
  northbound: boolean;
}

const R = [0, 0, 0], V = [0, 0, 0];
const angle = (p: Vec3, q: Vec3): number =>
  Math.acos(Math.max(-1, Math.min(1, (p.x * q.x + p.y * q.y + p.z * q.z) / (Math.hypot(p.x, p.y, p.z) * Math.hypot(q.x, q.y, q.z)))));
/** The mean Earth radius, m, for distances along the ground. */
const R_MEAN = 6371e3;

/** The view from the satellite at the highest point of one of its passes over `st`; null where SGP4 cannot place it. */
export function overflightOf(o: SkyObject, st: GroundStation, pass: Pass): Overflight | null {
  const jd = pass.top.jd;
  if (sgp4(o.sat, minutesSinceEpoch(o.sat, jd), R, V) !== 0) return null;
  const sat = eciToEcef(v3(R[0] * 1e3, R[1] * 1e3, R[2] * 1e3), gmst(jd));
  const site = geodeticToEcef(st);
  const down = v3(-sat.x, -sat.y, -sat.z), toSite = v3(site.x - sat.x, site.y - sat.y, site.z - sat.z);
  const utcHours = (((jd - 0.5) % 1) + 1) % 1 * 24;
  return {
    object: o, pass,
    offNadir: angle(down, toSite),
    groundRange: angle(sat, site) * R_MEAN,
    daylight: sunElevation(st, jd) > 0,
    solarTime: (((utcHours + (st.lon * 180) / Math.PI / 15) % 24) + 24) % 24,
    // TEME's z is the Earth's axis
    northbound: V[2] > 0,
  };
}

/** Every pass of each satellite over `st` between `jd0` and `jd1` above `minEl` (rad), in time order of the highest points. */
export function overflights(objs: readonly SkyObject[], st: GroundStation, jd0: number, jd1: number, minEl: number): Overflight[] {
  return objs.flatMap((o) => overflightsOf(o, st, jd0, jd1, minEl)).sort((a, b) => a.pass.top.jd - b.pass.top.jd);
}

function overflightsOf(o: SkyObject, st: GroundStation, jd0: number, jd1: number, minEl: number): Overflight[] {
  if (o.sat.error !== 0) return [];
  return findPasses(o, st, jd0, jd1, minEl).map((p) => overflightOf(o, st, p)).filter((f): f is Overflight => !!f);
}

/** `overflights`, a few satellites at a time, as src/orbit/screening.ts does it; null when stopped. */
export async function overflightsInSlices(
  objs: readonly SkyObject[], st: GroundStation, jd0: number, jd1: number, minEl: number,
  onProgress: (fraction: number) => boolean | void, yieldTo: () => Promise<void> = () => new Promise((r) => setTimeout(r, 0)),
): Promise<Overflight[] | null> {
  const out: Overflight[] = [];
  let last = performance.now();
  for (let k = 0; k < objs.length; k++) {
    out.push(...overflightsOf(objs[k], st, jd0, jd1, minEl));
    if (performance.now() - last > 40) {
      if (onProgress((k + 1) / objs.length) === false) return null;
      await yieldTo();
      last = performance.now();
    }
  }
  onProgress(1);
  return out.sort((a, b) => a.pass.top.jd - b.pass.top.jd);
}
